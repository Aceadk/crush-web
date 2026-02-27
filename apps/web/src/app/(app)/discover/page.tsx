'use client';

import { LikeLimitIndicator } from '@/components/streak';
import {
    ActionButtons,
    BoostControl,
    StoryTray,
    StoryViewer,
    SwipeCard,
} from '@/features/discover';
import { analytics } from '@/lib/analytics';
import {
    DiscoveryFilters,
    useAuthStore,
    useMatchStore,
    useStoryStore,
    useStreakStore,
    useUIStore,
} from '@crush/core';
import { Badge, Button, SkeletonSwipeCard } from '@crush/ui';
import { Globe, Keyboard, RefreshCw, Sliders } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useCallback, useEffect, useRef, useState, type ChangeEvent } from 'react';

const MatchModal = dynamic(
  () => import('@/features/discover/components/match-modal').then((mod) => mod.MatchModal),
  { ssr: false }
);
const FilterDialog = dynamic(
  () => import('@/features/discover/components/filter-dialog').then((mod) => mod.FilterDialog),
  { ssr: false }
);

export default function DiscoverPage() {
  const { user, profile } = useAuthStore();
  const {
    discoveryProfiles,
    currentProfileIndex,
    loading,
    error,
    filters,
    loadDiscoveryProfiles,
    swipe,
    previousProfile,
    setFilters,
  } = useMatchStore();
  const { limitInfo, refreshLimitInfo } = useStreakStore();
  const {
    storiesByUser,
    viewedStoryIdsByUser,
    loadStoriesForUsers,
    createStoryFromFile,
    markStoryViewed,
    uploading: storyUploading,
    uploadProgress: storyUploadProgress,
  } = useStoryStore();
  const { addToast } = useUIStore();

  const [showMatchModal, setShowMatchModal] = useState(false);
  const [showFilterDialog, setShowFilterDialog] = useState(false);
  const [matchedUser, setMatchedUser] = useState<{ name: string; photo: string } | null>(null);
  const [swiping, setSwiping] = useState(false);
  const [showKeyboardHint, setShowKeyboardHint] = useState(false);
  const [activeStoryViewer, setActiveStoryViewer] = useState<{
    ownerId: string;
    ownerName: string;
    ownerPhoto?: string;
    initialIndex: number;
  } | null>(null);
  const viewedProfilesRef = useRef<Set<string>>(new Set());
  const storyInputRef = useRef<HTMLInputElement | null>(null);

  const isPremium = profile?.isPremium ?? false;
  const hasReachedDailyLikeLimit = !isPremium && (limitInfo?.remaining ?? 1) <= 0;
  const passportModeEnabled = Boolean(profile?.settings?.passportMode);
  const passportDestination = [
    profile?.settings?.passportLocation?.city,
    profile?.settings?.passportLocation?.country,
  ]
    .filter(Boolean)
    .join(', ');

  const currentProfile = discoveryProfiles[currentProfileIndex];
  const nextProfile = discoveryProfiles[currentProfileIndex + 1];
  const getStoriesForUserId = useCallback(
    (userId?: string) => (userId ? (storiesByUser[userId] ?? []) : []),
    [storiesByUser]
  );
  const hasUnseenStoriesForUser = useCallback(
    (userId?: string) => {
      if (!userId) return false;
      const stories = storiesByUser[userId] ?? [];
      if (stories.length === 0) return false;
      const viewedIds = new Set(viewedStoryIdsByUser[userId] ?? []);
      return stories.some((story) => !viewedIds.has(story.id));
    },
    [storiesByUser, viewedStoryIdsByUser]
  );

  // Load profiles on mount
  useEffect(() => {
    if (user) {
      loadDiscoveryProfiles(user.uid);
    }
  }, [user, loadDiscoveryProfiles]);

  useEffect(() => {
    if (!user) return;
    const userIds = [user.uid, ...discoveryProfiles.map((profileItem) => profileItem.id)];
    void loadStoriesForUsers(userIds);
  }, [user, discoveryProfiles, loadStoriesForUsers]);

  useEffect(() => {
    if (!currentProfile) return;
    if (viewedProfilesRef.current.has(currentProfile.id)) return;
    viewedProfilesRef.current.add(currentProfile.id);
    analytics.track({
      name: 'profile_viewed',
      properties: { profileId: currentProfile.id },
    });
  }, [currentProfile]);

  const handleSwipe = useCallback(
    async (direction: 'left' | 'right' | 'up') => {
      if (!user || !currentProfile || swiping) return;

      const action = direction === 'left' ? 'pass' : direction === 'right' ? 'like' : 'superlike';
      const isPositiveAction = action === 'like' || action === 'superlike';

      if (isPositiveAction && hasReachedDailyLikeLimit) {
        addToast({
          type: 'info',
          title: 'Daily like limit reached',
          description: 'More likes unlock after reset, or upgrade to Crush+ for unlimited likes.',
        });
        analytics.track({
          name: 'daily_limit_reached',
          properties: { likesUsed: limitInfo?.used ?? 0 },
        });
        return;
      }

      setSwiping(true);

      try {
        const result = await swipe(user.uid, currentProfile.id, action);

        if (isPositiveAction) {
          void refreshLimitInfo(user.uid, isPremium);
        }

        if (action === 'pass') {
          analytics.track({
            name: 'swipe_left',
            properties: { targetUserId: currentProfile.id },
          });
        } else if (action === 'like') {
          analytics.track({
            name: 'swipe_right',
            properties: { targetUserId: currentProfile.id },
          });
        } else {
          analytics.track({
            name: 'super_like',
            properties: { targetUserId: currentProfile.id },
          });
        }

        if (result.isMatch) {
          setMatchedUser({
            name: currentProfile.displayName,
            photo: currentProfile.photos[0] || '',
          });
          setShowMatchModal(true);
          analytics.track({
            name: 'match_created',
            properties: {
              matchId: result.matchId || `${user.uid}_${currentProfile.id}`,
            },
          });
        }
      } catch (error) {
        const isDailyLimitError =
          error instanceof Error && error.message.toLowerCase().includes('daily like limit');

        if (isDailyLimitError) {
          addToast({
            type: 'info',
            title: 'Daily like limit reached',
            description: 'More likes unlock after reset, or upgrade to Crush+ for unlimited likes.',
          });
          analytics.track({
            name: 'daily_limit_reached',
            properties: { likesUsed: limitInfo?.used ?? 0 },
          });
          void refreshLimitInfo(user.uid, isPremium);
        } else {
          addToast({
            type: 'error',
            title: 'Swipe failed',
            description: 'Please try again',
          });
        }
      } finally {
        setSwiping(false);
      }
    },
    [
      addToast,
      currentProfile,
      hasReachedDailyLikeLimit,
      isPremium,
      limitInfo?.used,
      refreshLimitInfo,
      swipe,
      swiping,
      user,
    ]
  );

  const handleRefresh = () => {
    if (user) {
      loadDiscoveryProfiles(user.uid);
    }
  };

  const handleApplyFilters = (newFilters: DiscoveryFilters) => {
    setFilters(newFilters);
    analytics.track({
      name: 'feature_used',
      properties: { feature: 'discover_filters_applied' },
    });
    // Reload profiles with new filters
    if (user) {
      loadDiscoveryProfiles(user.uid);
    }
  };

  const openStoriesForUser = useCallback(
    (ownerId: string, ownerName?: string, ownerPhoto?: string, initialIndex: number = 0) => {
      const stories = getStoriesForUserId(ownerId);
      if (stories.length === 0) {
        addToast({
          type: 'info',
          title: 'No active stories',
          description: 'This profile has no active stories right now.',
        });
        return;
      }

      setActiveStoryViewer({
        ownerId,
        ownerName: ownerName ?? 'Stories',
        ownerPhoto,
        initialIndex,
      });
      analytics.track({
        name: 'feature_used',
        properties: { feature: 'profile_stories_opened' },
      });
    },
    [addToast, getStoriesForUserId]
  );

  const handleStoryViewerOpenChange = useCallback((open: boolean) => {
    if (!open) {
      setActiveStoryViewer(null);
    }
  }, []);

  const handleStoryViewed = useCallback(
    (storyId: string) => {
      if (!user || !activeStoryViewer) return;
      void markStoryViewed(activeStoryViewer.ownerId, storyId, user.uid);
      analytics.track({
        name: 'feature_used',
        properties: { feature: 'profile_story_viewed' },
      });
    },
    [activeStoryViewer, markStoryViewed, user]
  );

  const handleAddStoryClick = useCallback(() => {
    storyInputRef.current?.click();
  }, []);

  const handleStoryInputChange = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      event.target.value = '';

      if (!file || !user) return;

      try {
        await createStoryFromFile(user.uid, file);
        addToast({
          type: 'success',
          title: 'Story added',
          description: 'Your story is now visible in discovery.',
        });
        analytics.track({
          name: 'feature_used',
          properties: { feature: 'profile_story_added' },
        });
        void loadStoriesForUsers([user.uid, ...discoveryProfiles.map((item) => item.id)]);
      } catch (error) {
        addToast({
          type: 'error',
          title: 'Story upload failed',
          description:
            error instanceof Error
              ? error.message
              : 'Unable to upload story right now. Please try again.',
        });
      }
    },
    [addToast, createStoryFromFile, discoveryProfiles, loadStoriesForUsers, user]
  );

  // Keyboard shortcuts handler
  const handleKeyPress = useCallback(
    (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input field or modal is open
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        showMatchModal ||
        showFilterDialog ||
        Boolean(activeStoryViewer)
      ) {
        return;
      }

      const key = e.key.toLowerCase();

      // Pass: Left arrow or 'a' key
      if (key === 'arrowleft' || key === 'a') {
        e.preventDefault();
        if (!swiping && currentProfile) {
          handleSwipe('left');
        }
      }

      // Like: Right arrow or 'd' key
      if (key === 'arrowright' || key === 'd') {
        e.preventDefault();
        if (!swiping && currentProfile) {
          handleSwipe('right');
        }
      }

      // Super Like: Up arrow or 'w' key
      if (key === 'arrowup' || key === 'w') {
        e.preventDefault();
        if (!swiping && currentProfile) {
          handleSwipe('up');
        }
      }

      // Undo: 'z' key
      if (key === 'z') {
        e.preventDefault();
        if (currentProfileIndex > 0) {
          previousProfile();
        }
      }

      // Toggle keyboard hints: '?' key
      if (key === '?') {
        e.preventDefault();
        setShowKeyboardHint((prev) => !prev);
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    },
    [
      showMatchModal,
      showFilterDialog,
      activeStoryViewer,
      swiping,
      currentProfile,
      currentProfileIndex,
      previousProfile,
      handleSwipe,
    ]
  );

  // Register keyboard event listener
  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handleKeyPress]);

  const currentUserStories = getStoriesForUserId(user?.uid);
  const storyTrayUsers = discoveryProfiles
    .map((profileItem) => {
      const stories = getStoriesForUserId(profileItem.id);
      if (stories.length === 0) return null;

      return {
        userId: profileItem.id,
        name: profileItem.displayName,
        photoUrl: profileItem.photos[0],
        storyCount: stories.length,
        hasUnseen: hasUnseenStoriesForUser(profileItem.id),
      };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item))
    .slice(0, 20);

  const activeViewerStories = activeStoryViewer
    ? getStoriesForUserId(activeStoryViewer.ownerId)
    : [];

  // Empty state
  if (!loading && discoveryProfiles.length === 0) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-6 text-center">
        <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-muted">
          <RefreshCw className="h-10 w-10 text-muted-foreground" />
        </div>
        <h2 className="mb-2 text-2xl font-bold">No more profiles</h2>
        <p className="mb-6 max-w-sm text-muted-foreground">
          {error
            ? 'Something went wrong loading profiles. Please try again.'
            : "You've seen everyone in your area. Check back later or adjust your filters."}
        </p>
        {user && (
          <>
            <input
              ref={storyInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/heic,video/mp4,video/webm,video/quicktime,video/x-m4v"
              onChange={handleStoryInputChange}
              className="hidden"
            />
            <StoryTray
              currentUser={{
                userId: user.uid,
                name: profile?.displayName || 'You',
                photoUrl: profile?.profilePhotoUrl,
                storyCount: currentUserStories.length,
                hasUnseen: false,
              }}
              users={storyTrayUsers}
              onAddStory={handleAddStoryClick}
              onOpenStories={(ownerId) => {
                if (ownerId === user.uid) {
                  openStoriesForUser(
                    ownerId,
                    profile?.displayName || 'You',
                    profile?.profilePhotoUrl
                  );
                  return;
                }

                const ownerProfile = discoveryProfiles.find(
                  (profileItem) => profileItem.id === ownerId
                );
                openStoriesForUser(
                  ownerId,
                  ownerProfile?.displayName ?? 'Stories',
                  ownerProfile?.photos[0]
                );
              }}
              uploading={storyUploading}
              uploadProgress={storyUploadProgress}
            />
          </>
        )}
        {error && <p className="mb-4 max-w-sm text-sm text-destructive">{error}</p>}
        <div className="flex gap-3">
          <Button onClick={handleRefresh} loading={loading}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button variant="outline" onClick={() => setShowFilterDialog(true)}>
            <Sliders className="mr-2 h-4 w-4" />
            Filters
          </Button>
        </div>

        <StoryViewer
          open={Boolean(activeStoryViewer)}
          stories={activeViewerStories}
          ownerName={activeStoryViewer?.ownerName ?? 'Stories'}
          ownerPhoto={activeStoryViewer?.ownerPhoto}
          initialIndex={activeStoryViewer?.initialIndex ?? 0}
          onOpenChange={handleStoryViewerOpenChange}
          onStoryViewed={handleStoryViewed}
        />

        {/* Filter dialog */}
        <FilterDialog
          open={showFilterDialog}
          onOpenChange={setShowFilterDialog}
          filters={filters}
          onApplyFilters={handleApplyFilters}
        />
      </div>
    );
  }

  // Loading state
  if (loading && discoveryProfiles.length === 0) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-6">
        <div className="relative w-full max-w-md">
          <SkeletonSwipeCard />
        </div>
        <div className="mt-8 flex gap-4">
          <div className="h-16 w-16 animate-pulse rounded-full bg-muted" />
          <div className="h-14 w-14 animate-pulse rounded-full bg-muted" />
          <div className="h-16 w-16 animate-pulse rounded-full bg-muted" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6">
      <div className="absolute left-4 top-4 z-10">
        <LikeLimitIndicator variant="compact" />
        {passportModeEnabled && passportDestination && (
          <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
            <Globe className="h-3.5 w-3.5" />
            Passport: {passportDestination}
          </div>
        )}
      </div>

      {/* Header */}
      <div className="absolute right-4 top-4 flex items-center gap-2">
        {user && <BoostControl userId={user.uid} isPremium={isPremium} />}
        <Button variant="ghost" size="icon" onClick={handleRefresh} aria-label="Refresh profiles">
          <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setShowFilterDialog(true)}
          aria-label="Filter profiles"
        >
          <Sliders className="h-5 w-5" />
        </Button>
      </div>

      <input
        ref={storyInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic,video/mp4,video/webm,video/quicktime,video/x-m4v"
        onChange={handleStoryInputChange}
        className="hidden"
      />

      {user && (
        <StoryTray
          currentUser={{
            userId: user.uid,
            name: profile?.displayName || 'You',
            photoUrl: profile?.profilePhotoUrl,
            storyCount: currentUserStories.length,
            hasUnseen: false,
          }}
          users={storyTrayUsers}
          onAddStory={handleAddStoryClick}
          onOpenStories={(ownerId) => {
            if (ownerId === user.uid) {
              openStoriesForUser(ownerId, profile?.displayName || 'You', profile?.profilePhotoUrl);
              return;
            }

            const ownerProfile = discoveryProfiles.find(
              (profileItem) => profileItem.id === ownerId
            );
            openStoriesForUser(
              ownerId,
              ownerProfile?.displayName ?? 'Stories',
              ownerProfile?.photos[0]
            );
          }}
          uploading={storyUploading}
          uploadProgress={storyUploadProgress}
        />
      )}

      {/* Card stack */}
      <div className="relative mb-8 aspect-[3/4] w-full max-w-md">
        {/* Background card (next profile) */}
        {nextProfile && (
          <SwipeCard
            key={nextProfile.id}
            profile={nextProfile}
            onSwipe={() => {}}
            isTop={false}
            storyCount={getStoriesForUserId(nextProfile.id).length}
            hasUnseenStories={hasUnseenStoriesForUser(nextProfile.id)}
            onOpenStories={() =>
              openStoriesForUser(nextProfile.id, nextProfile.displayName, nextProfile.photos[0])
            }
          />
        )}

        {/* Top card (current profile) */}
        {currentProfile && (
          <SwipeCard
            key={currentProfile.id}
            profile={currentProfile}
            onSwipe={handleSwipe}
            isTop={true}
            storyCount={getStoriesForUserId(currentProfile.id).length}
            hasUnseenStories={hasUnseenStoriesForUser(currentProfile.id)}
            onOpenStories={() =>
              openStoriesForUser(
                currentProfile.id,
                currentProfile.displayName,
                currentProfile.photos[0]
              )
            }
          />
        )}
      </div>

      {/* Action buttons */}
      <ActionButtons
        onPass={() => handleSwipe('left')}
        onLike={() => handleSwipe('right')}
        onSuperLike={() => handleSwipe('up')}
        onUndo={previousProfile}
        disabled={swiping || !currentProfile}
        disableLikeActions={hasReachedDailyLikeLimit}
        canUndo={currentProfileIndex > 0}
      />

      {/* Match modal */}
      <MatchModal
        isOpen={showMatchModal}
        onClose={() => setShowMatchModal(false)}
        matchedUser={matchedUser}
        currentUserPhoto={profile?.profilePhotoUrl}
      />

      <StoryViewer
        open={Boolean(activeStoryViewer)}
        stories={activeViewerStories}
        ownerName={activeStoryViewer?.ownerName ?? 'Stories'}
        ownerPhoto={activeStoryViewer?.ownerPhoto}
        initialIndex={activeStoryViewer?.initialIndex ?? 0}
        onOpenChange={handleStoryViewerOpenChange}
        onStoryViewed={handleStoryViewed}
      />

      {/* Error toast */}
      {error && (
        <div className="fixed bottom-4 left-4 right-4 rounded-xl bg-destructive p-4 text-destructive-foreground shadow-lg md:left-auto md:right-4 md:w-80">
          {error}
        </div>
      )}

      {/* Filter dialog */}
      <FilterDialog
        open={showFilterDialog}
        onOpenChange={setShowFilterDialog}
        filters={filters}
        onApplyFilters={handleApplyFilters}
      />

      {/* Keyboard shortcuts hint */}
      <div className="fixed bottom-4 left-4 hidden md:block">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowKeyboardHint(!showKeyboardHint)}
          className="text-muted-foreground hover:text-foreground"
        >
          <Keyboard className="mr-2 h-4 w-4" />
          Keyboard shortcuts
        </Button>
      </div>

      {/* Keyboard shortcuts panel */}
      {showKeyboardHint && (
        <div className="fixed bottom-16 left-4 z-50 hidden w-64 rounded-xl border bg-background p-4 shadow-lg md:block">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-semibold">Keyboard Shortcuts</h3>
            <button
              onClick={() => setShowKeyboardHint(false)}
              className="text-muted-foreground hover:text-foreground"
              aria-label="Close keyboard shortcuts"
            >
              ×
            </button>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Pass</span>
              <div className="flex gap-1">
                <Badge variant="secondary" className="px-2 text-xs">
                  ←
                </Badge>
                <Badge variant="secondary" className="px-2 text-xs">
                  A
                </Badge>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Like</span>
              <div className="flex gap-1">
                <Badge variant="secondary" className="px-2 text-xs">
                  →
                </Badge>
                <Badge variant="secondary" className="px-2 text-xs">
                  D
                </Badge>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Super Like</span>
              <div className="flex gap-1">
                <Badge variant="secondary" className="px-2 text-xs">
                  ↑
                </Badge>
                <Badge variant="secondary" className="px-2 text-xs">
                  W
                </Badge>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Undo</span>
              <Badge variant="secondary" className="px-2 text-xs">
                Z
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Toggle hints</span>
              <Badge variant="secondary" className="px-2 text-xs">
                ?
              </Badge>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
