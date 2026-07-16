/**
 * MessageServiceV2 — canonical backend-aligned chat service.
 *
 * Replaces the legacy `message.ts` (which used top-level `conversations/` and
 * `typing_indicators/`). This service reads from the canonical
 * `matches/{matchId}/messages` subcollection and routes ALL mutations through
 * backend callables, matching the Flutter mobile client and the Firestore
 * security rules.
 *
 * Backend message schema (verified against functions/src/index.ts 2026-06-05):
 *   matchId, fromUserId, toUserId, content, type, mediaUrl, sentAt, isRead,
 *   isDeletedForSender, isDeletedForRecipient, reactions: { [uid]: emoji },
 *   visibleTo: [uid, toUserId], readAt, readBy.
 *
 * See:
 * - docs/reports/web_chat_match_migration_plan_2026-06-05.md (Option B)
 * - docs/reports/shared_backend_contract_matrix_2026-06-05.md
 */

import {
  collection,
  doc,
  getDoc,
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
import { callables, type CallableMessageType } from '../api/callables';
import {
  decodeLegacyEncryptedContent,
  isLegacyEncryptedContent,
  LEGACY_ENCRYPTED_FALLBACK,
} from './legacy_cipher';
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
   * Resolve the other participant's uid from a match document. The backend
   * `sendMessage` callable requires `toUserId`, but chat callers typically only
   * hold the matchId. Pass `toUserId` explicitly to skip this lookup.
   */
  private async resolveOtherUserId(matchId: string): Promise<string> {
    const viewerId = this.requireUserId();
    const db = getFirebaseDb();
    const snapshot = await getDoc(doc(db, MATCHES_COLLECTION, matchId));
    if (!snapshot.exists()) {
      throw new Error(`Match ${matchId} not found`);
    }
    const userIds = (snapshot.data()?.userIds as string[]) ?? [];
    const other = userIds.find((uid) => uid !== viewerId);
    if (!other) {
      throw new Error(`Could not resolve recipient for match ${matchId}`);
    }
    return other;
  }

  /**
   * Map a canonical backend message doc (matches/{matchId}/messages/{id}) to the
   * web Message type. Backend uses fromUserId/sentAt/isRead and a per-user
   * reactions map { [uid]: emoji }.
   */
  private mapDocToMessage(
    id: string,
    matchId: string,
    data: Record<string, unknown>
  ): Message {
    const viewerId = getFirebaseAuth().currentUser?.uid;
    const senderId = (data.fromUserId as string) ?? '';
    const isRead = data.isRead === true;

    // Soft-delete: backend tracks per-side deletion flags.
    const isDeletedForSender = data.isDeletedForSender === true;
    const isDeletedForRecipient = data.isDeletedForRecipient === true;
    const viewerIsSender = viewerId === senderId;
    const isDeleted = viewerIsSender
      ? isDeletedForSender
      : isDeletedForRecipient;

    // Status: synthesized from sender + isRead. Outbound read messages show
    // 'read'; everything else is 'sent' (delivery is implicit once persisted).
    const status: MessageStatus = isRead ? 'read' : 'sent';

    // Reactions: backend stores { [uid]: emoji } (one reaction per user).
    const reactions: MessageReaction[] = [];
    const rawReactions = data.reactions;
    if (rawReactions && typeof rawReactions === 'object') {
      for (const [uid, emoji] of Object.entries(
        rawReactions as Record<string, unknown>
      )) {
        if (typeof emoji === 'string' && emoji.length > 0) {
          reactions.push({
            emoji: emoji as MessageReactionType,
            userId: uid,
            timestamp: this.toIsoString(data.sentAt),
          });
        }
      }
    }

    // Mobile historically writes type 'voice' for audio notes; normalize so
    // both platforms agree. Older mobile builds also stored the media URL in
    // content with no mediaUrl field — fall back so their media stays playable.
    const rawType = ((data.type as string) ?? 'text').toLowerCase();
    const type: MessageType =
      rawType === 'voice' ? 'audio' : ((rawType as MessageType) || 'text');
    const rawContent = (data.content as string) ?? '';
    const mediaUrl =
      (data.mediaUrl as string | undefined) ??
      (type !== 'text' && /^https?:\/\//.test(rawContent)
        ? rawContent
        : undefined);
    const metadata: MessageMetadata | undefined = mediaUrl
      ? {
          imageUrl: type === 'image' ? mediaUrl : undefined,
          videoUrl: type === 'video' ? mediaUrl : undefined,
          audioUrl: type === 'audio' ? mediaUrl : undefined,
          gifUrl: type === 'gif' ? mediaUrl : undefined,
        }
      : undefined;

    return {
      id,
      conversationId: matchId, // V2: conversationId IS the matchId
      senderId,
      content: (data.content as string) ?? '',
      type,
      status,
      timestamp: this.toIsoString(data.sentAt),
      readAt: data.readAt ? this.toIsoString(data.readAt) : undefined,
      metadata,
      reactions: reactions.length > 0 ? reactions : undefined,
      editedAt: data.editedAt ? this.toIsoString(data.editedAt) : undefined,
      isDeleted,
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

    const q = lastDoc
      ? query(
          collection(db, MATCHES_COLLECTION, matchId, MESSAGES_SUBCOLLECTION),
          orderBy('sentAt', 'desc'),
          startAfter(lastDoc),
          limit(pageSize)
        )
      : query(
          collection(db, MATCHES_COLLECTION, matchId, MESSAGES_SUBCOLLECTION),
          orderBy('sentAt', 'desc'),
          limit(pageSize)
        );

    const snapshot = await getDocs(q);
    const messages = await Promise.all(
      snapshot.docs.map((d) =>
        this.decodeLegacyContent(
          matchId,
          d.data(),
          this.mapDocToMessage(d.id, matchId, d.data())
        )
      )
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
      orderBy('sentAt', 'desc'),
      limit(MESSAGES_PER_PAGE)
    );

    // Legacy-message decoding is async; guard against a slow older snapshot
    // resolving after a newer one and delivering stale messages.
    let latestSnapshotSeq = 0;
    return onSnapshot(q, (snapshot) => {
      const seq = ++latestSnapshotSeq;
      void Promise.all(
        snapshot.docs.map((d) =>
          this.decodeLegacyContent(
            matchId,
            d.data(),
            this.mapDocToMessage(d.id, matchId, d.data())
          )
        )
      ).then((messages) => {
        if (seq === latestSnapshotSeq) {
          callback(messages);
        }
      });
    });
  }

  /**
   * Replace legacy "enc_v1:" ciphertext (written by older mobile builds)
   * with its decoded plaintext, or a lock placeholder when undecodable.
   * Plaintext messages pass through untouched. See legacy_cipher.ts.
   */
  private async decodeLegacyContent(
    matchId: string,
    data: Record<string, unknown>,
    message: Message
  ): Promise<Message> {
    if (message.type !== 'text' || !isLegacyEncryptedContent(message.content)) {
      return message;
    }
    const decoded = await decodeLegacyEncryptedContent({
      matchId,
      fromUserId: (data.fromUserId as string) ?? '',
      toUserId: (data.toUserId as string) ?? '',
      content: message.content,
    });
    return { ...message, content: decoded ?? LEGACY_ENCRYPTED_FALLBACK };
  }

  /**
   * Send a message via the backend `sendMessage` callable.
   *
   * @param toUserId Optional recipient uid. If omitted it is resolved from the
   *   match document (one extra read). Pass it when the caller already knows it.
   */
  async sendMessage(
    matchId: string,
    content: string,
    type: MessageType = 'text',
    options?: { mediaUrl?: string; toUserId?: string }
  ): Promise<{ messageId: string }> {
    const toUserId =
      options?.toUserId ?? (await this.resolveOtherUserId(matchId));
    const result = await callables.sendMessage({
      matchId,
      toUserId,
      type: toCallableMessageType(type),
      content,
      mediaUrl: options?.mediaUrl,
    });
    return { messageId: result.messageId };
  }

  /**
   * Unsend (delete) a message via the backend `unsendMessage` callable.
   * Backend restricts this to Plus-plan users.
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
   * Returns the count of messages marked.
   */
  async markMessagesRead(matchId: string): Promise<number> {
    const result = await callables.markMessagesRead({ matchId });
    return result.markedCount;
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
   * Add a reaction via the backend `addReaction` callable. The backend stores
   * a single reaction per user ({ [uid]: emoji }), so adding replaces any prior
   * reaction by the same user.
   */
  async addReaction(
    matchId: string,
    messageId: string,
    emoji: MessageReactionType
  ): Promise<void> {
    await callables.addReaction({ matchId, messageId, emoji });
  }

  /**
   * Remove the current user's reaction via the backend `removeReaction`
   * callable. No emoji is needed — the backend removes the caller's reaction.
   */
  async removeReaction(matchId: string, messageId: string): Promise<void> {
    await callables.removeReaction({ matchId, messageId });
  }

  /**
   * Resolve a signed URL for chat media via the backend callable.
   */
  async getMediaSignedUrl(matchId: string, filePath: string): Promise<string> {
    const result = await callables.getChatMediaSignedUrl({ matchId, filePath });
    return result.url;
  }
}

export const messageServiceV2 = new MessageServiceV2();
export { MessageServiceV2 };
