// Firebase
export {
    firebaseConfig, getFirebaseAuth,
    getFirebaseDb,
    getFirebaseStorage
} from './firebase/config';

// Types
export { DEFAULT_USER_SETTINGS, calculateAge } from './types/user';
export type {
    Gender, GeoLocation, NotificationSettings, SexualOrientation, UserProfile, UserPrompt,
    UserSettings, UserStats
} from './types/user';

export { DEFAULT_DISCOVERY_FILTERS } from './types/match';
export type {
    DiscoveryFilters, DiscoveryProfile, Match,
    MatchStatus, MessageRequest, ReceivedLike, SwipeAction, WeeklyPick
} from './types/match';

export { MESSAGES_PER_PAGE } from './types/message';
export type {
    Conversation, Message, MessageMetadata,
    MessageReaction,
    MessageReactionType, MessageStatus, MessageType, ReadReceipt, TypingIndicator
} from './types/message';

export {
    BASE_DAILY_LIKES, DEFAULT_STREAK_DATA, LIKES_RESET_HOURS, MAX_DAILY_LIKES, STREAK_MILESTONES, calculateStreakBonus,
    calculateTotalAllowedLikes,
    getCurrentMilestone,
    getNextMilestone
} from './types/streak';
export type { LikeLimitInfo, StreakData, StreakInfo, StreakMilestone } from './types/streak';

export { getBoostActiveRemainingMs, getBoostCooldownRemainingMs } from './types/boost';
export type { BoostStatus, BoostUnavailableReason } from './types/boost';

export type {
    ApplyPromoResult, PromoCode,
    PromoCodeRedemption,
    PromoCodeValidationResult
} from './types/promo';

export {
    STORY_DEFAULT_DURATION_HOURS, STORY_MAX_STORIES_PER_USER, STORY_MAX_VIDEO_DURATION_SECONDS, STORY_PHOTO_DURATION_MS, filterActiveStories, getStoryExpirationMs, getStoryRemainingMs, isStoryActive, sortStoriesByNewest
} from './types/story';
export type { ProfileStory, StoryMediaType } from './types/story';

// Services
export { authService } from './services/auth';
export type { AuthState } from './services/auth';

export { matchService } from './services/match';
export { messageService } from './services/message';
export { storageService } from './services/storage';
export type { UploadProgress } from './services/storage';
export { userService } from './services/user';

export { locationService } from './services/location';
export type {
    LocationCoordinates,
    LocationDetails, LocationError, LocationPermissionStatus
} from './services/location';

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
export { BILLING_CONFIG } from './config/billing';
export type {
    BillingFeature, BillingPeriod, BillingPlanConfig, SubscriptionTier
} from './config/billing';

