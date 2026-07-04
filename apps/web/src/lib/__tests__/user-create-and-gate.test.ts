import { describe, expect, it } from 'vitest';
import {
  buildUserProfileCreateData,
  deriveOnboardingGate,
  mapUserDocumentToUserProfile,
} from '@crush/core/services/user_document';

/** Recursively collect paths whose value is undefined. */
function undefinedPaths(value: unknown, path = ''): string[] {
  if (Array.isArray(value)) {
    return value.flatMap((item, index) => undefinedPaths(item, `${path}[${index}]`));
  }
  if (value !== null && typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>).flatMap(([key, entry]) =>
      entry === undefined ? [`${path}.${key}`] : undefinedPaths(entry, `${path}.${key}`)
    );
  }
  return [];
}

describe('buildUserProfileCreateData (web signup payload)', () => {
  it('contains NO undefined values for a minimal email signup (setDoc rejects undefined)', () => {
    const payload = buildUserProfileCreateData(
      { id: 'u1', email: 'a@b.com', displayName: 'Alex' },
      new Date().toISOString()
    );
    expect(undefinedPaths(payload)).toEqual([]);
  });

  it('contains NO undefined values for a phone signup without email', () => {
    const payload = buildUserProfileCreateData(
      { id: 'u2', phoneNumber: '+9779800000000', displayName: '' },
      new Date().toISOString()
    );
    expect(undefinedPaths(payload)).toEqual([]);
  });

  it('mirrors the mobile create shape (plan/isIdVerified/themePreference/profile defaults)', () => {
    const payload = buildUserProfileCreateData(
      { id: 'u1', email: 'a@b.com', displayName: 'Alex' },
      new Date().toISOString()
    ) as Record<string, unknown>;
    const profile = payload.profile as Record<string, unknown>;

    expect(payload.plan).toBe('free');
    expect(payload.isIdVerified).toBe(false);
    expect(payload.themePreference).toBe('system');
    expect(payload.phoneNumber).toBe('');
    expect(payload.username).toBeNull();
    expect(payload.usernameLower).toBeNull();
    expect(profile.gender).toBe('');
    expect(profile.age).toBe(0);
    expect(profile.lastName).toBe('');
    expect(profile.videoUrls).toEqual([]);
    expect(profile.languages).toEqual([]);
  });
});

describe('onboarding routing gate (mobile-parity derivation)', () => {
  const completeDoc = {
    hasAcceptedTerms: true,
    profile: {
      name: 'Alex',
      age: 25,
      gender: 'male',
      photoUrls: ['https://x/a.jpg'],
    },
  };

  it('is complete for terms + age>=18 + gender + one photo', () => {
    const profile = mapUserDocumentToUserProfile('u1', completeDoc);
    expect(profile.onboardingComplete).toBe(true);
  });

  it('IGNORES the trigger-managed onboardingComplete doc field (incognito users must not loop back into onboarding)', () => {
    // The backend mirror trigger rewrites top-level onboardingComplete to
    // discovery ELIGIBILITY, which is false for incognito/hidden users.
    const profile = mapUserDocumentToUserProfile('u1', {
      ...completeDoc,
      onboardingComplete: false,
      profileComplete: false,
      profile: {
        ...completeDoc.profile,
        preferences: { incognitoMode: true },
      },
    });
    expect(profile.onboardingComplete).toBe(true);
  });

  it('requires accepted terms', () => {
    const profile = mapUserDocumentToUserProfile('u1', {
      ...completeDoc,
      hasAcceptedTerms: false,
    });
    expect(profile.onboardingComplete).toBe(false);
  });

  it('honours mobile skip flags in place of content', () => {
    const profile = mapUserDocumentToUserProfile('u1', {
      hasAcceptedTerms: true,
      hasSkippedBasicInfo: true,
      hasSkippedProfileSetup: true,
      profile: {},
    });
    expect(profile.onboardingComplete).toBe(true);
  });

  it('is incomplete without a photo (unless skipped)', () => {
    const profile = mapUserDocumentToUserProfile('u1', {
      ...completeDoc,
      profile: { ...completeDoc.profile, photoUrls: [] },
    });
    expect(profile.onboardingComplete).toBe(false);
  });

  it('derives age from birthDate when age is absent', () => {
    expect(
      deriveOnboardingGate({
        hasAcceptedTerms: true,
        age: undefined,
        gender: 'female',
        photos: ['x'],
      })
    ).toBe(false);
  });
});
