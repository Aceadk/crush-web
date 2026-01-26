/**
 * Message types matching Flutter app's data models
 */

export type MessageType = 'text' | 'image' | 'gif' | 'audio' | 'video' | 'system';

export type MessageStatus = 'sending' | 'sent' | 'delivered' | 'read' | 'failed';

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  type: MessageType;
  status: MessageStatus;
  timestamp: string;
  readAt?: string;
  deliveredAt?: string;
  replyToId?: string;
  metadata?: MessageMetadata;
}

export interface MessageMetadata {
  imageUrl?: string;
  thumbnailUrl?: string;
  gifUrl?: string;
  audioUrl?: string;
  audioDuration?: number;
  videoUrl?: string;
  videoDuration?: number;
  width?: number;
  height?: number;
}

export interface Conversation {
  id: string;
  matchId: string;
  participants: string[];
  lastMessage?: Message;
  lastMessageAt?: string;
  unreadCount: number;
  createdAt: string;
  updatedAt: string;
  isBlocked: boolean;
  blockedBy?: string;
}

export interface TypingIndicator {
  conversationId: string;
  userId: string;
  isTyping: boolean;
  timestamp: string;
}

export interface ReadReceipt {
  conversationId: string;
  userId: string;
  lastReadMessageId: string;
  timestamp: string;
}

export const MESSAGES_PER_PAGE = 50;
