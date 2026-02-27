'use client';

import { analytics } from '@/lib/analytics';
import { Match, useMatchStore } from '@crush/core';
import { formatDistanceToNow } from 'date-fns';
import { AnimatePresence, motion } from 'framer-motion';
import { Clock, Pin } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useMemo } from 'react';

interface PinnedConversationsProps {
  matches: Match[];
  className?: string;
}

export function PinnedConversations({ matches, className = '' }: PinnedConversationsProps) {
  const pinnedMatches = useMemo(() => matches.filter((m) => m.pinnedForUser), [matches]);

  if (pinnedMatches.length === 0) return null;

  return (
    <div className={`mb-4 ${className}`}>
      {/* Header */}
      <div className="mb-3 flex items-center gap-2 px-1">
        <Pin className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium">Pinned</span>
        <span className="text-xs text-muted-foreground">({pinnedMatches.length})</span>
      </div>

      {/* Pinned items - horizontal scroll on mobile, grid on larger screens */}
      <div className="scrollbar-hide -mx-4 flex gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 lg:grid-cols-3">
        <AnimatePresence>
          {pinnedMatches.map((match, index) => (
            <motion.div
              key={match.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ delay: index * 0.05 }}
            >
              <PinnedConversationCard match={match} />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

interface PinnedConversationCardProps {
  match: Match;
}

function PinnedConversationCard({ match }: PinnedConversationCardProps) {
  const { togglePin } = useMatchStore();

  const handleUnpin = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    await togglePin(match.id, false);
    analytics.track({
      name: 'conversation_unpinned',
      properties: { matchId: match.id },
    });
  };

  return (
    <Link
      href={`/messages/${match.id}`}
      className="group relative block w-40 flex-shrink-0 rounded-xl border border-border bg-card p-3 transition-colors hover:border-primary/50 sm:w-auto"
    >
      {/* Unpin button */}
      <button
        onClick={handleUnpin}
        className="absolute right-2 top-2 z-10 rounded-full bg-muted/80 p-1 opacity-0 transition-opacity group-hover:opacity-100"
        title="Unpin"
      >
        <Pin className="h-3 w-3 text-primary" />
      </button>

      {/* Avatar */}
      <div className="relative mb-3">
        {match.otherUserPhotoUrl ? (
          <Image
            src={match.otherUserPhotoUrl}
            alt={match.otherUserName || 'Match'}
            width={48}
            height={48}
            className="mx-auto h-12 w-12 rounded-full object-cover"
          />
        ) : (
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <span className="text-lg font-semibold text-muted-foreground">
              {match.otherUserName?.charAt(0) || '?'}
            </span>
          </div>
        )}

        {/* Unread badge */}
        {match.unreadCount > 0 && (
          <div className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground">
            {match.unreadCount > 9 ? '9+' : match.unreadCount}
          </div>
        )}
      </div>

      {/* Name */}
      <p className="truncate text-center text-sm font-medium">{match.otherUserName || 'Unknown'}</p>

      {/* Last message preview */}
      {match.lastMessage && (
        <p className="mt-1 truncate text-center text-xs text-muted-foreground">
          {match.lastMessage}
        </p>
      )}

      {/* Time */}
      {match.lastMessageAt && (
        <p className="mt-1 flex items-center justify-center gap-1 text-center text-[10px] text-muted-foreground">
          <Clock className="h-3 w-3" />
          {formatDistanceToNow(new Date(match.lastMessageAt), { addSuffix: true })}
        </p>
      )}
    </Link>
  );
}

// Pin button for conversation header
interface PinButtonProps {
  matchId: string;
  isPinned: boolean;
  className?: string;
}

export function PinButton({ matchId, isPinned, className = '' }: PinButtonProps) {
  const { togglePin } = useMatchStore();

  const handleToggle = async () => {
    await togglePin(matchId, !isPinned);
    analytics.track({
      name: !isPinned ? 'conversation_pinned' : 'conversation_unpinned',
      properties: { matchId },
    });
  };

  return (
    <button
      onClick={handleToggle}
      className={`rounded-lg p-2 transition-colors ${
        isPinned ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted'
      } ${className}`}
      title={isPinned ? 'Unpin conversation' : 'Pin conversation'}
    >
      <Pin className={`h-5 w-5 ${isPinned ? 'fill-current' : ''}`} />
    </button>
  );
}

// Context menu for pinning
interface PinContextMenuProps {
  match: Match;
  children: React.ReactNode;
}

export function PinContextMenu({ match, children }: PinContextMenuProps) {
  const { togglePin } = useMatchStore();

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    // You could use a proper context menu library here
    // For now, just toggle on right-click
    togglePin(match.id, !match.pinnedForUser);
    analytics.track({
      name: !match.pinnedForUser ? 'conversation_pinned' : 'conversation_unpinned',
      properties: { matchId: match.id },
    });
  };

  return <div onContextMenu={handleContextMenu}>{children}</div>;
}
