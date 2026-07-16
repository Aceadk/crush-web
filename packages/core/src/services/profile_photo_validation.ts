import {
  PROFILE_PHOTO_ALLOWED_MIME_TYPES,
  PROFILE_PHOTO_MAX_BYTES,
  PROFILE_PHOTO_MAX_DIMENSION_PX,
  PROFILE_PHOTO_MAX_PIXELS,
  PROFILE_PHOTO_MIN_DIMENSION_PX,
} from '../config/profile_capabilities';

export interface ProfilePhotoDimensions {
  width: number;
  height: number;
}

const HTML_IMAGE_DECODABLE_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const SERVER_FALLBACK_MIME_TYPES = new Set(['image/heic', 'image/heif']);

function isAllowedProfilePhotoMimeType(type: string): boolean {
  return PROFILE_PHOTO_ALLOWED_MIME_TYPES.some((allowed) => allowed === type);
}

export function assertProfilePhotoFileEnvelope(file: Pick<File, 'size' | 'type'>): void {
  if (file.size > PROFILE_PHOTO_MAX_BYTES) {
    throw new Error('Choose a profile photo no larger than 10 MB.');
  }
  if (!isAllowedProfilePhotoMimeType(file.type)) {
    throw new Error('Choose a JPEG, PNG, WebP, HEIC, or HEIF profile photo.');
  }
}

export function assertProfilePhotoDimensions({ width, height }: ProfilePhotoDimensions): void {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0) {
    throw new Error('Could not read valid dimensions from that profile photo.');
  }
  if (width < PROFILE_PHOTO_MIN_DIMENSION_PX || height < PROFILE_PHOTO_MIN_DIMENSION_PX) {
    throw new Error(
      `Profile photos must be at least ${PROFILE_PHOTO_MIN_DIMENSION_PX} × ${PROFILE_PHOTO_MIN_DIMENSION_PX} pixels.`
    );
  }
  if (width > PROFILE_PHOTO_MAX_DIMENSION_PX || height > PROFILE_PHOTO_MAX_DIMENSION_PX) {
    throw new Error(
      `Profile photos must be no larger than ${PROFILE_PHOTO_MAX_DIMENSION_PX} × ${PROFILE_PHOTO_MAX_DIMENSION_PX} pixels.`
    );
  }
  if (width * height > PROFILE_PHOTO_MAX_PIXELS) {
    throw new Error(
      `Profile photos must contain no more than ${PROFILE_PHOTO_MAX_PIXELS.toLocaleString('en-US')} decoded pixels.`
    );
  }
}

async function dimensionsFromImageBitmap(file: File): Promise<ProfilePhotoDimensions | null> {
  if (typeof globalThis.createImageBitmap !== 'function') return null;
  let bitmap: ImageBitmap | undefined;
  try {
    bitmap = await globalThis.createImageBitmap(file);
    return { width: bitmap.width, height: bitmap.height };
  } catch {
    return null;
  } finally {
    bitmap?.close();
  }
}

async function dimensionsFromImageElement(file: File): Promise<ProfilePhotoDimensions | null> {
  if (
    typeof Image === 'undefined' ||
    typeof URL === 'undefined' ||
    typeof URL.createObjectURL !== 'function'
  ) {
    return null;
  }

  const objectUrl = URL.createObjectURL(file);
  try {
    return await new Promise<ProfilePhotoDimensions | null>((resolve) => {
      const image = new Image();
      image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
      image.onerror = () => resolve(null);
      image.src = objectUrl;
    });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

/**
 * Browser preflight for the exact candidate that will be uploaded.
 *
 * JPEG/PNG/WebP must decode locally; corrupt files are rejected before upload.
 * HEIC/HEIF remain part of the canonical iOS-friendly contract, but browser
 * support is inconsistent. If the browser cannot decode those formats, this
 * returns `null` and the server performs the authoritative dimension/pixel and
 * person/moderation validation after upload.
 */
export async function validateProfilePhotoForUpload(
  file: File
): Promise<ProfilePhotoDimensions | null> {
  assertProfilePhotoFileEnvelope(file);

  const bitmapDimensions = await dimensionsFromImageBitmap(file);
  if (bitmapDimensions) {
    assertProfilePhotoDimensions(bitmapDimensions);
    return bitmapDimensions;
  }

  if (SERVER_FALLBACK_MIME_TYPES.has(file.type)) return null;

  const elementDimensions = HTML_IMAGE_DECODABLE_MIME_TYPES.has(file.type)
    ? await dimensionsFromImageElement(file)
    : null;
  if (!elementDimensions) {
    throw new Error('Could not decode that profile photo. Choose a valid JPEG, PNG, or WebP file.');
  }
  assertProfilePhotoDimensions(elementDimensions);
  return elementDimensions;
}
