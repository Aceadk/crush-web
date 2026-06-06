/**
 * Typed Cloud Functions callable wrappers.
 *
 * These wrap the backend callables documented in the shared backend contract
 * matrix (my_first_project/docs/reports/shared_backend_contract_matrix_2026-06-05.md).
 *
 * Web mutations MUST go through these callables instead of writing directly to
 * Firestore. The Firestore security rules reject direct client writes to
 * matches/, messages/, and other backend-managed collections.
 */

import { httpsCallable, HttpsCallableResult } from 'firebase/functions';
import { getFirebaseFunctions } from '../firebase/config';

// ─────────────────────────────────────────────────────────────────────────────
// Request/Response contracts (mirror functions/src/index.ts)
// ─────────────────────────────────────────────────────────────────────────────

export type CallableMessageType =
  | 'text'
  | 'image'
  | 'video'
  | 'audio'
  | 'voice'
  | 'gift';

// Discovery & Matching
export interface SwipeRequest {
  candidateId: string;
  message?: string;
}

export interface SwipeResponse {
  success: boolean;
  match?: BackendMatchDTO;
}

export interface UnmatchRequest {
  matchId: string;
}

export interface UnmatchResponse {
  success: boolean;
}

// Chat & Messages
export interface SendMessageRequest {
  matchId: string;
  type: CallableMessageType;
  content: string;
  mediaUrl?: string;
}

export interface SendMessageResponse {
  success: boolean;
  messageId: string;
  timestamp: number;
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
  upToTimestamp: number;
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

export interface RemoveReactionRequest {
  matchId: string;
  messageId: string;
  emoji: string;
}

export interface GetChatMediaSignedUrlRequest {
  matchId: string;
  mediaPath: string;
}

export interface GetChatMediaSignedUrlResponse {
  url: string;
}

// Safety & Moderation
export interface ReportUserRequest {
  userId: string;
  reason: string;
  context?: string;
}

export interface BlockUserRequest {
  userId: string;
}

export interface SimpleSuccessResponse {
  success: boolean;
}

// Backend match DTO as returned by callables (canonical shape).
export interface BackendMatchDTO {
  id: string;
  userIds: [string, string];
  status: 'active' | 'archived' | 'cancelled';
  createdAt: number | string;
  updatedAt: number | string;
  participants?: Record<
    string,
    {
      swipedAt?: number | string;
      lastMessageAt?: number | string;
      unreadCount?: number;
      lastReadTimestamp?: number | string;
    }
  >;
  settings?: {
    extendedRetention?: boolean;
  };
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
  swipeRight: (data: SwipeRequest) =>
    invokeCallable<SwipeRequest, SwipeResponse>('swipeRight', data),
  swipeLeft: (data: SwipeRequest) =>
    invokeCallable<SwipeRequest, SimpleSuccessResponse>('swipeLeft', data),
  unmatch: (data: UnmatchRequest) =>
    invokeCallable<UnmatchRequest, UnmatchResponse>('unmatch', data),

  // Chat & Messages
  sendMessage: (data: SendMessageRequest) =>
    invokeCallable<SendMessageRequest, SendMessageResponse>('sendMessage', data),
  unsendMessage: (data: UnsendMessageRequest) =>
    invokeCallable<UnsendMessageRequest, SimpleSuccessResponse>(
      'unsendMessage',
      data
    ),
  editMessage: (data: EditMessageRequest) =>
    invokeCallable<EditMessageRequest, SimpleSuccessResponse>(
      'editMessage',
      data
    ),
  markMessagesRead: (data: MarkMessagesReadRequest) =>
    invokeCallable<MarkMessagesReadRequest, SimpleSuccessResponse>(
      'markMessagesRead',
      data
    ),
  setTyping: (data: SetTypingRequest) =>
    invokeCallable<SetTypingRequest, SimpleSuccessResponse>('setTyping', data),
  setPresenceStatus: (data: SetPresenceStatusRequest) =>
    invokeCallable<SetPresenceStatusRequest, SimpleSuccessResponse>(
      'setPresenceStatus',
      data
    ),
  addReaction: (data: AddReactionRequest) =>
    invokeCallable<AddReactionRequest, SimpleSuccessResponse>(
      'addReaction',
      data
    ),
  removeReaction: (data: RemoveReactionRequest) =>
    invokeCallable<RemoveReactionRequest, SimpleSuccessResponse>(
      'removeReaction',
      data
    ),
  getChatMediaSignedUrl: (data: GetChatMediaSignedUrlRequest) =>
    invokeCallable<GetChatMediaSignedUrlRequest, GetChatMediaSignedUrlResponse>(
      'getChatMediaSignedUrl',
      data
    ),

  // Safety & Moderation
  reportUser: (data: ReportUserRequest) =>
    invokeCallable<ReportUserRequest, SimpleSuccessResponse>('reportUser', data),
  blockUser: (data: BlockUserRequest) =>
    invokeCallable<BlockUserRequest, SimpleSuccessResponse>('blockUser', data),
  unblockUser: (data: BlockUserRequest) =>
    invokeCallable<BlockUserRequest, SimpleSuccessResponse>('unblockUser', data),
} as const;

export { invokeCallable };
