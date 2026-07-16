import { beforeEach, describe, expect, it } from 'vitest';
import {
  ONBOARDING_STEP_REGISTRY,
  WEB_ONBOARDING_STEP_KEYS,
  buildOnboardingStepQuery,
  evaluateOnboardingReadiness,
  hydrateOnboardingDraft,
  isAccountVerified,
  loadOnboardingDraft,
  normalizeOnboardingResolution,
  onboardingDraftStorageKey,
  resolveWebOnboardingStep,
  saveOnboardingDraft,
  type AuthVerificationFacts,
  type CanonicalOnboardingSnapshot,
} from '@crush/core';

const emailVerified: AuthVerificationFacts = {
  uid: 'email-user',
  hasEmail: true,
  emailVerified: true,
  providerIds: ['password'],
};

function completeSnapshot(
  patch: Partial<CanonicalOnboardingSnapshot> = {}
): CanonicalOnboardingSnapshot {
  return {
    schemaVersion: 2,
    uid: 'email-user',
    hasAcceptedTerms: true,
    username: 'ace_2026',
    firstName: 'Ace',
    lastName: '',
    birthDate: '1995-07-15',
    gender: 'non_binary',
    sexualOrientation: 'bisexual',
    interestedIn: ['male', 'female', 'non_binary', 'other'],
    photos: [
      {
        mediaId: 'media-1',
        storagePath: 'profile-media/email-user/media-1.jpg',
        downloadUrl: 'https://example.test/one.jpg',
        status: 'approved',
        isPrimary: true,
      },
    ],
    bio: 'Genuine',
    location: {
      latitude: 27.7172,
      longitude: 85.324,
      accuracyMeters: 12,
      capturedAt: '2026-07-15T10:00:00.000Z',
      confirmedAt: '2026-07-15T10:00:01.000Z',
      city: 'Kathmandu',
      country: 'Nepal',
    },
    workEducation: {},
    interests: ['travel', 'music', 'reading'],
    favourites: {},
    completedSteps: [],
    skippedSteps: ['workEducation', 'favourites'],
    ...patch,
  };
}

describe('onboarding V2 registry and history routing', () => {
  it('keeps the cross-platform step codes in one stable order', () => {
    expect(ONBOARDING_STEP_REGISTRY.map((step) => step.key)).toEqual([
      'emailVerification',
      'phoneVerification',
      'terms',
      'username',
      'basicInfo',
      'idVerification',
      'discoveryPreferences',
      'photos',
      'aboutMe',
      'location',
      'workEducation',
      'interests',
      'favourites',
      'ready',
      'discovery',
    ]);
    expect(WEB_ONBOARDING_STEP_KEYS).not.toContain('idVerification');
    expect(WEB_ONBOARDING_STEP_KEYS).not.toContain('emailVerification');
    expect(WEB_ONBOARDING_STEP_KEYS).not.toContain('phoneVerification');
  });

  it('replays valid step query values and preserves other query parameters', () => {
    expect(resolveWebOnboardingStep('aboutMe', 'terms')).toBe('aboutMe');
    expect(resolveWebOnboardingStep('made-up', 'interests')).toBe('interests');
    const query = new URLSearchParams(
      buildOnboardingStepQuery('redirect=%2Fmatches&step=terms', 'location')
    );
    expect(query.get('step')).toBe('location');
    expect(query.get('redirect')).toBe('/matches');
  });
});

describe('provider-aware verification', () => {
  it('accepts a verified password/Google email and a phone-only account', () => {
    expect(isAccountVerified(emailVerified)).toBe(true);
    expect(
      isAccountVerified({
        hasEmail: true,
        emailVerified: true,
        providerIds: ['google.com'],
      })
    ).toBe(true);
    expect(
      isAccountVerified({
        hasEmail: false,
        emailVerified: false,
        hasPhoneNumber: true,
        providerIds: ['phone'],
      })
    ).toBe(true);
    expect(
      isAccountVerified({
        hasEmail: false,
        emailVerified: false,
        hasPhoneNumber: false,
        providerIds: ['phone'],
      })
    ).toBe(false);
  });

  it('does not let a linked phone provider hide an unverified email claim', () => {
    const linked = {
      hasEmail: true,
      emailVerified: false,
      providerIds: ['password', 'phone'],
    };
    expect(isAccountVerified(linked)).toBe(false);
    expect(evaluateOnboardingReadiness(completeSnapshot(), linked).firstIncompleteStep).toBe(
      'emailVerification'
    );
  });
});

describe('onboarding readiness', () => {
  it('accepts a seven-character bio and rejects six', () => {
    expect(
      evaluateOnboardingReadiness(completeSnapshot({ bio: '1234567' }), emailVerified)
        .canStartMatching
    ).toBe(true);
    const result = evaluateOnboardingReadiness(completeSnapshot({ bio: '123456' }), emailVerified);
    expect(result.canStartMatching).toBe(false);
    expect(result.missingRequirements.map((item) => item.code)).toContain('bio');
  });

  it('requires three to five stable interests', () => {
    expect(
      evaluateOnboardingReadiness(completeSnapshot({ interests: ['a', 'b', 'c'] }), emailVerified)
        .canStartMatching
    ).toBe(true);
    expect(
      evaluateOnboardingReadiness(
        completeSnapshot({ interests: ['a', 'b', 'c', 'd', 'e'] }),
        emailVerified
      ).canStartMatching
    ).toBe(true);
    expect(
      evaluateOnboardingReadiness(completeSnapshot({ interests: ['a', 'b'] }), emailVerified)
        .firstIncompleteStep
    ).toBe('interests');
    expect(
      evaluateOnboardingReadiness(
        completeSnapshot({ interests: ['a', 'b', 'c', 'd', 'e', 'f'] }),
        emailVerified
      ).firstIncompleteStep
    ).toBe('interests');
  });

  it('requires an approved media record and a confirmed coordinate capture', () => {
    const result = evaluateOnboardingReadiness(
      completeSnapshot({
        photos: [{ downloadUrl: 'https://example.test/legacy.jpg', status: 'unknown' }],
        location: { latitude: 27.7, longitude: 85.3, city: 'Kathmandu', country: 'Nepal' },
      }),
      emailVerified
    );
    expect(result.missingRequirements.map((item) => item.code)).toEqual(
      expect.arrayContaining(['approved_photo', 'confirmed_location'])
    );
  });

  it('accepts the privacy-safe confirmed location returned by the resolver', () => {
    const result = evaluateOnboardingReadiness(
      completeSnapshot({
        location: {
          confirmedAt: '2026-07-15T10:00:01.000Z',
          city: 'Kathmandu',
          country: 'Nepal',
        },
      }),
      emailVerified
    );
    expect(result.missingRequirements.map((item) => item.code)).not.toContain('confirmed_location');
  });

  it('only keeps orientation for non-binary profiles', () => {
    const hydrated = hydrateOnboardingDraft(
      completeSnapshot({ gender: 'female', sexualOrientation: 'straight' }),
      completeSnapshot({ gender: 'female', sexualOrientation: 'bisexual' })
    );
    expect(hydrated.sexualOrientation).toBeNull();
  });

  it('offers optional steps in order, then ready, and never re-asks a completed user', () => {
    const optional = completeSnapshot({ skippedSteps: [], completedSteps: [] });
    expect(evaluateOnboardingReadiness(optional, emailVerified).firstIncompleteStep).toBe(
      'workEducation'
    );
    expect(
      evaluateOnboardingReadiness({ ...optional, skippedSteps: ['workEducation'] }, emailVerified)
        .firstIncompleteStep
    ).toBe('favourites');
    expect(
      evaluateOnboardingReadiness(
        { ...optional, skippedSteps: ['workEducation', 'favourites'] },
        emailVerified
      ).firstIncompleteStep
    ).toBe('ready');
    expect(
      evaluateOnboardingReadiness(
        {
          ...optional,
          skippedSteps: ['workEducation', 'favourites'],
          completedAt: '2026-07-15T12:00:00Z',
        },
        emailVerified
      ).firstIncompleteStep
    ).toBe('discovery');
  });
});

describe('server hydration and UID-scoped resume', () => {
  beforeEach(() => window.localStorage.clear());

  it('never overwrites non-empty server values with a stale local draft', () => {
    const server = completeSnapshot({
      firstName: 'Server Name',
      bio: '',
      interests: ['server_a', 'server_b', 'server_c'],
    });
    const local = completeSnapshot({
      firstName: 'Stale Name',
      bio: 'Local bio',
      interests: ['local_a', 'local_b', 'local_c'],
    });
    const hydrated = hydrateOnboardingDraft(server, local);
    expect(hydrated.firstName).toBe('Server Name');
    expect(hydrated.interests).toEqual(['server_a', 'server_b', 'server_c']);
    expect(hydrated.bio).toBe('Local bio');
  });

  it('normalizes canonical wire keys, fractional metrics, and privacy-safe location snapshots', () => {
    const resolution = normalizeOnboardingResolution(
      {
        schemaVersion: 2,
        snapshot: {
          ...completeSnapshot(),
          location: {
            confirmedAt: '2026-07-15T10:00:01.000Z',
            city: 'Kathmandu',
            country: 'Nepal',
          },
          completedSteps: ['emailVerification', 'idVerification'],
        },
        readiness: {
          canStartMatching: false,
          requiredCompletion: 0.7,
          optionalCompletion: 0.4,
          missingRequirements: [
            {
              code: 'approved_photo_required',
              stepKey: 'photos',
              message: 'Add a photo.',
            },
          ],
          firstIncompleteStep: 'photos',
        },
        destination: 'photos',
      },
      emailVerified
    );

    expect(resolution.snapshot.location).toMatchObject({
      confirmedAt: '2026-07-15T10:00:01.000Z',
      city: 'Kathmandu',
    });
    expect(resolution.snapshot.completedSteps).toEqual(['emailVerification', 'idVerification']);
    expect(resolution.readiness.requiredCompletion.percent).toBe(70);
    expect(resolution.readiness.optionalCompletion.percent).toBe(40);
    expect(resolution.readiness.firstIncompleteStep).toBe('photos');
  });

  it('repairs a stale false verification mirror from fresh Firebase Auth facts', () => {
    const resolution = normalizeOnboardingResolution(
      {
        schemaVersion: 2,
        snapshot: completeSnapshot({ emailVerified: false }),
        readiness: {
          canStartMatching: false,
          requiredCompletion: 0.875,
          optionalCompletion: 1,
          missingRequirements: [
            {
              code: 'auth_verification_required',
              stepKey: 'emailVerification',
              message: 'Verify your account to continue.',
            },
          ],
          firstIncompleteStep: 'emailVerification',
        },
        destination: 'emailVerification',
      },
      emailVerified
    );

    expect(resolution.snapshot.emailVerified).toBe(true);
    expect(resolution.readiness.missingRequirements).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ code: 'auth_verification_required' })])
    );
    expect(resolution.readiness.canStartMatching).toBe(true);
    expect(resolution.readiness.requiredCompletion.percent).toBe(100);
    expect(resolution.readiness.firstIncompleteStep).toBe('ready');
    expect(resolution.destination).toBe('ready');
  });

  it('never lets a stale verified response override an unverified Firebase user', () => {
    const resolution = normalizeOnboardingResolution(
      {
        schemaVersion: 2,
        snapshot: completeSnapshot({ emailVerified: true }),
        readiness: {
          canStartMatching: true,
          requiredCompletion: 1,
          optionalCompletion: 1,
          missingRequirements: [],
          firstIncompleteStep: 'discovery',
        },
        destination: 'discovery',
      },
      { ...emailVerified, emailVerified: false }
    );

    expect(resolution.snapshot.emailVerified).toBe(false);
    expect(resolution.readiness.canStartMatching).toBe(false);
    expect(resolution.readiness.missingRequirements).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: 'auth_verification_required' })])
    );
    expect(resolution.readiness.firstIncompleteStep).toBe('emailVerification');
    expect(resolution.destination).toBe('emailVerification');
  });

  it('persists drafts per Firebase UID so accounts cannot share state', () => {
    saveOnboardingDraft('uid-a', completeSnapshot({ uid: 'uid-a', firstName: 'A' }));
    saveOnboardingDraft('uid-b', completeSnapshot({ uid: 'uid-b', firstName: 'B' }));
    expect(onboardingDraftStorageKey('uid-a')).not.toBe(onboardingDraftStorageKey('uid-b'));
    expect(loadOnboardingDraft('uid-a')?.firstName).toBe('A');
    expect(loadOnboardingDraft('uid-b')?.firstName).toBe('B');
  });
});
