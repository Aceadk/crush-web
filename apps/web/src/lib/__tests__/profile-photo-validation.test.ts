import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  PROFILE_PHOTO_MAX_BYTES,
  assertProfilePhotoDimensions,
  assertProfilePhotoFileEnvelope,
  validateProfilePhotoForUpload,
} from '@crush/core';

function photoFile(type = 'image/jpeg'): File {
  return new File(['profile-photo'], 'profile-photo', { type });
}

describe('profile photo browser preflight', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('enforces the canonical byte and MIME envelope while preserving HEIC/HEIF', () => {
    expect(() =>
      assertProfilePhotoFileEnvelope({ size: PROFILE_PHOTO_MAX_BYTES, type: 'image/heic' })
    ).not.toThrow();
    expect(() =>
      assertProfilePhotoFileEnvelope({ size: PROFILE_PHOTO_MAX_BYTES, type: 'image/heif' })
    ).not.toThrow();
    expect(() =>
      assertProfilePhotoFileEnvelope({
        size: PROFILE_PHOTO_MAX_BYTES + 1,
        type: 'image/jpeg',
      })
    ).toThrow(/10 MB/);
    expect(() => assertProfilePhotoFileEnvelope({ size: 1, type: 'image/gif' })).toThrow(
      /JPEG, PNG, WebP, HEIC, or HEIF/
    );
  });

  it('accepts the exact dimension boundaries and rejects values outside them', () => {
    expect(() => assertProfilePhotoDimensions({ width: 320, height: 320 })).not.toThrow();
    expect(() => assertProfilePhotoDimensions({ width: 4096, height: 4096 })).not.toThrow();
    expect(() => assertProfilePhotoDimensions({ width: 319, height: 320 })).toThrow(/at least/);
    expect(() => assertProfilePhotoDimensions({ width: 4097, height: 320 })).toThrow(/no larger/);
  });

  it('uses createImageBitmap dimensions and closes the decoded bitmap', async () => {
    const close = vi.fn();
    vi.stubGlobal(
      'createImageBitmap',
      vi.fn().mockResolvedValue({ width: 1280, height: 960, close })
    );

    await expect(validateProfilePhotoForUpload(photoFile())).resolves.toEqual({
      width: 1280,
      height: 960,
    });
    expect(close).toHaveBeenCalledTimes(1);
  });

  it('rejects a standard image whose decoded dimensions are invalid', async () => {
    const close = vi.fn();
    vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue({ width: 0, height: 0, close }));

    await expect(validateProfilePhotoForUpload(photoFile('image/png'))).rejects.toThrow(
      /valid dimensions/
    );
    expect(close).toHaveBeenCalledTimes(1);
  });

  it('defers HEIC dimensions to the authoritative server when the browser cannot decode them', async () => {
    vi.stubGlobal('createImageBitmap', vi.fn().mockRejectedValue(new Error('unsupported codec')));

    await expect(validateProfilePhotoForUpload(photoFile('image/heic'))).resolves.toBeNull();
  });
});
