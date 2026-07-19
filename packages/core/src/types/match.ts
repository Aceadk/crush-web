/**
 * Match types matching Flutter app's data models
 */

export type MatchStatus = 'pending' | 'mutual' | 'rejected' | 'unmatched';

export interface Match {
  id: string;
  userId: string;
  otherUserId: string;
  status: MatchStatus;
  preMatchMessageRequestsCount: number;
  pinnedForUser: boolean;
  otherUserName?: string;
  otherUserPhotoUrl?: string;
  createdAt: string;
  updatedAt: string;
  lastMessageAt?: string;
  /** Media-safe preview string (never a raw URL/ciphertext). See messagePreview(). */
  lastMessage?: string;
  /** Raw type of the last message ('text'|'image'|'video'|'voice'|'audio'|'gif'). */
  lastMessageType?: string;
  /** Sender of the last message; lets the list show a "You:" prefix. */
  lastMessageFromUserId?: string;
  unreadCount: number;
  isSuperLike?: boolean;
}

export interface SwipeAction {
  id: string;
  swiperId: string;
  swipedUserId: string;
  action: 'like' | 'pass' | 'superlike';
  timestamp: string;
}

export interface DiscoveryProfile {
  id: string;
  displayName: string;
  /** Public @handle. Discovery is username-first on both clients. */
  username?: string;
  birthDate?: string;
  age?: number;
  bio?: string;
  photos: string[];
  distance?: number;
  interests?: string[];
  prompts?: { question: string; answer: string }[];
  isVerified: boolean;
  lastActive?: string;
  boost?: {
    isActive: boolean;
    expiresAt?: string;
  };
}

export interface DiscoveryFilters {
  minAge: number;
  maxAge: number;
  maxDistance: number;
  genders?: string[];
  interests?: string[];
  hasPhotos?: boolean;
  isVerified?: boolean;
}

export interface ReceivedLike {
  id: string;
  likerUserId: string;
  likerName: string;
  likerPhotoUrl?: string;
  likerAge?: number;
  isSuperLike: boolean;
  timestamp: string;
}

export const DEFAULT_DISCOVERY_FILTERS: DiscoveryFilters = {
  minAge: 18,
  maxAge: 50,
  maxDistance: 50,
};

export interface MessageRequest {
  id: string;
  fromUserId: string;
  fromUserName: string;
  fromUserPhotoUrl?: string;
  fromUserAge?: number;
  message: string;
  isSuperLike: boolean;
  timestamp: string;
}

export interface WeeklyPick {
  id: string;
  userId: string;
  displayName: string;
  age?: number;
  bio?: string;
  photos: string[];
  distance?: number;
  interests?: string[];
  prompts?: { question: string; answer: string }[];
  isVerified: boolean;
  compatibilityScore?: number;
  pickReason?: string;
  expiresAt: string;
}
