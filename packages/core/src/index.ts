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
  GeoLocation,
  UserPrompt,
  UserSettings,
  UserStats,
} from './types/user';
export { DEFAULT_USER_SETTINGS } from './types/user';

export type {
  Match,
  MatchStatus,
  SwipeAction,
  DiscoveryProfile,
  DiscoveryFilters,
} from './types/match';
export { DEFAULT_DISCOVERY_FILTERS } from './types/match';

export type {
  Message,
  MessageType,
  MessageStatus,
  MessageMetadata,
  Conversation,
  TypingIndicator,
  ReadReceipt,
} from './types/message';
export { MESSAGES_PER_PAGE } from './types/message';

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

// Stores
export { useAuthStore } from './stores/auth';
export { useMatchStore } from './stores/match';
export { useMessageStore } from './stores/message';
export { useUIStore } from './stores/ui';
