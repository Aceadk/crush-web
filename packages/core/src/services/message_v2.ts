/**
 * MessageServiceV2 — canonical backend-aligned chat service.
 *
 * Replaces the legacy `message.ts` (which used top-level `conversations/` and
 * `typing_indicators/`). This service reads from the canonical
 * `matches/{matchId}/messages` subcollection and routes ALL mutations through
 * backend callables, matching the Flutter mobile client and the Firestore
 * security rules.
 *
 * See:
 * - docs/reports/web_chat_match_migration_plan_2026-06-05.md (Option B)
 * - docs/reports/shared_backend_contract_matrix_2026-06-05.md
 */

import {
  collection,
  doc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  startAfter,
  Timestamp,
  Unsubscribe,
  DocumentSnapshot,
} from 'firebase/firestore';
import { getFirebaseAuth, getFirebaseDb } from '../firebase/config';
import {
  callables,
  type CallableMessageType,
} from '../api/callables';
import {
  Message,
  MessageMetadata,
  MessageReaction,
  MessageReactionType,
  MessageStatus,
  MessageType,
  MESSAGES_PER_PAGE,
} from '../types/message';

const MATCHES_COLLECTION = 'matches';
const MESSAGES_SUBCOLLECTION = 'messages';

/** Map the web MessageType to the backend's CallableMessageType. */
function toCallableMessageType(type: MessageType): CallableMessageType {
  switch (type) {
    case 'text':
      return 'text';
    case 'image':
      return 'image';
    case 'video':
      return 'video';
    case 'audio':
      return 'audio';
    case 'gif':
      // Backend has no distinct gif type; treat as image.
      return 'image';
    case 'system':
      // System messages are backend-generated; default to text for safety.
      return 'text';
    default:
      return 'text';
  }
}

class MessageServiceV2 {
  private requireUserId(): string {
    const userId = getFirebaseAuth().currentUser?.uid;
    if (!userId) {
      throw new Error('User must be authenticated for chat operations');
    }
    return userId;
  }

  private toIsoString(value: unknown): string {
    if (value instanceof Timestamp) {
      return value.toDate().toISOString();
    }
    if (typeof value === 'number') {
      return new Date(value).toISOString();
    }
    if (typeof value === 'string') {
      return value;
    }
    return new Date().toISOString();
  }

  /**
   * Map a canonical backend message doc (matches/{matchId}/messages/{id}) to the
   * web Message type. Handles both the backend field names (isRead, createdAt,
   * visibleTo) and any legacy fields encountered during migration.
   */
  private mapDocToMessage(
    id: string,
    matchId: string,
    data: Record<string, unknown>
  ): Message {
    const isRead = data.isRead === true;
    const deletedAt = data.deletedAt;
    const isDeleted = Boolean(deletedAt);

    // Derive status from backend fields. Backend doesn't store a per-message
    // status enum; we synthesize one from isRead + sender.
    let status: MessageStatus = 'sent';
    if (isRead) {
      status = 'read';
    }

    // Reactions in backend are a map { emoji: [uid, ...] }; flatten to the
    // web's MessageReaction[] shape.
    const reactions: MessageReaction[] = [];
    const rawReactions = data.reactions;
    if (rawReactions && typeof rawReactions === 'object') {
      for (const [emoji, uids] of Object.entries(
        rawReactions as Record<string, unknown>
      )) {
        if (Array.isArray(uids)) {
          for (const uid of uids) {
            if (typeof uid === 'string') {
              reactions.push({
                emoji: emoji as MessageReactionType,
                userId: uid,
                timestamp: this.toIsoString(data.createdAt),
              });
            }
          }
        }
      }
    }

    const metadata: MessageMetadata | undefined =
      data.mediaUrl || data.mediaMetadata
        ? {
            imageUrl:
              data.type === 'image'
                ? (data.mediaUrl as string | undefined)
                : undefined,
            videoUrl:
              data.type === 'video'
                ? (data.mediaUrl as string | undefined)
                : undefined,
            audioUrl:
              data.type === 'audio' || data.type === 'voice'
                ? (data.mediaUrl as string | undefined)
                : undefined,
            ...(typeof data.mediaMetadata === 'object' && data.mediaMetadata
              ? (data.mediaMetadata as Record<string, number>)
              : {}),
          }
        : undefined;

    return {
      id,
      conversationId: matchId, // V2: conversationId IS the matchId
      senderId: (data.senderId as string) ?? '',
      content: (data.content as string) ?? '',
      type: (data.type as MessageType) ?? 'text',
      status,
      timestamp: this.toIsoString(data.createdAt),
      readAt: data.readAt ? this.toIsoString(data.readAt) : undefined,
      metadata,
      reactions: reactions.length > 0 ? reactions : undefined,
      editedAt: data.editedAt ? this.toIsoString(data.editedAt) : undefined,
      isDeleted,
      deletedAt: deletedAt ? this.toIsoString(deletedAt) : undefined,
    };
  }

  /**
   * Get messages for a match (paginated, newest first).
   */
  async getMessages(
    matchId: string,
    lastDoc?: DocumentSnapshot,
    pageSize: number = MESSAGES_PER_PAGE
  ): Promise<{ messages: Message[]; lastDoc?: DocumentSnapshot }> {
    const db = getFirebaseDb();
    const baseConstraints = [orderBy('createdAt', 'desc'), limit(pageSize)];

    const q = lastDoc
      ? query(
          collection(db, MATCHES_COLLECTION, matchId, MESSAGES_SUBCOLLECTION),
          orderBy('createdAt', 'desc'),
          startAfter(lastDoc),
          limit(pageSize)
        )
      : query(
          collection(db, MATCHES_COLLECTION, matchId, MESSAGES_SUBCOLLECTION),
          ...baseConstraints
        );

    const snapshot = await getDocs(q);
    const messages = snapshot.docs.map((d) =>
      this.mapDocToMessage(d.id, matchId, d.data())
    );

    return {
      messages,
      lastDoc: snapshot.docs[snapshot.docs.length - 1],
    };
  }

  /**
   * Subscribe to realtime messages for a match.
   */
  subscribeToMessages(
    matchId: string,
    callback: (messages: Message[]) => void
  ): Unsubscribe {
    const db = getFirebaseDb();
    const q = query(
      collection(db, MATCHES_COLLECTION, matchId, MESSAGES_SUBCOLLECTION),
      orderBy('createdAt', 'desc'),
      limit(MESSAGES_PER_PAGE)
    );

    return onSnapshot(q, (snapshot) => {
      const messages = snapshot.docs.map((d) =>
        this.mapDocToMessage(d.id, matchId, d.data())
      );
      callback(messages);
    });
  }

  /**
   * Send a message via the backend `sendMessage` callable.
   */
  async sendMessage(
    matchId: string,
    content: string,
    type: MessageType = 'text',
    mediaUrl?: string
  ): Promise<{ messageId: string; timestamp: number }> {
    const result = await callables.sendMessage({
      matchId,
      type: toCallableMessageType(type),
      content,
      mediaUrl,
    });
    return { messageId: result.messageId, timestamp: result.timestamp };
  }

  /**
   * Unsend (delete) a message via the backend `unsendMessage` callable.
   */
  async unsendMessage(matchId: string, messageId: string): Promise<void> {
    await callables.unsendMessage({ matchId, messageId });
  }

  /**
   * Edit a message via the backend `editMessage` callable.
   */
  async editMessage(
    matchId: string,
    messageId: string,
    content: string
  ): Promise<void> {
    await callables.editMessage({ matchId, messageId, content });
  }

  /**
   * Mark messages as read via the backend `markMessagesRead` callable.
   */
  async markMessagesRead(
    matchId: string,
    upToTimestamp: number = Date.now()
  ): Promise<void> {
    await callables.markMessagesRead({ matchId, upToTimestamp });
  }

  /**
   * Set typing indicator via the backend `setTyping` callable.
   * Silent-fails: typing indicators are non-critical.
   */
  async setTyping(matchId: string, isTyping: boolean): Promise<void> {
    try {
      await callables.setTyping({ matchId, isTyping });
    } catch {
      // Typing indicators are best-effort; ignore failures.
    }
  }

  /**
   * Subscribe to typing indicators for a match. Backend stores typing state on
   * the match document under a `typing` map keyed by userId.
   */
  subscribeToTyping(
    matchId: string,
    callback: (typingUserIds: string[]) => void
  ): Unsubscribe {
    const db = getFirebaseDb();
    const currentUserId = getFirebaseAuth().currentUser?.uid;
    const matchRef = doc(db, MATCHES_COLLECTION, matchId);

    return onSnapshot(matchRef, (snapshot) => {
      const data = snapshot.data();
      const typing = (data?.typing as Record<string, unknown>) ?? {};
      const typingUserIds = Object.entries(typing)
        .filter(([uid, isTyping]) => uid !== currentUserId && isTyping === true)
        .map(([uid]) => uid);
      callback(typingUserIds);
    });
  }

  /**
   * Add a reaction via the backend `addReaction` callable.
   */
  async addReaction(
    matchId: string,
    messageId: string,
    emoji: MessageReactionType
  ): Promise<void> {
    await callables.addReaction({ matchId, messageId, emoji });
  }

  /**
   * Remove a reaction via the backend `removeReaction` callable.
   */
  async removeReaction(
    matchId: string,
    messageId: string,
    emoji: MessageReactionType
  ): Promise<void> {
    await callables.removeReaction({ matchId, messageId, emoji });
  }

  /**
   * Resolve a signed URL for chat media via the backend callable.
   */
  async getMediaSignedUrl(matchId: string, mediaPath: string): Promise<string> {
    const result = await callables.getChatMediaSignedUrl({ matchId, mediaPath });
    return result.url;
  }
}

export const messageServiceV2 = new MessageServiceV2();
export { MessageServiceV2 };
