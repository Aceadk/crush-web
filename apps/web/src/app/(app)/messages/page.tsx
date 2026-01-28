'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuthStore, useMessageStore, useMatchStore, Conversation } from '@crush/core';
import { Card, Avatar, AvatarImage, AvatarFallback, Input, SkeletonProfile, Badge } from '@crush/ui';
import { cn } from '@crush/ui';
import { Search, MessageCircle, ChevronRight, Inbox } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function MessagesPage() {
  const { user } = useAuthStore();
  const { conversations, loading, loadConversations } = useMessageStore();
  const { matches } = useMatchStore();
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (user) {
      loadConversations(user.uid);
    }
  }, [user, loadConversations]);

  // Get match info for conversations
  const getMatchInfo = (conversation: Conversation) => {
    const match = matches.find((m) => m.id === conversation.matchId);
    return match;
  };

  // Filter conversations
  const filteredConversations = conversations.filter((conv) => {
    if (!searchQuery) return true;
    const match = getMatchInfo(conv);
    return match?.otherUserName?.toLowerCase().includes(searchQuery.toLowerCase());
  });

  // Sort by last message time
  const sortedConversations = [...filteredConversations].sort((a, b) => {
    const aTime = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
    const bTime = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
    return bTime - aTime;
  });

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Messages</h1>
        <p className="text-muted-foreground">
          {conversations.length} {conversations.length === 1 ? 'conversation' : 'conversations'}
        </p>
      </div>

      {/* Message Requests Link */}
      <Link href="/messages/requests">
        <Card className="p-4 mb-6 hover:shadow-md transition-shadow cursor-pointer group">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-pink-100 to-rose-100 dark:from-pink-900/30 dark:to-rose-900/30 flex items-center justify-center">
              <Inbox className="w-6 h-6 text-pink-500" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold">Message Requests</h3>
              <p className="text-sm text-muted-foreground">
                Messages from people who liked you
              </p>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </Card>
      </Link>

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            placeholder="Search messages..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Loading state */}
      {loading && conversations.length === 0 && (
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <Card key={i} className="p-4">
              <SkeletonProfile />
            </Card>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && conversations.length === 0 && (
        <div className="text-center py-16">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-muted flex items-center justify-center">
            <MessageCircle className="w-10 h-10 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-semibold mb-2">No messages yet</h2>
          <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
            When you match with someone, you can start chatting here.
          </p>
          <Link href="/discover">
            <button className="text-primary hover:underline">Find matches</button>
          </Link>
        </div>
      )}

      {/* No results */}
      {!loading && conversations.length > 0 && sortedConversations.length === 0 && (
        <div className="text-center py-16">
          <p className="text-muted-foreground">No conversations found matching your search.</p>
        </div>
      )}

      {/* Conversations list */}
      <div className="space-y-3">
        {sortedConversations.map((conversation) => {
          const match = getMatchInfo(conversation);
          return (
            <ConversationCard
              key={conversation.id}
              conversation={conversation}
              matchName={match?.otherUserName}
              matchPhoto={match?.otherUserPhotoUrl}
              currentUserId={user?.uid || ''}
            />
          );
        })}
      </div>
    </div>
  );
}

interface ConversationCardProps {
  conversation: Conversation;
  matchName?: string;
  matchPhoto?: string;
  currentUserId: string;
}

function ConversationCard({
  conversation,
  matchName,
  matchPhoto,
  currentUserId,
}: ConversationCardProps) {
  const lastMessage = conversation.lastMessage;
  const isOwnMessage = lastMessage?.senderId === currentUserId;

  return (
    <Link href={`/messages/${conversation.matchId}`}>
      <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer group">
        <div className="flex items-center gap-4">
          {/* Avatar */}
          <div className="relative">
            <Avatar size="lg">
              {matchPhoto ? (
                <AvatarImage src={matchPhoto} alt={matchName || ''} />
              ) : (
                <AvatarFallback>{matchName?.charAt(0) || '?'}</AvatarFallback>
              )}
            </Avatar>
            {/* Online indicator would go here */}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-semibold truncate">{matchName || 'Unknown'}</h3>
              {conversation.lastMessageAt && (
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {formatDistanceToNow(new Date(conversation.lastMessageAt), { addSuffix: false })}
                </span>
              )}
            </div>

            <p
              className={cn(
                'text-sm truncate',
                conversation.unreadCount > 0
                  ? 'text-foreground font-medium'
                  : 'text-muted-foreground'
              )}
            >
              {isOwnMessage && <span className="text-muted-foreground">You: </span>}
              {lastMessage?.content || 'Start a conversation!'}
            </p>
          </div>

          {/* Unread badge */}
          {conversation.unreadCount > 0 && (
            <Badge variant="default" className="rounded-full">
              {conversation.unreadCount > 9 ? '9+' : conversation.unreadCount}
            </Badge>
          )}

          {/* Blocked indicator */}
          {conversation.isBlocked && (
            <Badge variant="destructive">Blocked</Badge>
          )}

          {/* Arrow */}
          <ChevronRight className="w-5 h-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </Card>
    </Link>
  );
}
