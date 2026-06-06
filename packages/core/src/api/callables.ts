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

export type CallableMessageType =
  | 'text'
  | 'image'
  | 'video'
  | 'audio'
  | 'voice'
  | 'gift';

/** Standard backend success envelope. */
export interface OkResponse {
  ok: boolean;
}

// Discovery & Matching
export interface SwipeRightRequest {
  targetUserId: string;
  attachedMessage?: string;
}

export interface SwipeRightResponse {
  matched: boolean;
  matchId?: string;
}

export interface SwipeLeftRequest {
  targetUserId: string;
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

// Safety & Moderation
export interface ReportUserRequest {
  reportedId: string;
  reason: string;
  context?: string;
}

export interface BlockUserRequest {
  targetUserId: string;
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
  // Discovery & Matching
  swipeRight: (data: SwipeRightRequest) =>
    invokeCallable<SwipeRightRequest, SwipeRightResponse>('swipeRight', data),
  swipeLeft: (data: SwipeLeftRequest) =>
    invokeCallable<SwipeLeftRequest, OkResponse>('swipeLeft', data),
  unmatch: (data: UnmatchRequest) =>
    invokeCallable<UnmatchRequest, OkResponse>('unmatch', data),

  // Chat & Messages
  sendMessage: (data: SendMessageRequest) =>
    invokeCallable<SendMessageRequest, SendMessageResponse>('sendMessage', data),
  unsendMessage: (data: UnsendMessageRequest) =>
    invokeCallable<UnsendMessageRequest, OkResponse>('unsendMessage', data),
  editMessage: (data: EditMessageRequest) =>
    invokeCallable<EditMessageRequest, OkResponse>('editMessage', data),
  markMessagesRead: (data: MarkMessagesReadRequest) =>
    invokeCallable<MarkMessagesReadRequest, MarkMessagesReadResponse>(
      'markMessagesRead',
      data
    ),
  setTyping: (data: SetTypingRequest) =>
    invokeCallable<SetTypingRequest, OkResponse>('setTyping', data),
  setPresenceStatus: (data: SetPresenceStatusRequest) =>
    invokeCallable<SetPresenceStatusRequest, OkResponse>(
      'setPresenceStatus',
      data
    ),
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
} as const;

export { invokeCallable };
