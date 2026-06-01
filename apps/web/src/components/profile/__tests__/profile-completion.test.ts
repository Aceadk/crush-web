import { describe, expect, it } from 'vitest';

import {
  buildProfileCompletionState,
  buildProfileCompletionStateFromProfile,
} from '../profile-completion';

describe('profile completion guidance', () => {
  it('blocks visible profile save until all required fields are present', () => {
    const state = buildProfileCompletionState({
      displayName: 'Sam',
      bio: 'Short',
      interests: ['Music'],
      photos: [],
      location: { city: 'New York' },
      prompts: [],
    });

    expect(state.canSaveVisibleProfile).toBe(false);
    expect(state.percent).toBe(15);
    expect(state.missingRequired.map((item) => item.id)).toEqual([
      'photos',
      'bio',
      'interests',
      'location',
    ]);
    expect(state.primaryMessage).toContain('required');
  });

  it('allows matching when required fields are complete and keeps prompts recommended', () => {
    const state = buildProfileCompletionState({
      displayName: 'Sam',
      bio: 'A thoughtful bio with enough detail.',
      interests: ['Music', 'Travel', 'Fitness'],
      photos: ['https://example.com/photo.jpg'],
      location: { city: 'New York', country: 'United States' },
      prompts: [],
    });

    expect(state.canSaveVisibleProfile).toBe(true);
    expect(state.percent).toBe(90);
    expect(state.missingRequired).toEqual([]);
    expect(state.missingRecommended.map((item) => item.id)).toEqual(['prompts']);
  });

  it('builds completion state from a full profile document', () => {
    const state = buildProfileCompletionStateFromProfile({
      id: 'user-1',
      displayName: 'Sam',
      bio: 'A thoughtful bio with enough detail.',
      photos: ['https://example.com/photo.jpg'],
      profilePhotoUrl: 'https://example.com/photo.jpg',
      location: { city: 'New York', country: 'United States' },
      interests: ['Music', 'Travel', 'Fitness'],
      prompts: [{ question: 'My ideal first date would be...', answer: 'Coffee and a walk.' }],
      isVerified: false,
      subscriptionTier: 'free',
      createdAt: '2026-05-30T00:00:00.000Z',
      updatedAt: '2026-05-30T00:00:00.000Z',
      hasAcceptedTerms: true,
      onboardingComplete: true,
      profileComplete: true,
    });

    expect(state.canSaveVisibleProfile).toBe(true);
    expect(state.percent).toBe(100);
    expect(state.primaryMessage).toBe('Your profile is ready for matching.');
  });
});
