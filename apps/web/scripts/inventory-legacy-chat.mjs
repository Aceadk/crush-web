#!/usr/bin/env node
/**
 * Phase 5 Step 8 — Legacy chat/match inventory + migration verification.
 *
 * READ-ONLY. Reports counts of every legacy + canonical chat/match entity so an
 * operator can (a) size the migration, and (b) after running
 * migrate-conversations-to-matches.mjs, compare source vs destination counts and
 * confirm completeness.
 *
 * Inventories: conversations (+ their messages, unread, pins), legacy
 * directional matches (userId/otherUserId, no userIds array), canonical matches
 * (userIds array, + their messages + pins), swipes, typing_indicators, and
 * migration progress (conversations with migratedToMatchId).
 *
 * USAGE (auth via GOOGLE_APPLICATION_CREDENTIALS or FIREBASE_SERVICE_ACCOUNT):
 *   cd crush-web/apps/web
 *   node scripts/inventory-legacy-chat.mjs --project crush-f5352
 *   node scripts/inventory-legacy-chat.mjs --project crush-f5352 --verify
 *
 * --verify cross-checks that every conversation is migrated and that each
 * migrated conversation's message count matches its destination match.
 *
 * See docs/reports/chat_match_cutover_runbook_2026-06-07.md (Phase 5).
 */

import admin from 'firebase-admin';

const args = process.argv.slice(2);
const VERIFY = args.includes('--verify');
const projectIdx = args.indexOf('--project');
const PROJECT_ID = projectIdx >= 0 ? args[projectIdx + 1] : process.env.GCLOUD_PROJECT;

function initAdmin() {
  if (admin.apps.length) return;
  const inline = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (inline) {
    admin.initializeApp({
      credential: admin.credential.cert(JSON.parse(inline)),
      projectId: PROJECT_ID,
    });
  } else {
    admin.initializeApp({ projectId: PROJECT_ID });
  }
}

const log = (...a) => console.log(...a);

function isCanonicalMatch(data) {
  return Array.isArray(data.userIds) && data.userIds.length >= 2;
}
function isLegacyDirectionalMatch(data) {
  return !isCanonicalMatch(data) && typeof data.userId === 'string' && typeof data.otherUserId === 'string';
}

async function countSubcollection(docRef, name) {
  const snap = await docRef.collection(name).count().get();
  return snap.data().count;
}

async function inventory() {
  initAdmin();
  if (!PROJECT_ID) throw new Error('No project id. Pass --project <id> or set GCLOUD_PROJECT.');
  const db = admin.firestore();

  log(`\nLegacy chat/match inventory — project ${PROJECT_ID}\n${'='.repeat(48)}`);

  // Conversations
  const convos = await db.collection('conversations').get();
  let convoMessages = 0;
  let convoUnread = 0;
  let convoMigrated = 0;
  for (const c of convos.docs) {
    convoMessages += await countSubcollection(c.ref, 'messages');
    if ((c.data().unreadCount ?? 0) > 0) convoUnread += 1;
    if (c.data().migratedToMatchId) convoMigrated += 1;
  }

  // Matches (split legacy directional vs canonical)
  const matches = await db.collection('matches').get();
  let canonicalMatches = 0;
  let legacyDirectionalMatches = 0;
  let canonicalMatchMessages = 0;
  let pinnedCanonical = 0;
  let pinnedLegacy = 0;
  for (const m of matches.docs) {
    const data = m.data();
    if (isCanonicalMatch(data)) {
      canonicalMatches += 1;
      canonicalMatchMessages += await countSubcollection(m.ref, 'messages');
      const pinned = data.pinnedForUser;
      if (pinned && typeof pinned === 'object' && Object.values(pinned).some(Boolean)) {
        pinnedCanonical += 1;
      }
    } else if (isLegacyDirectionalMatch(data)) {
      legacyDirectionalMatches += 1;
      if (data.pinnedForUser === true) pinnedLegacy += 1;
    }
  }

  const swipes = await db.collection('swipes').count().get();
  const typing = await db.collection('typing_indicators').count().get();

  log('\nLEGACY (to migrate / retire):');
  log(`  conversations                 : ${convos.size}`);
  log(`  conversation messages         : ${convoMessages}`);
  log(`  conversations w/ unread       : ${convoUnread}`);
  log(`  legacy directional matches    : ${legacyDirectionalMatches}`);
  log(`  legacy match pins             : ${pinnedLegacy}`);
  log(`  swipes (transient — drop)     : ${swipes.data().count}`);
  log(`  typing_indicators (drop)      : ${typing.data().count}`);

  log('\nCANONICAL (destination):');
  log(`  canonical matches             : ${canonicalMatches}`);
  log(`  canonical match messages      : ${canonicalMatchMessages}`);
  log(`  canonical match pins          : ${pinnedCanonical}`);

  log('\nMIGRATION PROGRESS:');
  log(`  conversations migrated        : ${convoMigrated} / ${convos.size}`);

  if (VERIFY) {
    log(`\nVERIFY:\n${'-'.repeat(48)}`);
    let unmigrated = 0;
    let messageMismatches = 0;
    for (const c of convos.docs) {
      const matchId = c.data().migratedToMatchId;
      if (!matchId) {
        unmigrated += 1;
        log(`  ✗ conversation ${c.id} not migrated`);
        continue;
      }
      const srcCount = await countSubcollection(c.ref, 'messages');
      const dstCount = await countSubcollection(
        db.collection('matches').doc(matchId),
        'messages'
      );
      if (dstCount < srcCount) {
        messageMismatches += 1;
        log(
          `  ✗ ${c.id} → ${matchId}: dst messages ${dstCount} < src ${srcCount}`
        );
      }
    }
    log('-'.repeat(48));
    log(`  unmigrated conversations      : ${unmigrated}`);
    log(`  message-count mismatches      : ${messageMismatches}`);
    log(
      unmigrated === 0 && messageMismatches === 0
        ? '  ✓ VERIFY PASSED — all conversations migrated, counts consistent.'
        : '  ✗ VERIFY FAILED — investigate before enabling V2 / removing legacy.'
    );
  }

  log('');
}

inventory()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Inventory failed:', err);
    process.exit(1);
  });
