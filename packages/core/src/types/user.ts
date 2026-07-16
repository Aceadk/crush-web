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
  height?: string;
  education?: string;
  drinking?: 'yes' | 'no' | 'sometimes' | '';
  smoking?: 'yes' | 'no' | 'sometimes' | '';
  workout?: 'active' | 'sometimes' | 'never' | '';
}

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
