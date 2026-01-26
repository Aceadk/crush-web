'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuthStore, useMatchStore, Match } from '@crush/core';
import { Card, Avatar, AvatarImage, AvatarFallback, Badge, Button, Input, SkeletonProfile } from '@crush/ui';
import { cn } from '@crush/ui';
import { Search, Heart, MessageCircle, Pin, MoreVertical, Sparkles } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

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
      // Pinned first, then by date
      if (a.pinnedForUser && !b.pinnedForUser) return -1;
      if (!a.pinnedForUser && b.pinnedForUser) return 1;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });

  const pinnedCount = matches.filter((m) => m.pinnedForUser).length;
  const newCount = matches.filter((m) => {
    const createdAt = new Date(m.createdAt);
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    return createdAt > dayAgo;
  }).length;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Matches</h1>
        <p className="text-muted-foreground">
          {matches.length} {matches.length === 1 ? 'match' : 'matches'}
        </p>
      </div>

      {/* Search and filters */}
      <div className="mb-6 space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
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
            <Pin className="w-4 h-4 mr-1" />
            Pinned ({pinnedCount})
          </Button>
          <Button
            variant={filter === 'new' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('new')}
          >
            <Sparkles className="w-4 h-4 mr-1" />
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
        <div className="text-center py-16">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-muted flex items-center justify-center">
            <Heart className="w-10 h-10 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-semibold mb-2">No matches yet</h2>
          <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
            Keep swiping to find your perfect match. When you both like each other,
            you'll see them here.
          </p>
          <Link href="/discover">
            <Button>Start Swiping</Button>
          </Link>
        </div>
      )}

      {/* No results */}
      {!loading && matches.length > 0 && filteredMatches.length === 0 && (
        <div className="text-center py-16">
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
    <Card className="p-4 hover:shadow-md transition-shadow">
      <div className="flex items-center gap-4">
        {/* Avatar */}
        <Link href={`/profile/${match.otherUserId}`}>
          <Avatar size="lg" className="cursor-pointer">
            {match.otherUserPhotoUrl ? (
              <AvatarImage src={match.otherUserPhotoUrl} alt={match.otherUserName || ''} />
            ) : (
              <AvatarFallback>
                {match.otherUserName?.charAt(0) || '?'}
              </AvatarFallback>
            )}
          </Avatar>
        </Link>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Link href={`/profile/${match.otherUserId}`}>
              <h3 className="font-semibold hover:text-primary transition-colors">
                {match.otherUserName || 'Unknown'}
              </h3>
            </Link>
            {match.pinnedForUser && (
              <Pin className="w-4 h-4 text-primary fill-primary" />
            )}
            {isNew() && (
              <Badge variant="new">New</Badge>
            )}
            {match.isSuperLike && (
              <Badge variant="premium">Super Like</Badge>
            )}
          </div>

          <p className="text-sm text-muted-foreground truncate">
            {match.lastMessage || 'Start a conversation!'}
          </p>

          <p className="text-xs text-muted-foreground mt-1">
            Matched {formatDistanceToNow(new Date(match.createdAt), { addSuffix: true })}
          </p>
        </div>

        {/* Unread badge */}
        {match.unreadCount > 0 && (
          <div className="w-6 h-6 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center">
            {match.unreadCount > 9 ? '9+' : match.unreadCount}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Link href={`/messages/${match.id}`}>
            <Button variant="ghost" size="icon">
              <MessageCircle className="w-5 h-5" />
            </Button>
          </Link>

          <Button
            variant="ghost"
            size="icon"
            onClick={onTogglePin}
            className={cn(match.pinnedForUser && 'text-primary')}
          >
            <Pin className={cn('w-5 h-5', match.pinnedForUser && 'fill-primary')} />
          </Button>
        </div>
      </div>
    </Card>
  );
}
