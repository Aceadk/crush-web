/**
 * Typed Cloud Functions callable wrappers.
 *
 * These wrap the backend callables in my_first_project/functions/src/index.ts.
 * Request/response shapes were verified directly against the backend source on
 * 2026-06-05 (see docs/reports/shared_backend_contract_matrix_2026-06-05.md and
 * web_chat_match_migration_plan_2026-06-05.md).
 *
 * Web mutations MUST go through these callables instead of writing directly to
 * Firestore. The Firestore security rules reject direct client writes to
 * matches/, messages/, and other backend-managed collections.
 *
 * NOTE: the backend returns `{ ok: true, ... }` for success (NOT `{ success }`).
 */

import { httpsCallable, HttpsCallableResult } from 'firebase/functions';
import { getFirebaseFunctions } from '../firebase/config';

// ─────────────────────────────────────────────────────────────────────────────
// Request/Response contracts (verified against functions/src/index.ts)
// ─────────────────────────────────────────────────────────────────────────────

export type CallableMessageType = 'text' | 'image' | 'video' | 'audio' | 'voice' | 'gift';

/** Standard backend success envelope. */
export interface OkResponse {
  ok: boolean;
}

// Discovery & Matching
export interface SwipeRightRequest {
  targetUserId: string;
  attachedMessage?: string;
  superLike?: boolean;
}

export interface SwipeRightResponse {
  matched: boolean;
  matchId?: string;
}

export interface SwipeLeftRequest {
  targetUserId: string;
}

/** Exact schema-v2 keys accepted and returned by the shared backend. */
export type OnboardingWireStepKey =
  | 'emailVerification'
  | 'phoneVerification'
  | 'terms'
  | 'username'
  | 'basicInfo'
  | 'idVerification'
  | 'discoveryPreferences'
  | 'photos'
  | 'aboutMe'
  | 'location'
  | 'workEducation'
  | 'interests'
  | 'favourites'
  | 'ready'
  | 'discovery';

export interface SaveOnboardingStepRequest {
  stepKey: OnboardingWireStepKey;
  data: Record<string, unknown>;
  skipped?: boolean;
}

export interface ClaimUsernameRequest {
  username: string;
}

export interface CheckUsernameAvailabilityResponse {
  available: boolean;
  normalized: string;
}

export interface ConfirmCurrentLocationRequest {
  latitude: number;
  longitude: number;
  accuracyMeters?: number;
  capturedAt: string;
  city?: string;
  region?: string;
  country?: string;
}

export interface ValidateProfilePhotoRequest {
  storagePath: string;
  downloadUrl?: string;
  isPrimary?: boolean;
}

export interface UnmatchRequest {
  matchId: string;
}

// Chat & Messages
export interface SendMessageRequest {
  matchId: string;
  /** The other participant's uid — required by the backend. */
  toUserId: string;
  content?: string;
  type?: CallableMessageType;
  mediaUrl?: string;
}

export interface SendMessageResponse {
  ok: boolean;
  messageId: string;
}

export interface UnsendMessageRequest {
  matchId: string;
  messageId: string;
}

export interface EditMessageRequest {
  matchId: string;
  messageId: string;
  content: string;
}

export interface MarkMessagesReadRequest {
  matchId: string;
}

export interface MarkMessagesReadResponse {
  ok: boolean;
  markedCount: number;
}

export interface SetTypingRequest {
  matchId: string;
  isTyping: boolean;
}

export interface SetMatchPinnedRequest {
  matchId: string;
  pinned: boolean;
}

export interface ClearConversationRequest {
  matchId: string;
}

export interface ClearConversationResponse {
  ok: boolean;
  /** ISO timestamp of the watermark the backend just wrote. */
  clearedAt: string;
}

export interface SetPresenceStatusRequest {
  isOnline: boolean;
}

export interface AddReactionRequest {
  matchId: string;
  messageId: string;
  emoji: string;
}

/** removeReaction takes NO emoji — the backend stores one reaction per user. */
export interface RemoveReactionRequest {
  matchId: string;
  messageId: string;
}

export interface GetChatMediaSignedUrlRequest {
  matchId: string;
  /** Storage path of the media object (backend param name: `filePath`). */
  filePath: string;
}

export interface GetChatMediaSignedUrlResponse {
  url: string;
}

// Safety & Moderation (shapes verified against functions/src/index.ts)
export interface ReportUserRequest {
  reportedId: string;
  reason: string;
  matchId?: string;
  messageId?: string;
  source?: string;
  description?: string;
}

export interface BlockUserRequest {
  blockedId: string;
}

export interface BlockedUser {
  id: string;
  name: string | null;
  photoUrl: string | null;
  blockedAt: string | null;
}

export interface GetBlockedUsersResponse {
  ok: boolean;
  blocked: BlockedUser[];
}

export interface ActivateBoostResponse {
  ok: boolean;
  isActive: boolean;
  activeUntil: string;
  cooldownUntil: string;
  lastActivatedAt: string;
  durationMinutes: number;
  cooldownHours: number;
}

export interface PromoRequest {
  code: string;
  planId?: string;
}

export interface ValidatePromoResponse {
  ok: boolean;
  isValid: boolean;
  error?: string;
  discountPercent?: number;
  isFreeAccess?: boolean;
}

export interface RedeemPromoResponse {
  ok: boolean;
  isFreeAccess: boolean;
  discountPercent: number;
}

export interface StreakStatusResponse {
  ok: boolean;
  isPremium: boolean;
  currentStreak: number;
  longestStreak: number;
  baseLikes: number;
  streakBonus: number;
  totalAllowed: number; // -1 = unlimited (premium)
  used: number;
  remaining: number; // -1 = unlimited
  nextMilestoneDays: number | null;
  nextMilestoneBonus: number | null;
  maintainedToday: boolean;
  lastActivityDate: string | null;
  streakStartDate: string | null;
}

export interface RecordStreakResponse {
  ok: boolean;
  currentStreak: number;
  longestStreak: number;
  streakBonus: number;
  incremented: boolean;
  isNewRecord: boolean;
}

/**
 * Canonical match document shape as stored in Firestore (matches/{matchId}).
 * Used by read paths (getMatch / subscribeToMatches), NOT returned by swipeRight.
 */
export interface BackendMatchDoc {
  userIds: string[];
  status: 'active' | 'unmatched';
  preMatchRequests?: Record<string, number>;
  pinnedForUser?: Record<string, boolean>;
  /** Per-user "delete chat" watermarks written by clearConversation. */
  clearedAt?: Record<string, unknown>;
  createdAt?: unknown;
  lastMessageAt?: unknown;
  lastMessageContent?: string | null;
  lastMessageType?: string;
  lastMessageFromUserId?: string;
  readBy?: Record<string, unknown>;
  typing?: Record<string, boolean>;
  isSuperLike?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Generic callable invoker
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Invoke a backend callable with typed request/response. Throws on error so
 * callers can use try/catch consistently.
 */
async function invokeCallable<TRequest, TResponse>(
  name: string,
  data: TRequest
): Promise<TResponse> {
  const functions = getFirebaseFunctions();
  const callable = httpsCallable<TRequest, TResponse>(functions, name);
  const result: HttpsCallableResult<TResponse> = await callable(data);
  return result.data;
}

// ─────────────────────────────────────────────────────────────────────────────
// Typed callable bindings (one per backend export)
// ─────────────────────────────────────────────────────────────────────────────

export const callables = {
  // Versioned onboarding. Responses are normalized defensively by
  // services/onboarding because the backend may add canonical snapshot fields.
  resolveOnboardingState: (data: Record<string, never>) =>
    invokeCallable<Record<string, never>, unknown>('resolveOnboardingState', data),
  saveOnboardingStep: (data: SaveOnboardingStepRequest) =>
    invokeCallable<SaveOnboardingStepRequest, unknown>('saveOnboardingStep', data),
  completeOnboarding: (data: Record<string, never>) =>
    invokeCallable<Record<string, never>, unknown>('completeOnboarding', data),
  claimUsername: (data: ClaimUsernameRequest) =>
    invokeCallable<ClaimUsernameRequest, unknown>('claimUsername', data),
  checkUsernameAvailability: (data: ClaimUsernameRequest) =>
    invokeCallable<ClaimUsernameRequest, CheckUsernameAvailabilityResponse>(
      'checkUsernameAvailability',
      data
    ),
  syncEmailVerification: (data: Record<string, never>) =>
    invokeCallable<Record<string, never>, unknown>('syncEmailVerification', data),
  confirmCurrentLocation: (data: ConfirmCurrentLocationRequest) =>
    invokeCallable<ConfirmCurrentLocationRequest, unknown>('confirmCurrentLocation', data),
  validateProfilePhoto: (data: ValidateProfilePhotoRequest) =>
    invokeCallable<ValidateProfilePhotoRequest, unknown>('validateProfilePhoto', data),

  // Discovery & Matching
  swipeRight: (data: SwipeRightRequest) =>
    invokeCallable<SwipeRightRequest, SwipeRightResponse>('swipeRight', data),
  swipeLeft: (data: SwipeLeftRequest) =>
    invokeCallable<SwipeLeftRequest, OkResponse>('swipeLeft', data),
  unmatch: (data: UnmatchRequest) => invokeCallable<UnmatchRequest, OkResponse>('unmatch', data),
  setMatchPinned: (data: SetMatchPinnedRequest) =>
    invokeCallable<SetMatchPinnedRequest, OkResponse>('setMatchPinned', data),
  /**
   * "Delete chat" — one-sided and non-destructive. Stamps clearedAt.{uid} on
   * the match doc; the other participant's copy and the match itself are
   * untouched.
   */
  clearConversation: (data: ClearConversationRequest) =>
    invokeCallable<ClearConversationRequest, ClearConversationResponse>(
      'clearConversation',
      data
    ),

  // Chat & Messages
  sendMessage: (data: SendMessageRequest) =>
    invokeCallable<SendMessageRequest, SendMessageResponse>('sendMessage', data),
  unsendMessage: (data: UnsendMessageRequest) =>
    invokeCallable<UnsendMessageRequest, OkResponse>('unsendMessage', data),
  editMessage: (data: EditMessageRequest) =>
    invokeCallable<EditMessageRequest, OkResponse>('editMessage', data),
  markMessagesRead: (data: MarkMessagesReadRequest) =>
    invokeCallable<MarkMessagesReadRequest, MarkMessagesReadResponse>('markMessagesRead', data),
  setTyping: (data: SetTypingRequest) =>
    invokeCallable<SetTypingRequest, OkResponse>('setTyping', data),
  setPresenceStatus: (data: SetPresenceStatusRequest) =>
    invokeCallable<SetPresenceStatusRequest, OkResponse>('setPresenceStatus', data),
  addReaction: (data: AddReactionRequest) =>
    invokeCallable<AddReactionRequest, OkResponse>('addReaction', data),
  removeReaction: (data: RemoveReactionRequest) =>
    invokeCallable<RemoveReactionRequest, OkResponse>('removeReaction', data),
  getChatMediaSignedUrl: (data: GetChatMediaSignedUrlRequest) =>
    invokeCallable<GetChatMediaSignedUrlRequest, GetChatMediaSignedUrlResponse>(
      'getChatMediaSignedUrl',
      data
    ),

  // Safety & Moderation
  reportUser: (data: ReportUserRequest) =>
    invokeCallable<ReportUserRequest, OkResponse>('reportUser', data),
  blockUser: (data: BlockUserRequest) =>
    invokeCallable<BlockUserRequest, OkResponse>('blockUser', data),
  unblockUser: (data: BlockUserRequest) =>
    invokeCallable<BlockUserRequest, OkResponse>('unblockUser', data),
  getBlockedUsers: () =>
    invokeCallable<Record<string, never>, GetBlockedUsersResponse>('getBlockedUsers', {}),

  // Entitlement-affecting actions (server-owned)
  activateBoost: () =>
    invokeCallable<Record<string, never>, ActivateBoostResponse>('activateBoost', {}),
  validatePromoCode: (data: PromoRequest) =>
    invokeCallable<PromoRequest, ValidatePromoResponse>('validatePromoCode', data),
  redeemPromoCode: (data: PromoRequest) =>
    invokeCallable<PromoRequest, RedeemPromoResponse>('redeemPromoCode', data),
  getStreakStatus: () =>
    invokeCallable<Record<string, never>, StreakStatusResponse>('getStreakStatus', {}),
  recordStreakActivity: () =>
    invokeCallable<Record<string, never>, RecordStreakResponse>('recordStreakActivity', {}),
} as const;

export { invokeCallable };
