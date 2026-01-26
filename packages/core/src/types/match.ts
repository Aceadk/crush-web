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
  lastMessage?: string;
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
  age?: number;
  bio?: string;
  photos: string[];
  distance?: number;
  interests?: string[];
  prompts?: { question: string; answer: string }[];
  isVerified: boolean;
  lastActive?: string;
}

export interface DiscoveryFilters {
  minAge: number;
  maxAge: number;
  maxDistance: number;
  genders?: string[];
  hasPhotos?: boolean;
  isVerified?: boolean;
}

export const DEFAULT_DISCOVERY_FILTERS: DiscoveryFilters = {
  minAge: 18,
  maxAge: 50,
  maxDistance: 50,
};
