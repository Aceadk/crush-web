import { create } from 'zustand';
import { messageService } from '../services/message';
import { Message, Conversation, TypingIndicator, MessageType, MessageMetadata, MessageReactionType, MESSAGES_PER_PAGE } from '../types/message';
import { DocumentSnapshot } from 'firebase/firestore';

interface MessageState {
  // State
  conversations: Conversation[];
  currentConversation: Conversation | null;
  messages: Message[];
  typingIndicator: TypingIndicator | null;
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  error: string | null;
  lastDoc: DocumentSnapshot | null;
  unsubscribeMessages: (() => void) | null;
  unsubscribeTyping: (() => void) | null;

  // Actions
  loadConversations: (userId: string) => Promise<void>;
  openConversation: (matchId: string, participants: string[], currentUserId: string) => Promise<void>;
  loadMessages: (conversationId: string) => Promise<void>;
  loadMoreMessages: (conversationId: string) => Promise<void>;
  sendMessage: (content: string, currentUserId: string, type?: MessageType, metadata?: MessageMetadata) => Promise<void>;
  sendImageMessage: (imageUrl: string, currentUserId: string, thumbnailUrl?: string) => Promise<void>;
  sendVoiceMessage: (audioUrl: string, duration: number, currentUserId: string) => Promise<void>;
  markAsRead: (userId: string, messageIds: string[]) => Promise<void>;
  setTyping: (userId: string, isTyping: boolean) => Promise<void>;
  toggleReaction: (messageId: string, userId: string, emoji: MessageReactionType) => Promise<void>;
  editMessage: (messageId: string, userId: string, newContent: string) => Promise<void>;
  deleteMessage: (messageId: string, userId: string) => Promise<void>;
  blockConversation: (userId: string) => Promise<void>;
  closeConversation: () => void;
  cleanup: () => void;
  clearError: () => void;
}

export const useMessageStore = create<MessageState>()((set, get) => ({
  // Initial state
  conversations: [],
  currentConversation: null,
  messages: [],
  typingIndicator: null,
  loading: false,
  loadingMore: false,
  hasMore: true,
  error: null,
  lastDoc: null,
  unsubscribeMessages: null,
  unsubscribeTyping: null,

  // Load all conversations
  loadConversations: async (userId) => {
    set({ loading: true, error: null });
    try {
      const conversations = await messageService.getConversations(userId);
      set({ conversations, loading: false });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load conversations';
      set({ error: message, loading: false });
    }
  },

  // Open a conversation
  openConversation: async (matchId, participants, currentUserId) => {
    set({ loading: true, error: null, messages: [], hasMore: true, lastDoc: null });

    try {
      // Get or create conversation
      const conversation = await messageService.getOrCreateConversation(matchId, participants);
      set({ currentConversation: conversation });

      // Subscribe to messages
      const { unsubscribeMessages: existingUnsub } = get();
      if (existingUnsub) {
        existingUnsub();
      }

      const unsubscribeMessages = messageService.subscribeToMessages(
        conversation.id,
        (messages) => {
          set({ messages: messages.reverse(), loading: false });
        }
      );

      // Subscribe to typing indicator
      const { unsubscribeTyping: existingTypingUnsub } = get();
      if (existingTypingUnsub) {
        existingTypingUnsub();
      }

      const unsubscribeTyping = messageService.subscribeToTypingIndicator(
        conversation.id,
        currentUserId,
        (indicator) => {
          set({ typingIndicator: indicator });
        }
      );

      set({ unsubscribeMessages, unsubscribeTyping });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to open conversation';
      set({ error: message, loading: false });
    }
  },

  // Load messages (initial load)
  loadMessages: async (conversationId) => {
    set({ loading: true, error: null });
    try {
      const result = await messageService.getMessages(conversationId);
      set({
        messages: result.messages.reverse(),
        lastDoc: result.lastDoc || null,
        hasMore: result.messages.length >= MESSAGES_PER_PAGE,
        loading: false,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load messages';
      set({ error: message, loading: false });
    }
  },

  // Load more messages (pagination)
  loadMoreMessages: async (conversationId) => {
    const { loadingMore, hasMore, lastDoc, messages } = get();
    if (loadingMore || !hasMore || !lastDoc) return;

    set({ loadingMore: true, error: null });
    try {
      const result = await messageService.getMessages(conversationId, lastDoc);
      set({
        messages: [...result.messages.reverse(), ...messages],
        lastDoc: result.lastDoc || null,
        hasMore: result.messages.length >= MESSAGES_PER_PAGE,
        loadingMore: false,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load more messages';
      set({ error: message, loadingMore: false });
    }
  },

  // Send a message
  sendMessage: async (content, currentUserId, type = 'text', metadata) => {
    const { currentConversation, messages } = get();
    if (!currentConversation) {
      set({ error: 'No conversation selected' });
      return;
    }

    // Optimistic update
    const tempMessage: Message = {
      id: `temp-${Date.now()}`,
      conversationId: currentConversation.id,
      senderId: currentUserId,
      content,
      type,
      status: 'sending',
      timestamp: new Date().toISOString(),
      metadata,
    };

    set({ messages: [...messages, tempMessage] });

    try {
      const sentMessage = await messageService.sendMessage(
        currentConversation.id,
        currentUserId,
        content,
        type,
        metadata
      );

      // Replace temp message with real one
      set({
        messages: get().messages.map((m) =>
          m.id === tempMessage.id ? sentMessage : m
        ),
      });
    } catch (error) {
      // Mark message as failed
      set({
        messages: get().messages.map((m) =>
          m.id === tempMessage.id ? { ...m, status: 'failed' as const } : m
        ),
        error: error instanceof Error ? error.message : 'Failed to send message',
      });
    }
  },

  // Send an image message
  sendImageMessage: async (imageUrl, currentUserId, thumbnailUrl) => {
    const metadata: MessageMetadata = {
      imageUrl,
      thumbnailUrl: thumbnailUrl || imageUrl,
    };
    await get().sendMessage(imageUrl, currentUserId, 'image', metadata);
  },

  // Send a voice message
  sendVoiceMessage: async (audioUrl, duration, currentUserId) => {
    const metadata: MessageMetadata = {
      audioUrl,
      audioDuration: duration,
    };
    await get().sendMessage('Voice message', currentUserId, 'audio', metadata);
  },

  // Mark messages as read
  markAsRead: async (userId, messageIds) => {
    const { currentConversation } = get();
    if (!currentConversation) return;

    try {
      await messageService.markMessagesAsRead(
        currentConversation.id,
        userId,
        messageIds
      );
    } catch (error) {
      console.error('Failed to mark messages as read:', error);
    }
  },

  // Set typing indicator
  setTyping: async (userId, isTyping) => {
    const { currentConversation } = get();
    if (!currentConversation) return;

    try {
      await messageService.setTypingIndicator(
        currentConversation.id,
        userId,
        isTyping
      );
    } catch (error) {
      console.error('Failed to set typing indicator:', error);
    }
  },

  // Toggle reaction on a message
  toggleReaction: async (messageId, userId, emoji) => {
    const { currentConversation, messages } = get();
    if (!currentConversation) return;

    // Optimistic update
    const updatedMessages = messages.map((m) => {
      if (m.id !== messageId) return m;

      const existingReactions = m.reactions || [];
      const hasReaction = existingReactions.some(
        (r) => r.userId === userId && r.emoji === emoji
      );

      let newReactions;
      if (hasReaction) {
        // Remove the reaction
        newReactions = existingReactions.filter(
          (r) => !(r.userId === userId && r.emoji === emoji)
        );
      } else {
        // Remove any other reaction from this user and add the new one
        newReactions = existingReactions.filter((r) => r.userId !== userId);
        newReactions.push({
          emoji,
          userId,
          timestamp: new Date().toISOString(),
        });
      }

      return { ...m, reactions: newReactions };
    });

    set({ messages: updatedMessages });

    try {
      await messageService.toggleReaction(
        currentConversation.id,
        messageId,
        userId,
        emoji
      );
    } catch (error) {
      // Revert on error
      set({ messages });
      console.error('Failed to toggle reaction:', error);
    }
  },

  // Edit a message
  editMessage: async (messageId, userId, newContent) => {
    const { currentConversation, messages } = get();
    if (!currentConversation) return;

    // Store original for rollback
    const originalMessages = [...messages];

    // Optimistic update
    set({
      messages: messages.map((m) =>
        m.id === messageId
          ? { ...m, content: newContent, editedAt: new Date().toISOString() }
          : m
      ),
    });

    try {
      await messageService.editMessage(
        currentConversation.id,
        messageId,
        userId,
        newContent
      );
    } catch (error) {
      // Revert on error
      set({ messages: originalMessages });
      const errorMessage = error instanceof Error ? error.message : 'Failed to edit message';
      set({ error: errorMessage });
      throw error;
    }
  },

  // Delete/unsend a message
  deleteMessage: async (messageId, userId) => {
    const { currentConversation, messages } = get();
    if (!currentConversation) return;

    // Store original for rollback
    const originalMessages = [...messages];

    // Optimistic update
    set({
      messages: messages.map((m) =>
        m.id === messageId
          ? { ...m, isDeleted: true, content: '', deletedAt: new Date().toISOString() }
          : m
      ),
    });

    try {
      await messageService.deleteMessage(
        currentConversation.id,
        messageId,
        userId
      );
    } catch (error) {
      // Revert on error
      set({ messages: originalMessages });
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete message';
      set({ error: errorMessage });
      throw error;
    }
  },

  // Block conversation
  blockConversation: async (userId) => {
    const { currentConversation } = get();
    if (!currentConversation) return;

    set({ loading: true, error: null });
    try {
      await messageService.setConversationBlocked(
        currentConversation.id,
        userId,
        true
      );
      set({
        currentConversation: { ...currentConversation, isBlocked: true, blockedBy: userId },
        loading: false,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to block conversation';
      set({ error: message, loading: false });
    }
  },

  // Close current conversation
  closeConversation: () => {
    const { unsubscribeMessages, unsubscribeTyping } = get();
    if (unsubscribeMessages) {
      unsubscribeMessages();
    }
    if (unsubscribeTyping) {
      unsubscribeTyping();
    }
    set({
      currentConversation: null,
      messages: [],
      typingIndicator: null,
      hasMore: true,
      lastDoc: null,
      unsubscribeMessages: null,
      unsubscribeTyping: null,
    });
  },

  // Cleanup all subscriptions
  cleanup: () => {
    get().closeConversation();
    set({ conversations: [] });
  },

  // Clear error
  clearError: () => {
    set({ error: null });
  },
}));
