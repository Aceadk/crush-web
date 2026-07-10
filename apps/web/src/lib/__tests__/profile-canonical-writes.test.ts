/**
 * Canonical profile-write tests (P0.3 / Phase 3 Step 5).
 *
 * Verifies the web profile create/update builders write demographic data ONLY
 * under profile.* and never emit the legacy flat root keys that the Firestore
 * rules reject. Driven by the shared canonical user-document fixture.
 */

import { describe, it, expect } from 'vitest';
import {
  buildUserProfileCreateData,
  buildUserProfileUpdateData,
  mapUserDocumentToUserProfile,
} from '@crush/core/services/user_document';
import type { UserProfile } from '@crush/core/types/user';
import fixture from '@/__fixtures__/canonical_user_document.json';

const REJECTED_FLAT_ROOT_KEYS = fixture.rejectedFlatRootKeys as string[];

function rootKeysIn(doc: Record<string, unknown>): string[] {
  return Object.keys(doc).filter((k) => !k.includes('.'));
}

const fullProfileInput: Partial<UserProfile> = {
  id: 'web-user',
  email: 'alice@example.com',
  displayName: 'Alice Web',
  birthDate: '1998-05-10',
  gender: 'female',
  bio: 'Coffee and trails.',
  sexualOrientation: 'straight',
  interestedIn: ['male'],
  interests: ['Hiking', 'Coffee'],
  photos: ['https://img.example.com/alice.jpg'],
  isVerified: true,
  location: { city: 'Austin', country: 'US', latitude: 30.2672, longitude: -97.7431 },
};

describe('mapUserDocumentToUserProfile — Firestore timestamps', () => {
  it('calls timestamp-like toDate methods with their instance context', () => {
    const timestampLike = {
      millis: Date.parse('2026-07-04T00:00:00.000Z'),
      toDate() {
        return new Date(this.millis);
      },
    };

    const profile = mapUserDocumentToUserProfile('user-timestamp', {
      displayName: 'Timestamp User',
      createdAt: timestampLike,
      updatedAt: timestampLike,
    });

    expect(profile.createdAt).toBe('2026-07-04T00:00:00.000Z');
    expect(profile.updatedAt).toBe('2026-07-04T00:00:00.000Z');
  });
});

describe('buildUserProfileCreateData — canonical only', () => {
  const created = buildUserProfileCreateData(fullProfileInput, '2026-06-01T00:00:00.000Z');

  it('emits no legacy flat root keys', () => {
    const offenders = rootKeysIn(created).filter((k) => REJECTED_FLAT_ROOT_KEYS.includes(k));
    expect(offenders).toEqual([]);
  });

  it('writes demographic data under profile.*', () => {
    expect(created.profile).toMatchObject({
      name: 'Alice Web',
      birthDate: '1998-05-10',
      gender: 'female',
      bio: 'Coffee and trails.',
      sexualOrientation: 'straight',
      interests: ['Hiking', 'Coffee'],
      photoUrls: ['https://img.example.com/alice.jpg'],
      primaryPhotoIndex: 0,
    });
  });

  it('retains allowed root identity/lifecycle fields', () => {
    expect(created.displayName).toBe('Alice Web');
    expect(created.email).toBe('alice@example.com');
    expect(created.photos).toEqual(['https://img.example.com/alice.jpg']);
    expect(created.onboardingComplete).toBe(true);
    expect(created.createdAt).toBe('2026-06-01T00:00:00.000Z');
  });
});

describe('buildUserProfileUpdateData — canonical only', () => {
  const updates = buildUserProfileUpdateData(fullProfileInput);

  it('emits no legacy flat root keys', () => {
    const offenders = rootKeysIn(updates).filter((k) => REJECTED_FLAT_ROOT_KEYS.includes(k));
    expect(offenders).toEqual([]);
  });

  it('routes demographic mutations to profile.* paths', () => {
    expect(updates['profile.bio']).toBe('Coffee and trails.');
    expect(updates['profile.birthDate']).toBe('1998-05-10');
    expect(updates['profile.gender']).toBe('female');
    expect(updates['profile.sexualOrientation']).toBe('straight');
    expect(updates['profile.interests']).toEqual(['Hiking', 'Coffee']);
    expect(updates['profile.isVerified']).toBe(true);
    // No flat counterparts.
    expect(updates.bio).toBeUndefined();
    expect(updates.age).toBeUndefined();
    expect(updates.gender).toBeUndefined();
    expect(updates.interests).toBeUndefined();
    expect(updates.isVerified).toBeUndefined();
  });

  it('keeps allowed root mirrors (displayName, photos, location)', () => {
    expect(updates.displayName).toBe('Alice Web');
    expect(updates.photos).toEqual(['https://img.example.com/alice.jpg']);
    expect(updates.profilePhotoUrl).toBe('https://img.example.com/alice.jpg');
    expect(updates['profile.primaryPhotoIndex']).toBe(0);
    expect(updates.location).toBeDefined();
    expect(updates['profile.name']).toBe('Alice Web');
  });

  it('strips nested undefined values (updateDoc rejects them)', () => {
    // Profile-edit sends unset lifestyle selects as literal undefined; the
    // web Firestore SDK throws on any nested undefined, which failed the
    // whole profile save for users with an incomplete lifestyle section.
    const withUnsetLifestyle = buildUserProfileUpdateData({
      lifestyle: {
        height: '170',
        education: 'BSc',
        drinking: undefined,
        smoking: undefined,
        workout: undefined,
      },
    });

    const lifestyle = withUnsetLifestyle.lifestyle as Record<string, unknown>;
    expect(lifestyle).toEqual({ height: '170', education: 'BSc' });
    expect(Object.values(withUnsetLifestyle)).not.toContain(undefined);
    expect(withUnsetLifestyle['profile.heightCm']).toBe('170');
    expect(withUnsetLifestyle['profile.drinking']).toBeUndefined();
  });
});

describe('fixture integrity', () => {
  it('rejected list matches the Firestore rules legacyFlatProfileKeys', () => {
    // Spot-check a representative subset is present.
    for (const key of ['age', 'gender', 'bio', 'interests', 'birthDate', 'isVerified']) {
      expect(REJECTED_FLAT_ROOT_KEYS).toContain(key);
    }
  });
});
