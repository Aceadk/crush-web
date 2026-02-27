'use client';

import { Avatar, AvatarFallback, AvatarImage, Badge, Button } from '@crush/ui';
import { cn } from '@crush/ui';
import { Loader2, Plus, Sparkles } from 'lucide-react';

export interface StoryTrayUser {
  userId: string;
  name: string;
  photoUrl?: string;
  storyCount: number;
  hasUnseen: boolean;
}

interface StoryTrayProps {
  currentUser: StoryTrayUser;
  users: StoryTrayUser[];
  onAddStory: () => void;
  onOpenStories: (userId: string) => void;
  uploading?: boolean;
  uploadProgress?: number | null;
}

function UserStoryChip({
  user,
  onOpenStories,
}: {
  user: StoryTrayUser;
  onOpenStories: (userId: string) => void;
}) {
  const initial = user.name.trim().charAt(0).toUpperCase() || '?';

  return (
    <button
      type="button"
      onClick={() => onOpenStories(user.userId)}
      className="flex flex-col items-center gap-1.5 shrink-0"
      aria-label={`View stories from ${user.name}`}
    >
      <div
        className={cn(
          'rounded-full p-[2px]',
          user.hasUnseen
            ? 'bg-gradient-to-br from-fuchsia-500 via-rose-500 to-amber-500'
            : 'bg-muted-foreground/30'
        )}
      >
        <Avatar className="h-14 w-14 border-2 border-background">
          {user.photoUrl && <AvatarImage src={user.photoUrl} alt={user.name} />}
          <AvatarFallback className="text-sm font-semibold">{initial}</AvatarFallback>
        </Avatar>
      </div>
      <div className="text-center leading-tight">
        <p className="text-xs font-medium text-foreground max-w-[64px] truncate">
          {user.name}
        </p>
        <p className="text-[10px] text-muted-foreground">
          {user.storyCount} {user.storyCount === 1 ? 'story' : 'stories'}
        </p>
      </div>
    </button>
  );
}

export function StoryTray({
  currentUser,
  users,
  onAddStory,
  onOpenStories,
  uploading = false,
  uploadProgress = null,
}: StoryTrayProps) {
  const currentUserInitial = currentUser.name.trim().charAt(0).toUpperCase() || 'Y';
  const canOpenCurrentStories = currentUser.storyCount > 0;

  return (
    <div className="w-full max-w-md mb-4">
      <div className="rounded-2xl border bg-card/80 backdrop-blur-sm p-3">
        <div className="flex items-center justify-between mb-3">
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            <Sparkles className="w-3.5 h-3.5" />
            Stories
          </div>
          {uploading && (
            <Badge variant="secondary" className="text-[10px]">
              Uploading{typeof uploadProgress === 'number' ? ` ${Math.round(uploadProgress)}%` : ''}
            </Badge>
          )}
        </div>

        <div className="flex items-start gap-3 overflow-x-auto pb-1">
          <div className="flex flex-col items-center gap-1.5 shrink-0">
            <div
              className={cn(
                'rounded-full p-[2px]',
                canOpenCurrentStories
                  ? 'bg-gradient-to-br from-cyan-500 via-blue-500 to-indigo-500'
                  : 'bg-muted-foreground/30'
              )}
            >
              <button
                type="button"
                onClick={() => {
                  if (canOpenCurrentStories) {
                    onOpenStories(currentUser.userId);
                    return;
                  }
                  onAddStory();
                }}
                className="relative"
                aria-label={canOpenCurrentStories ? 'View your stories' : 'Add a story'}
              >
                <Avatar className="h-14 w-14 border-2 border-background">
                  {currentUser.photoUrl && (
                    <AvatarImage src={currentUser.photoUrl} alt={currentUser.name} />
                  )}
                  <AvatarFallback className="text-sm font-semibold">
                    {currentUserInitial}
                  </AvatarFallback>
                </Avatar>
                <span className="absolute -bottom-1 -right-1 rounded-full bg-primary text-primary-foreground p-1 shadow-sm">
                  {uploading ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Plus className="w-3 h-3" />
                  )}
                </span>
              </button>
            </div>
            <div className="text-center leading-tight">
              <p className="text-xs font-medium text-foreground max-w-[64px] truncate">
                Your Story
              </p>
              <p className="text-[10px] text-muted-foreground">
                {canOpenCurrentStories
                  ? `${currentUser.storyCount} ${currentUser.storyCount === 1 ? 'story' : 'stories'}`
                  : 'Add'}
              </p>
            </div>
          </div>

          {users.map((user) => (
            <UserStoryChip
              key={user.userId}
              user={user}
              onOpenStories={onOpenStories}
            />
          ))}

          {!canOpenCurrentStories && users.length === 0 && (
            <div className="text-xs text-muted-foreground py-5 px-2">
              Add your first story to stand out in discovery.
            </div>
          )}
        </div>

        <div className="mt-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onAddStory}
            disabled={uploading}
            className="w-full"
          >
            {uploading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Plus className="w-4 h-4 mr-2" />
            )}
            Add Story
          </Button>
        </div>
      </div>
    </div>
  );
}
