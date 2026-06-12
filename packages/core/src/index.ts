// Firebase
export {
  firebaseConfig,
  getFirebaseApp,
  getFirebaseAuth,
  getFirebaseDb,
  getFirebaseFunctions,
  getFirebaseStorage,
  getFirebaseAppCheck,
  initializeWebAppCheck,
  isAppCheckConfigured,
  validateAppCheckEnv,
  getAppCheckToken,
  getAppCheckHeaders,
} from './firebase/config';
export type { AppCheckEnvValidation } from './firebase/config';

// Types
export { DEFAULT_USER_SETTINGS, calculateAge } from './types/user';
export type {
  Gender,
  GeoLocation,
  NotificationSettings,
  SexualOrientation,
  UserProfile,
  UserPrompt,
  UserSettings,
  UserStats,
} from './types/user';

export { DEFAULT_DISCOVERY_FILTERS } from './types/match';
export type {
  DiscoveryFilters,
  DiscoveryProfile,
  Match,
  MatchStatus,
  MessageRequest,
  ReceivedLike,
  SwipeAction,
  WeeklyPick,
} from './types/match';

export { MESSAGES_PER_PAGE } from './types/message';
export type {
  Conversation,
  Message,
  MessageMetadata,
  MessageReaction,
  MessageReactionType,
  MessageStatus,
  MessageType,
  ReadReceipt,
  TypingIndicator,
} from './types/message';

export {
  BASE_DAILY_LIKES,
  DEFAULT_STREAK_DATA,
  LIKES_RESET_HOURS,
  MAX_DAILY_LIKES,
  STREAK_MILESTONES,
  calculateStreakBonus,
  calculateTotalAllowedLikes,
  getCurrentMilestone,
  getNextMilestone,
} from './types/streak';
export type { LikeLimitInfo, StreakData, StreakInfo, StreakMilestone } from './types/streak';

export { getBoostActiveRemainingMs, getBoostCooldownRemainingMs } from './types/boost';
export type { BoostStatus, BoostUnavailableReason } from './types/boost';

export type {
  ApplyPromoResult,
  PromoCode,
  PromoCodeRedemption,
  PromoCodeValidationResult,
} from './types/promo';

export {
  STORY_DEFAULT_DURATION_HOURS,
  STORY_MAX_STORIES_PER_USER,
  STORY_MAX_VIDEO_DURATION_SECONDS,
  STORY_PHOTO_DURATION_MS,
  filterActiveStories,
  getStoryExpirationMs,
  getStoryRemainingMs,
  isStoryActive,
  sortStoriesByNewest,
} from './types/story';
export type { ProfileStory, StoryMediaType } from './types/story';

// Services
export { authService } from './services/auth';
export type { AuthState } from './services/auth';
export { getAuthErrorMessage, getAuthErrorKey } from './services/auth_errors';

export { matchService } from './services/match';
export { messageService } from './services/message';

// V2 services — canonical backend-aligned (Option B migration).
// Mutations go through Cloud Functions callables; reads use the canonical
// matches/{matchId}/messages model. See:
// docs/reports/web_chat_match_migration_plan_2026-06-05.md
export { matchServiceV2, MatchServiceV2 } from './services/match_v2';
export { messageServiceV2, MessageServiceV2 } from './services/message_v2';

// Backend callable bindings (typed wrappers over Cloud Functions).
export { callables, invokeCallable } from './api/callables';
export type {
  BackendMatchDoc,
  CallableMessageType,
  OkResponse,
  SendMessageRequest,
  SendMessageResponse,
  SwipeRightRequest,
  SwipeRightResponse,
  SwipeLeftRequest,
  UnmatchRequest,
  SetMatchPinnedRequest,
  ReportUserRequest,
  BlockUserRequest,
  BlockedUser,
  GetBlockedUsersResponse,
  ActivateBoostResponse,
  PromoRequest,
  ValidatePromoResponse,
  RedeemPromoResponse,
  StreakStatusResponse,
  RecordStreakResponse,
} from './api/callables';
export { storageService } from './services/storage';
export type { UploadProgress } from './services/storage';
export { userService } from './services/user';
export {
  notificationService,
  resolveNotificationRoute,
  WEB_NOTIFICATION_PREF_DEFAULTS,
} from './services/notification';
export type { WebNotificationPrefs } from './services/notification';

export { locationService } from './services/location';
export type {
  LocationCoordinates,
  LocationDetails,
  LocationError,
  LocationPermissionStatus,
} from './services/location';

export {
  resolveEntitlement,
  resolvePlan,
  resolveTier,
  isPremiumUser,
} from './services/entitlement';
export type {
  CanonicalPlan,
  Entitlement,
  SubscriptionTier as EntitlementSubscriptionTier,
} from './services/entitlement';

export { boostService } from './services/boost';
export { deviceSecurityService } from './services/device-security';
export type { DeviceTrustResult, TrustedDevice } from './services/device-security';
export { promoCodeService } from './services/promo';
export { storyService } from './services/story';
export { streakService } from './services/streak';

// Stores
export { useAuthStore } from './stores/auth';
export { useBoostStore } from './stores/boost';
export { useMatchStore } from './stores/match';
export { useMessageStore } from './stores/message';
export { usePromoCodeStore } from './stores/promo';
export { useStoryStore } from './stores/story';
export { useStreakStore } from './stores/streak';
export { useUIStore } from './stores/ui';

// Config
export { isV2ChatEnabled } from './config/features';
export {
  MAX_PROFILE_PHOTOS,
  MIN_PROFILE_PHOTOS,
  MAX_INTERESTS,
  MAX_PROMPTS,
  PROFILE_PHOTO_MAX_BYTES,
  PROFILE_PHOTO_ALLOWED_MIME_TYPES,
  VERIFICATION_IS_SERVER_OWNED,
  PROFILE_CAPABILITIES,
} from './config/profile_capabilities';
export { BILLING_CONFIG } from './config/billing';
export type {
  BillingFeature,
  BillingPeriod,
  BillingPlanConfig,
  SubscriptionTier,
} from './config/billing';
