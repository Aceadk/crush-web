/**
 * Canonical profile/media capability limits (Phase 9 Step 19).
 *
 * Single source of truth for the web clients, mirroring the mobile app
 * (`lib/features/profile`, `lib/core/constants/validation_constants.dart`) and
 * the backend (`functions/src/index.ts` + `firestore.rules`). Web surfaces MUST
 * import these instead of hardcoding limits so the two platforms cannot drift.
 *
 * Authority for each value:
 * - photos: mobile `ProfileMediaLimits.maxPhotos` = 9; rules bound photoUrls ≤ 9.
 * - interests: mobile `save_profile_details` rejects > 10; rules bound ≤ 20.
 * - photo size/mime: backend `PROFILE_PHOTO_MAX_BYTES` (10MB) + allowed MIME set.
 * - prompts: mobile/web profile editor cap = 3.
 * See docs/contracts/profile_settings_capability_matrix_2026-06-07.md.
 */

/** Max profile photos a user can have (product limit; rules ceiling is also 9). */
export const MAX_PROFILE_PHOTOS = 9;
/** Min photos required to complete a profile. */
export const MIN_PROFILE_PHOTOS = 1;
/** Max interests (product limit; rules ceiling is 20). */
export const MAX_INTERESTS = 10;
/** Max profile prompts (question/answer pairs). */
export const MAX_PROMPTS = 3;
/** Max bytes per profile photo (10 MB), matching the backend upload limit. */
export const PROFILE_PHOTO_MAX_BYTES = 10 * 1024 * 1024;
/** Allowed profile photo MIME types (mirrors backend PROFILE_PHOTO_ALLOWED_MIME_TYPES). */
export const PROFILE_PHOTO_ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
] as const;

/**
 * Verification is **server-owned**: `isIdVerified` / `kycVerificationStatus` are
 * protected root fields (firestore.rules) and there is no canonical client
 * verification-submission endpoint. Web therefore DISPLAYS verification status
 * only and must not implement a self-verification write path.
 */
export const VERIFICATION_IS_SERVER_OWNED = true;

export const PROFILE_CAPABILITIES = {
  maxPhotos: MAX_PROFILE_PHOTOS,
  minPhotos: MIN_PROFILE_PHOTOS,
  maxInterests: MAX_INTERESTS,
  maxPrompts: MAX_PROMPTS,
  photoMaxBytes: PROFILE_PHOTO_MAX_BYTES,
  photoAllowedMimeTypes: PROFILE_PHOTO_ALLOWED_MIME_TYPES,
  verificationServerOwned: VERIFICATION_IS_SERVER_OWNED,
} as const;
