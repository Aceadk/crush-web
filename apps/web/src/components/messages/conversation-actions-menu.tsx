'use client';

/**
 * Conversation row actions — pin, view profile, delete chat, unmatch, block.
 *
 * Everything here is reachable without opening the conversation, which matters
 * most for the safety actions: someone who needs to block or unmatch should not
 * have to walk back into the thread to do it. Mirrors the mobile app's
 * long-press sheet (`chat_list_actions_sheet.dart`) so both platforms offer the
 * same set with the same semantics — in particular, "Delete chat" clears the
 * thread for the caller only.
 *
 * The trigger opens on click AND on right-click (native context menu
 * suppressed), so the desktop habit of right-clicking a row works too.
 */

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Match,
  useAuthStore,
  useMatchStore,
  useUIStore,
  userService,
} from '@crush/core';
import {
  Button,
  cn,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@crush/ui';
import { Ban, HeartCrack, MoreVertical, Pin, PinOff, Trash2, User } from 'lucide-react';

type DestructiveAction = 'unmatch' | 'block';

const CONFIRM_COPY: Record<
  DestructiveAction,
  { title: (name: string) => string; body: (name: string) => string; confirm: string }
> = {
  unmatch: {
    title: (name) => `Unmatch ${name}?`,
    body: (name) =>
      `This removes your match with ${name} for both of you. Your conversation goes away and ` +
      `you will not be able to message unless you match again.`,
    confirm: 'Unmatch',
  },
  block: {
    title: (name) => `Block ${name}?`,
    body: (name) =>
      `${name} will no longer be able to find your profile or message you, and you will be ` +
      `unmatched. You can undo this from Settings → Blocked users.`,
    confirm: 'Block',
  },
};

interface ConversationActionsMenuProps {
  match: Match;
  /** Rendered inside a link/card: stop the row navigation on interaction. */
  stopPropagation?: boolean;
  className?: string;
}

export function ConversationActionsMenu({
  match,
  stopPropagation = true,
  className,
}: ConversationActionsMenuProps) {
  const router = useRouter();
  const { user } = useAuthStore();
  const { togglePin, unmatch, clearConversation, loadMatches } = useMatchStore();
  const { addToast } = useUIStore();

  const [pendingAction, setPendingAction] = useState<DestructiveAction | null>(null);
  const [busy, setBusy] = useState(false);

  const name = match.otherUserName || 'this person';

  const swallow = useCallback(
    (event: { preventDefault: () => void; stopPropagation: () => void }) => {
      if (!stopPropagation) return;
      event.preventDefault();
      event.stopPropagation();
    },
    [stopPropagation]
  );

  const handleTogglePin = useCallback(async () => {
    const nextPinned = !match.pinnedForUser;
    await togglePin(match.id, nextPinned);
    addToast({
      type: 'success',
      title: nextPinned ? 'Pinned' : 'Unpinned',
      description: nextPinned
        ? `${name} stays at the top of your list.`
        : `${name} is no longer pinned.`,
    });
  }, [addToast, match.id, match.pinnedForUser, name, togglePin]);

  const handleDeleteChat = useCallback(async () => {
    try {
      await clearConversation(match.id);
      addToast({
        type: 'success',
        title: 'Chat deleted',
        description: `Cleared your copy of the chat with ${name}. They still have theirs.`,
      });
    } catch {
      addToast({
        type: 'error',
        title: 'Could not delete chat',
        description: 'Please check your connection and try again.',
      });
    }
  }, [addToast, clearConversation, match.id, name]);

  const runDestructiveAction = useCallback(async () => {
    if (!pendingAction || !user) return;
    setBusy(true);
    try {
      if (pendingAction === 'unmatch') {
        await unmatch(user.uid, match.id);
        addToast({
          type: 'success',
          title: 'Unmatched',
          description: `You are no longer matched with ${name}.`,
        });
      } else {
        // Block THEN unmatch, in that order.
        //
        // The backend `blockUser` callable only writes the block record and
        // clears pending likes — it deliberately leaves the match active, and
        // neither client filters blocked pairs out of the match list. So
        // blocking alone would leave the person sitting in your conversations
        // with an unresolvable name and photo (the users read is denied once a
        // block exists). Unmatching second means a failure there still leaves
        // the protective block in place.
        await userService.blockUser(user.uid, match.otherUserId);
        await unmatch(user.uid, match.id);
        addToast({
          type: 'success',
          title: 'Blocked',
          description: `${name} can no longer find or message you.`,
        });
        await loadMatches(user.uid);
      }
      setPendingAction(null);
      router.refresh();
    } catch {
      addToast({
        type: 'error',
        title: pendingAction === 'unmatch' ? 'Could not unmatch' : 'Could not block',
        description: 'Please check your connection and try again.',
      });
    } finally {
      setBusy(false);
    }
  }, [
    addToast,
    loadMatches,
    match.id,
    match.otherUserId,
    name,
    pendingAction,
    router,
    unmatch,
    user,
  ]);

  const copy = pendingAction ? CONFIRM_COPY[pendingAction] : null;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            onClick={swallow}
            onContextMenu={(event) => {
              // Right-click opens the same menu rather than the browser's.
              event.preventDefault();
              event.currentTarget.click();
            }}
            className={cn(
              'rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground',
              className
            )}
            aria-label={`Options for ${name}`}
            title="Conversation options"
          >
            <MoreVertical className="h-4 w-4" />
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-56" onClick={swallow}>
          <DropdownMenuItem
            onSelect={() => {
              void handleTogglePin();
            }}
          >
            {match.pinnedForUser ? (
              <PinOff className="mr-2 h-4 w-4" />
            ) : (
              <Pin className="mr-2 h-4 w-4" />
            )}
            {match.pinnedForUser ? 'Unpin conversation' : 'Pin conversation'}
          </DropdownMenuItem>

          {match.otherUserId && (
            <DropdownMenuItem onSelect={() => router.push(`/profile/${match.otherUserId}`)}>
              <User className="mr-2 h-4 w-4" />
              View profile
            </DropdownMenuItem>
          )}

          <DropdownMenuSeparator />

          <DropdownMenuItem
            onSelect={() => {
              void handleDeleteChat();
            }}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete chat
          </DropdownMenuItem>

          <DropdownMenuItem onSelect={() => setPendingAction('unmatch')}>
            <HeartCrack className="mr-2 h-4 w-4" />
            Unmatch
          </DropdownMenuItem>

          <DropdownMenuItem
            onSelect={() => setPendingAction('block')}
            className="text-destructive focus:text-destructive"
          >
            <Ban className="mr-2 h-4 w-4" />
            Block user
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog
        open={pendingAction !== null}
        onOpenChange={(open) => {
          if (!open) setPendingAction(null);
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{copy?.title(name)}</DialogTitle>
            <DialogDescription>{copy?.body(name)}</DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => setPendingAction(null)} disabled={busy}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              loading={busy}
              onClick={() => {
                void runDestructiveAction();
              }}
            >
              {copy?.confirm}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
