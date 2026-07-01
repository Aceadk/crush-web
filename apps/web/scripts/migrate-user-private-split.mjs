#!/usr/bin/env node
/**
 * H-2 — users/{uid} public/private split — PHASE 1 (additive backfill).
 *
 * Firestore has no field-level read rules, so any viewer allowed to read a
 * profile reads the WHOLE user doc — including billing IDs, KYC status, safety
 * flags, entitlement, email/phone and exact geo. This script copies those
 * sensitive fields into an owner-only private doc and builds the Stripe reverse
 * lookup, WITHOUT removing anything from the public doc.
 *
 * It is intentionally NON-DESTRUCTIVE: it only writes
 *   - users/{uid}/private/account   (sensitive fields, merge)
 *   - stripe_customers/{customerId} (= { uid })   when stripeCustomerId is set
 * The destructive step (rounding public geo + deleting sensitive fields from the
 * public doc) lives in the separate cutover script and must run only AFTER all
 * clients/backends read+dual-write the private doc and you've validated.
 *
 * SAFETY:
 *  - Dry-run by default. Pass --execute to write.
 *  - Idempotent: writes are merges; re-running is a no-op once backfilled.
 *  - Reads precise geo from BOTH data.location.* and data.profile.*.
 *
 * USAGE (auth via GOOGLE_APPLICATION_CREDENTIALS or FIREBASE_SERVICE_ACCOUNT):
 *   cd crush-web/apps/web
 *   node scripts/migrate-user-private-split.mjs --project crush-f5352            # dry run
 *   node scripts/migrate-user-private-split.mjs --project crush-f5352 --execute  # apply
 *
 * See docs/SECURITY_AUDIT_2026-06.md (H-2) and
 *     docs/h2_user_private_split_runbook_2026-06-12.md (cutover).
 */

import admin from 'firebase-admin';

const args = process.argv.slice(2);
const EXECUTE = args.includes('--execute');
const projectIdx = args.indexOf('--project');
const PROJECT_ID = projectIdx >= 0 ? args[projectIdx + 1] : process.env.GCLOUD_PROJECT;
const limitIdx = args.indexOf('--limit');
const LIMIT = limitIdx >= 0 ? Number(args[limitIdx + 1]) : Infinity;
const MODE = EXECUTE ? 'EXECUTE' : 'DRY-RUN';

// Sensitive top-level fields that must NOT be cross-user readable.
// Mirrors firestore.rules protected-field list + email/phone + entitlement.
const PRIVATE_SCALAR_FIELDS = [
  'email', 'phoneNumber',
  'stripeCustomerId', 'stripeSubscriptionId',
  'kycVerificationStatus', 'safetyFlags', 'subscriptionLifecycle',
  'isIdVerified', 'isEmailVerified', 'emailVerified',
  'plan', 'subscriptionTier', 'isPremium', 'premiumPlan',
  'subscriptionExpiresAt', 'premiumExpiresAt', 'premiumAutoRenew',
  'billingPeriod', 'boost',
];

const log = (...a) => console.log(`[${MODE}]`, ...a);
const warn = (...a) => console.warn(`[${MODE}] ⚠`, ...a);

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

// Collect exact coordinates from either container, if present.
function extractPreciseGeo(data) {
  const geo = {};
  const loc = data.location && typeof data.location === 'object' ? data.location : {};
  const prof = data.profile && typeof data.profile === 'object' ? data.profile : {};
  if (typeof loc.latitude === 'number') geo.locationLatitude = loc.latitude;
  if (typeof loc.longitude === 'number') geo.locationLongitude = loc.longitude;
  if (typeof prof.latitude === 'number') geo.profileLatitude = prof.latitude;
  if (typeof prof.longitude === 'number') geo.profileLongitude = prof.longitude;
  return geo;
}

async function migrate() {
  initAdmin();
  const db = admin.firestore();
  if (!PROJECT_ID) {
    throw new Error('No project id. Pass --project <id> or set GCLOUD_PROJECT.');
  }

  log(`Project: ${PROJECT_ID}`);
  log('Scanning users/ to backfill private account docs…');

  const snapshot = await db.collection('users').get();
  log(`Found ${snapshot.size} user document(s).`);

  const stats = {
    scanned: 0,
    privateWritten: 0,
    stripeMapWritten: 0,
    nothingSensitive: 0,
    errors: 0,
  };

  let processed = 0;
  for (const userDoc of snapshot.docs) {
    if (processed >= LIMIT) break;
    processed += 1;
    stats.scanned += 1;

    const data = userDoc.data();
    const privatePayload = {};
    for (const key of PRIVATE_SCALAR_FIELDS) {
      if (Object.prototype.hasOwnProperty.call(data, key) && data[key] !== undefined) {
        privatePayload[key] = data[key];
      }
    }
    const geo = extractPreciseGeo(data);
    if (Object.keys(geo).length > 0) privatePayload.geo = geo;

    if (Object.keys(privatePayload).length === 0) {
      stats.nothingSensitive += 1;
      continue;
    }
    privatePayload.migratedAt = admin.firestore.FieldValue.serverTimestamp();

    try {
      if (EXECUTE) {
        await userDoc.ref.collection('private').doc('account').set(privatePayload, { merge: true });
      }
      stats.privateWritten += 1;

      const customerId = data.stripeCustomerId;
      if (typeof customerId === 'string' && customerId) {
        if (EXECUTE) {
          await db.collection('stripe_customers').doc(customerId).set(
            { uid: userDoc.id, updatedAt: admin.firestore.FieldValue.serverTimestamp() },
            { merge: true }
          );
        }
        stats.stripeMapWritten += 1;
      }

      log(
        `user ${userDoc.id}: private fields [${Object.keys(privatePayload)
          .filter((k) => k !== 'migratedAt')
          .join(', ')}]`
      );
    } catch (err) {
      stats.errors += 1;
      warn(`user ${userDoc.id}: ERROR — ${err?.message ?? err}`);
    }
  }

  log('──────────────────────────────────────────');
  log('Backfill summary:');
  log(`  scanned               : ${stats.scanned}`);
  log(`  private docs written  : ${stats.privateWritten}`);
  log(`  stripe map entries    : ${stats.stripeMapWritten}`);
  log(`  no sensitive fields   : ${stats.nothingSensitive}`);
  log(`  errors                : ${stats.errors}`);
  log('──────────────────────────────────────────');
  if (!EXECUTE) {
    log('DRY-RUN complete. No data written. Re-run with --execute to apply.');
  } else {
    log('EXECUTE complete. Private docs backfilled (public doc UNCHANGED — run cutover after validation).');
  }
}

migrate()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Backfill failed:', err);
    process.exit(1);
  });
