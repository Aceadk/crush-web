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
  /**
   * When the viewer last cleared this conversation (`clearedAt.{uid}` on the
   * match doc), or undefined if they never have.
   *
   * "Delete chat" is per-user and non-destructive: messages sent at or before
   * this instant are hidden from the viewer only. The other participant keeps
   * their copy, the match stays active, and a newer message brings the
   * conversation back. Mirrors CrushMatch.clearedAt on mobile.
   */
  clearedAt?: string;
}

/**
 * Whether a conversation should stay out of the viewer's chat list: they
 * cleared it and nothing has arrived since. Shared by the messages list and
 * the matches page so both platforms hide the same threads.
 */
export function isMatchClearedForViewer(
  match: Pick<Match, 'clearedAt' | 'lastMessageAt'>
): boolean {
  if (!match.clearedAt) return false;
  if (!match.lastMessageAt) return true;
  return new Date(match.lastMessageAt).getTime() <= new Date(match.clearedAt).getTime();
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

/** Mirrors CrushConstants.extendedMaxDistanceKm in the Flutter client. */
export const DISCOVERY_EXTENDED_MAX_DISTANCE_KM = 500;

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
