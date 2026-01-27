'use client';

import { useEffect, useState } from 'react';
import { useAuthStore, useMatchStore, useUIStore, DiscoveryFilters } from '@crush/core';
import { SwipeCard, ActionButtons, MatchModal, FilterDialog } from '@/features/discover';
import { SkeletonSwipeCard, Button } from '@crush/ui';
import { RefreshCw, Sliders } from 'lucide-react';

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

  // Load profiles on mount
  useEffect(() => {
    if (user) {
      loadDiscoveryProfiles(user.uid);
    }
  }, [user, loadDiscoveryProfiles]);

  const currentProfile = discoveryProfiles[currentProfileIndex];
  const nextProfile = discoveryProfiles[currentProfileIndex + 1];

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
    </div>
  );
}
