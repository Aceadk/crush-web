'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthStore, useMessageStore, useMatchStore, Message } from '@crush/core';
import { Avatar, AvatarImage, AvatarFallback, Button, Badge } from '@crush/ui';
import { cn } from '@crush/ui';
import {
  ArrowLeft,
  MoreVertical,
  Send,
  Image as ImageIcon,
  Smile,
  Phone,
  Video,
  Shield,
  Flag,
  UserX,
  Trash2,
} from 'lucide-react';
import { formatDistanceToNow, format, isToday, isYesterday } from 'date-fns';

interface ChatRoomProps {
  matchId: string;
}

export default function ChatRoom({ matchId }: ChatRoomProps) {
  const router = useRouter();
  const { user } = useAuthStore();
  const { matches } = useMatchStore();
  const {
    currentConversation,
    messages,
    typingIndicator,
    loading,
    loadingMore,
    hasMore,
    openConversation,
    sendMessage,
    markAsRead,
    setTyping,
    loadMoreMessages,
    closeConversation,
  } = useMessageStore();

  const [inputValue, setInputValue] = useState('');
  const [showMenu, setShowMenu] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  // Get match info
  const match = matches.find((m) => m.id === matchId);

  // Initialize conversation
  useEffect(() => {
    if (user && match) {
      openConversation(matchId, [user.uid, match.otherUserId], user.uid);
    }

    return () => {
      closeConversation();
    };
  }, [user, match, matchId, openConversation, closeConversation]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Mark messages as read
  useEffect(() => {
    if (!user || !currentConversation) return;

    const unreadMessages = messages
      .filter((m) => m.senderId !== user.uid && m.status !== 'read')
      .map((m) => m.id);

    if (unreadMessages.length > 0) {
      markAsRead(user.uid, unreadMessages);
    }
  }, [messages, user, currentConversation, markAsRead]);

  // Handle typing indicator
  const handleInputChange = (value: string) => {
    setInputValue(value);

    if (!user) return;

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set typing to true
    if (value.length > 0) {
      setTyping(user.uid, true);
    }

    // Set timeout to stop typing indicator
    typingTimeoutRef.current = setTimeout(() => {
      setTyping(user.uid, false);
    }, 2000);
  };

  // Send message
  const handleSend = useCallback(async () => {
    if (!inputValue.trim() || !user) return;

    const messageText = inputValue.trim();
    setInputValue('');

    // Stop typing indicator
    setTyping(user.uid, false);

    await sendMessage(messageText, user.uid);
  }, [inputValue, user, sendMessage, setTyping]);

  // Handle infinite scroll
  const handleScroll = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container || loadingMore || !hasMore || !currentConversation) return;

    if (container.scrollTop === 0) {
      loadMoreMessages(currentConversation.id);
    }
  }, [loadingMore, hasMore, currentConversation, loadMoreMessages]);

  // Group messages by date
  const groupedMessages = messages.reduce((groups, message) => {
    const date = new Date(message.timestamp);
    const dateKey = format(date, 'yyyy-MM-dd');

    if (!groups[dateKey]) {
      groups[dateKey] = [];
    }
    groups[dateKey].push(message);
    return groups;
  }, {} as Record<string, Message[]>);

  const formatDateHeader = (dateKey: string) => {
    const date = new Date(dateKey);
    if (isToday(date)) return 'Today';
    if (isYesterday(date)) return 'Yesterday';
    return format(date, 'MMMM d, yyyy');
  };

  if (!match) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <p className="text-gray-500 mb-4">Match not found</p>
        <Link href="/messages">
          <Button variant="outline">Back to Messages</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="flex items-center gap-3 px-4 py-3 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
        <button
          onClick={() => router.back()}
          className="p-2 -ml-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <Link href={`/profile/${match.otherUserId}`} className="flex items-center gap-3 flex-1">
          <div className="relative">
            <Avatar size="md">
              {match.otherUserPhotoUrl ? (
                <AvatarImage src={match.otherUserPhotoUrl} alt={match.otherUserName || ''} />
              ) : (
                <AvatarFallback>{match.otherUserName?.charAt(0) || '?'}</AvatarFallback>
              )}
            </Avatar>
            {/* Online indicator */}
            <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white dark:border-gray-800 rounded-full" />
          </div>

          <div className="flex-1 min-w-0">
            <h1 className="font-semibold truncate">{match.otherUserName || 'Unknown'}</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {typingIndicator ? (
                <span className="text-primary">typing...</span>
              ) : (
                'Active now'
              )}
            </p>
          </div>
        </Link>

        {/* Action buttons */}
        <div className="flex items-center gap-1">
          <button className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-600 dark:text-gray-300">
            <Phone className="w-5 h-5" />
          </button>
          <button className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-600 dark:text-gray-300">
            <Video className="w-5 h-5" />
          </button>
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-600 dark:text-gray-300"
            >
              <MoreVertical className="w-5 h-5" />
            </button>

            {/* Dropdown menu */}
            {showMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-20">
                  <button className="w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-3">
                    <Shield className="w-4 h-4" />
                    Safety tips
                  </button>
                  <button className="w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-3 text-amber-600">
                    <Flag className="w-4 h-4" />
                    Report
                  </button>
                  <button className="w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-3 text-red-600">
                    <UserX className="w-4 h-4" />
                    Unmatch
                  </button>
                  <hr className="my-1 border-gray-200 dark:border-gray-700" />
                  <button className="w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-3 text-red-600">
                    <Trash2 className="w-4 h-4" />
                    Delete chat
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Messages */}
      <div
        ref={messagesContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 py-4"
      >
        {/* Load more indicator */}
        {loadingMore && (
          <div className="flex justify-center py-2">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* Match intro card */}
        {messages.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center py-12">
            <Avatar size="2xl" className="mb-4">
              {match.otherUserPhotoUrl ? (
                <AvatarImage src={match.otherUserPhotoUrl} alt={match.otherUserName || ''} />
              ) : (
                <AvatarFallback className="text-4xl">
                  {match.otherUserName?.charAt(0) || '?'}
                </AvatarFallback>
              )}
            </Avatar>
            <h2 className="text-xl font-semibold mb-1">{match.otherUserName}</h2>
            <p className="text-gray-500 text-center max-w-xs mb-4">
              You matched with {match.otherUserName}! Say something nice to start the conversation.
            </p>
            {match.isSuperLike && (
              <Badge variant="premium" className="mb-2">
                ⭐ Super Liked you
              </Badge>
            )}
          </div>
        )}

        {/* Messages grouped by date */}
        {Object.entries(groupedMessages).map(([dateKey, dateMessages]) => (
          <div key={dateKey}>
            {/* Date header */}
            <div className="flex justify-center my-4">
              <span className="px-3 py-1 text-xs text-gray-500 bg-gray-100 dark:bg-gray-800 rounded-full">
                {formatDateHeader(dateKey)}
              </span>
            </div>

            {/* Messages */}
            {dateMessages.map((message, index) => {
              const isOwn = message.senderId === user?.uid;
              const showAvatar =
                !isOwn &&
                (index === 0 || dateMessages[index - 1].senderId !== message.senderId);

              return (
                <MessageBubble
                  key={message.id}
                  message={message}
                  isOwn={isOwn}
                  showAvatar={showAvatar}
                  otherUserPhoto={match.otherUserPhotoUrl}
                  otherUserName={match.otherUserName}
                />
              );
            })}
          </div>
        ))}

        {/* Typing indicator */}
        {typingIndicator && (
          <div className="flex items-end gap-2 mb-2">
            <Avatar size="sm">
              {match.otherUserPhotoUrl ? (
                <AvatarImage src={match.otherUserPhotoUrl} alt="" />
              ) : (
                <AvatarFallback>{match.otherUserName?.charAt(0)}</AvatarFallback>
              )}
            </Avatar>
            <div className="bg-gray-200 dark:bg-gray-700 rounded-2xl rounded-bl-md px-4 py-3">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <button className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-500">
            <ImageIcon className="w-5 h-5" />
          </button>

          <div className="flex-1 relative">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => handleInputChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Type a message..."
              className="w-full px-4 py-2.5 bg-gray-100 dark:bg-gray-700 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
            />
            <button className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <Smile className="w-5 h-5" />
            </button>
          </div>

          <button
            onClick={handleSend}
            disabled={!inputValue.trim()}
            className={cn(
              'p-2.5 rounded-full transition-all',
              inputValue.trim()
                ? 'bg-primary text-white hover:bg-primary-dark'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-400'
            )}
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  showAvatar: boolean;
  otherUserPhoto?: string;
  otherUserName?: string;
}

function MessageBubble({ message, isOwn, showAvatar, otherUserPhoto, otherUserName }: MessageBubbleProps) {
  const time = format(new Date(message.timestamp), 'h:mm a');

  return (
    <div className={cn('flex items-end gap-2 mb-2', isOwn && 'flex-row-reverse')}>
      {/* Avatar */}
      {!isOwn && (
        <div className="w-8">
          {showAvatar && (
            <Avatar size="sm">
              {otherUserPhoto ? (
                <AvatarImage src={otherUserPhoto} alt={otherUserName || ''} />
              ) : (
                <AvatarFallback>{otherUserName?.charAt(0)}</AvatarFallback>
              )}
            </Avatar>
          )}
        </div>
      )}

      {/* Message bubble */}
      <div
        className={cn(
          'max-w-[70%] px-4 py-2.5 rounded-2xl',
          isOwn
            ? 'bg-primary text-white rounded-br-md'
            : 'bg-gray-200 dark:bg-gray-700 rounded-bl-md'
        )}
      >
        <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
          {message.content}
        </p>
        <div
          className={cn(
            'flex items-center gap-1 mt-1',
            isOwn ? 'justify-end' : 'justify-start'
          )}
        >
          <span className={cn('text-xs', isOwn ? 'text-white/70' : 'text-gray-500')}>
            {time}
          </span>
          {/* Status indicator for own messages */}
          {isOwn && (
            <span className="text-xs text-white/70">
              {message.status === 'sending' && '○'}
              {message.status === 'sent' && '✓'}
              {message.status === 'delivered' && '✓✓'}
              {message.status === 'read' && (
                <span className="text-blue-300">✓✓</span>
              )}
              {message.status === 'failed' && (
                <span className="text-red-300">!</span>
              )}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
