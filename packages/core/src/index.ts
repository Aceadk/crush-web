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
export {
  DEFAULT_USER_SETTINGS,
  MAX_PROFILE_HEIGHT_CM,
  MIN_PROFILE_HEIGHT_CM,
  PROFILE_HEIGHT_OPTIONS,
  calculateAge,
  formatProfileHeight,
  normalizeProfileHeightCm,
} from './types/user';
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

export { DEFAULT_DISCOVERY_FILTERS, isMatchClearedForViewer } from './types/match';
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
export { sanitizeErrorText, errorText } from './utils/errors';

export { matchService } from './services/match';
export { discoveryDisplayName, discoveryFiltersFromProfile } from './services/discovery_rest';
export {
  presenceService,
  isPresenceOnline,
  PRESENCE_FRESHNESS_MS,
  PRESENCE_HEARTBEAT_MS,
} from './services/presence';
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
  SaveOnboardingStepRequest,
  ClaimUsernameRequest,
  CheckUsernameAvailabilityResponse,
  ConfirmCurrentLocationRequest,
  ValidateProfilePhotoRequest,
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
export { describeProfilePhotoUploadError, storageService } from './services/storage';
export type { UploadProgress, ProfilePhotoUpload } from './services/storage';
export {
  assertProfilePhotoDimensions,
  assertProfilePhotoFileEnvelope,
  validateProfilePhotoForUpload,
} from './services/profile_photo_validation';
export type { ProfilePhotoDimensions } from './services/profile_photo_validation';
export { userService } from './services/user';
export {
  ONBOARDING_SCHEMA_VERSION,
  MIN_ONBOARDING_BIO_LENGTH,
  MIN_ONBOARDING_INTERESTS,
  MAX_ONBOARDING_INTERESTS,
  ONBOARDING_STEP_REGISTRY,
  WEB_ONBOARDING_STEP_KEYS,
  ONBOARDING_INTEREST_OPTIONS,
  resolveWebOnboardingStep,
  buildOnboardingStepQuery,
  OnboardingServiceError,
  authVerificationFactsFromUser,
  isAccountVerified,
  calculateCalendarAge,
  latestAllowedAdultBirthDate,
  normalizeInterestId,
  normalizeOnboardingSnapshot,
  normalizeOnboardingResolution,
  hydrateOnboardingDraft,
  snapshotFromProfile,
  evaluateOnboardingReadiness,
  onboardingDraftStorageKey,
  loadOnboardingDraft,
  saveOnboardingDraft,
  clearOnboardingDraft,
  onboardingService,
} from './services/onboarding';
export type {
  OnboardingStepKey,
  OnboardingStepDefinition,
  OnboardingPhotoStatus,
  OnboardingPhoto,
  ConfirmedOnboardingLocation,
  OnboardingWorkEducation,
  OnboardingFavourites,
  CanonicalOnboardingSnapshot,
  AuthVerificationFacts,
  OnboardingMissingRequirement,
  OnboardingCompletionMetric,
  OnboardingReadiness,
  OnboardingResolution,
  ValidateProfilePhotoResult,
} from './services/onboarding';
export type { OnboardingWireStepKey } from './api/callables';
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
export {
  decodeLegacyEncryptedContent,
  isLegacyEncryptedContent,
  LEGACY_ENCRYPTED_FALLBACK,
} from './services/legacy_cipher';
export { deviceSecurityService } from './services/device-security';
export type { DeviceTrustResult, TrustedDevice } from './services/device-security';
export { promoCodeService } from './services/promo';
export { storyService } from './services/story';
export { streakService } from './services/streak';

// Stores
export { useAuthStore, isFederatedSignIn } from './stores/auth';
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
  PROFILE_PHOTO_MIN_DIMENSION_PX,
  PROFILE_PHOTO_MAX_DIMENSION_PX,
  PROFILE_PHOTO_MAX_PIXELS,
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
