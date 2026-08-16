import { DEFAULT_DISCOVERY_FILTERS, type DiscoveryFilters, type DiscoveryProfile } from '../types/match';
import type { UserProfile } from '../types/user';

/**
 * Discovery filters seeded from the viewer's SAVED preferences.
 *
 * This is the cross-platform alignment point. The backend resolves any filter
 * a client omits from the requester's canonical `profile.preferences`, and the
 * mobile app relies on exactly that — it sends only distance. The web deck
 * previously started from a hardcoded 18–50 / 50km default held in local store
 * state, so the same account got a differently-filtered deck on each platform.
 * Seeding from the profile makes both clients start from the same rule; the
 * filter dialog then edits from there.
 */
export function discoveryFiltersFromProfile(
  profile: Pick<UserProfile, 'settings' | 'interestedIn'> | null | undefined
): DiscoveryFilters {
  const settings = profile?.settings;
  const genders = profile?.interestedIn ?? [];
  return {
    minAge: settings?.ageRangeMin ?? DEFAULT_DISCOVERY_FILTERS.minAge,
    maxAge: settings?.ageRangeMax ?? DEFAULT_DISCOVERY_FILTERS.maxAge,
    maxDistance: settings?.maxDistance ?? DEFAULT_DISCOVERY_FILTERS.maxDistance,
    ...(genders.length > 0 ? { genders: [...genders] } : {}),
  };
}

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
      username:
        typeof source.username === 'string' && source.username
          ? source.username
          : undefined,
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

  // Defensive mirror of the server rules, matching the mobile deck exactly:
  //   * a profile with no photos never renders (the backend already requires
  //     one, but an older deployment could return one), and
  //   * duplicate ids are collapsed, preserving server order.
  // Without these the web deck could show a blank card the app would drop.
  const seenIds = new Set<string>();
  return profiles.filter((candidate): candidate is DiscoveryProfile => {
    if (candidate === null || candidate.id.length === 0) return false;
    if (candidate.photos.length === 0) return false;
    if (seenIds.has(candidate.id)) return false;
    seenIds.add(candidate.id);
    return true;
  });
}

/**
 * Username-first identity for discovery surfaces: the bare handle when a
 * username exists, otherwise the (already privacy-gated) display name.
 *
 * Rendered WITHOUT an "@" — the handle IS the name on these surfaces, so the
 * sigil only added noise. Mirrors the mobile app's
 * Profile.discoveryDisplayName so both clients show the same identity on the
 * deck.
 */
export function discoveryDisplayName(
  profile: Pick<DiscoveryProfile, 'username' | 'displayName'>
): string {
  const handle = profile.username?.trim();
  if (handle) return handle;
  return profile.displayName;
}
