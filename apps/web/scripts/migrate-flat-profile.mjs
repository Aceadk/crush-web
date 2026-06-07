#!/usr/bin/env node
/**
 * Phase 3 Step 5 — Legacy flat-profile migration.
 *
 * Moves legacy flat root profile fields on `users/{uid}` (age, gender, bio,
 * interests, birthDate, …) into the canonical nested `profile.*` shape, then
 * removes the flat root keys. After this runs, web onboarding/profile editing —
 * which now writes canonical-only data — and the Firestore rules agree on shape.
 *
 * Canonical key set mirrors firestore.rules legacyFlatProfileKeys() and
 * docs/contracts/canonical_user_document.fixture.json (rejectedFlatRootKeys).
 *
 * SAFETY:
 *  - Dry-run by default. Pass --execute to write.
 *  - Idempotent: a flat key is moved only if `profile.<key>` is not already set;
 *    the flat key is then deleted. Re-running is a no-op once migrated.
 *  - Non-destructive ordering: profile.* is written/merged BEFORE the root key
 *    is deleted, so a crash mid-run never loses data.
 *
 * USAGE (auth via GOOGLE_APPLICATION_CREDENTIALS or FIREBASE_SERVICE_ACCOUNT):
 *   cd crush-web/apps/web
 *   node scripts/migrate-flat-profile.mjs --project crush-265f7-staging            # dry run
 *   node scripts/migrate-flat-profile.mjs --project crush-265f7-staging --execute  # apply
 *
 * See docs/reports/crush_web_mobile_alignment_reaudit_2026-06-06.md (P0.3 / Step 5).
 */

import admin from 'firebase-admin';

const args = process.argv.slice(2);
const EXECUTE = args.includes('--execute');
const projectIdx = args.indexOf('--project');
const PROJECT_ID = projectIdx >= 0 ? args[projectIdx + 1] : process.env.GCLOUD_PROJECT;
const limitIdx = args.indexOf('--limit');
const LIMIT = limitIdx >= 0 ? Number(args[limitIdx + 1]) : Infinity;
const MODE = EXECUTE ? 'EXECUTE' : 'DRY-RUN';

// Mirror of firestore.rules legacyFlatProfileKeys(). Some keys map to a
// differently-named canonical profile field; most map 1:1.
const LEGACY_FLAT_KEYS = [
  'name', 'lastName', 'age', 'gender', 'sexualOrientation', 'birthDate',
  'dateOfBirth', 'lastDobChangeAt', 'lastNameChangeAt', 'bio', 'photoUrls',
  'videoUrls', 'primaryPhotoIndex', 'interests', 'country', 'city',
  'latitude', 'longitude', 'livingIn', 'isVerified', 'heightCm',
  'relationshipGoals', 'languages', 'zodiacSign', 'educationLevel',
  'familyPlans', 'personalityType', 'religion', 'workout', 'socialMedia',
  'sleepingHabits', 'smoking', 'drinking', 'pets', 'favoriteSongs',
  'favoriteSinger', 'jobTitle', 'company', 'school', 'preferences',
  'privacySettings', 'favourites',
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

async function migrate() {
  initAdmin();
  const db = admin.firestore();
  if (!PROJECT_ID) {
    throw new Error('No project id. Pass --project <id> or set GCLOUD_PROJECT.');
  }

  log(`Project: ${PROJECT_ID}`);
  log('Scanning users/ for legacy flat profile fields…');

  const snapshot = await db.collection('users').get();
  log(`Found ${snapshot.size} user document(s).`);

  const stats = {
    scanned: 0,
    migrated: 0,
    alreadyCanonical: 0,
    fieldsMoved: 0,
    fieldsDroppedDuplicate: 0,
    errors: 0,
  };

  let processed = 0;
  for (const userDoc of snapshot.docs) {
    if (processed >= LIMIT) break;
    processed += 1;
    stats.scanned += 1;

    const data = userDoc.data();
    const flatPresent = LEGACY_FLAT_KEYS.filter((k) =>
      Object.prototype.hasOwnProperty.call(data, k)
    );
    if (flatPresent.length === 0) {
      stats.alreadyCanonical += 1;
      continue;
    }

    const existingProfile =
      data.profile && typeof data.profile === 'object' ? data.profile : {};
    const profilePatch = {};
    const rootDeletes = {};

    for (const key of flatPresent) {
      const flatValue = data[key];
      const alreadyInProfile = Object.prototype.hasOwnProperty.call(
        existingProfile,
        key
      );
      if (!alreadyInProfile && flatValue !== undefined && flatValue !== null) {
        profilePatch[key] = flatValue; // move into profile.*
        stats.fieldsMoved += 1;
      } else {
        stats.fieldsDroppedDuplicate += 1; // profile already has it → just drop root
      }
      rootDeletes[key] = admin.firestore.FieldValue.delete();
    }

    try {
      if (EXECUTE) {
        // 1) Write/merge canonical nested fields FIRST (no data loss on crash).
        if (Object.keys(profilePatch).length > 0) {
          await userDoc.ref.set({ profile: profilePatch }, { merge: true });
        }
        // 2) Then delete the flat root keys.
        await userDoc.ref.update(rootDeletes);
      }
      stats.migrated += 1;
      log(
        `user ${userDoc.id}: ${flatPresent.length} flat key(s) → profile.* ` +
          `(moved ${Object.keys(profilePatch).length})`
      );
    } catch (err) {
      stats.errors += 1;
      warn(`user ${userDoc.id}: ERROR — ${err?.message ?? err}`);
    }
  }

  log('──────────────────────────────────────────');
  log('Migration summary:');
  log(`  scanned             : ${stats.scanned}`);
  log(`  already canonical   : ${stats.alreadyCanonical}`);
  log(`  migrated            : ${stats.migrated}`);
  log(`  fields moved        : ${stats.fieldsMoved}`);
  log(`  duplicate dropped   : ${stats.fieldsDroppedDuplicate}`);
  log(`  errors              : ${stats.errors}`);
  log('──────────────────────────────────────────');
  if (!EXECUTE) {
    log('DRY-RUN complete. No data written. Re-run with --execute to apply.');
  } else {
    log('EXECUTE complete. Flat root profile keys migrated into profile.*.');
  }
}

migrate()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
  });
