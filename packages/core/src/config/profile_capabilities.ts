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
 * - interests: onboarding V2 product contract requires 3–5 stable interest IDs.
 * - photo media: backend upload validation (bytes, MIME, dimensions, decoded pixels).
 * - prompts: mobile/web profile editor cap = 3.
 * See docs/contracts/profile_settings_capability_matrix_2026-06-07.md.
 */

/** Max profile photos a user can have (product limit; rules ceiling is also 9). */
export const MAX_PROFILE_PHOTOS = 9;
/** Min photos required to complete a profile. */
export const MIN_PROFILE_PHOTOS = 1;
/** Max interests in the cross-platform onboarding/profile contract. */
export const MAX_INTERESTS = 5;
/** Max profile prompts (question/answer pairs). */
export const MAX_PROMPTS = 3;
/** Max bytes per profile photo (10 MB), matching the backend upload limit. */
export const PROFILE_PHOTO_MAX_BYTES = 10 * 1024 * 1024;
/** Smallest accepted width and height for a profile photo. */
export const PROFILE_PHOTO_MIN_DIMENSION_PX = 320;
/** Largest accepted width and height for a profile photo. */
export const PROFILE_PHOTO_MAX_DIMENSION_PX = 4096;
/** Maximum decoded pixel count (4096 × 4096), independent of compressed bytes. */
export const PROFILE_PHOTO_MAX_PIXELS = 16_777_216;
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
  photoMinDimensionPx: PROFILE_PHOTO_MIN_DIMENSION_PX,
  photoMaxDimensionPx: PROFILE_PHOTO_MAX_DIMENSION_PX,
  photoMaxPixels: PROFILE_PHOTO_MAX_PIXELS,
  photoAllowedMimeTypes: PROFILE_PHOTO_ALLOWED_MIME_TYPES,
  verificationServerOwned: VERIFICATION_IS_SERVER_OWNED,
} as const;
