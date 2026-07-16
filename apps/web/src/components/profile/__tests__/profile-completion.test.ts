import { describe, expect, it } from 'vitest';
import type { UserProfile } from '@crush/core';

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
    expect(state.percent).toBe(13);
    expect(state.missingRequired.map((item) => item.id)).toEqual([
      'verification',
      'username',
      'basicInfo',
      'photos',
      'bio',
      'interests',
      'location',
    ]);
    expect(state.primaryMessage).toContain('required');
  });

  it('allows matching when required fields are complete and keeps prompts recommended', () => {
    const state = buildProfileCompletionState({
      accountVerified: true,
      username: 'sam_2026',
      displayName: 'Sam',
      birthDate: '1995-05-10',
      gender: 'male',
      interestedIn: ['female'],
      bio: 'A thoughtful bio with enough detail.',
      interests: ['Music', 'Travel', 'Fitness'],
      photos: ['https://example.com/photo.jpg'],
      photoRecords: [{ downloadUrl: 'https://example.com/photo.jpg', status: 'approved' }],
      location: {
        city: 'New York',
        country: 'United States',
        confirmedAt: '2026-07-15T12:00:00.000Z',
      },
      prompts: [],
    });

    expect(state.canSaveVisibleProfile).toBe(true);
    expect(state.percent).toBe(100);
    expect(state.missingRequired).toEqual([]);
    expect(state.missingRecommended.map((item) => item.id)).toEqual(['prompts']);
  });

  it('builds completion state from a full profile document', () => {
    const profile: UserProfile = {
      id: 'user-1',
      username: 'sam_2026',
      displayName: 'Sam',
      birthDate: '1995-05-10',
      gender: 'male',
      interestedIn: ['female'],
      bio: 'A thoughtful bio with enough detail.',
      photos: ['https://example.com/photo.jpg'],
      profilePhotoUrl: 'https://example.com/photo.jpg',
      photoRecords: [{ downloadUrl: 'https://example.com/photo.jpg', status: 'approved' }],
      location: {
        latitude: 40.7128,
        longitude: -74.006,
        city: 'New York',
        country: 'United States',
        confirmedAt: '2026-07-15T12:00:00.000Z',
      },
      interests: ['Music', 'Travel', 'Fitness'],
      prompts: [{ question: 'My ideal first date would be...', answer: 'Coffee and a walk.' }],
      isVerified: false,
      subscriptionTier: 'free',
      createdAt: '2026-05-30T00:00:00.000Z',
      updatedAt: '2026-05-30T00:00:00.000Z',
      hasAcceptedTerms: true,
      onboardingComplete: true,
      profileComplete: true,
      isEmailVerified: true,
    };
    const state = buildProfileCompletionStateFromProfile(profile, true);

    expect(state.canSaveVisibleProfile).toBe(true);
    expect(state.percent).toBe(100);
    expect(state.primaryMessage).toBe('Your profile is ready for matching.');
  });

  it('never promotes a stale Firestore verification mirror into auth truth', () => {
    const state = buildProfileCompletionStateFromProfile(
      {
        id: 'user-1',
        displayName: 'Sam',
        photos: [],
        isVerified: false,
        subscriptionTier: 'free',
        createdAt: '2026-05-30T00:00:00.000Z',
        updatedAt: '2026-05-30T00:00:00.000Z',
        hasAcceptedTerms: true,
        onboardingComplete: false,
        profileComplete: false,
        isEmailVerified: true,
      },
      false
    );

    expect(state.requirements.find((item) => item.id === 'verification')?.complete).toBe(false);
  });
});
