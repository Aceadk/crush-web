/**
 * Profile capability parity (Phase 9 Step 19).
 *
 * Locks the canonical profile/media limits to the values documented in
 * docs/contracts/profile_settings_capability_matrix_2026-06-07.md (mobile +
 * backend authority) and guards that the web profile surfaces consume the shared
 * constants instead of re-hardcoding limits (which is how web drifted to a 6-photo
 * cap while the backend/mobile allow 9).
 */

import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  MAX_PROFILE_PHOTOS,
  MAX_INTERESTS,
  MAX_PROMPTS,
  PROFILE_PHOTO_MAX_BYTES,
  PROFILE_PHOTO_MIN_DIMENSION_PX,
  PROFILE_PHOTO_MAX_DIMENSION_PX,
  PROFILE_PHOTO_MAX_PIXELS,
  PROFILE_PHOTO_ALLOWED_MIME_TYPES,
  PROFILE_HEIGHT_OPTIONS,
  formatProfileHeight,
  VERIFICATION_IS_SERVER_OWNED,
} from '@crush/core';

const here = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(here, '../../..'); // apps/web
const coreRoot = path.resolve(appRoot, '../../packages/core/src');

function read(rel: string): string {
  return fs.readFileSync(path.join(appRoot, rel), 'utf8');
}

function readCore(rel: string): string {
  return fs.readFileSync(path.join(coreRoot, rel), 'utf8');
}

describe('canonical profile capability values', () => {
  it('matches the documented mobile/backend limits', () => {
    expect(MAX_PROFILE_PHOTOS).toBe(9); // mobile ProfileMediaLimits.maxPhotos + rules ≤ 9
    expect(MAX_INTERESTS).toBe(5); // schema-v2 onboarding/backend require 3–5 stable IDs
    expect(MAX_PROMPTS).toBe(3);
    expect(PROFILE_PHOTO_MAX_BYTES).toBe(10 * 1024 * 1024);
    expect(PROFILE_PHOTO_MIN_DIMENSION_PX).toBe(320);
    expect(PROFILE_PHOTO_MAX_DIMENSION_PX).toBe(4096);
    expect(PROFILE_PHOTO_MAX_PIXELS).toBe(16_777_216);
    expect([...PROFILE_PHOTO_ALLOWED_MIME_TYPES]).toEqual([
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/heic',
      'image/heif',
    ]);
    expect(PROFILE_HEIGHT_OPTIONS).toHaveLength(151);
    expect(PROFILE_HEIGHT_OPTIONS[0]?.value).toBe(100);
    expect(PROFILE_HEIGHT_OPTIONS.at(-1)?.value).toBe(250);
    expect(formatProfileHeight(178)).toBe(`5'10" (178 cm)`);
  });

  it('treats verification as server-owned (display-only on web)', () => {
    expect(VERIFICATION_IS_SERVER_OWNED).toBe(true);
  });
});

describe('web profile surfaces consume the shared constants', () => {
  it('onboarding + edit form pass MAX_PROFILE_PHOTOS (no hardcoded 6)', () => {
    const onboarding = read('src/app/onboarding/onboarding-flow.tsx');
    const editForm = read('src/app/(app)/profile/edit/profile-edit-form.tsx');
    for (const [name, src] of [
      ['onboarding', onboarding],
      ['edit form', editForm],
    ] as const) {
      expect(src, `${name} should reference MAX_PROFILE_PHOTOS`).toContain(
        'maxPhotos={MAX_PROFILE_PHOTOS}'
      );
      expect(src, `${name} should not hardcode maxPhotos={6}`).not.toContain('maxPhotos={6}');
    }
  });

  it('PhotoGridReorder defaults to the canonical max', () => {
    const grid = read('src/components/profile/photo-grid-reorder.tsx');
    expect(grid).toContain('maxPhotos = MAX_PROFILE_PHOTOS');
    expect(grid).toContain('PROFILE_PHOTO_MIN_DIMENSION_PX');
    expect(grid).toContain('PROFILE_PHOTO_MAX_DIMENSION_PX');
    expect(grid).toContain('image/heic,image/heif');
    expect(grid).toContain("isMain ? 'col-span-2 aspect-[4/5]' : ''");
    expect(grid).not.toContain("isMain && 'aspect-auto h-full'");
  });

  it('edit form uses the bounded shared height selector', () => {
    const editForm = read('src/app/(app)/profile/edit/profile-edit-form.tsx');
    expect(editForm).toContain('PROFILE_HEIGHT_OPTIONS.map');
    expect(editForm).toContain('Select your height');
    expect(editForm).not.toContain('placeholder="e.g. 5\'10');
  });

  it('runs shared async dimension preflight before a staging upload', () => {
    const storage = readCore('services/storage.ts');
    expect(storage).toContain('await validateProfilePhotoForUpload(file)');
  });

  it('edit form caps interests + prompts via the shared constants', () => {
    const editForm = read('src/app/(app)/profile/edit/profile-edit-form.tsx');
    expect(editForm).toContain('prev.interests.length < MAX_INTERESTS');
    expect(editForm).toContain('formData.prompts.length >= MAX_PROMPTS');
  });
});
