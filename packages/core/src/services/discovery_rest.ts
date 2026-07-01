import type { DiscoveryFilters, DiscoveryProfile } from '../types/match';

export function buildDiscoveryRestUrl(
  projectId: string,
  filters: DiscoveryFilters,
  pageSize: number
): string {
  const url = new URL(`https://us-central1-${projectId}.cloudfunctions.net/api/v1/discovery/deck`);
  if (Number.isFinite(pageSize) && pageSize > 0) {
    url.searchParams.set('limit', String(pageSize));
  }
  if (Number.isFinite(filters.minAge)) {
    url.searchParams.set('minAge', String(filters.minAge));
  }
  if (Number.isFinite(filters.maxAge)) {
    url.searchParams.set('maxAge', String(filters.maxAge));
  }
  if (Number.isFinite(filters.maxDistance)) {
    url.searchParams.set('maxDistanceKm', String(filters.maxDistance));
  }
  if (filters.genders && filters.genders.length > 0) {
    url.searchParams.set('showMeGenders', filters.genders.join(','));
  }
  if (filters.interests && filters.interests.length > 0) {
    url.searchParams.set('interests', filters.interests.join(','));
  }
  if (filters.hasPhotos) {
    url.searchParams.set('requirePhotos', 'true');
  }
  if (filters.isVerified) {
    url.searchParams.set('requireVerified', 'true');
  }
  return url.toString();
}

export function mapDiscoveryRestProfiles(payload: Record<string, unknown>): DiscoveryProfile[] {
  const candidates = Array.isArray(payload.profiles)
    ? payload.profiles
    : Array.isArray(payload.candidates)
      ? payload.candidates
      : [];
  const profiles: Array<DiscoveryProfile | null> = candidates.map((candidate) => {
    if (!candidate || typeof candidate !== 'object') return null;
    const source = candidate as Record<string, unknown>;
    const photoEntries = Array.isArray(source.photos)
      ? source.photos
          .map((photo) => {
            if (typeof photo === 'string') {
              return { url: photo, isPrimary: false };
            }
            if (
              photo &&
              typeof photo === 'object' &&
              typeof (photo as { url?: unknown }).url === 'string'
            ) {
              return {
                url: (photo as { url: string }).url,
                isPrimary: (photo as { is_primary?: unknown }).is_primary === true,
              };
            }
            return null;
          })
          .filter((photo): photo is { url: string; isPrimary: boolean } => photo !== null)
      : [];
    const primaryPhotoIndex = photoEntries.findIndex((photo) => photo.isPrimary);
    const photos =
      primaryPhotoIndex > 0
        ? [
            photoEntries[primaryPhotoIndex].url,
            ...photoEntries
              .filter((_, index) => index !== primaryPhotoIndex)
              .map((photo) => photo.url),
          ]
        : photoEntries.map((photo) => photo.url);

    return {
      id: typeof source.id === 'string' ? source.id : '',
      displayName:
        (typeof source.display_name === 'string' && source.display_name) ||
        (typeof source.name === 'string' && source.name) ||
        '',
      age: typeof source.age === 'number' ? source.age : undefined,
      bio: typeof source.bio === 'string' ? source.bio : undefined,
      photos,
      distance:
        typeof source.distance_km === 'number'
          ? source.distance_km
          : typeof source.distanceKm === 'number'
            ? source.distanceKm
            : undefined,
      interests: Array.isArray(source.interests)
        ? source.interests.filter((interest): interest is string => typeof interest === 'string')
        : undefined,
      prompts: Array.isArray(source.prompts)
        ? source.prompts
            .map((prompt) => {
              if (!prompt || typeof prompt !== 'object') return null;
              const question = (prompt as { question?: unknown }).question;
              const answer = (prompt as { answer?: unknown }).answer;
              if (typeof question !== 'string' || typeof answer !== 'string') {
                return null;
              }
              return { question, answer };
            })
            .filter((prompt): prompt is { question: string; answer: string } => prompt !== null)
        : undefined,
      isVerified: source.is_verified === true || source.isVerified === true,
      lastActive:
        typeof source.last_active === 'string'
          ? source.last_active
          : typeof source.lastActive === 'string'
            ? source.lastActive
            : undefined,
    } satisfies DiscoveryProfile;
  });

  return profiles.filter(
    (candidate): candidate is DiscoveryProfile => candidate !== null && candidate.id.length > 0
  );
}
