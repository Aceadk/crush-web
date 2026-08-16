'use client';

import { LikeLimitIndicator } from '@/components/streak';
import {
    ActionButtons,
    BoostControl,
    SwipeCard,
} from '@/features/discover';
import { analytics } from '@/lib/analytics';
import {
    DiscoveryFilters,
    discoveryFiltersFromProfile,
    useAuthStore,
    useMatchStore,
    useStreakStore,
    useUIStore,
} from '@crush/core';
import { Badge, Button, SkeletonSwipeCard } from '@crush/ui';
import { Globe, Keyboard, RefreshCw, Sliders } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

const MatchModal = dynamic(
  () => import('@/features/discover/components/match-modal').then((mod) => mod.MatchModal),
  { ssr: false }
);
const FilterDialog = dynamic(
  () => import('@/features/discover/components/filter-dialog').then((mod) => mod.FilterDialog),
  { ssr: false }
);

export default function DiscoverPage() {
  const router = useRouter();
  const { user, profile } = useAuthStore();
  const {
    discoveryProfiles: storedDiscoveryProfiles,
    currentProfileIndex,
    filters,
    discoveryOwnerUserId,
    discoveryLoading,
    discoveryRefreshing,
    discoveryError,
    localDeckExpanded,
    loadDiscoveryProfiles,
    swipe,
    setFilters,
  } = useMatchStore();
  const { limitInfo, refreshLimitInfo } = useStreakStore();
  const { addToast } = useUIStore();

  const [showMatchModal, setShowMatchModal] = useState(false);
  const [showFilterDialog, setShowFilterDialog] = useState(false);
  const [matchedUser, setMatchedUser] = useState<{ name: string; photo: string } | null>(null);
  const [swiping, setSwiping] = useState(false);
  const [showKeyboardHint, setShowKeyboardHint] = useState(false);
  const viewedProfilesRef = useRef<Set<string>>(new Set());

  const isPremium = profile?.isPremium ?? false;
  const hasReachedDailyLikeLimit = !isPremium && (limitInfo?.remaining ?? 1) <= 0;
  // Super Likes have their OWN server-enforced budget (finite for Plus too), so
  // they cannot be gated by the like limit alone — that was the divergence:
  // mobile enforced a Super Like quota while web let them through until the
  // like limit was hit. Both now read the same server counter.
  const hasReachedSuperLikeLimit = (limitInfo?.superLikesRemaining ?? 1) <= 0;
  // Passport is an entitlement, not just a saved toggle. A stale/free account
  // must never display or request the premium discovery mode.
  const passportModeEnabled = Boolean(isPremium && profile?.settings?.passportMode);
  const passportDestination = [
    profile?.settings?.passportLocation?.city,
    profile?.settings?.passportLocation?.country,
  ]
    .filter(Boolean)
    .join(', ');

  // Store state survives route transitions. Never render even one frame of a
  // previous account's cached deck while the new account request is starting.
  const discoveryProfiles = useMemo(
    () => (discoveryOwnerUserId === user?.uid ? storedDiscoveryProfiles : []),
    [discoveryOwnerUserId, storedDiscoveryProfiles, user?.uid]
  );

  const currentProfile = discoveryProfiles[currentProfileIndex];
  const nextProfile = discoveryProfiles[currentProfileIndex + 1];

  // Seed the deck filters from the account's SAVED discovery preferences
  // before the first fetch, then load.
  //
  // The store's defaults are a hardcoded 18–50 / 50km, which is not what this
  // account asked for and not what mobile sends — the app sends only distance
  // and lets the backend fall back to the same saved preferences. Starting
  // from the profile is what makes the two decks obey identical rules.
  // Depend on the preference VALUES, never the profile object.
  //
  // `profile` is replaced with a new object on every auth-store write
  // (`set({ profile })` on load, setProfile, refreshProfile). Depending on its
  // identity re-ran this effect — re-seeding filters and re-fetching the whole
  // deck — on writes that changed nothing about discovery, producing request
  // churn that made the deck feel stuck. Serializing the resolved filters means
  // it re-fires only when a number the backend actually receives has changed.
  const seededFilters = useMemo(
    () => (profile ? discoveryFiltersFromProfile(profile) : null),
    [profile]
  );
  const seededFiltersKey = seededFilters ? JSON.stringify(seededFilters) : null;

  useEffect(() => {
    if (!user || !seededFiltersKey) return;
    setFilters(JSON.parse(seededFiltersKey) as DiscoveryFilters);
    void loadDiscoveryProfiles(user.uid, {
      allowDistanceExpansion: !passportModeEnabled,
    });
    // `filters` is deliberately absent: re-seeding on every filter change would
    // clobber the filter dialog's edits.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid, seededFiltersKey, passportModeEnabled, loadDiscoveryProfiles, setFilters]);


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

      if (action === 'superlike' && hasReachedSuperLikeLimit) {
        addToast({
          type: 'info',
          title: 'No Super Likes left today',
          description: isPremium
            ? 'Your Super Likes reset tomorrow.'
            : 'Upgrade to Crush+ for more Super Likes every day.',
        });
        return;
      }

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
      hasReachedSuperLikeLimit,
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
      void loadDiscoveryProfiles(user.uid, {
        allowDistanceExpansion: !passportModeEnabled,
      });
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
      void loadDiscoveryProfiles(user.uid, {
        allowDistanceExpansion: !passportModeEnabled,
      });
    }
  };


  // Keyboard shortcuts handler
  const handleKeyPress = useCallback(
    (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input field or modal is open
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        showMatchModal ||
        showFilterDialog
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
      swiping,
      currentProfile,
      handleSwipe,
    ]
  );

  // Register keyboard event listener
  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handleKeyPress]);



  // A failed load is NOT an empty deck. This screen used to render the
  // "No more profiles" headline for BOTH, so a backend rejection — most
  // importantly the profile-completion gate ("Complete your profile before
  // viewing discovery. Missing: …") — read as "there is nobody to show",
  // hiding both the real problem and its fix from the user. The server sends
  // a precise message and the store keeps it in discoveryError; render it.
  if (!discoveryLoading && discoveryProfiles.length === 0 && discoveryError) {
    const isProfileGate = /complete your profile/i.test(discoveryError);
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-6 text-center">
        <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-muted">
          <RefreshCw className="h-10 w-10 text-muted-foreground" />
        </div>
        <h2 className="mb-2 text-2xl font-bold">
          {isProfileGate ? 'Finish your profile to start browsing' : 'Could not load profiles'}
        </h2>
        <p className="mb-6 max-w-sm text-muted-foreground">{discoveryError}</p>
        <div className="flex gap-3">
          {isProfileGate && (
            <Button onClick={() => router.push('/onboarding')}>Finish my profile</Button>
          )}
          <Button
            variant={isProfileGate ? 'outline' : 'default'}
            onClick={handleRefresh}
            loading={discoveryRefreshing}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Try again
          </Button>
        </div>
      </div>
    );
  }

  // Empty state — a real, successfully-loaded empty deck.
  if (!discoveryLoading && discoveryProfiles.length === 0) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-6 text-center">
        <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-muted">
          <RefreshCw className="h-10 w-10 text-muted-foreground" />
        </div>
        <h2 className="mb-2 text-2xl font-bold">No more profiles</h2>
        <p className="mb-6 max-w-sm text-muted-foreground">
          {localDeckExpanded
            ? "You've seen everyone available right now — new people appear here as they join. Check back soon."
            : "You've seen everyone in your area. Check back later or adjust your filters."}
        </p>
        <div className="flex gap-3">
          <Button onClick={handleRefresh} loading={discoveryRefreshing}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button variant="outline" onClick={() => setShowFilterDialog(true)}>
            <Sliders className="mr-2 h-4 w-4" />
            Filters
          </Button>
        </div>


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
  if (discoveryLoading && discoveryProfiles.length === 0) {
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
    // Fixed-viewport deck, mirroring the mobile layout
    // (deck_screen.dart: Stack(fit: StackFit.expand) + Positioned.fill).
    //
    // The old layout stacked story tray → fixed 3/4 card (max-w-md) → buttons →
    // hints in a vertical column, so the page was taller than the viewport and
    // the whole deck scrolled — cards drifted under the browser chrome and the
    // photo was a small letterbox. Now the shell owns the height, the card
    // fills it edge to edge, and the controls float ON the photo the way they
    // do in the app, which is what reclaims the vertical space.
    //
    // h-[100dvh] (not vh) so mobile browser chrome collapsing cannot create a
    // scrollbar; the app shell already reserves the mobile menu button.
    <div className="relative flex h-[100dvh] flex-col overflow-hidden">
      <div className="pointer-events-none absolute left-4 top-4 z-30">
        <div className="pointer-events-auto">
          <LikeLimitIndicator variant="compact" />
          {passportModeEnabled && passportDestination && (
            <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
              <Globe className="h-3.5 w-3.5" />
              Passport: {passportDestination}
            </div>
          )}
          {localDeckExpanded && !passportModeEnabled && (
            <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-2.5 py-1 text-xs font-medium text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
              <Globe className="h-3.5 w-3.5" />
              Search expanded to 500 km
            </div>
          )}
        </div>
      </div>

      {/* Header */}
      <div className="absolute right-4 top-4 z-30 flex items-center gap-2">
        {user && <BoostControl userId={user.uid} isPremium={isPremium} />}
        <Button variant="ghost" size="icon" onClick={handleRefresh} aria-label="Refresh profiles">
          <RefreshCw className={`h-5 w-5 ${discoveryRefreshing ? 'animate-spin' : ''}`} />
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

      {/* Card stack — grows to fill the viewport instead of a fixed aspect box.
          max-w-* keeps it sane on desktop; on a phone it goes edge to edge. */}
      <div className="relative min-h-0 flex-1 px-2 pb-2 pt-16 sm:px-4 sm:pb-4">
        <div className="relative mx-auto h-full w-full max-w-md lg:max-w-lg">
          {/* Background card (next profile) */}
          {nextProfile && (
            <SwipeCard key={nextProfile.id} profile={nextProfile} onSwipe={() => {}} isTop={false} />
          )}

          {/* Top card (current profile) */}
          {currentProfile && (
            <SwipeCard key={currentProfile.id} profile={currentProfile} onSwipe={handleSwipe} isTop />
          )}

          {/* Controls float ON the card, as in the app, so they cost no layout
              height and the photo keeps the full viewport. */}
          <div className="pointer-events-none absolute inset-x-0 bottom-4 z-20 flex justify-center sm:bottom-6">
            <div className="pointer-events-auto">
        {/* Action buttons. No Undo: rewind is unavailable on both platforms —
        there is no backend undo, and the swipe is already recorded by the
        time the card leaves the screen. */}
        <ActionButtons
        onPass={() => handleSwipe('left')}
        onLike={() => handleSwipe('right')}
        onSuperLike={() => handleSwipe('up')}
        disabled={swiping || !currentProfile}
        disableLikeActions={hasReachedDailyLikeLimit}
        disableSuperLike={hasReachedSuperLikeLimit}
        />
            </div>
          </div>
        </div>
      </div>


      {/* Match modal */}
      <MatchModal
        isOpen={showMatchModal}
        onClose={() => setShowMatchModal(false)}
        matchedUser={matchedUser}
        currentUserPhoto={profile?.profilePhotoUrl}
      />


      {/* Error toast */}
      {discoveryError && (
        <div className="fixed bottom-4 left-4 right-4 rounded-xl bg-destructive p-4 text-destructive-foreground shadow-lg md:left-auto md:right-4 md:w-80">
          {discoveryError}
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
