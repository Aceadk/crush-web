'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuthStore, useMatchStore, useUIStore, DiscoveryFilters } from '@crush/core';
import { SwipeCard, ActionButtons, MatchModal, FilterDialog } from '@/features/discover';
import { SkeletonSwipeCard, Button, Badge } from '@crush/ui';
import { RefreshCw, Sliders, Keyboard } from 'lucide-react';

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
  const { addToast } = useUIStore();

  const [showMatchModal, setShowMatchModal] = useState(false);
  const [showFilterDialog, setShowFilterDialog] = useState(false);
  const [matchedUser, setMatchedUser] = useState<{ name: string; photo: string } | null>(null);
  const [swiping, setSwiping] = useState(false);
  const [showKeyboardHint, setShowKeyboardHint] = useState(false);

  const currentProfile = discoveryProfiles[currentProfileIndex];
  const nextProfile = discoveryProfiles[currentProfileIndex + 1];

  // Load profiles on mount
  useEffect(() => {
    if (user) {
      loadDiscoveryProfiles(user.uid);
    }
  }, [user, loadDiscoveryProfiles]);

  const handleSwipe = async (direction: 'left' | 'right' | 'up') => {
    if (!user || !currentProfile || swiping) return;

    setSwiping(true);

    const action = direction === 'left' ? 'pass' : direction === 'right' ? 'like' : 'superlike';

    try {
      const result = await swipe(user.uid, currentProfile.id, action);

      if (result.isMatch) {
        setMatchedUser({
          name: currentProfile.displayName,
          photo: currentProfile.photos[0] || '',
        });
        setShowMatchModal(true);
      }
    } catch {
      addToast({
        type: 'error',
        title: 'Swipe failed',
        description: 'Please try again',
      });
    } finally {
      setSwiping(false);
    }
  };

  const handleRefresh = () => {
    if (user) {
      loadDiscoveryProfiles(user.uid);
    }
  };

  const handleApplyFilters = (newFilters: DiscoveryFilters) => {
    setFilters(newFilters);
    // Reload profiles with new filters
    if (user) {
      loadDiscoveryProfiles(user.uid);
    }
  };

  // Keyboard shortcuts handler
  const handleKeyPress = useCallback((e: KeyboardEvent) => {
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
      setShowKeyboardHint(prev => !prev);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showMatchModal, showFilterDialog, swiping, currentProfile, currentProfileIndex, previousProfile]);

  // Register keyboard event listener
  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handleKeyPress]);

  // Empty state
  if (!loading && discoveryProfiles.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center">
        <div className="w-24 h-24 mb-6 rounded-full bg-muted flex items-center justify-center">
          <RefreshCw className="w-10 h-10 text-muted-foreground" />
        </div>
        <h2 className="text-2xl font-bold mb-2">No more profiles</h2>
        <p className="text-muted-foreground mb-6 max-w-sm">
          You've seen everyone in your area. Check back later or adjust your filters.
        </p>
        <div className="flex gap-3">
          <Button onClick={handleRefresh} loading={loading}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" onClick={() => setShowFilterDialog(true)}>
            <Sliders className="w-4 h-4 mr-2" />
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
  if (loading && discoveryProfiles.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6">
        <div className="relative w-full max-w-md">
          <SkeletonSwipeCard />
        </div>
        <div className="mt-8 flex gap-4">
          <div className="w-16 h-16 rounded-full bg-muted animate-pulse" />
          <div className="w-14 h-14 rounded-full bg-muted animate-pulse" />
          <div className="w-16 h-16 rounded-full bg-muted animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6">
      {/* Header */}
      <div className="absolute top-4 right-4 flex gap-2">
        <Button variant="ghost" size="icon" onClick={handleRefresh}>
          <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
        </Button>
        <Button variant="ghost" size="icon" onClick={() => setShowFilterDialog(true)}>
          <Sliders className="w-5 h-5" />
        </Button>
      </div>

      {/* Card stack */}
      <div className="relative w-full max-w-md aspect-[3/4] mb-8">
        {/* Background card (next profile) */}
        {nextProfile && (
          <SwipeCard
            key={nextProfile.id}
            profile={nextProfile}
            onSwipe={() => {}}
            isTop={false}
          />
        )}

        {/* Top card (current profile) */}
        {currentProfile && (
          <SwipeCard
            key={currentProfile.id}
            profile={currentProfile}
            onSwipe={handleSwipe}
            isTop={true}
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
        canUndo={currentProfileIndex > 0}
      />

      {/* Match modal */}
      <MatchModal
        isOpen={showMatchModal}
        onClose={() => setShowMatchModal(false)}
        matchedUser={matchedUser}
        currentUserPhoto={profile?.profilePhotoUrl}
      />

      {/* Error toast */}
      {error && (
        <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-80 bg-destructive text-destructive-foreground p-4 rounded-xl shadow-lg">
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
      <div className="hidden md:block fixed bottom-4 left-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowKeyboardHint(!showKeyboardHint)}
          className="text-muted-foreground hover:text-foreground"
        >
          <Keyboard className="w-4 h-4 mr-2" />
          Keyboard shortcuts
        </Button>
      </div>

      {/* Keyboard shortcuts panel */}
      {showKeyboardHint && (
        <div className="hidden md:block fixed bottom-16 left-4 bg-background border rounded-xl shadow-lg p-4 w-64 z-50">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold">Keyboard Shortcuts</h3>
            <button
              onClick={() => setShowKeyboardHint(false)}
              className="text-muted-foreground hover:text-foreground"
            >
              ×
            </button>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Pass</span>
              <div className="flex gap-1">
                <Badge variant="secondary" className="text-xs px-2">←</Badge>
                <Badge variant="secondary" className="text-xs px-2">A</Badge>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Like</span>
              <div className="flex gap-1">
                <Badge variant="secondary" className="text-xs px-2">→</Badge>
                <Badge variant="secondary" className="text-xs px-2">D</Badge>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Super Like</span>
              <div className="flex gap-1">
                <Badge variant="secondary" className="text-xs px-2">↑</Badge>
                <Badge variant="secondary" className="text-xs px-2">W</Badge>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Undo</span>
              <Badge variant="secondary" className="text-xs px-2">Z</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Toggle hints</span>
              <Badge variant="secondary" className="text-xs px-2">?</Badge>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
