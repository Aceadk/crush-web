import {
  DEFAULT_USER_SETTINGS,
  normalizeProfileHeightCm,
  type Gender,
  type UserProfile,
  type UserPrompt,
  type UserSettings,
} from '../types/user';
import { resolveEntitlement } from './entitlement';

type FirestoreUserData = Record<string, unknown>;

type GeoLocationPatch = {
  latitude?: number;
  longitude?: number;
  accuracyMeters?: number;
  city?: string;
  region?: string;
  country?: string;
  capturedAt?: string;
  confirmedAt?: string;
};

function asRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

function toString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function toBoolean(value: unknown): boolean | undefined {
  return typeof value === 'boolean' ? value : undefined;
}

function toNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    .map((item) => item.trim());
}

function normalizePrimaryPhotoIndex(value: unknown, photoCount: number): number {
  if (photoCount <= 0) return 0;
  const index = toNumber(value);
  if (index === undefined) return 0;
  return Math.max(0, Math.min(Math.trunc(index), photoCount - 1));
}

export type ResolvedUserProfilePhotos = {
  photos: string[];
  primaryPhotoIndex: number;
  displayPhotoUrl?: string;
};

export function resolveUserProfilePhotos(data: FirestoreUserData): ResolvedUserProfilePhotos {
  const profile = asRecord(data.profile);
  const hasCanonicalPhotoList = Array.isArray(profile.photoUrls);
  let photos = hasCanonicalPhotoList
    ? toStringArray(profile.photoUrls)
    : toStringArray(data.photos);

  // Fall back to the legacy single display photo whenever the resolved list is
  // empty — including when profile.photoUrls exists but is an empty array,
  // matching the backend's profilePhotoSelection precedence.
  if (photos.length === 0) {
    const legacyDisplayPhoto = toString(data.profilePhotoUrl);
    photos = legacyDisplayPhoto ? [legacyDisplayPhoto] : [];
  }

  const primaryPhotoIndex = normalizePrimaryPhotoIndex(profile.primaryPhotoIndex, photos.length);
  return {
    photos,
    primaryPhotoIndex,
    displayPhotoUrl: photos[primaryPhotoIndex],
  };
}

function normalizeGender(value: unknown): Gender | undefined {
  if (typeof value !== 'string') return undefined;
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');
  switch (normalized) {
    case 'male':
    case 'man':
    case 'men':
      return 'male';
    case 'female':
    case 'woman':
    case 'women':
      return 'female';
    case 'non_binary':
    case 'nonbinary':
    case 'nb':
      return 'non_binary';
    case 'other':
      return 'other';
    default:
      return undefined;
  }
}

function normalizeInterestedIn(value: unknown): Gender[] {
  const normalized = new Set<Gender>();
  for (const entry of Array.isArray(value) ? value : typeof value === 'string' ? [value] : []) {
    if (typeof entry !== 'string') continue;
    const token = entry
      .trim()
      .toLowerCase()
      .replace(/[\s-]+/g, '_');
    switch (token) {
      case 'male':
      case 'man':
      case 'men':
        normalized.add('male');
        break;
      case 'female':
      case 'woman':
      case 'women':
        normalized.add('female');
        break;
      case 'non_binary':
      case 'nonbinary':
      case 'nb':
        normalized.add('non_binary');
        break;
      case 'other':
        normalized.add('other');
        break;
      case 'all':
      case 'any':
      case 'everyone':
        normalized.add('male');
        normalized.add('female');
        normalized.add('non_binary');
        normalized.add('other');
        break;
      default:
        break;
    }
  }
  return Array.from(normalized);
}

function normalizeLocation(value: unknown): GeoLocationPatch | undefined {
  const source = asRecord(value);
  if (Object.keys(source).length === 0) return undefined;

  const latitude = toNumber(source.latitude);
  const longitude = toNumber(source.longitude);
  const accuracyMeters = toNumber(source.accuracyMeters) ?? toNumber(source.accuracy);
  const city = toString(source.city);
  const region = toString(source.region) ?? toString(source.state);
  const country = toString(source.country);
  const capturedAt = normalizeTimestampToString(source.capturedAt);
  const confirmedAt =
    normalizeTimestampToString(source.confirmedAt) ??
    normalizeTimestampToString(source.locationConfirmedAt);

  if (
    latitude === undefined &&
    longitude === undefined &&
    !city &&
    !region &&
    !country &&
    !confirmedAt
  ) {
    return undefined;
  }

  return {
    latitude,
    longitude,
    accuracyMeters,
    city,
    region,
    country,
    capturedAt,
    confirmedAt,
  };
}

function normalizePhotoRecords(value: unknown): NonNullable<UserProfile['photoRecords']> {
  if (!Array.isArray(value)) return [];
  const validStatuses = new Set([
    'uploading',
    'processing',
    'approved',
    'rejected',
    'failed',
    'unknown',
  ]);
  return value.flatMap((entry, index) => {
    const source = asRecord(entry);
    const downloadUrl =
      toString(source.downloadUrl) ?? toString(source.url) ?? toString(source.photoUrl);
    const mediaId = toString(source.mediaId) ?? toString(source.id);
    if (!downloadUrl && !mediaId) return [];
    const rawStatus = toString(source.status);
    const status = validStatuses.has(rawStatus ?? '')
      ? (rawStatus as NonNullable<UserProfile['photoRecords']>[number]['status'])
      : 'unknown';
    return [
      {
        mediaId,
        storagePath: toString(source.storagePath),
        downloadUrl,
        status,
        reason: toString(source.reason),
        isPrimary: toBoolean(source.isPrimary) ?? index === 0,
      },
    ];
  });
}

function normalizeStringMap(value: unknown): Record<string, string> | undefined {
  const source = asRecord(value);
  const entries = Object.entries(source).flatMap(([key, entry]) => {
    const resolved = toString(entry);
    return resolved ? [[key, resolved] as const] : [];
  });
  return entries.length ? Object.fromEntries(entries) : undefined;
}

function normalizePrompts(value: unknown): UserPrompt[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const prompts = value
    .map((entry) => {
      const source = asRecord(entry);
      const question = toString(source.question);
      const answer = toString(source.answer);
      if (!question || !answer) return null;
      return { question, answer };
    })
    .filter((entry): entry is UserPrompt => entry !== null);
  return prompts.length > 0 ? prompts : undefined;
}

function normalizeTimestampToString(value: unknown): string | undefined {
  if (!value) return undefined;
  if (typeof value === 'string') return value;
  if (typeof value === 'number' && Number.isFinite(value)) {
    return new Date(value).toISOString();
  }
  if (typeof value === 'object' && value !== null && 'toDate' in value) {
    const maybeToDate = (value as { toDate?: unknown }).toDate;
    if (typeof maybeToDate === 'function') {
      // Firestore Timestamp.toDate() reads instance state through `this`.
      // Calling it detached breaks authenticated profile loading.
      return (maybeToDate as (this: object) => Date).call(value).toISOString();
    }
  }
  return undefined;
}

function deriveAgeFromBirthDate(birthDate: string | undefined): number | undefined {
  if (!birthDate) return undefined;
  const birth = new Date(birthDate);
  if (Number.isNaN(birth.getTime())) return undefined;
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  if (
    now.getMonth() < birth.getMonth() ||
    (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate())
  ) {
    age -= 1;
  }
  return age >= 0 ? age : undefined;
}

function buildCanonicalPreferences(
  interestedIn: Gender[],
  settings: Partial<UserSettings> | undefined,
  existingProfilePreferences?: Record<string, unknown>
): Record<string, unknown> {
  return {
    minAge: settings?.ageRangeMin ?? existingProfilePreferences?.minAge ?? 18,
    maxAge: settings?.ageRangeMax ?? existingProfilePreferences?.maxAge ?? 50,
    maxDistanceKm: settings?.maxDistance ?? existingProfilePreferences?.maxDistanceKm ?? 50,
    showMeGenders:
      interestedIn.length > 0
        ? interestedIn
        : (toStringArray(existingProfilePreferences?.showMeGenders) as Gender[]).length > 0
          ? toStringArray(existingProfilePreferences?.showMeGenders)
          : ['male', 'female'],
    showMyDistance:
      settings?.showDistance ?? toBoolean(existingProfilePreferences?.showMyDistance) ?? true,
    showMyAge: settings?.showAge ?? toBoolean(existingProfilePreferences?.showMyAge) ?? true,
    hideFromDiscovery:
      settings && 'showInDiscovery' in settings
        ? (settings as UserSettings & { showInDiscovery?: boolean }).showInDiscovery === false
        : (toBoolean(existingProfilePreferences?.hideFromDiscovery) ?? false),
    incognitoMode:
      settings?.incognitoMode ?? toBoolean(existingProfilePreferences?.incognitoMode) ?? false,
  };
}

function deriveCompletionFlags(params: {
  explicitOnboardingComplete?: boolean;
  explicitProfileComplete?: boolean;
  displayName?: string;
  gender?: Gender;
  birthDate?: string;
  age?: number;
  interestedIn: Gender[];
  photos: string[];
}): { onboardingComplete: boolean; profileComplete: boolean } {
  const inferredComplete =
    Boolean(params.displayName) &&
    Boolean(params.gender) &&
    Boolean(params.birthDate || params.age) &&
    params.interestedIn.length > 0 &&
    params.photos.length > 0;

  return {
    onboardingComplete: params.explicitOnboardingComplete ?? inferredComplete,
    profileComplete: params.explicitProfileComplete ?? inferredComplete,
  };
}

/**
 * Legacy view-model convenience only. Actual routing calls
 * resolveOnboardingState; root onboardingComplete/profileComplete are mutable
 * discovery mirrors and partial field inference is not trusted.
 */
export function deriveOnboardingGate(params: {
  schemaVersion?: number;
  completedAt?: unknown;
}): boolean {
  return (params.schemaVersion ?? 0) >= 2 && Boolean(params.completedAt);
}

/**
 * Recursively drop undefined values from a write payload. The web Firestore
 * SDK rejects undefined field values (we deliberately do NOT enable
 * ignoreUndefinedProperties — explicit payloads keep writes auditable), and
 * signup calls buildUserProfileCreateData with most optional fields absent,
 * which used to make EVERY web account-creation setDoc throw and leave the
 * user with no users/{uid} document at all.
 */
function omitUndefinedDeep<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => omitUndefinedDeep(item)) as unknown as T;
  }
  if (value !== null && typeof value === 'object' && value.constructor === Object) {
    const result: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
      if (entry !== undefined) {
        result[key] = omitUndefinedDeep(entry);
      }
    }
    return result as T;
  }
  return value;
}

export function buildUserProfileCreateData(
  data: Partial<UserProfile>,
  nowIso: string
): Record<string, unknown> {
  const displayName = data.displayName?.trim() ?? '';
  const settings = { ...DEFAULT_USER_SETTINGS, ...(data.settings ?? {}) };
  const interestedIn = normalizeInterestedIn(data.interestedIn);
  const normalizedGender = normalizeGender(data.gender);
  const location = normalizeLocation(data.location);
  const prompts = data.prompts?.filter((prompt) => prompt.answer.trim().length > 0);
  // This builder is intentionally limited to fields Firestore Rules classify
  // as client-owned. Runtime auth bootstrap uses resolveOnboardingState/Admin
  // SDK; keeping this helper safe prevents future callers from reintroducing a
  // client-authored trust/entitlement/onboarding document.
  const canonicalProfile: Record<string, unknown> = {
    name: displayName,
    gender: normalizedGender ?? '',
    sexualOrientation: normalizedGender === 'non_binary' ? data.sexualOrientation : null,
    bio: data.bio ?? '',
    interests: data.interests ?? [],
    city: location?.city ?? '',
    country: location?.country ?? '',
    lastName: data.lastName?.trim() ?? '',
    videoUrls: [] as string[],
    languages: [] as string[],
    preferences: buildCanonicalPreferences(interestedIn, settings),
  };

  if (prompts != null) {
    canonicalProfile.profilePrompts = prompts;
  }
  if (data.lifestyle?.height != null) {
    canonicalProfile.heightCm = data.lifestyle.height;
  }
  if (data.lifestyle?.education != null) {
    canonicalProfile.educationLevel = data.lifestyle.education;
  }
  if (data.lifestyle?.drinking != null) {
    canonicalProfile.drinking = data.lifestyle.drinking;
  }
  if (data.lifestyle?.smoking != null) {
    canonicalProfile.smoking = data.lifestyle.smoking;
  }
  if (data.lifestyle?.workout != null) {
    canonicalProfile.workout = data.lifestyle.workout;
  }

  // omitUndefinedDeep is load-bearing: at signup most optional fields are
  // absent and the web Firestore SDK throws on any undefined value, which
  // previously broke every web account creation (no users/{uid} doc at all).
  return omitUndefinedDeep({
    id: data.id,
    email: data.email ?? null,
    phoneNumber: data.phoneNumber ?? '',
    displayName,
    // username, usernameLower, and lastUsernameChangeAt are callable-owned.
    // claimUsername is the only trusted writer for the uniqueness tuple.
    // Canonical demographic/profile data lives ONLY under profile.* — the
    // Firestore rules reject legacy flat root keys (bio, birthDate, age, gender,
    // sexualOrientation, interests, isVerified, …). See firestore.rules
    // legacyFlatProfileKeys() and docs/contracts/canonical_user_document.fixture.json.
    interestedIn,
    prompts,
    lifestyle: data.lifestyle,
    themePreference: 'system',
    updatedAt: nowIso,
    lastActive: data.lastActive ?? nowIso,
    isOnline: data.isOnline,
    settings,
    notificationPrefs: data.notificationPrefs ?? data.notificationSettings,
    notificationSettings: data.notificationSettings,
    profile: canonicalProfile,
  });
}

export function buildUserProfileUpdateData(data: Partial<UserProfile>): Record<string, unknown> {
  const updates: Record<string, unknown> = {};
  const settingsPatch = data.settings;
  const interestedIn =
    data.interestedIn !== undefined ? normalizeInterestedIn(data.interestedIn) : undefined;
  const prompts =
    data.prompts !== undefined
      ? data.prompts.filter((prompt) => prompt.answer.trim().length > 0)
      : undefined;
  const updatedGender = data.gender !== undefined ? normalizeGender(data.gender) : undefined;

  if (data.displayName !== undefined) {
    updates.displayName = data.displayName.trim();
    updates['profile.name'] = data.displayName.trim();
  }
  // DOB/age, media/order, exact or confirmed location, verification,
  // entitlement, and completion fields are deliberately absent here. Their
  // trusted schema-v2 callables own those mutations.
  if (data.bio !== undefined) {
    updates['profile.bio'] = data.bio.trim();
  }
  if (data.gender !== undefined) {
    updates['profile.gender'] = updatedGender;
    if (updatedGender !== 'non_binary') {
      updates['profile.sexualOrientation'] = null;
    }
  }
  if (
    data.sexualOrientation !== undefined &&
    (data.gender === undefined || updatedGender === 'non_binary')
  ) {
    updates['profile.sexualOrientation'] = data.sexualOrientation;
  }
  if (interestedIn !== undefined) {
    updates.interestedIn = interestedIn;
    updates['profile.preferences.showMeGenders'] =
      interestedIn.length > 0 ? interestedIn : ['male', 'female'];
  }
  if (data.interests !== undefined) {
    updates['profile.interests'] = data.interests;
  }
  if (prompts !== undefined) {
    updates.prompts = prompts;
    updates['profile.profilePrompts'] = prompts;
  }
  if (data.lifestyle !== undefined) {
    updates.lifestyle = data.lifestyle;
    if (data.lifestyle.height !== undefined) {
      updates['profile.heightCm'] = data.lifestyle.height;
    }
    if (data.lifestyle.education !== undefined) {
      updates['profile.educationLevel'] = data.lifestyle.education;
    }
    if (data.lifestyle.drinking !== undefined) {
      updates['profile.drinking'] = data.lifestyle.drinking;
    }
    if (data.lifestyle.smoking !== undefined) {
      updates['profile.smoking'] = data.lifestyle.smoking;
    }
    if (data.lifestyle.workout !== undefined) {
      updates['profile.workout'] = data.lifestyle.workout;
    }
  }
  if (settingsPatch !== undefined) {
    updates.settings = settingsPatch;
    const canonicalPreferences = buildCanonicalPreferences(
      interestedIn ?? normalizeInterestedIn([]),
      settingsPatch,
      {}
    );
    if ('maxDistanceKm' in canonicalPreferences) {
      updates['profile.preferences.maxDistanceKm'] = canonicalPreferences.maxDistanceKm;
    }
    if ('minAge' in canonicalPreferences) {
      updates['profile.preferences.minAge'] = canonicalPreferences.minAge;
    }
    if ('maxAge' in canonicalPreferences) {
      updates['profile.preferences.maxAge'] = canonicalPreferences.maxAge;
    }
    if ('showMyDistance' in canonicalPreferences) {
      updates['profile.preferences.showMyDistance'] = canonicalPreferences.showMyDistance;
    }
    if ('showMyAge' in canonicalPreferences) {
      updates['profile.preferences.showMyAge'] = canonicalPreferences.showMyAge;
    }
    if ('hideFromDiscovery' in canonicalPreferences) {
      updates['profile.preferences.hideFromDiscovery'] = canonicalPreferences.hideFromDiscovery;
    }
    if ('incognitoMode' in canonicalPreferences) {
      updates['profile.preferences.incognitoMode'] = canonicalPreferences.incognitoMode;
    }
  }

  // Same guarantee as buildUserProfileCreateData: the web Firestore SDK
  // rejects undefined field values, and callers pass objects with optional
  // entries (e.g. profile-edit sends lifestyle with drinking/smoking/workout
  // as `undefined` when unset). Without this, updateDoc throws and the whole
  // profile save fails for any user with an incomplete lifestyle section.
  return omitUndefinedDeep(updates);
}

export function mapUserDocumentToUserProfile(id: string, data: FirestoreUserData): UserProfile {
  const profile = asRecord(data.profile);
  // Mobile writes profile.birthDate as a Firestore Timestamp; web writes an
  // ISO string. Accept both so ages derived from mobile-written docs work.
  const canonicalBirthDate =
    toString(data.birthDate) ??
    toString(profile.birthDate) ??
    normalizeTimestampToString(data.birthDate) ??
    normalizeTimestampToString(profile.birthDate);
  const photoSelection = resolveUserProfilePhotos(data);
  const photos =
    photoSelection.primaryPhotoIndex > 0
      ? [
          photoSelection.photos[photoSelection.primaryPhotoIndex],
          ...photoSelection.photos.filter((_, index) => index !== photoSelection.primaryPhotoIndex),
        ]
      : photoSelection.photos;
  const interestedIn =
    normalizeInterestedIn(data.interestedIn).length > 0
      ? normalizeInterestedIn(data.interestedIn)
      : normalizeInterestedIn(asRecord(profile.preferences).showMeGenders);
  const location =
    normalizeLocation(data.location) ??
    normalizeLocation({
      latitude: profile.latitude,
      longitude: profile.longitude,
      accuracyMeters: profile.locationAccuracyMeters,
      city: profile.city,
      region: profile.region,
      country: profile.country,
      capturedAt: profile.locationCapturedAt,
      confirmedAt: profile.locationConfirmedAt,
    });
  const prompts = normalizePrompts(data.prompts) ?? normalizePrompts(profile.profilePrompts);
  const settingsFromDoc = (data.settings as Partial<UserSettings> | undefined) ?? {};
  const profilePreferences = asRecord(profile.preferences);
  // Canonical privacy lives in profile.privacySettings (mobile + backend read
  // it). A deliberate choice (privacySchemaVersion >= 2) wins over the legacy
  // top-level settings mirror, so a value set on the mobile app is reflected
  // correctly in the web settings UI. Absent/legacy → fall back to settings.
  const privacyCanonical = asRecord(profile.privacySettings);
  const privacyIsDeliberate = (toNumber(privacyCanonical.privacySchemaVersion) ?? 0) >= 2;
  const canonicalShowOnlineStatus =
    privacyIsDeliberate && typeof privacyCanonical.showOnlineStatus === 'boolean'
      ? privacyCanonical.showOnlineStatus
      : undefined;
  const settings: UserSettings = {
    ...DEFAULT_USER_SETTINGS,
    ...settingsFromDoc,
    showOnlineStatus:
      canonicalShowOnlineStatus ??
      settingsFromDoc.showOnlineStatus ??
      DEFAULT_USER_SETTINGS.showOnlineStatus,
    maxDistance:
      toNumber(profilePreferences.maxDistanceKm) ??
      settingsFromDoc.maxDistance ??
      DEFAULT_USER_SETTINGS.maxDistance,
    ageRangeMin:
      toNumber(profilePreferences.minAge) ??
      settingsFromDoc.ageRangeMin ??
      DEFAULT_USER_SETTINGS.ageRangeMin,
    ageRangeMax:
      toNumber(profilePreferences.maxAge) ??
      settingsFromDoc.ageRangeMax ??
      DEFAULT_USER_SETTINGS.ageRangeMax,
    showDistance:
      toBoolean(profilePreferences.showMyDistance) ??
      settingsFromDoc.showDistance ??
      DEFAULT_USER_SETTINGS.showDistance,
    showAge:
      toBoolean(profilePreferences.showMyAge) ??
      settingsFromDoc.showAge ??
      DEFAULT_USER_SETTINGS.showAge,
    incognitoMode: toBoolean(profilePreferences.incognitoMode) ?? settingsFromDoc.incognitoMode,
    // Canonical profile.preferences.hideFromDiscovery wins; legacy
    // settings.showInDiscovery is the fallback. Defaults to visible.
    showInDiscovery:
      toBoolean(profilePreferences.hideFromDiscovery) !== undefined
        ? !toBoolean(profilePreferences.hideFromDiscovery)
        : (settingsFromDoc.showInDiscovery ?? true),
  };
  // The real name the account has set, if any. Completion checks must use
  // THIS — a handle is not a display name and must never make a half-finished
  // profile look complete.
  const providedDisplayName = toString(data.displayName) ?? toString(profile.name) ?? '';
  // What the UI renders. Falls through to first name and then the handle so a
  // half-finished account (its profile map still filling in step by step)
  // shows something instead of a blank header. Mirrors _fallbackDisplayName in
  // the mobile discovery repository.
  const displayName =
    providedDisplayName || toString(profile.firstName) || toString(data.username) || '';
  const resolvedGender = normalizeGender(data.gender) ?? normalizeGender(profile.gender);
  const legacyLifestyle = asRecord(data.lifestyle);
  const heightCm =
    normalizeProfileHeightCm(profile.heightCm) ?? normalizeProfileHeightCm(legacyLifestyle.height);
  const lifestyle =
    Object.keys(legacyLifestyle).length > 0 || heightCm !== undefined
      ? ({ ...legacyLifestyle, height: heightCm } as UserProfile['lifestyle'])
      : undefined;
  const completion = deriveCompletionFlags({
    explicitOnboardingComplete: toBoolean(data.onboardingComplete),
    explicitProfileComplete: toBoolean(data.profileComplete),
    displayName: providedDisplayName,
    gender: resolvedGender,
    birthDate: canonicalBirthDate,
    age: toNumber(data.age) ?? toNumber(profile.age) ?? deriveAgeFromBirthDate(canonicalBirthDate),
    interestedIn,
    photos,
  });

  return {
    id,
    email: toString(data.email),
    phoneNumber: toString(data.phoneNumber),
    displayName,
    lastName: toString(profile.lastName) ?? toString(data.lastName),
    username: toString(data.username),
    bio: toString(data.bio) ?? toString(profile.bio),
    birthDate: canonicalBirthDate,
    age: toNumber(data.age) ?? toNumber(profile.age) ?? deriveAgeFromBirthDate(canonicalBirthDate),
    gender: resolvedGender,
    sexualOrientation:
      resolvedGender === 'non_binary'
        ? ((toString(data.sexualOrientation) ??
            toString(profile.sexualOrientation)) as UserProfile['sexualOrientation'])
        : undefined,
    interestedIn,
    photos,
    // The web view-model presents the selected display photo first so existing
    // grids and swipe-card components consistently treat index 0 as primary.
    primaryPhotoIndex: 0,
    profilePhotoUrl: photoSelection.displayPhotoUrl,
    location,
    interests:
      toStringArray(data.interests).length > 0
        ? toStringArray(data.interests)
        : toStringArray(profile.interests),
    photoRecords:
      normalizePhotoRecords(data.photoRecords).length > 0
        ? normalizePhotoRecords(data.photoRecords)
        : normalizePhotoRecords(profile.photoRecords).length > 0
          ? normalizePhotoRecords(profile.photoRecords)
          : normalizePhotoRecords(asRecord(data.onboarding).photos),
    jobTitle: toString(profile.jobTitle),
    company: toString(profile.company),
    school: toString(profile.school) ?? toString(profile.education),
    favourites: normalizeStringMap(profile.favourites),
    prompts,
    lifestyle,
    isVerified: toBoolean(data.isVerified) ?? toBoolean(profile.isVerified) ?? false,
    // Entitlement is derived from the canonical backend `plan` field (with
    // legacy fallback) so web premium gating matches the backend + rules.
    // See services/entitlement.ts (P1 #7 alignment).
    ...(() => {
      const entitlement = resolveEntitlement(data);
      return {
        subscriptionTier: entitlement.tier,
        isPremium: entitlement.isPremium,
        premiumExpiresAt: entitlement.expiresAt ?? toString(data.premiumExpiresAt),
      };
    })(),
    billingPeriod: data.billingPeriod as UserProfile['billingPeriod'],
    premiumAutoRenew: toBoolean(data.premiumAutoRenew),
    stripeCustomerId: toString(data.stripeCustomerId),
    stripeSubscriptionId: toString(data.stripeSubscriptionId),
    createdAt: normalizeTimestampToString(data.createdAt) ?? new Date().toISOString(),
    updatedAt: normalizeTimestampToString(data.updatedAt) ?? new Date().toISOString(),
    lastActive: normalizeTimestampToString(data.lastActive),
    isOnline: toBoolean(data.isOnline),
    settings,
    notificationPrefs:
      (data.notificationPrefs as UserProfile['notificationPrefs']) ??
      (data.notificationSettings as UserProfile['notificationSettings']),
    notificationSettings: data.notificationSettings as UserProfile['notificationSettings'],
    hasAcceptedTerms: toBoolean(data.hasAcceptedTerms) ?? false,
    termsAcceptedAt: toString(data.termsAcceptedAt),
    hasSkippedBasicInfo: toBoolean(data.hasSkippedBasicInfo),
    hasSkippedProfileSetup: toBoolean(data.hasSkippedProfileSetup),
    // Convenience only; protected routing calls resolveOnboardingState.
    //
    // Falls back to the explicit root mirror so an account finished on mobile
    // — including one completed before onboarding schema v2, which carries no
    // schemaVersion/completedAt pair — is not shown as unfinished here. The
    // mobile repository trusts the same mirror in the other direction
    // (_hasProfileSignal in firebase_profile_repository.dart).
    onboardingComplete:
      deriveOnboardingGate({
        schemaVersion:
          toNumber(asRecord(data.onboarding).schemaVersion) ??
          toNumber(data.onboardingSchemaVersion),
        completedAt: asRecord(data.onboarding).completedAt ?? data.onboardingCompletedAt,
      }) || completion.onboardingComplete,
    profileComplete: completion.profileComplete,
    isEmailVerified: toBoolean(data.isEmailVerified),
    isPhoneVerified: toBoolean(data.isPhoneVerified),
    onboardingSchemaVersion:
      toNumber(asRecord(data.onboarding).schemaVersion) ?? toNumber(data.onboardingSchemaVersion),
    onboardingCompletedSteps:
      toStringArray(asRecord(data.onboarding).completedStepKeys).length > 0
        ? toStringArray(asRecord(data.onboarding).completedStepKeys)
        : toStringArray(asRecord(data.onboarding).completedSteps),
    onboardingSkippedSteps:
      toStringArray(asRecord(data.onboarding).skippedOptionalStepKeys).length > 0
        ? toStringArray(asRecord(data.onboarding).skippedOptionalStepKeys)
        : toStringArray(asRecord(data.onboarding).skippedSteps),
    onboardingCompletedAt:
      normalizeTimestampToString(asRecord(data.onboarding).completedAt) ??
      normalizeTimestampToString(data.onboardingCompletedAt),
    boost: {
      expiresAt: normalizeTimestampToString(asRecord(data.boost).expiresAt),
      activatedAt: normalizeTimestampToString(asRecord(data.boost).activatedAt),
      lastActivatedAt: normalizeTimestampToString(asRecord(data.boost).lastActivatedAt),
      totalActivations: toNumber(asRecord(data.boost).totalActivations),
    },
  };
}
