'use client';

import { Match, useAuthStore, useMatchStore } from '@crush/core';
import {
    Avatar,
    AvatarFallback,
    AvatarImage,
    Badge,
    Button,
    Card,
    cn,
    Input,
    SkeletonProfile,
} from '@crush/ui';
import { formatDistanceToNow } from 'date-fns';
import { Heart, MessageCircle, Pin, Search, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ConversationActionsMenu } from '@/components/messages/conversation-actions-menu';

export default function MatchesPage() {
  const { user } = useAuthStore();
  const { matches, loading, loadMatches, togglePin } = useMatchStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'pinned' | 'new'>('all');

  useEffect(() => {
    if (user) {
      loadMatches(user.uid);
    }
  }, [user, loadMatches]);

  // Filter and sort matches
  const filteredMatches = matches
    .filter((match) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return match.otherUserName?.toLowerCase().includes(query);
      }
      return true;
    })
    .filter((match) => {
      // Tab filter
      if (filter === 'pinned') return match.pinnedForUser;
      if (filter === 'new') {
        const createdAt = new Date(match.createdAt);
        const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        return createdAt > dayAgo;
      }
      return true;
    })
    .sort((a, b) => {
      // Pinned first, then NEWEST MATCH first.
      //
      // This sorted by `updatedAt`, which the V2 mapper derives from
      // lastMessageAt — so a fresh match sat below an older one that happened
      // to have a recent message, on the page whose whole subject is who you
      // matched with. Conversation recency belongs on the messages page.
      // Mirrors MatchesBloc.sortByMatchRecency on mobile.
      if (a.pinnedForUser && !b.pinnedForUser) return -1;
      if (!a.pinnedForUser && b.pinnedForUser) return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  const pinnedCount = matches.filter((m) => m.pinnedForUser).length;
  const newCount = matches.filter((m) => {
    const createdAt = new Date(m.createdAt);
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    return createdAt > dayAgo;
  }).length;

  return (
    <div className="mx-auto max-w-4xl p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="mb-2 text-3xl font-bold">Matches</h1>
        <p className="text-muted-foreground">
          {matches.length} {matches.length === 1 ? 'match' : 'matches'}
        </p>
      </div>

      {/* Search and filters */}
      <div className="mb-6 space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search matches..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="flex gap-2">
          <Button
            variant={filter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('all')}
          >
            All ({matches.length})
          </Button>
          <Button
            variant={filter === 'pinned' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('pinned')}
          >
            <Pin className="mr-1 h-4 w-4" />
            Pinned ({pinnedCount})
          </Button>
          <Button
            variant={filter === 'new' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('new')}
          >
            <Sparkles className="mr-1 h-4 w-4" />
            New ({newCount})
          </Button>
        </div>
      </div>

      {/* Loading state */}
      {loading && matches.length === 0 && (
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <Card key={i} className="p-4">
              <SkeletonProfile />
            </Card>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && matches.length === 0 && (
        <div className="py-16 text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-muted">
            <Heart className="h-10 w-10 text-muted-foreground" />
          </div>
          <h2 className="mb-2 text-xl font-semibold">No matches yet</h2>
          <p className="mx-auto mb-6 max-w-sm text-muted-foreground">
            Keep swiping to find your perfect match. When you both like each other, you'll see them
            here.
          </p>
          <Link href="/discover">
            <Button>Start Swiping</Button>
          </Link>
        </div>
      )}

      {/* No results */}
      {!loading && matches.length > 0 && filteredMatches.length === 0 && (
        <div className="py-16 text-center">
          <p className="text-muted-foreground">No matches found matching your search.</p>
        </div>
      )}

      {/* Matches list */}
      <div className="space-y-3">
        {filteredMatches.map((match) => (
          <MatchCard
            key={match.id}
            match={match}
            onTogglePin={() => togglePin(match.id, !match.pinnedForUser)}
          />
        ))}
      </div>
    </div>
  );
}

interface MatchCardProps {
  match: Match;
  onTogglePin: () => void;
}

function MatchCard({ match, onTogglePin }: MatchCardProps) {
  const isNew = () => {
    const createdAt = new Date(match.createdAt);
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    return createdAt > dayAgo;
  };

  return (
    <Card className="p-4 transition-shadow hover:shadow-md">
      <div className="flex items-center gap-4">
        {/* Avatar */}
        <Link href={`/profile/${match.otherUserId}`}>
          <Avatar size="lg" className="cursor-pointer">
            {match.otherUserPhotoUrl ? (
              <AvatarImage src={match.otherUserPhotoUrl} alt={match.otherUserName || ''} />
            ) : (
              <AvatarFallback>{match.otherUserName?.charAt(0) || '?'}</AvatarFallback>
            )}
          </Avatar>
        </Link>

        {/* Info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Link href={`/profile/${match.otherUserId}`}>
              <h3 className="font-semibold transition-colors hover:text-primary">
                {match.otherUserName || 'Unknown'}
              </h3>
            </Link>
            {match.pinnedForUser && <Pin className="h-4 w-4 fill-primary text-primary" />}
            {isNew() && <Badge variant="new">New</Badge>}
            {match.isSuperLike && <Badge variant="premium">Super Like</Badge>}
          </div>

          <p className="truncate text-sm text-muted-foreground">
            {match.lastMessage || 'Start a conversation!'}
          </p>

          <p className="mt-1 text-xs text-muted-foreground">
            Matched {formatDistanceToNow(new Date(match.createdAt), { addSuffix: true })}
          </p>
        </div>

        {/* Unread badge */}
        {match.unreadCount > 0 && (
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
            {match.unreadCount > 9 ? '9+' : match.unreadCount}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Link href={`/messages/${match.id}`}>
            <Button
              variant="ghost"
              size="icon"
              aria-label={`Message ${match.otherUserName || 'user'}`}
            >
              <MessageCircle className="h-5 w-5" />
            </Button>
          </Link>

          <Button
            variant="ghost"
            size="icon"
            onClick={onTogglePin}
            className={cn(match.pinnedForUser && 'text-primary')}
            aria-label={
              match.pinnedForUser
                ? `Unpin ${match.otherUserName || 'user'}`
                : `Pin ${match.otherUserName || 'user'}`
            }
          >
            <Pin className={cn('h-5 w-5', match.pinnedForUser && 'fill-primary')} />
          </Button>

          <ConversationActionsMenu match={match} stopPropagation={false} />
        </div>
      </div>
    </Card>
  );
}
