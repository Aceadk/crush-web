import {
  DEFAULT_USER_SETTINGS,
  type Gender,
  type UserProfile,
  type UserPrompt,
  type UserSettings,
} from '../types/user';

type FirestoreUserData = Record<string, unknown>;

type GeoLocationPatch = {
  latitude?: number;
  longitude?: number;
  city?: string;
  country?: string;
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
  return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
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
  const city = toString(source.city);
  const country = toString(source.country);

  if (latitude === undefined && longitude === undefined && !city && !country) {
    return undefined;
  }

  return {
    latitude,
    longitude,
    city,
    country,
  };
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
      return (maybeToDate as () => Date)().toISOString();
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

export function buildUserProfileCreateData(
  data: Partial<UserProfile>,
  nowIso: string
): Record<string, unknown> {
  const displayName = data.displayName?.trim() ?? '';
  const photos = data.photos ?? [];
  const settings = { ...DEFAULT_USER_SETTINGS, ...(data.settings ?? {}) };
  const interestedIn = normalizeInterestedIn(data.interestedIn);
  const location = normalizeLocation(data.location);
  const prompts = data.prompts?.filter((prompt) => prompt.answer.trim().length > 0);
  const completion = deriveCompletionFlags({
    explicitOnboardingComplete: data.onboardingComplete,
    explicitProfileComplete: data.profileComplete,
    displayName,
    gender: normalizeGender(data.gender),
    birthDate: data.birthDate,
    age: data.age,
    interestedIn,
    photos,
  });
  const canonicalProfile: Record<string, unknown> = {
    name: displayName,
    birthDate: data.birthDate,
    age: data.age,
    gender: normalizeGender(data.gender),
    sexualOrientation: data.sexualOrientation,
    bio: data.bio ?? '',
    photoUrls: photos,
    interests: data.interests ?? [],
    city: location?.city ?? '',
    country: location?.country ?? '',
    isVerified: data.isVerified ?? false,
    preferences: buildCanonicalPreferences(interestedIn, settings),
  };

  if (location?.latitude != null) {
    canonicalProfile.latitude = location.latitude;
  }
  if (location?.longitude != null) {
    canonicalProfile.longitude = location.longitude;
  }
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

  return {
    id: data.id,
    email: data.email,
    phoneNumber: data.phoneNumber,
    displayName,
    username: data.username,
    bio: data.bio ?? '',
    birthDate: data.birthDate,
    age: data.age,
    gender: normalizeGender(data.gender),
    sexualOrientation: data.sexualOrientation,
    interestedIn,
    photos,
    profilePhotoUrl: data.profilePhotoUrl ?? photos[0],
    location,
    interests: data.interests ?? [],
    prompts,
    lifestyle: data.lifestyle,
    isVerified: data.isVerified ?? false,
    subscriptionTier: data.subscriptionTier ?? 'free',
    billingPeriod: data.billingPeriod,
    premiumExpiresAt: data.premiumExpiresAt,
    premiumAutoRenew: data.premiumAutoRenew,
    stripeCustomerId: data.stripeCustomerId,
    stripeSubscriptionId: data.stripeSubscriptionId,
    createdAt: nowIso,
    updatedAt: nowIso,
    lastActive: data.lastActive ?? nowIso,
    isOnline: data.isOnline,
    settings,
    notificationPrefs: data.notificationPrefs ?? data.notificationSettings,
    notificationSettings: data.notificationSettings,
    hasAcceptedTerms: data.hasAcceptedTerms ?? false,
    termsAcceptedAt: data.termsAcceptedAt,
    onboardingComplete: completion.onboardingComplete,
    profileComplete: completion.profileComplete,
    isEmailVerified: data.isEmailVerified ?? false,
    isPhoneVerified: data.isPhoneVerified ?? Boolean(data.phoneNumber),
    boost: data.boost,
    profile: canonicalProfile,
  };
}

export function buildUserProfileUpdateData(data: Partial<UserProfile>): Record<string, unknown> {
  const updates: Record<string, unknown> = {};
  const settingsPatch = data.settings;
  const interestedIn =
    data.interestedIn !== undefined ? normalizeInterestedIn(data.interestedIn) : undefined;
  const location = data.location !== undefined ? normalizeLocation(data.location) : undefined;
  const prompts =
    data.prompts !== undefined
      ? data.prompts.filter((prompt) => prompt.answer.trim().length > 0)
      : undefined;

  if (data.displayName !== undefined) {
    updates.displayName = data.displayName.trim();
    updates['profile.name'] = data.displayName.trim();
  }
  if (data.bio !== undefined) {
    updates.bio = data.bio.trim();
    updates['profile.bio'] = data.bio.trim();
  }
  if (data.birthDate !== undefined) {
    updates.birthDate = data.birthDate;
    updates['profile.birthDate'] = data.birthDate;
  }
  if (data.age !== undefined) {
    updates.age = data.age;
    updates['profile.age'] = data.age;
  }
  if (data.gender !== undefined) {
    const normalizedGender = normalizeGender(data.gender);
    updates.gender = normalizedGender;
    updates['profile.gender'] = normalizedGender;
  }
  if (data.sexualOrientation !== undefined) {
    updates.sexualOrientation = data.sexualOrientation;
    updates['profile.sexualOrientation'] = data.sexualOrientation;
  }
  if (interestedIn !== undefined) {
    updates.interestedIn = interestedIn;
    updates['profile.preferences.showMeGenders'] =
      interestedIn.length > 0 ? interestedIn : ['male', 'female'];
  }
  if (data.photos !== undefined) {
    updates.photos = data.photos;
    updates.profilePhotoUrl = data.photos[0] ?? undefined;
    updates['profile.photoUrls'] = data.photos;
  }
  if (location !== undefined) {
    updates.location = location;
    updates['profile.city'] = location.city ?? '';
    updates['profile.country'] = location.country ?? '';
    if (location.latitude !== undefined) {
      updates['profile.latitude'] = location.latitude;
    }
    if (location.longitude !== undefined) {
      updates['profile.longitude'] = location.longitude;
    }
  }
  if (data.interests !== undefined) {
    updates.interests = data.interests;
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
  if (data.isVerified !== undefined) {
    updates.isVerified = data.isVerified;
    updates['profile.isVerified'] = data.isVerified;
  }
  if (data.onboardingComplete !== undefined) {
    updates.onboardingComplete = data.onboardingComplete;
  }
  if (data.profileComplete !== undefined) {
    updates.profileComplete = data.profileComplete;
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

  return updates;
}

export function mapUserDocumentToUserProfile(id: string, data: FirestoreUserData): UserProfile {
  const profile = asRecord(data.profile);
  const canonicalBirthDate = toString(data.birthDate) ?? toString(profile.birthDate);
  const photos =
    toStringArray(data.photos).length > 0
      ? toStringArray(data.photos)
      : toStringArray(profile.photoUrls);
  const interestedIn =
    normalizeInterestedIn(data.interestedIn).length > 0
      ? normalizeInterestedIn(data.interestedIn)
      : normalizeInterestedIn(asRecord(profile.preferences).showMeGenders);
  const location =
    normalizeLocation(data.location) ??
    normalizeLocation({
      latitude: profile.latitude,
      longitude: profile.longitude,
      city: profile.city,
      country: profile.country,
    });
  const prompts = normalizePrompts(data.prompts) ?? normalizePrompts(profile.profilePrompts);
  const settingsFromDoc = (data.settings as Partial<UserSettings> | undefined) ?? {};
  const profilePreferences = asRecord(profile.preferences);
  const settings: UserSettings = {
    ...DEFAULT_USER_SETTINGS,
    ...settingsFromDoc,
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
  };
  const displayName = toString(data.displayName) ?? toString(profile.name) ?? '';
  const completion = deriveCompletionFlags({
    explicitOnboardingComplete: toBoolean(data.onboardingComplete),
    explicitProfileComplete: toBoolean(data.profileComplete),
    displayName,
    gender: normalizeGender(data.gender) ?? normalizeGender(profile.gender),
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
    username: toString(data.username),
    bio: toString(data.bio) ?? toString(profile.bio),
    birthDate: canonicalBirthDate,
    age: toNumber(data.age) ?? toNumber(profile.age) ?? deriveAgeFromBirthDate(canonicalBirthDate),
    gender: normalizeGender(data.gender) ?? normalizeGender(profile.gender),
    sexualOrientation: (toString(data.sexualOrientation) ??
      toString(profile.sexualOrientation)) as UserProfile['sexualOrientation'],
    interestedIn,
    photos,
    profilePhotoUrl: toString(data.profilePhotoUrl) ?? photos[0],
    location,
    interests:
      toStringArray(data.interests).length > 0
        ? toStringArray(data.interests)
        : toStringArray(profile.interests),
    prompts,
    lifestyle: (data.lifestyle as UserProfile['lifestyle']) ?? undefined,
    isVerified: toBoolean(data.isVerified) ?? toBoolean(profile.isVerified) ?? false,
    subscriptionTier: (data.subscriptionTier as UserProfile['subscriptionTier']) ?? 'free',
    billingPeriod: data.billingPeriod as UserProfile['billingPeriod'],
    premiumExpiresAt: toString(data.premiumExpiresAt),
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
    onboardingComplete: completion.onboardingComplete,
    profileComplete: completion.profileComplete,
    isEmailVerified: toBoolean(data.isEmailVerified),
    isPhoneVerified: toBoolean(data.isPhoneVerified),
    boost: {
      expiresAt: normalizeTimestampToString(asRecord(data.boost).expiresAt),
      activatedAt: normalizeTimestampToString(asRecord(data.boost).activatedAt),
      lastActivatedAt: normalizeTimestampToString(asRecord(data.boost).lastActivatedAt),
      totalActivations: toNumber(asRecord(data.boost).totalActivations),
    },
  };
}
