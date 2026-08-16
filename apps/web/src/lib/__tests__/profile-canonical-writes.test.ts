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
const PROTECTED_ROOT_KEYS = [
  'username',
  'usernameLower',
  'lastUsernameChangeAt',
  'plan',
  'isIdVerified',
  'idVerified',
  'stripeCustomerId',
  'stripeSubscriptionId',
  'isEmailVerified',
  'emailVerified',
  'emailVerifiedViaOtp',
  'isPhoneVerified',
  'phoneVerified',
  'createdAt',
  'kycVerificationStatus',
  'verificationStatus',
  'boost',
  'subscriptionExpiresAt',
  'subscriptionLifecycle',
  'subscriptionTier',
  'isPremium',
  'premiumPlan',
  'safetyFlags',
  'photos',
  'profilePhotoUrl',
  'onboarding',
  'onboardingVersion',
  'onboardingComplete',
  'profileComplete',
  'requiredProfileComplete',
  'onboardingCompletedAt',
  'hasAcceptedTerms',
  'termsAcceptedAt',
  'privacyAcceptedAt',
  'location',
  'latitude',
  'longitude',
] as const;
const PROTECTED_PROFILE_KEYS = [
  'birthDate',
  'dateOfBirth',
  'age',
  'dobLastChangedAt',
  'lastDobChangeAt',
  'latitude',
  'longitude',
  'locationConfirmedAt',
  'approvedPhotoCount',
  'approvedPhotoUrls',
  'photoApprovalStatus',
  'photoModerationStatus',
  'photoUrls',
  'primaryPhotoIndex',
  'photos',
  'profilePhotoUrl',
  'isVerified',
] as const;

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
      gender: 'female',
      bio: 'Coffee and trails.',
      sexualOrientation: null,
      interests: ['Hiking', 'Coffee'],
    });
  });

  it('retains client-owned identity fields without manufacturing server state', () => {
    expect(created.displayName).toBe('Alice Web');
    expect(created.email).toBe('alice@example.com');
    expect(created.themePreference).toBe('system');
    for (const key of PROTECTED_ROOT_KEYS) expect(created[key]).toBeUndefined();
    const profile = created.profile as Record<string, unknown>;
    for (const key of PROTECTED_PROFILE_KEYS) expect(profile[key]).toBeUndefined();
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
    expect(updates['profile.gender']).toBe('female');
    expect(updates['profile.sexualOrientation']).toBeNull();
    expect(updates['profile.interests']).toEqual(['Hiking', 'Coffee']);
    expect(updates['profile.birthDate']).toBeUndefined();
    expect(updates['profile.isVerified']).toBeUndefined();
    // No flat counterparts.
    expect(updates.bio).toBeUndefined();
    expect(updates.age).toBeUndefined();
    expect(updates.gender).toBeUndefined();
    expect(updates.interests).toBeUndefined();
    expect(updates.isVerified).toBeUndefined();
  });

  it('keeps allowed display-name writes and omits callable-owned mutations', () => {
    expect(updates.displayName).toBe('Alice Web');
    expect(updates['profile.name']).toBe('Alice Web');
    for (const key of PROTECTED_ROOT_KEYS) expect(updates[key]).toBeUndefined();
    for (const key of PROTECTED_PROFILE_KEYS) {
      expect(updates[`profile.${key}`]).toBeUndefined();
    }
  });

  it('strips nested undefined values (updateDoc rejects them)', () => {
    // Profile-edit sends unset lifestyle selects as literal undefined; the
    // web Firestore SDK throws on any nested undefined, which failed the
    // whole profile save for users with an incomplete lifestyle section.
    const withUnsetLifestyle = buildUserProfileUpdateData({
      lifestyle: {
        height: 170,
        education: 'BSc',
        drinking: undefined,
        smoking: undefined,
        workout: undefined,
      },
    });

    const lifestyle = withUnsetLifestyle.lifestyle as Record<string, unknown>;
    expect(lifestyle).toEqual({ height: 170, education: 'BSc' });
    expect(Object.values(withUnsetLifestyle)).not.toContain(undefined);
    expect(withUnsetLifestyle['profile.heightCm']).toBe(170);
    expect(withUnsetLifestyle['profile.drinking']).toBeUndefined();
  });

  it('reads canonical mobile heightCm and normalizes legacy web height strings', () => {
    expect(
      mapUserDocumentToUserProfile('mobile-height', {
        profile: { heightCm: 178 },
        lifestyle: { height: '5\'8"', education: 'BSc' },
      }).lifestyle
    ).toEqual({ height: 178, education: 'BSc' });

    expect(
      mapUserDocumentToUserProfile('legacy-height', {
        lifestyle: { height: '5\'10"' },
      }).lifestyle?.height
    ).toBe(178);
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
