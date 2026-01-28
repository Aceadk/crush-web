import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  orderBy,
  limit,
  startAfter,
  serverTimestamp,
  Timestamp,
  onSnapshot,
  Unsubscribe,
  addDoc,
  DocumentSnapshot,
  arrayUnion,
  arrayRemove,
} from 'firebase/firestore';
import { getFirebaseDb } from '../firebase/config';
import {
  Message,
  MessageType,
  MessageStatus,
  MessageMetadata,
  MessageReaction,
  MessageReactionType,
  Conversation,
  TypingIndicator,
  MESSAGES_PER_PAGE,
} from '../types/message';

const CONVERSATIONS_COLLECTION = 'conversations';
const MESSAGES_COLLECTION = 'messages';
const TYPING_COLLECTION = 'typing_indicators';

class MessageService {
  /**
   * Get or create a conversation for a match
   */
  async getOrCreateConversation(
    matchId: string,
    participants: string[]
  ): Promise<Conversation> {
    const db = getFirebaseDb();

    // Check if conversation exists
    const q = query(
      collection(db, CONVERSATIONS_COLLECTION),
      where('matchId', '==', matchId)
    );
    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      const doc = snapshot.docs[0];
      return this.mapDocToConversation(doc.id, doc.data());
    }

    // Create new conversation
    const now = serverTimestamp();
    const conversationData = {
      matchId,
      participants,
      unreadCount: 0,
      createdAt: now,
      updatedAt: now,
      isBlocked: false,
    };

    const conversationRef = await addDoc(
      collection(db, CONVERSATIONS_COLLECTION),
      conversationData
    );

    return {
      id: conversationRef.id,
      matchId,
      participants,
      unreadCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isBlocked: false,
    };
  }

  /**
   * Get messages for a conversation with pagination
   */
  async getMessages(
    conversationId: string,
    lastDoc?: DocumentSnapshot,
    pageSize: number = MESSAGES_PER_PAGE
  ): Promise<{ messages: Message[]; lastDoc?: DocumentSnapshot }> {
    const db = getFirebaseDb();

    let q = query(
      collection(db, CONVERSATIONS_COLLECTION, conversationId, MESSAGES_COLLECTION),
      orderBy('timestamp', 'desc'),
      limit(pageSize)
    );

    if (lastDoc) {
      q = query(
        collection(db, CONVERSATIONS_COLLECTION, conversationId, MESSAGES_COLLECTION),
        orderBy('timestamp', 'desc'),
        startAfter(lastDoc),
        limit(pageSize)
      );
    }

    const snapshot = await getDocs(q);
    const messages = snapshot.docs.map((doc) =>
      this.mapDocToMessage(doc.id, conversationId, doc.data())
    );

    return {
      messages,
      lastDoc: snapshot.docs[snapshot.docs.length - 1],
    };
  }

  /**
   * Subscribe to new messages in a conversation
   */
  subscribeToMessages(
    conversationId: string,
    callback: (messages: Message[]) => void
  ): Unsubscribe {
    const db = getFirebaseDb();

    const q = query(
      collection(db, CONVERSATIONS_COLLECTION, conversationId, MESSAGES_COLLECTION),
      orderBy('timestamp', 'desc'),
      limit(MESSAGES_PER_PAGE)
    );

    return onSnapshot(q, (snapshot) => {
      const messages = snapshot.docs.map((doc) =>
        this.mapDocToMessage(doc.id, conversationId, doc.data())
      );
      callback(messages);
    });
  }

  /**
   * Send a message
   */
  async sendMessage(
    conversationId: string,
    senderId: string,
    content: string,
    type: MessageType = 'text',
    metadata?: MessageMetadata
  ): Promise<Message> {
    const db = getFirebaseDb();
    const now = serverTimestamp();

    const messageData: Record<string, unknown> = {
      senderId,
      content,
      type,
      status: 'sent',
      timestamp: now,
    };

    if (metadata) {
      messageData.metadata = metadata;
    }

    const messageRef = await addDoc(
      collection(db, CONVERSATIONS_COLLECTION, conversationId, MESSAGES_COLLECTION),
      messageData
    );

    // Update conversation's last message
    const lastMessageContent = type === 'image' ? '📷 Photo' : content;
    await updateDoc(doc(db, CONVERSATIONS_COLLECTION, conversationId), {
      lastMessage: {
        id: messageRef.id,
        content: lastMessageContent,
        senderId,
        timestamp: now,
      },
      lastMessageAt: now,
      updatedAt: now,
    });

    return {
      id: messageRef.id,
      conversationId,
      senderId,
      content,
      type,
      status: 'sent',
      timestamp: new Date().toISOString(),
      metadata,
    };
  }

  /**
   * Mark messages as read
   */
  async markMessagesAsRead(
    conversationId: string,
    userId: string,
    messageIds: string[]
  ): Promise<void> {
    const db = getFirebaseDb();
    const now = serverTimestamp();

    // Update each message
    for (const messageId of messageIds) {
      await updateDoc(
        doc(db, CONVERSATIONS_COLLECTION, conversationId, MESSAGES_COLLECTION, messageId),
        {
          status: 'read',
          readAt: now,
        }
      );
    }

    // Reset unread count for the conversation
    await updateDoc(doc(db, CONVERSATIONS_COLLECTION, conversationId), {
      unreadCount: 0,
      updatedAt: now,
    });
  }

  /**
   * Set typing indicator
   */
  async setTypingIndicator(
    conversationId: string,
    userId: string,
    isTyping: boolean
  ): Promise<void> {
    const db = getFirebaseDb();

    await setDoc(doc(db, TYPING_COLLECTION, `${conversationId}_${userId}`), {
      conversationId,
      userId,
      isTyping,
      timestamp: serverTimestamp(),
    });
  }

  /**
   * Subscribe to typing indicators
   */
  subscribeToTypingIndicator(
    conversationId: string,
    userId: string,
    callback: (typing: TypingIndicator | null) => void
  ): Unsubscribe {
    const db = getFirebaseDb();

    // Listen to other user's typing indicator
    const q = query(
      collection(db, TYPING_COLLECTION),
      where('conversationId', '==', conversationId)
    );

    return onSnapshot(q, (snapshot) => {
      const indicators = snapshot.docs
        .map((doc) => doc.data() as TypingIndicator)
        .filter((indicator) => indicator.userId !== userId && indicator.isTyping);

      callback(indicators.length > 0 ? indicators[0] : null);
    });
  }

  /**
   * Get all conversations for a user
   */
  async getConversations(userId: string): Promise<Conversation[]> {
    const db = getFirebaseDb();

    const q = query(
      collection(db, CONVERSATIONS_COLLECTION),
      where('participants', 'array-contains', userId),
      orderBy('updatedAt', 'desc')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) =>
      this.mapDocToConversation(doc.id, doc.data())
    );
  }

  /**
   * Block/unblock a conversation
   */
  async setConversationBlocked(
    conversationId: string,
    blockedBy: string,
    isBlocked: boolean
  ): Promise<void> {
    const db = getFirebaseDb();

    await updateDoc(doc(db, CONVERSATIONS_COLLECTION, conversationId), {
      isBlocked,
      blockedBy: isBlocked ? blockedBy : null,
      updatedAt: serverTimestamp(),
    });
  }

  /**
   * Add a reaction to a message
   */
  async addReaction(
    conversationId: string,
    messageId: string,
    userId: string,
    emoji: MessageReactionType
  ): Promise<void> {
    const db = getFirebaseDb();
    const messageRef = doc(
      db,
      CONVERSATIONS_COLLECTION,
      conversationId,
      MESSAGES_COLLECTION,
      messageId
    );

    const reaction: MessageReaction = {
      emoji,
      userId,
      timestamp: new Date().toISOString(),
    };

    // First, remove any existing reaction from this user
    const messageSnap = await getDoc(messageRef);
    if (messageSnap.exists()) {
      const existingReactions = (messageSnap.data().reactions || []) as MessageReaction[];
      const userReaction = existingReactions.find(r => r.userId === userId);
      if (userReaction) {
        await updateDoc(messageRef, {
          reactions: arrayRemove(userReaction),
        });
      }
    }

    // Add the new reaction
    await updateDoc(messageRef, {
      reactions: arrayUnion(reaction),
    });
  }

  /**
   * Remove a reaction from a message
   */
  async removeReaction(
    conversationId: string,
    messageId: string,
    userId: string,
    emoji: MessageReactionType
  ): Promise<void> {
    const db = getFirebaseDb();
    const messageRef = doc(
      db,
      CONVERSATIONS_COLLECTION,
      conversationId,
      MESSAGES_COLLECTION,
      messageId
    );

    const messageSnap = await getDoc(messageRef);
    if (messageSnap.exists()) {
      const existingReactions = (messageSnap.data().reactions || []) as MessageReaction[];
      const reactionToRemove = existingReactions.find(
        r => r.userId === userId && r.emoji === emoji
      );
      if (reactionToRemove) {
        await updateDoc(messageRef, {
          reactions: arrayRemove(reactionToRemove),
        });
      }
    }
  }

  /**
   * Edit a message (only sender can edit, within time limit)
   */
  async editMessage(
    conversationId: string,
    messageId: string,
    senderId: string,
    newContent: string
  ): Promise<void> {
    const db = getFirebaseDb();
    const messageRef = doc(
      db,
      CONVERSATIONS_COLLECTION,
      conversationId,
      MESSAGES_COLLECTION,
      messageId
    );

    // Verify sender owns the message
    const messageSnap = await getDoc(messageRef);
    if (!messageSnap.exists()) {
      throw new Error('Message not found');
    }

    const messageData = messageSnap.data();
    if (messageData.senderId !== senderId) {
      throw new Error('You can only edit your own messages');
    }

    // Check if message is already deleted
    if (messageData.isDeleted) {
      throw new Error('Cannot edit a deleted message');
    }

    // Check time limit (15 minutes)
    const messageTime = messageData.timestamp?.toDate?.() || new Date(messageData.timestamp);
    const timeDiff = Date.now() - messageTime.getTime();
    const fifteenMinutes = 15 * 60 * 1000;
    if (timeDiff > fifteenMinutes) {
      throw new Error('Messages can only be edited within 15 minutes');
    }

    await updateDoc(messageRef, {
      content: newContent,
      editedAt: serverTimestamp(),
    });

    // Update last message in conversation if this was the last message
    const conversationRef = doc(db, CONVERSATIONS_COLLECTION, conversationId);
    const conversationSnap = await getDoc(conversationRef);
    if (conversationSnap.exists()) {
      const lastMessage = conversationSnap.data().lastMessage;
      if (lastMessage?.id === messageId) {
        await updateDoc(conversationRef, {
          'lastMessage.content': newContent,
          updatedAt: serverTimestamp(),
        });
      }
    }
  }

  /**
   * Delete/unsend a message (only sender can delete)
   */
  async deleteMessage(
    conversationId: string,
    messageId: string,
    senderId: string
  ): Promise<void> {
    const db = getFirebaseDb();
    const messageRef = doc(
      db,
      CONVERSATIONS_COLLECTION,
      conversationId,
      MESSAGES_COLLECTION,
      messageId
    );

    // Verify sender owns the message
    const messageSnap = await getDoc(messageRef);
    if (!messageSnap.exists()) {
      throw new Error('Message not found');
    }

    const messageData = messageSnap.data();
    if (messageData.senderId !== senderId) {
      throw new Error('You can only delete your own messages');
    }

    // Soft delete - mark as deleted rather than removing
    await updateDoc(messageRef, {
      isDeleted: true,
      deletedAt: serverTimestamp(),
      content: '', // Clear content for privacy
      metadata: null, // Clear any attachments
    });

    // Update last message in conversation if this was the last message
    const conversationRef = doc(db, CONVERSATIONS_COLLECTION, conversationId);
    const conversationSnap = await getDoc(conversationRef);
    if (conversationSnap.exists()) {
      const lastMessage = conversationSnap.data().lastMessage;
      if (lastMessage?.id === messageId) {
        await updateDoc(conversationRef, {
          'lastMessage.content': 'Message deleted',
          updatedAt: serverTimestamp(),
        });
      }
    }
  }

  /**
   * Toggle a reaction on a message (add if not exists, remove if exists)
   */
  async toggleReaction(
    conversationId: string,
    messageId: string,
    userId: string,
    emoji: MessageReactionType
  ): Promise<void> {
    const db = getFirebaseDb();
    const messageRef = doc(
      db,
      CONVERSATIONS_COLLECTION,
      conversationId,
      MESSAGES_COLLECTION,
      messageId
    );

    const messageSnap = await getDoc(messageRef);
    if (messageSnap.exists()) {
      const existingReactions = (messageSnap.data().reactions || []) as MessageReaction[];
      const existingReaction = existingReactions.find(
        r => r.userId === userId && r.emoji === emoji
      );

      if (existingReaction) {
        // Remove the reaction
        await updateDoc(messageRef, {
          reactions: arrayRemove(existingReaction),
        });
      } else {
        // Remove any other reaction from this user first
        const userReaction = existingReactions.find(r => r.userId === userId);
        if (userReaction) {
          await updateDoc(messageRef, {
            reactions: arrayRemove(userReaction),
          });
        }
        // Add the new reaction
        const reaction: MessageReaction = {
          emoji,
          userId,
          timestamp: new Date().toISOString(),
        };
        await updateDoc(messageRef, {
          reactions: arrayUnion(reaction),
        });
      }
    }
  }

  /**
   * Map Firestore document to Message
   */
  private mapDocToMessage(
    id: string,
    conversationId: string,
    data: Record<string, unknown>
  ): Message {
    return {
      id,
      conversationId,
      senderId: data.senderId as string,
      content: data.content as string,
      type: data.type as MessageType,
      status: data.status as MessageStatus,
      timestamp: this.timestampToString(data.timestamp),
      readAt: this.timestampToString(data.readAt),
      deliveredAt: this.timestampToString(data.deliveredAt),
      replyToId: data.replyToId as string | undefined,
      metadata: data.metadata as Message['metadata'],
      reactions: data.reactions as MessageReaction[] | undefined,
      editedAt: data.editedAt ? this.timestampToString(data.editedAt) : undefined,
      isDeleted: data.isDeleted as boolean | undefined,
      deletedAt: data.deletedAt ? this.timestampToString(data.deletedAt) : undefined,
    };
  }

  /**
   * Map Firestore document to Conversation
   */
  private mapDocToConversation(
    id: string,
    data: Record<string, unknown>
  ): Conversation {
    const lastMessageData = data.lastMessage as Record<string, unknown> | undefined;

    return {
      id,
      matchId: data.matchId as string,
      participants: data.participants as string[],
      lastMessage: lastMessageData
        ? this.mapDocToMessage(
            lastMessageData.id as string,
            id,
            lastMessageData
          )
        : undefined,
      lastMessageAt: this.timestampToString(data.lastMessageAt),
      unreadCount: data.unreadCount as number || 0,
      createdAt: this.timestampToString(data.createdAt),
      updatedAt: this.timestampToString(data.updatedAt),
      isBlocked: data.isBlocked as boolean || false,
      blockedBy: data.blockedBy as string | undefined,
    };
  }

  private timestampToString(timestamp: unknown): string {
    if (!timestamp) return new Date().toISOString();
    if (timestamp instanceof Timestamp) {
      return timestamp.toDate().toISOString();
    }
    if (typeof timestamp === 'string') return timestamp;
    return new Date().toISOString();
  }
}

export const messageService = new MessageService();
