/**
 * MessageServiceV2 adapter.
 *
 * Implements the subset of the legacy `messageService` surface that
 * `stores/message.ts` calls, but routes to the canonical backend-aligned
 * MessageServiceV2. In V2 the "conversation id" IS the matchId.
 *
 * This lets the message store switch backends with a single import swap
 * (gated by isV2ChatEnabled()) instead of rewriting every action.
 *
 * Reads are allowed directly under Firestore rules; only writes are restricted
 * (and those go through callables via messageServiceV2).
 */

import {
  doc,
  getDoc,
  DocumentSnapshot,
} from 'firebase/firestore';
import { getFirebaseDb } from '../firebase/config';
import { messageServiceV2 } from './message_v2';
import { matchServiceV2 } from './match_v2';
import { callables } from '../api/callables';
import {
  Conversation,
  Message,
  MessageMetadata,
  MessageReactionType,
  MessageType,
  TypingIndicator,
} from '../types/message';

import { Match } from '../types/match';

const MATCHES_COLLECTION = 'matches';
const MESSAGES_SUBCOLLECTION = 'messages';

/**
 * Build the minimal Message the conversation list renders as a preview, from a
 * Match's denormalized last-message fields. `m.lastMessage` is already
 * media-safe (see match_v2.mapDocToMatch → messagePreview). Returns undefined
 * when there is no message yet, so the list falls back to "Start a
 * conversation!".
 */
function buildPreviewMessage(m: Match): Message | undefined {
  if (!m.lastMessage) return undefined;
  return {
    id: '',
    conversationId: m.id,
    senderId: m.lastMessageFromUserId ?? '',
    content: m.lastMessage,
    type: 'text',
    status: 'sent',
    timestamp: m.lastMessageAt ?? m.updatedAt,
  };
}

function mediaUrlFromMetadata(metadata?: MessageMetadata): string | undefined {
  if (!metadata) return undefined;
  return (
    metadata.imageUrl ??
    metadata.videoUrl ??
    metadata.audioUrl ??
    metadata.gifUrl ??
    undefined
  );
}

/**
 * Resolve the other participant of a match from its doc. Returns '' if it
 * cannot be determined (caller should handle).
 */
async function resolveOtherParticipant(
  matchId: string,
  selfId: string
): Promise<string> {
  const db = getFirebaseDb();
  const snap = await getDoc(doc(db, MATCHES_COLLECTION, matchId));
  const userIds = (snap.data()?.userIds as string[]) ?? [];
  return userIds.find((uid) => uid !== selfId) ?? '';
}

export const messageServiceV2Adapter = {
  /**
   * List conversations = active matches mapped to the Conversation shape.
   */
  async getConversations(userId: string): Promise<Conversation[]> {
    const matches = await matchServiceV2.getMatches();
    return matches.map((m) => ({
      id: m.id, // conversation id === matchId
      matchId: m.id,
      participants: [userId, m.otherUserId],
      // Synthesize the last-message preview from the match's denormalized
      // fields so the conversation list shows a media-safe preview (and a
      // "You:" prefix) instead of always "Start a conversation!".
      lastMessage: buildPreviewMessage(m),
      lastMessageAt: m.lastMessageAt,
      unreadCount: m.unreadCount,
      createdAt: m.createdAt,
      updatedAt: m.updatedAt,
      isBlocked: false,
    }));
  },

  /**
   * In V2 there is no separate conversation doc — synthesize one keyed by the
   * matchId so the store can treat it uniformly.
   */
  async getOrCreateConversation(
    matchId: string,
    participants: string[]
  ): Promise<Conversation> {
    const nowIso = new Date().toISOString();
    return {
      id: matchId,
      matchId,
      participants,
      unreadCount: 0,
      createdAt: nowIso,
      updatedAt: nowIso,
      isBlocked: false,
    };
  },

  subscribeToMessages(
    conversationId: string,
    callback: (messages: Message[]) => void
  ) {
    return messageServiceV2.subscribeToMessages(conversationId, callback);
  },

  subscribeToTypingIndicator(
    conversationId: string,
    currentUserId: string,
    callback: (typing: TypingIndicator | null) => void
  ) {
    return messageServiceV2.subscribeToTyping(
      conversationId,
      (typingUserIds) => {
        const otherTyping = typingUserIds.find((uid) => uid !== currentUserId);
        callback(
          otherTyping
            ? {
                conversationId,
                userId: otherTyping,
                isTyping: true,
                timestamp: new Date().toISOString(),
              }
            : null
        );
      }
    );
  },

  getMessages(conversationId: string, lastDoc?: DocumentSnapshot) {
    return messageServiceV2.getMessages(conversationId, lastDoc);
  },

  /**
   * Send via the backend callable, then return a Message for the store's
   * optimistic replacement. The realtime subscription reconciles the canonical
   * doc shortly after.
   */
  async sendMessage(
    conversationId: string,
    senderId: string,
    content: string,
    type: MessageType = 'text',
    metadata?: MessageMetadata
  ): Promise<Message> {
    const toUserId = await resolveOtherParticipant(conversationId, senderId);
    const { messageId } = await messageServiceV2.sendMessage(
      conversationId,
      content,
      type,
      { mediaUrl: mediaUrlFromMetadata(metadata), toUserId }
    );
    return {
      id: messageId,
      conversationId,
      senderId,
      content,
      type,
      status: 'sent',
      timestamp: new Date().toISOString(),
      metadata,
    };
  },

  async markMessagesAsRead(
    conversationId: string,
    _userId: string,
    _messageIds: string[]
  ): Promise<void> {
    // Backend marks all unread messages addressed to the caller; per-id and
    // per-user args are not needed.
    await messageServiceV2.markMessagesRead(conversationId);
  },

  async setTypingIndicator(
    conversationId: string,
    _userId: string,
    isTyping: boolean
  ): Promise<void> {
    await messageServiceV2.setTyping(conversationId, isTyping);
  },

  /**
   * Toggle a reaction. The backend stores one reaction per user, so we read the
   * current reaction to decide add vs remove. (Read is rules-allowed.)
   */
  async toggleReaction(
    conversationId: string,
    messageId: string,
    userId: string,
    emoji: MessageReactionType
  ): Promise<void> {
    const db = getFirebaseDb();
    const msgSnap = await getDoc(
      doc(db, MATCHES_COLLECTION, conversationId, MESSAGES_SUBCOLLECTION, messageId)
    );
    const reactions = (msgSnap.data()?.reactions as Record<string, string>) ?? {};
    if (reactions[userId] === emoji) {
      await messageServiceV2.removeReaction(conversationId, messageId);
    } else {
      await messageServiceV2.addReaction(conversationId, messageId, emoji);
    }
  },

  async editMessage(
    conversationId: string,
    messageId: string,
    _userId: string,
    newContent: string
  ): Promise<void> {
    await messageServiceV2.editMessage(conversationId, messageId, newContent);
  },

  async deleteMessage(
    conversationId: string,
    messageId: string,
    _userId: string
  ): Promise<void> {
    await messageServiceV2.unsendMessage(conversationId, messageId);
  },

  /**
   * Blocking is a user-level action in V2 (blockUser callable), keyed by the
   * other participant rather than the conversation.
   */
  async setConversationBlocked(
    conversationId: string,
    userId: string,
    isBlocked: boolean
  ): Promise<void> {
    const blockedId = await resolveOtherParticipant(conversationId, userId);
    if (!blockedId) return;
    if (isBlocked) {
      await callables.blockUser({ blockedId });
    } else {
      await callables.unblockUser({ blockedId });
    }
  },
};

export type MessageServiceV2Adapter = typeof messageServiceV2Adapter;
