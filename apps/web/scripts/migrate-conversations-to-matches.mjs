#!/usr/bin/env node
/**
 * Phase 1.5 — Data migration: legacy web chat model → canonical backend model.
 *
 * Migrates the web-only chat/match data into the canonical schema that the
 * Flutter mobile client and Cloud Functions use:
 *
 *   conversations/{convoId}                 → (mapping only; archived)
 *   conversations/{convoId}/messages/{id}   → matches/{matchId}/messages/{id}
 *   matches/{uid_otherid} (legacy directional) → reconciled to canonical match
 *
 * Canonical target (verified against functions/src/index.ts 2026-06-05):
 *   matches/{autoId}: { userIds:[a,b], status:'active', preMatchRequests:{},
 *     pinnedForUser:{}, createdAt, lastMessageAt, lastMessageContent,
 *     lastMessageType, lastMessageFromUserId }
 *   matches/{matchId}/messages/{id}: { matchId, fromUserId, toUserId, content,
 *     type, mediaUrl, sentAt, isRead, readAt?, isDeletedForSender,
 *     isDeletedForRecipient, reactions:{[uid]:emoji}, visibleTo:[a,b] }
 *
 * SAFETY:
 *  - Dry-run by default. Pass --execute to write.
 *  - Idempotent: skips messages already migrated (matched by source id) and
 *    reuses an existing canonical match for a participant pair.
 *  - Non-destructive: legacy docs are MARKED (archived/migrated), never deleted.
 *    Run a separate cleanup only after a verification window.
 *
 * USAGE:
 *   # Auth: set GOOGLE_APPLICATION_CREDENTIALS to a service-account JSON path,
 *   # or FIREBASE_SERVICE_ACCOUNT to the JSON contents.
 *   node scripts/migrate-conversations-to-matches.mjs --project crush-265f7-staging          # dry run
 *   node scripts/migrate-conversations-to-matches.mjs --project crush-265f7-staging --execute # write
 *
 * See docs/reports/web_chat_match_migration_plan_2026-06-05.md (Phase 1.5).
 */

import admin from 'firebase-admin';

// ─── Args ────────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const EXECUTE = args.includes('--execute');
const projectFlagIdx = args.indexOf('--project');
const PROJECT_ID =
  projectFlagIdx >= 0 ? args[projectFlagIdx + 1] : process.env.GCLOUD_PROJECT;
const LIMIT_FLAG_IDX = args.indexOf('--limit');
const LIMIT = LIMIT_FLAG_IDX >= 0 ? Number(args[LIMIT_FLAG_IDX + 1]) : Infinity;

const MODE = EXECUTE ? 'EXECUTE' : 'DRY-RUN';

// ─── Init admin ──────────────────────────────────────────────────────────────
function initAdmin() {
  if (admin.apps.length) return;
  const inline = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (inline) {
    admin.initializeApp({
      credential: admin.credential.cert(JSON.parse(inline)),
      projectId: PROJECT_ID,
    });
  } else {
    // Falls back to GOOGLE_APPLICATION_CREDENTIALS / ADC.
    admin.initializeApp({ projectId: PROJECT_ID });
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
const log = (...a) => console.log(`[${MODE}]`, ...a);
const warn = (...a) => console.warn(`[${MODE}] ⚠`, ...a);

/** Map a legacy message `status` to canonical isRead. */
function toIsRead(status) {
  return status === 'read';
}

/** Map a legacy reactions array (web) to the canonical { [uid]: emoji } map. */
function toReactionsMap(legacyReactions) {
  const map = {};
  if (Array.isArray(legacyReactions)) {
    for (const r of legacyReactions) {
      if (r && typeof r.userId === 'string' && typeof r.emoji === 'string') {
        map[r.userId] = r.emoji; // one reaction per user (last wins)
      }
    }
  }
  return map;
}

/**
 * Find an existing canonical match for a participant pair, or null.
 * Canonical = has a `userIds` array containing both uids.
 */
async function findCanonicalMatch(db, uidA, uidB) {
  const snap = await db
    .collection('matches')
    .where('userIds', 'array-contains', uidA)
    .get();
  const found = snap.docs.find((d) => {
    const ids = d.data().userIds;
    return Array.isArray(ids) && ids.includes(uidB);
  });
  return found ?? null;
}

// ─── Migration ───────────────────────────────────────────────────────────────
async function migrate() {
  initAdmin();
  const db = admin.firestore();

  if (!PROJECT_ID) {
    throw new Error('No project id. Pass --project <id> or set GCLOUD_PROJECT.');
  }

  log(`Project: ${PROJECT_ID}`);
  log(`Mode: ${MODE}${LIMIT !== Infinity ? ` (limit ${LIMIT})` : ''}`);
  log('Scanning conversations/ …');

  const conversationsSnap = await db.collection('conversations').get();
  log(`Found ${conversationsSnap.size} conversation(s).`);

  const stats = {
    conversations: 0,
    conversationsSkipped: 0,
    matchesCreated: 0,
    matchesReused: 0,
    messagesMigrated: 0,
    messagesSkipped: 0,
    errors: 0,
  };

  let processed = 0;
  for (const convoDoc of conversationsSnap.docs) {
    if (processed >= LIMIT) break;
    processed += 1;

    const convo = convoDoc.data();
    const participants = Array.isArray(convo.participants)
      ? convo.participants.filter((p) => typeof p === 'string')
      : [];

    if (participants.length !== 2) {
      warn(
        `conversation ${convoDoc.id}: expected 2 participants, got ${participants.length} — skipping`
      );
      stats.conversationsSkipped += 1;
      continue;
    }

    if (convo.migratedToMatchId) {
      log(`conversation ${convoDoc.id}: already migrated → ${convo.migratedToMatchId}; skipping`);
      stats.conversationsSkipped += 1;
      continue;
    }

    const [uidA, uidB] = participants;
    stats.conversations += 1;

    try {
      // 1. Resolve (or create) the canonical match for this pair.
      let canonicalMatchRef;
      const existing = await findCanonicalMatch(db, uidA, uidB);
      if (existing) {
        canonicalMatchRef = existing.ref;
        stats.matchesReused += 1;
        log(`conversation ${convoDoc.id}: reusing canonical match ${existing.id}`);
      } else {
        canonicalMatchRef = db.collection('matches').doc();
        stats.matchesCreated += 1;
        log(`conversation ${convoDoc.id}: creating canonical match ${canonicalMatchRef.id}`);
        if (EXECUTE) {
          await canonicalMatchRef.set({
            userIds: [uidA, uidB],
            status: 'active',
            preMatchRequests: { [uidA]: 0, [uidB]: 0 },
            pinnedForUser: { [uidA]: false, [uidB]: false },
            createdAt: convo.createdAt ?? admin.firestore.FieldValue.serverTimestamp(),
            migratedFromConversationId: convoDoc.id,
          });
        }
      }
      const canonicalMatchId = canonicalMatchRef.id;

      // 2. Migrate messages.
      const messagesSnap = await convoDoc.ref.collection('messages').get();
      let lastMessage = null;
      for (const msgDoc of messagesSnap.docs) {
        const msg = msgDoc.data();
        const targetRef = canonicalMatchRef.collection('messages').doc(msgDoc.id);

        // Idempotency: skip if target already exists.
        if (EXECUTE) {
          const targetSnap = await targetRef.get();
          if (targetSnap.exists) {
            stats.messagesSkipped += 1;
            continue;
          }
        }

        const fromUserId = typeof msg.senderId === 'string' ? msg.senderId : '';
        const toUserId = participants.find((p) => p !== fromUserId) ?? '';
        const sentAt = msg.timestamp ?? msg.sentAt ?? null;

        const canonicalMsg = {
          matchId: canonicalMatchId,
          fromUserId,
          toUserId,
          content: typeof msg.content === 'string' ? msg.content : null,
          type: typeof msg.type === 'string' ? msg.type : 'text',
          mediaUrl:
            msg.metadata?.imageUrl ??
            msg.metadata?.videoUrl ??
            msg.metadata?.audioUrl ??
            msg.metadata?.gifUrl ??
            null,
          sentAt: sentAt ?? admin.firestore.FieldValue.serverTimestamp(),
          isRead: toIsRead(msg.status),
          readAt: msg.readAt ?? null,
          isDeletedForSender: msg.isDeleted === true,
          isDeletedForRecipient: false,
          reactions: toReactionsMap(msg.reactions),
          visibleTo: [uidA, uidB],
          migratedFromMessageId: msgDoc.id,
          migratedFromConversationId: convoDoc.id,
        };

        if (EXECUTE) {
          await targetRef.set(canonicalMsg);
        }
        stats.messagesMigrated += 1;
        lastMessage = canonicalMsg;
      }

      // 3. Update canonical match last-message summary + archive the convo.
      if (EXECUTE) {
        if (lastMessage) {
          await canonicalMatchRef.set(
            {
              lastMessageAt: lastMessage.sentAt,
              lastMessageContent: lastMessage.content
                ? String(lastMessage.content).slice(0, 100)
                : null,
              lastMessageType: lastMessage.type,
              lastMessageFromUserId: lastMessage.fromUserId,
            },
            { merge: true }
          );
        }
        await convoDoc.ref.set(
          {
            archived: true,
            migratedToMatchId: canonicalMatchId,
            migratedAt: admin.firestore.FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
      }

      log(
        `conversation ${convoDoc.id}: ${messagesSnap.size} message(s) → match ${canonicalMatchId}`
      );
    } catch (err) {
      stats.errors += 1;
      warn(`conversation ${convoDoc.id}: ERROR — ${err?.message ?? err}`);
    }
  }

  // ─── Summary ──────────────────────────────────────────────────────────────
  log('──────────────────────────────────────────');
  log('Migration summary:');
  log(`  conversations processed : ${stats.conversations}`);
  log(`  conversations skipped   : ${stats.conversationsSkipped}`);
  log(`  matches created         : ${stats.matchesCreated}`);
  log(`  matches reused          : ${stats.matchesReused}`);
  log(`  messages migrated       : ${stats.messagesMigrated}`);
  log(`  messages skipped        : ${stats.messagesSkipped}`);
  log(`  errors                  : ${stats.errors}`);
  log('──────────────────────────────────────────');
  if (!EXECUTE) {
    log('DRY-RUN complete. No data was written. Re-run with --execute to apply.');
  } else {
    log('EXECUTE complete. Legacy conversations marked archived (not deleted).');
  }
}

migrate()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
  });
