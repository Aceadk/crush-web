// Firebase
export {
  getFirebaseAuth,
  getFirebaseDb,
  getFirebaseStorage,
  firebaseConfig,
} from './firebase/config';

// Types
export type {
  UserProfile,
  Gender,
  SexualOrientation,
  GeoLocation,
  UserPrompt,
  UserSettings,
  NotificationSettings,
  UserStats,
} from './types/user';
export { DEFAULT_USER_SETTINGS, calculateAge } from './types/user';

export type {
  Match,
  MatchStatus,
  SwipeAction,
  DiscoveryProfile,
  DiscoveryFilters,
  ReceivedLike,
  MessageRequest,
  WeeklyPick,
} from './types/match';
export { DEFAULT_DISCOVERY_FILTERS } from './types/match';

export type {
  Message,
  MessageType,
  MessageStatus,
  MessageMetadata,
  MessageReaction,
  MessageReactionType,
  Conversation,
  TypingIndicator,
  ReadReceipt,
} from './types/message';
export { MESSAGES_PER_PAGE } from './types/message';

export type {
  StreakData,
  LikeLimitInfo,
  StreakInfo,
  StreakMilestone,
} from './types/streak';
export {
  STREAK_MILESTONES,
  BASE_DAILY_LIKES,
  MAX_DAILY_LIKES,
  LIKES_RESET_HOURS,
  calculateStreakBonus,
  calculateTotalAllowedLikes,
  getCurrentMilestone,
  getNextMilestone,
  DEFAULT_STREAK_DATA,
} from './types/streak';

export type {
  BoostUnavailableReason,
  BoostStatus,
} from './types/boost';
export {
  getBoostActiveRemainingMs,
  getBoostCooldownRemainingMs,
} from './types/boost';

export type {
  PromoCode,
  PromoCodeRedemption,
  PromoCodeValidationResult,
  ApplyPromoResult,
} from './types/promo';

export type {
  ProfileStory,
  StoryMediaType,
} from './types/story';
export {
  STORY_DEFAULT_DURATION_HOURS,
  STORY_PHOTO_DURATION_MS,
  STORY_MAX_VIDEO_DURATION_SECONDS,
  STORY_MAX_STORIES_PER_USER,
  getStoryExpirationMs,
  isStoryActive,
  getStoryRemainingMs,
  sortStoriesByNewest,
  filterActiveStories,
} from './types/story';

// Services
export { authService } from './services/auth';
export type { AuthState } from './services/auth';

export { userService } from './services/user';
export { matchService } from './services/match';
export { messageService } from './services/message';
export { storageService } from './services/storage';
export type { UploadProgress } from './services/storage';

export { locationService } from './services/location';
export type {
  LocationCoordinates,
  LocationDetails,
  LocationPermissionStatus,
  LocationError,
} from './services/location';

export { streakService } from './services/streak';
export { boostService } from './services/boost';
export { storyService } from './services/story';
export { promoCodeService } from './services/promo';
export { deviceSecurityService } from './services/device-security';
export type {
  TrustedDevice,
  DeviceTrustResult,
} from './services/device-security';

// Stores
export { useAuthStore } from './stores/auth';
export { useMatchStore } from './stores/match';
export { useMessageStore } from './stores/message';
export { useUIStore } from './stores/ui';
export { useStreakStore } from './stores/streak';
export { useBoostStore } from './stores/boost';
export { useStoryStore } from './stores/story';
export { usePromoCodeStore } from './stores/promo';
