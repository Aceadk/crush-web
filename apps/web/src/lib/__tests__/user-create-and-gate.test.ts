import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
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

  it('contains only Rules-approved client defaults and no manufactured trust fields', () => {
    const payload = buildUserProfileCreateData(
      { id: 'u1', email: 'a@b.com', displayName: 'Alex' },
      new Date().toISOString()
    ) as Record<string, unknown>;
    const profile = payload.profile as Record<string, unknown>;

    expect(payload.plan).toBeUndefined();
    expect(payload.isIdVerified).toBeUndefined();
    expect(payload.createdAt).toBeUndefined();
    expect(payload.hasAcceptedTerms).toBeUndefined();
    expect(payload.onboardingComplete).toBeUndefined();
    expect(payload.profileComplete).toBeUndefined();
    expect(payload.isEmailVerified).toBeUndefined();
    expect(payload.isPhoneVerified).toBeUndefined();
    expect(payload.themePreference).toBe('system');
    expect(payload.phoneNumber).toBe('');
    expect(payload.username).toBeUndefined();
    expect(payload.usernameLower).toBeUndefined();
    expect(payload.lastUsernameChangeAt).toBeUndefined();
    expect(profile.gender).toBe('');
    expect(profile.age).toBeUndefined();
    expect(profile.birthDate).toBeUndefined();
    expect(profile.photoUrls).toBeUndefined();
    expect(profile.isVerified).toBeUndefined();
    expect(profile.lastName).toBe('');
    expect(profile.videoUrls).toEqual([]);
    expect(profile.languages).toEqual([]);
  });
});

describe('authenticated user bootstrap', () => {
  it('uses the trusted resolver instead of a direct client create', () => {
    const coreRoot = path.resolve(process.cwd(), '../../packages/core/src');
    const authStore = fs.readFileSync(path.join(coreRoot, 'stores/auth.ts'), 'utf8');
    const userService = fs.readFileSync(path.join(coreRoot, 'services/user.ts'), 'utf8');

    expect(authStore).not.toContain('userService.createUserProfile');
    expect(authStore).toContain('userService.bootstrapUserProfile');
    expect(userService).toContain('callables.resolveOnboardingState({})');
    expect(userService).not.toContain('await setDoc(doc(db, USERS_COLLECTION, userId)');
  });

  it('does not memoize mutable Firebase verification facts by User object identity', () => {
    const webRoot = path.resolve(process.cwd());
    const protectedLayout = fs.readFileSync(path.join(webRoot, 'src/app/(app)/layout.tsx'), 'utf8');
    const onboardingFlow = fs.readFileSync(
      path.join(webRoot, 'src/app/onboarding/onboarding-flow.tsx'),
      'utf8'
    );
    const staleIdentityMemo = 'useMemo(() => authVerificationFactsFromUser(user), [user])';

    expect(protectedLayout).not.toContain(staleIdentityMemo);
    expect(onboardingFlow).not.toContain(staleIdentityMemo);
    expect(protectedLayout).toContain('authVerificationFactsFromUser(user)');
    expect(onboardingFlow).toContain('authVerificationFactsFromUser(useAuthStore.getState().user)');
  });
});

describe('onboarding compatibility marker (routing uses resolver)', () => {
  const completeDoc = {
    hasAcceptedTerms: true,
    profile: {
      name: 'Alex',
      age: 25,
      gender: 'male',
      photoUrls: ['https://x/a.jpg'],
    },
  };

  it('does not infer completion from a partial legacy profile', () => {
    const profile = mapUserDocumentToUserProfile('u1', completeDoc);
    expect(profile.onboardingComplete).toBe(false);
  });

  it('uses only a version-2 completion marker and ignores the trigger-managed root boolean', () => {
    const profile = mapUserDocumentToUserProfile('u1', {
      ...completeDoc,
      onboardingComplete: false,
      profileComplete: false,
      onboarding: {
        schemaVersion: 2,
        completedAt: '2026-07-15T12:00:00.000Z',
      },
      profile: {
        ...completeDoc.profile,
        preferences: { incognitoMode: true },
      },
    });
    expect(profile.onboardingComplete).toBe(true);
  });

  it('does not treat legacy skip flags as completion', () => {
    const profile = mapUserDocumentToUserProfile('u1', {
      hasAcceptedTerms: true,
      hasSkippedBasicInfo: true,
      hasSkippedProfileSetup: true,
      profile: {},
    });
    expect(profile.onboardingComplete).toBe(false);
  });

  it('requires both schema version and completion timestamp', () => {
    expect(
      deriveOnboardingGate({
        schemaVersion: 2,
      })
    ).toBe(false);
    expect(
      deriveOnboardingGate({
        schemaVersion: 2,
        completedAt: '2026-07-15T12:00:00.000Z',
      })
    ).toBe(true);
  });
});
