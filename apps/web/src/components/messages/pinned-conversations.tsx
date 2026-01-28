'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Pin, MessageCircle, Clock } from 'lucide-react';
import { Match, useMatchStore } from '@crush/core';
import { formatDistanceToNow } from 'date-fns';

interface PinnedConversationsProps {
  matches: Match[];
  className?: string;
}

export function PinnedConversations({ matches, className = '' }: PinnedConversationsProps) {
  const pinnedMatches = useMemo(
    () => matches.filter((m) => m.pinnedForUser),
    [matches]
  );

  if (pinnedMatches.length === 0) return null;

  return (
    <div className={`mb-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center gap-2 mb-3 px-1">
        <Pin className="w-4 h-4 text-primary" />
        <span className="text-sm font-medium">Pinned</span>
        <span className="text-xs text-muted-foreground">({pinnedMatches.length})</span>
      </div>

      {/* Pinned items - horizontal scroll on mobile, grid on larger screens */}
      <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 sm:grid sm:grid-cols-2 lg:grid-cols-3 sm:overflow-visible scrollbar-hide">
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
  };

  return (
    <Link
      href={`/messages/${match.id}`}
      className="relative flex-shrink-0 w-40 sm:w-auto block rounded-xl border border-border bg-card p-3 hover:border-primary/50 transition-colors group"
    >
      {/* Unpin button */}
      <button
        onClick={handleUnpin}
        className="absolute top-2 right-2 p-1 rounded-full bg-muted/80 opacity-0 group-hover:opacity-100 transition-opacity z-10"
        title="Unpin"
      >
        <Pin className="w-3 h-3 text-primary" />
      </button>

      {/* Avatar */}
      <div className="relative mb-3">
        {match.otherUserPhotoUrl ? (
          <img
            src={match.otherUserPhotoUrl}
            alt={match.otherUserName || 'Match'}
            className="w-12 h-12 rounded-full object-cover mx-auto"
          />
        ) : (
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto">
            <span className="text-lg font-semibold text-muted-foreground">
              {match.otherUserName?.charAt(0) || '?'}
            </span>
          </div>
        )}

        {/* Unread badge */}
        {match.unreadCount > 0 && (
          <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs font-medium flex items-center justify-center">
            {match.unreadCount > 9 ? '9+' : match.unreadCount}
          </div>
        )}
      </div>

      {/* Name */}
      <p className="text-sm font-medium text-center truncate">
        {match.otherUserName || 'Unknown'}
      </p>

      {/* Last message preview */}
      {match.lastMessage && (
        <p className="text-xs text-muted-foreground text-center truncate mt-1">
          {match.lastMessage}
        </p>
      )}

      {/* Time */}
      {match.lastMessageAt && (
        <p className="text-[10px] text-muted-foreground text-center mt-1 flex items-center justify-center gap-1">
          <Clock className="w-3 h-3" />
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
  };

  return (
    <button
      onClick={handleToggle}
      className={`p-2 rounded-lg transition-colors ${
        isPinned
          ? 'bg-primary/10 text-primary'
          : 'hover:bg-muted text-muted-foreground'
      } ${className}`}
      title={isPinned ? 'Unpin conversation' : 'Pin conversation'}
    >
      <Pin className={`w-5 h-5 ${isPinned ? 'fill-current' : ''}`} />
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
  };

  return (
    <div onContextMenu={handleContextMenu}>
      {children}
    </div>
  );
}
