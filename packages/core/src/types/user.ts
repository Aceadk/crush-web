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
  isVerified: boolean;
  isPremium: boolean;
  premiumPlan?: 'monthly' | 'quarterly' | 'yearly';
  premiumExpiresAt?: string;
  premiumAutoRenew?: boolean;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  createdAt: string;
  updatedAt: string;
  lastActive?: string;
  isOnline?: boolean;
  settings?: UserSettings;
  notificationSettings?: NotificationSettings;
  hasAcceptedTerms: boolean;
  termsAcceptedAt?: string;
  onboardingComplete: boolean;
  profileComplete: boolean;
}

export type SexualOrientation = 'straight' | 'gay' | 'lesbian' | 'bisexual' | 'pansexual' | 'asexual' | 'other' | 'prefer_not_to_say';

export type Gender = 'male' | 'female' | 'non_binary' | 'other';

export interface GeoLocation {
  latitude?: number;
  longitude?: number;
  city?: string;
  country?: string;
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
}

export interface NotificationSettings {
  // Match & Messages
  newMatches?: boolean;
  newMessages?: boolean;
  messageRequests?: boolean;

  // Activity
  likesReceived?: boolean;
  superLikesReceived?: boolean;
  profileViews?: boolean;

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
};
