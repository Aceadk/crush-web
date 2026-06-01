/**
 * User types matching Flutter app's data models
 */

export interface UserProfile {
  id: string;
  email?: string;
  phoneNumber?: string;
  displayName: string;
  username?: string;
  bio?: string;
  birthDate?: string;
  age?: number;
  gender?: Gender;
  sexualOrientation?: SexualOrientation;
  interestedIn?: Gender[];
  photos: string[];
  profilePhotoUrl?: string;
  location?: GeoLocation;
  interests?: string[];
  prompts?: UserPrompt[];
  lifestyle?: LifestyleInfo;
  isVerified: boolean;
  isPremium?: never; // Deprecated, use subscriptionTier
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
  onboardingComplete: boolean;
  profileComplete: boolean;
  isEmailVerified?: boolean;
  isPhoneVerified?: boolean;
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
  city?: string;
  country?: string;
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
  const birth = new Date(birthDate);
  if (isNaN(birth.getTime())) return undefined;
  const ageDiffMs = Date.now() - birth.getTime();
  const ageDate = new Date(ageDiffMs);
  return Math.abs(ageDate.getUTCFullYear() - 1970);
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
