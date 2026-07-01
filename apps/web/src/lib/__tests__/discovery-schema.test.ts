import { describe, expect, it } from 'vitest';
import {
  buildUserProfileCreateData,
  mapUserDocumentToUserProfile,
  resolveUserProfilePhotos,
} from '@crush/core/services/user_document';
import {
  buildDiscoveryRestUrl,
  mapDiscoveryRestProfiles,
} from '@crush/core/services/discovery_rest';
import { DEFAULT_DISCOVERY_FILTERS } from '@crush/core/types/match';
import { DEFAULT_USER_SETTINGS, type UserProfile } from '@crush/core/types/user';

describe('web user document compatibility helpers', () => {
  it('writes both flat and canonical nested fields for newly completed web profiles', () => {
    const created = buildUserProfileCreateData(
      {
        id: 'web-user',
        email: 'alice@example.com',
        displayName: 'Alice Web',
        birthDate: '1998-05-10',
        gender: 'female',
        interestedIn: ['male'],
        photos: ['https://img.example.com/alice.jpg'],
        location: {
          city: 'Austin',
          country: 'US',
          latitude: 30.2672,
          longitude: -97.7431,
        },
        settings: DEFAULT_USER_SETTINGS,
      } satisfies Partial<UserProfile>,
      '2026-03-13T01:00:00.000Z'
    );

    expect(created.displayName).toBe('Alice Web');
    expect(created.photos).toEqual(['https://img.example.com/alice.jpg']);
    expect(created.onboardingComplete).toBe(true);
    expect(created.profileComplete).toBe(true);
    expect(created.lastActive).toBe('2026-03-13T01:00:00.000Z');
    expect(created.profile).toMatchObject({
      name: 'Alice Web',
      birthDate: '1998-05-10',
      gender: 'female',
      photoUrls: ['https://img.example.com/alice.jpg'],
      primaryPhotoIndex: 0,
      city: 'Austin',
      country: 'US',
      latitude: 30.2672,
      longitude: -97.7431,
      preferences: {
        minAge: 18,
        maxAge: 50,
        maxDistanceKm: 50,
        showMeGenders: ['male'],
      },
    });
  });

  it('maps canonical nested mobile documents back into the shared web user model', () => {
    const profile = mapUserDocumentToUserProfile('mobile-user', {
      email: 'ben@example.com',
      onboardingComplete: true,
      profileComplete: true,
      profile: {
        name: 'Ben App',
        birthDate: '1996-07-22',
        gender: 'male',
        bio: 'Hiking and coffee',
        photoUrls: ['https://img.example.com/ben.jpg'],
        interests: ['Hiking', 'Coffee'],
        city: 'Denver',
        country: 'US',
        latitude: 39.7392,
        longitude: -104.9903,
        preferences: {
          minAge: 23,
          maxAge: 33,
          maxDistanceKm: 40,
          showMeGenders: ['female'],
          showMyDistance: true,
          showMyAge: true,
        },
      },
      updatedAt: '2026-03-13T01:05:00.000Z',
    });

    expect(profile.displayName).toBe('Ben App');
    expect(profile.gender).toBe('male');
    expect(profile.interestedIn).toEqual(['female']);
    expect(profile.photos).toEqual(['https://img.example.com/ben.jpg']);
    expect(profile.location).toEqual({
      city: 'Denver',
      country: 'US',
      latitude: 39.7392,
      longitude: -104.9903,
    });
    expect(profile.settings?.maxDistance).toBe(40);
    expect(profile.settings?.ageRangeMin).toBe(23);
    expect(profile.settings?.ageRangeMax).toBe(33);
  });

  it('prefers canonical mobile photos and presents the selected display photo first', () => {
    const document = {
      photos: ['https://img.example.com/stale-root.jpg'],
      profilePhotoUrl: 'https://img.example.com/stale-display.jpg',
      profile: {
        name: 'Mobile User',
        photoUrls: ['https://img.example.com/one.jpg', 'https://img.example.com/main.jpg'],
        primaryPhotoIndex: 1,
      },
    };

    expect(resolveUserProfilePhotos(document)).toEqual({
      photos: ['https://img.example.com/one.jpg', 'https://img.example.com/main.jpg'],
      primaryPhotoIndex: 1,
      displayPhotoUrl: 'https://img.example.com/main.jpg',
    });

    const profile = mapUserDocumentToUserProfile('mobile-user', document);
    expect(profile.profilePhotoUrl).toBe('https://img.example.com/main.jpg');
    expect(profile.photos).toEqual([
      'https://img.example.com/main.jpg',
      'https://img.example.com/one.jpg',
    ]);
    expect(profile.primaryPhotoIndex).toBe(0);
  });
});

describe('web discovery REST helpers', () => {
  it('builds the canonical discovery deck URL', () => {
    const url = buildDiscoveryRestUrl(
      'crush-f5352',
      {
        ...DEFAULT_DISCOVERY_FILTERS,
        genders: ['female'],
        interests: ['Coffee'],
        hasPhotos: true,
        isVerified: true,
      },
      20
    );

    expect(url).toContain('/v1/discovery/deck');
    expect(url).toContain('limit=20');
    expect(url).toContain('minAge=18');
    expect(url).toContain('maxAge=50');
    expect(url).toContain('maxDistanceKm=50');
    expect(url).toContain('showMeGenders=female');
    expect(url).toContain('interests=Coffee');
    expect(url).toContain('requirePhotos=true');
    expect(url).toContain('requireVerified=true');
  });

  it('maps REST discovery payloads into shared discovery profiles', () => {
    const profiles = mapDiscoveryRestProfiles({
      candidates: [
        {
          id: 'web-user',
          display_name: 'Alice Web',
          age: 27,
          bio: 'Coffee first',
          photos: [{ url: 'https://img.example.com/alice.jpg', is_primary: true }],
          distance_km: 3,
          interests: ['Coffee'],
          is_verified: true,
          prompts: [],
        },
      ],
    });

    expect(profiles).toEqual([
      {
        id: 'web-user',
        displayName: 'Alice Web',
        age: 27,
        bio: 'Coffee first',
        photos: ['https://img.example.com/alice.jpg'],
        distance: 3,
        interests: ['Coffee'],
        prompts: [],
        isVerified: true,
      },
    ]);
  });

  it('moves a REST primary photo to the front for existing swipe-card consumers', () => {
    const [profile] = mapDiscoveryRestProfiles({
      profiles: [
        {
          id: 'mobile-user',
          display_name: 'Mobile User',
          photos: [
            { url: 'https://img.example.com/one.jpg', is_primary: false },
            { url: 'https://img.example.com/main.jpg', is_primary: true },
          ],
        },
      ],
    });

    expect(profile.photos).toEqual([
      'https://img.example.com/main.jpg',
      'https://img.example.com/one.jpg',
    ]);
  });
});
