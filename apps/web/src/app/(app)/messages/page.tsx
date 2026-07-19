'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuthStore, useMessageStore, useMatchStore, useUIStore, Conversation } from '@crush/core';
import { Card, Avatar, AvatarImage, AvatarFallback, Input, SkeletonProfile, Badge } from '@crush/ui';
import { cn } from '@crush/ui';
import { Search, MessageCircle, ChevronRight, Inbox, Pin, WifiOff, RefreshCw } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { analytics } from '@/lib/analytics';
import { PinnedConversations } from '@/components/messages/pinned-conversations';
import { useNetworkStatus, usePeerPresence } from '@/shared/hooks';

export default function MessagesPage() {
  const { user } = useAuthStore();
  const { conversations, loading, loadConversations } = useMessageStore();
  const { matches, loadMatches, togglePin } = useMatchStore();
  const { addToast } = useUIStore();
  const { isOnline, reconnectCount } = useNetworkStatus();
  const [searchQuery, setSearchQuery] = useState('');
  const [reconnecting, setReconnecting] = useState(false);

  useEffect(() => {
    if (user) {
      loadConversations(user.uid);
      loadMatches(user.uid);
    }
  }, [user, loadConversations, loadMatches]);

  const refreshConversations = useCallback(async (showToast: boolean) => {
    if (!user) return;
    if (!isOnline) {
      addToast({
        type: 'error',
        title: 'You are offline',
        description: 'Reconnect to refresh conversations.',
      });
      return;
    }

    setReconnecting(true);
    try {
      await Promise.all([
        loadConversations(user.uid),
        loadMatches(user.uid),
      ]);
      if (showToast) {
        addToast({
          type: 'success',
          title: 'Reconnected',
          description: 'Conversations are back online.',
        });
      }
    } catch {
      addToast({
        type: 'error',
        title: 'Reconnect failed',
        description: 'Could not refresh conversations. Please try again.',
      });
    } finally {
      setReconnecting(false);
    }
  }, [user, isOnline, loadConversations, loadMatches, addToast]);

  useEffect(() => {
    if (!isOnline || reconnectCount === 0) return;
    void refreshConversations(true);
  }, [isOnline, reconnectCount, refreshConversations]);

  const handleTogglePin = useCallback(async (matchId: string, pinned: boolean) => {
    await togglePin(matchId, pinned);
    analytics.track({
      name: pinned ? 'conversation_pinned' : 'conversation_unpinned',
      properties: { matchId },
    });
  }, [togglePin]);

  const handleOpenConversation = useCallback((matchId: string) => {
    analytics.track({
      name: 'conversation_started',
      properties: { matchId },
    });
  }, []);

  // Resolve match info for a conversation.
  // Conversations can carry either directional match id; use participant fallback.
  const resolveConversationMatch = (conversation: Conversation) => {
    const byId = matches.find((m) => m.id === conversation.matchId);
    if (byId) {
      return byId;
    }

    if (!user) {
      return undefined;
    }

    const otherParticipantId = conversation.participants.find(
      (participantId) => participantId !== user.uid
    );

    if (!otherParticipantId) {
      return undefined;
    }

    return matches.find((m) => m.otherUserId === otherParticipantId);
  };

  // Filter conversations
  const filteredConversations = conversations.filter((conv) => {
    if (!searchQuery) return true;
    const match = resolveConversationMatch(conv);
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

      {!isOnline && (
        <Card className="mb-6 border-amber-300/70 bg-amber-50 dark:bg-amber-900/15">
          <div className="flex items-center justify-between gap-3 p-3">
            <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200">
              <WifiOff className="h-4 w-4" />
              <p className="text-sm font-medium">You are offline. Messages will sync when connection returns.</p>
            </div>
            <button
              onClick={() => void refreshConversations(false)}
              className="rounded-md p-1.5 text-amber-800 transition-colors hover:bg-amber-200/70 dark:text-amber-200 dark:hover:bg-amber-800/40"
              aria-label="Retry refresh"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
        </Card>
      )}

      {isOnline && reconnecting && (
        <Card className="mb-6 border-primary/30 bg-primary/5">
          <div className="flex items-center gap-2 p-3 text-sm text-primary">
            <RefreshCw className="h-4 w-4 animate-spin" />
            Reconnecting conversations...
          </div>
        </Card>
      )}

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
      <PinnedConversations matches={matches} className="mb-6" />

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
          const match = resolveConversationMatch(conversation);
          const hrefMatchId = match?.id || conversation.matchId;
          return (
            <ConversationCard
              key={conversation.id}
              conversation={conversation}
              hrefMatchId={hrefMatchId}
              matchName={match?.otherUserName}
              matchPhoto={match?.otherUserPhotoUrl}
              matchId={match?.id}
              isPinned={Boolean(match?.pinnedForUser)}
              currentUserId={user?.uid || ''}
              onTogglePin={handleTogglePin}
              onOpenConversation={handleOpenConversation}
            />
          );
        })}
      </div>
    </div>
  );
}

interface ConversationCardProps {
  conversation: Conversation;
  hrefMatchId: string;
  matchName?: string;
  matchPhoto?: string;
  matchId?: string;
  isPinned?: boolean;
  currentUserId: string;
  onTogglePin?: (matchId: string, pinned: boolean) => Promise<void>;
  onOpenConversation?: (matchId: string) => void;
}

function ConversationCard({
  conversation,
  hrefMatchId,
  matchName,
  matchPhoto,
  matchId,
  isPinned = false,
  currentUserId,
  onTogglePin,
  onOpenConversation,
}: ConversationCardProps) {
  const lastMessage = conversation.lastMessage;
  const isOwnMessage = lastMessage?.senderId === currentUserId;
  const peerId = conversation.participants.find((id) => id !== currentUserId);
  const isPeerOnline = usePeerPresence(peerId);

  return (
    <Link
      href={`/messages/${hrefMatchId}`}
      onClick={() => onOpenConversation?.(hrefMatchId)}
    >
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
            {isPeerOnline && (
              <span
                className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-white bg-green-500 dark:border-gray-900"
                aria-label="Online now"
                role="img"
              />
            )}
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
          {matchId && onTogglePin && (
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                void onTogglePin(matchId, !isPinned);
              }}
              className={cn(
                'p-1.5 rounded-md transition-colors',
                isPinned
                  ? 'text-primary bg-primary/10 hover:bg-primary/20'
                  : 'text-muted-foreground hover:bg-muted'
              )}
              aria-label={isPinned ? 'Unpin conversation' : 'Pin conversation'}
              title={isPinned ? 'Unpin conversation' : 'Pin conversation'}
            >
              <Pin className={cn('w-4 h-4', isPinned && 'fill-current')} />
            </button>
          )}

          <ChevronRight className="w-5 h-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </Card>
    </Link>
  );
}
