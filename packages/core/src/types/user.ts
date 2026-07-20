/**
 * User types matching Flutter app's data models
 */

export interface UserProfile {
  id: string;
  email?: string;
  phoneNumber?: string;
  displayName: string;
  lastName?: string;
  username?: string;
  bio?: string;
  birthDate?: string;
  age?: number;
  gender?: Gender;
  sexualOrientation?: SexualOrientation;
  interestedIn?: Gender[];
  photos: string[];
  primaryPhotoIndex?: number;
  profilePhotoUrl?: string;
  location?: GeoLocation;
  interests?: string[];
  /** Server-owned media records. A URL without an approved record is not readiness proof. */
  photoRecords?: Array<{
    mediaId?: string;
    storagePath?: string;
    downloadUrl?: string;
    status: 'uploading' | 'processing' | 'approved' | 'rejected' | 'failed' | 'unknown';
    reason?: string;
    isPrimary?: boolean;
  }>;
  jobTitle?: string;
  company?: string;
  school?: string;
  favourites?: Record<string, string>;
  prompts?: UserPrompt[];
  lifestyle?: LifestyleInfo;
  isVerified: boolean;
  // Derived convenience boolean (true when subscriptionTier !== 'free').
  // Populated by mapUserDocumentToUserProfile from the canonical backend `plan`
  // field via resolveEntitlement(). Do NOT persist this directly — `plan` is the
  // source of truth. See services/entitlement.ts.
  isPremium?: boolean;
  premiumPlan?: never; // Deprecated, use billingPeriod
  subscriptionTier: 'free' | 'plus' | 'platinum';
  billingPeriod?: 'monthly' | 'quarterly' | 'yearly';
  premiumExpiresAt?: string;
  premiumAutoRenew?: boolean;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  createdAt: string;
  updatedAt: string;
  lastActive?: string;
  isOnline?: boolean;
  settings?: UserSettings;
  notificationPrefs?: NotificationSettings;
  notificationSettings?: NotificationSettings;
  hasAcceptedTerms: boolean;
  termsAcceptedAt?: string;
  // Mobile onboarding skip flags (written by the Flutter app when the user
  // skips the basic-info / profile-setup steps). Read-only on web; inputs to
  // the onboarding gate derivation.
  hasSkippedBasicInfo?: boolean;
  hasSkippedProfileSetup?: boolean;
  // Compatibility view only. Routes must call resolveOnboardingState because
  // legacy root completion fields are discovery mirrors, not onboarding truth.
  onboardingComplete: boolean;
  profileComplete: boolean;
  isEmailVerified?: boolean;
  isPhoneVerified?: boolean;
  onboardingSchemaVersion?: number;
  onboardingCompletedSteps?: string[];
  onboardingSkippedSteps?: string[];
  onboardingCompletedAt?: string;
  boost?: {
    expiresAt?: string;
    activatedAt?: string;
    lastActivatedAt?: string;
    totalActivations?: number;
  };
}

export type SexualOrientation =
  | 'straight'
  | 'gay'
  | 'lesbian'
  | 'bisexual'
  | 'pansexual'
  | 'asexual'
  | 'other'
  | 'prefer_not_to_say';

export type Gender = 'male' | 'female' | 'non_binary' | 'other';

export interface GeoLocation {
  latitude?: number;
  longitude?: number;
  accuracyMeters?: number;
  city?: string;
  region?: string;
  country?: string;
  capturedAt?: string;
  confirmedAt?: string;
}

export interface LifestyleInfo {
  /** Canonical height in centimetres, matching profile.heightCm on mobile. */
  height?: number;
  education?: string;
  drinking?: 'yes' | 'no' | 'sometimes' | '';
  smoking?: 'yes' | 'no' | 'sometimes' | '';
  workout?: 'active' | 'sometimes' | 'never' | '';
}

export const MIN_PROFILE_HEIGHT_CM = 100;
export const MAX_PROFILE_HEIGHT_CM = 250;

/**
 * Normalize canonical numeric heights and older web values that were saved as
 * numeric or feet/inches strings before the profile editor used a picker.
 */
export function normalizeProfileHeightCm(value: unknown): number | undefined {
  let centimeters: number | undefined;

  if (typeof value === 'number' && Number.isFinite(value)) {
    centimeters = value;
  } else if (typeof value === 'string') {
    const trimmed = value.trim();
    if (/^\d+(?:\.\d+)?$/.test(trimmed)) {
      centimeters = Number(trimmed);
    } else {
      const imperial = trimmed.match(/^(\d+)\s*(?:'|ft)\s*(\d{1,2})?\s*(?:\"|in)?/i);
      if (imperial) {
        const feet = Number(imperial[1]);
        const inches = Number(imperial[2] ?? 0);
        if (inches < 12) centimeters = (feet * 12 + inches) * 2.54;
      }
    }
  }

  if (centimeters === undefined) return undefined;
  const rounded = Math.round(centimeters);
  return rounded >= MIN_PROFILE_HEIGHT_CM && rounded <= MAX_PROFILE_HEIGHT_CM ? rounded : undefined;
}

/** Format a centimetre value the same way the mobile height picker presents it. */
export function formatProfileHeight(heightCm: number): string {
  const totalInches = Math.round(heightCm / 2.54);
  const feet = Math.floor(totalInches / 12);
  const inches = totalInches % 12;
  return `${feet}'${inches}\" (${heightCm} cm)`;
}

export const PROFILE_HEIGHT_OPTIONS = Array.from(
  { length: MAX_PROFILE_HEIGHT_CM - MIN_PROFILE_HEIGHT_CM + 1 },
  (_, index) => {
    const value = MIN_PROFILE_HEIGHT_CM + index;
    return { value, label: formatProfileHeight(value) };
  }
);

export interface UserPrompt {
  id?: string;
  question: string;
  answer: string;
}

export interface UserSettings {
  showAge: boolean;
  showDistance: boolean;
  showOnlineStatus: boolean;
  // Discovery visibility. false maps to the canonical
  // profile.preferences.hideFromDiscovery=true (buildCanonicalPreferences),
  // which is what the backend deck + mobile read. Kept as the positive
  // "showInDiscovery" here to match the legacy web settings doc shape.
  showInDiscovery?: boolean;
  pushNotifications: boolean;
  emailNotifications: boolean;
  maxDistance: number;
  ageRangeMin: number;
  ageRangeMax: number;
  theme: 'light' | 'dark' | 'system';
  // Incognito Mode - browse without appearing in discovery
  incognitoMode?: boolean;
  // Show read receipts in messages
  showReadReceipts?: boolean;
  // Show typing indicators
  showTypingIndicators?: boolean;
  // Passport mode - discover people from a selected destination location
  passportMode?: boolean;
  passportLocation?: GeoLocation;
}

export interface NotificationSettings {
  // Canonical backend-enforced prefs
  push?: boolean;
  email?: boolean;
  sound?: boolean;
  vibration?: boolean;
  matches?: boolean;
  messages?: boolean;
  likes?: boolean;
  profileViews?: boolean;
  promotions?: boolean;
  subscriptions?: boolean;
  safetyAlerts?: boolean;
  quietHoursEnabled?: boolean;
  quietHoursStart?: number;
  quietHoursEnd?: number;
  mutedMessages?: string[];
  mutedCalls?: string[];

  // Match & Messages
  newMatches?: boolean;
  newMessages?: boolean;
  messageRequests?: boolean;

  // Activity
  likesReceived?: boolean;
  superLikesReceived?: boolean;

  // Promotions
  weeklyPicks?: boolean;
  specialOffers?: boolean;
  productUpdates?: boolean;

  // Email
  emailNotifications?: boolean;
  emailMarketing?: boolean;
}

export interface UserStats {
  likesReceived: number;
  likesSent: number;
  matchesCount: number;
  superLikesRemaining: number;
  boostsRemaining: number;
}

/**
 * Calculate age from a birth date string. Always use this instead of stored age
 * to ensure accuracy (stored age becomes stale after each birthday).
 */
export function calculateAge(birthDate: string | undefined | null): number | undefined {
  if (!birthDate) return undefined;
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(birthDate);
  if (!match) return undefined;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    return undefined;
  }
  const now = new Date();
  let age = now.getUTCFullYear() - year;
  if (
    now.getUTCMonth() + 1 < month ||
    (now.getUTCMonth() + 1 === month && now.getUTCDate() < day)
  ) {
    age -= 1;
  }
  return age >= 0 ? age : undefined;
}

export const DEFAULT_USER_SETTINGS: UserSettings = {
  showAge: true,
  showDistance: true,
  showOnlineStatus: true,
  pushNotifications: true,
  emailNotifications: true,
  maxDistance: 50,
  ageRangeMin: 18,
  ageRangeMax: 50,
  theme: 'system',
  passportMode: false,
};
