import { create } from 'zustand';
import { messageService } from '../services/message';
import { Message, Conversation, TypingIndicator, MessageType, MESSAGES_PER_PAGE } from '../types/message';
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
  sendMessage: (content: string, currentUserId: string, type?: MessageType) => Promise<void>;
  markAsRead: (userId: string, messageIds: string[]) => Promise<void>;
  setTyping: (userId: string, isTyping: boolean) => Promise<void>;
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
  sendMessage: async (content, currentUserId, type = 'text') => {
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
    };

    set({ messages: [...messages, tempMessage] });

    try {
      const sentMessage = await messageService.sendMessage(
        currentConversation.id,
        currentUserId,
        content,
        type
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
