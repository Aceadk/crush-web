'use client';

import { matchService, useAuthStore, useMatchStore, useUIStore, WeeklyPick } from '@crush/core';
import { Avatar, AvatarFallback, AvatarImage, Badge, Button, Card, cn } from '@crush/ui';
import { formatDistanceToNow } from 'date-fns';
import {
    ArrowLeft,
    CheckCircle2,
    Clock,
    Crown,
    Heart,
    Loader2,
    MapPin,
    RefreshCw,
    Sparkles,
    Star,
    X,
} from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

export default function WeeklyPicksPage() {
  const router = useRouter();
  const { user, profile } = useAuthStore();
  const { addToast } = useUIStore();
  const { swipe } = useMatchStore();
  const [picks, setPicks] = useState<WeeklyPick[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showMatchModal, setShowMatchModal] = useState(false);
  const [matchedPick, setMatchedPick] = useState<WeeklyPick | null>(null);

  const loadPicks = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    try {
      const weeklyPicks = await matchService.getWeeklyPicks(user.uid);
      setPicks(weeklyPicks);
    } catch (error) {
      console.error('Failed to load weekly picks:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadPicks();
  }, [loadPicks]);

  const handleLike = async (pick: WeeklyPick) => {
    if (!user || actionLoading) return;

    setActionLoading(pick.id);
    try {
      const result = await swipe(user.uid, pick.userId, 'like');
      if (result.isMatch) {
        setMatchedPick(pick);
        setShowMatchModal(true);
      }
      // Remove from list
      setPicks((prev) => prev.filter((p) => p.id !== pick.id));
    } catch (error) {
      if (error instanceof Error && error.message.toLowerCase().includes('daily like limit')) {
        addToast({
          type: 'info',
          title: 'Daily like limit reached',
          description: 'More likes unlock after reset, or upgrade to Crush+ for unlimited likes.',
        });
      } else {
        console.error('Failed to like:', error);
        addToast({
          type: 'error',
          title: 'Could not like this pick',
          description: 'Please try again.',
        });
      }
    } finally {
      setActionLoading(null);
    }
  };

  const handlePass = async (pick: WeeklyPick) => {
    if (!user || actionLoading) return;

    setActionLoading(pick.id);
    try {
      await swipe(user.uid, pick.userId, 'pass');
      // Remove from list
      setPicks((prev) => prev.filter((p) => p.id !== pick.id));
    } catch (error) {
      console.error('Failed to pass:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleSuperLike = async (pick: WeeklyPick) => {
    if (!user || actionLoading) return;

    setActionLoading(pick.id);
    try {
      const result = await swipe(user.uid, pick.userId, 'superlike');
      if (result.isMatch) {
        setMatchedPick(pick);
        setShowMatchModal(true);
      }
      // Remove from list
      setPicks((prev) => prev.filter((p) => p.id !== pick.id));
    } catch (error) {
      if (error instanceof Error && error.message.toLowerCase().includes('daily like limit')) {
        addToast({
          type: 'info',
          title: 'Daily like limit reached',
          description: 'More likes unlock after reset, or upgrade to Crush+ for unlimited likes.',
        });
      } else {
        console.error('Failed to super like:', error);
        addToast({
          type: 'error',
          title: 'Could not super like this pick',
          description: 'Please try again.',
        });
      }
    } finally {
      setActionLoading(null);
    }
  };

  // Calculate time until picks refresh
  const getTimeUntilRefresh = () => {
    if (picks.length === 0) return null;
    const expiresAt = new Date(picks[0].expiresAt);
    return formatDistanceToNow(expiresAt, { addSuffix: false });
  };

  const isPremium = profile?.isPremium;

  return (
    <div className="min-h-screen bg-gray-50 pb-20 dark:bg-gray-900">
      {/* Header */}
      <div className="sticky top-0 z-20 border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <div className="mx-auto flex max-w-4xl items-center gap-4 px-4 py-4">
          <button
            onClick={() => router.back()}
            className="-ml-2 p-2 text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
          >
            <ArrowLeft className="h-6 w-6" />
          </button>
          <div className="flex-1">
            <h1 className="flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white">
              <Sparkles className="h-5 w-5 text-amber-500" />
              Weekly Picks
            </h1>
            {picks.length > 0 && (
              <p className="mt-0.5 flex items-center gap-1 text-xs text-gray-500">
                <Clock className="h-3 w-3" />
                Refreshes in {getTimeUntilRefresh()}
              </p>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={loadPicks}
            disabled={loading}
            aria-label="Refresh weekly picks"
          >
            <RefreshCw className={cn('h-5 w-5', loading && 'animate-spin')} />
          </Button>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 py-6">
        {/* Premium banner */}
        <Card className="mb-6 overflow-hidden bg-gradient-to-r from-amber-500 to-orange-500">
          <div className="flex items-center gap-4 p-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20">
              <Sparkles className="h-6 w-6 text-white" />
            </div>
            <div className="flex-1">
              <h2 className="font-semibold text-white">Your Top Picks This Week</h2>
              <p className="text-sm text-white/80">
                Hand-picked profiles based on your preferences and compatibility
              </p>
            </div>
            {!isPremium && (
              <Badge className="border-0 bg-white/20 text-white">
                <Crown className="mr-1 h-3 w-3" />
                Premium
              </Badge>
            )}
          </div>
        </Card>

        {/* Loading state */}
        {loading && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {[...Array(4)].map((_, i) => (
              <Card key={i} className="overflow-hidden">
                <div className="aspect-[4/5] animate-pulse bg-gray-200 dark:bg-gray-700" />
                <div className="space-y-2 p-4">
                  <div className="h-5 w-1/2 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                  <div className="h-4 w-3/4 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && picks.length === 0 && (
          <div className="py-16 text-center">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
              <Sparkles className="h-10 w-10 text-amber-500" />
            </div>
            <h2 className="mb-2 text-xl font-semibold text-gray-900 dark:text-white">
              No picks available
            </h2>
            <p className="mx-auto mb-6 max-w-sm text-gray-500 dark:text-gray-400">
              You've seen all your weekly picks! Check back next week for new curated matches.
            </p>
            <Button onClick={() => router.push('/discover')}>Continue Discovering</Button>
          </div>
        )}

        {/* Picks grid */}
        {!loading && picks.length > 0 && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {picks.map((pick, index) => (
              <PickCard
                key={pick.id}
                pick={pick}
                index={index}
                isPremium={isPremium}
                isLoading={actionLoading === pick.id}
                onLike={() => handleLike(pick)}
                onPass={() => handlePass(pick)}
                onSuperLike={() => handleSuperLike(pick)}
                onViewProfile={() => router.push(`/profile/${pick.userId}`)}
              />
            ))}
          </div>
        )}

        {/* Info note */}
        <div className="mt-8 rounded-xl bg-amber-50 p-4 dark:bg-amber-900/20">
          <div className="flex items-start gap-3">
            <Sparkles className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-500" />
            <div>
              <p className="font-medium text-amber-700 dark:text-amber-300">About Weekly Picks</p>
              <p className="mt-1 text-sm text-amber-600 dark:text-amber-400">
                Every week, we curate a selection of profiles based on your preferences, interests,
                and compatibility. Your picks refresh every Sunday at midnight.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Match Modal */}
      {showMatchModal && matchedPick && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <Card className="animate-in zoom-in-95 w-full max-w-sm overflow-hidden">
            <div className="p-6 text-center">
              <div className="mb-6 flex items-center justify-center gap-4">
                <Avatar className="h-20 w-20 ring-4 ring-pink-500">
                  {profile?.profilePhotoUrl ? (
                    <AvatarImage src={profile.profilePhotoUrl} />
                  ) : (
                    <AvatarFallback>{profile?.displayName?.charAt(0)}</AvatarFallback>
                  )}
                </Avatar>
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-pink-500">
                  <Heart className="h-5 w-5 fill-white text-white" />
                </div>
                <Avatar className="h-20 w-20 ring-4 ring-pink-500">
                  {matchedPick.photos[0] ? (
                    <AvatarImage src={matchedPick.photos[0]} />
                  ) : (
                    <AvatarFallback>{matchedPick.displayName.charAt(0)}</AvatarFallback>
                  )}
                </Avatar>
              </div>
              <h2 className="mb-2 text-2xl font-bold text-gray-900 dark:text-white">
                It's a Match!
              </h2>
              <p className="mb-6 text-gray-500 dark:text-gray-400">
                You and {matchedPick.displayName} liked each other
              </p>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowMatchModal(false)}
                >
                  Keep Browsing
                </Button>
                <Button className="flex-1" onClick={() => router.push('/messages')}>
                  Send Message
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

interface PickCardProps {
  pick: WeeklyPick;
  index: number;
  isPremium?: boolean;
  isLoading: boolean;
  onLike: () => void;
  onPass: () => void;
  onSuperLike: () => void;
  onViewProfile: () => void;
}

function PickCard({
  pick,
  index,
  isPremium: _isPremium,
  isLoading,
  onLike,
  onPass,
  onSuperLike,
  onViewProfile: _onViewProfile,
}: PickCardProps) {
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);

  return (
    <Card className="group overflow-hidden">
      {/* Photo */}
      <div className="relative aspect-[4/5]">
        {pick.photos[currentPhotoIndex] ? (
          <Image
            src={pick.photos[currentPhotoIndex]}
            alt={pick.displayName}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gray-200 dark:bg-gray-700">
            <span className="text-4xl text-gray-500">{pick.displayName.charAt(0)}</span>
          </div>
        )}

        {/* Photo navigation dots */}
        {pick.photos.length > 1 && (
          <div className="absolute left-0 right-0 top-2 flex justify-center gap-1">
            {pick.photos.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentPhotoIndex(i)}
                className={cn(
                  'h-1 w-8 rounded-full transition-colors',
                  i === currentPhotoIndex ? 'bg-white' : 'bg-white/50'
                )}
              />
            ))}
          </div>
        )}

        {/* Pick badge */}
        <div className="absolute left-3 top-3">
          <Badge className="border-0 bg-amber-500 text-white">
            <Sparkles className="mr-1 h-3 w-3" />
            Pick #{index + 1}
          </Badge>
        </div>

        {/* Verified badge */}
        {pick.isVerified && (
          <div className="absolute right-3 top-3">
            <Badge className="border-0 bg-blue-500 text-white">
              <CheckCircle2 className="mr-1 h-3 w-3" />
              Verified
            </Badge>
          </div>
        )}

        {/* Gradient overlay */}
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/80 to-transparent" />

        {/* Info overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
          <div className="flex items-end justify-between">
            <div>
              <h3 className="text-xl font-bold">
                {pick.displayName}
                {pick.age && `, ${pick.age}`}
              </h3>
              {pick.distance && (
                <p className="flex items-center gap-1 text-sm text-white/80">
                  <MapPin className="h-3 w-3" />
                  {pick.distance} km away
                </p>
              )}
            </div>
            {pick.compatibilityScore && (
              <div className="text-right">
                <div className="text-2xl font-bold">{pick.compatibilityScore}%</div>
                <div className="text-xs text-white/80">match</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Info section */}
      <div className="p-4">
        {/* Pick reason */}
        {pick.pickReason && (
          <div className="mb-3 flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400">
            <Sparkles className="h-4 w-4" />
            {pick.pickReason}
          </div>
        )}

        {/* Bio preview */}
        {pick.bio && (
          <p className="mb-3 line-clamp-2 text-sm text-gray-600 dark:text-gray-400">{pick.bio}</p>
        )}

        {/* Interests */}
        {pick.interests && pick.interests.length > 0 && (
          <div className="mb-4 flex flex-wrap gap-1">
            {pick.interests.slice(0, 4).map((interest) => (
              <Badge key={interest} variant="secondary" className="text-xs">
                {interest}
              </Badge>
            ))}
            {pick.interests.length > 4 && (
              <Badge variant="secondary" className="text-xs">
                +{pick.interests.length - 4}
              </Badge>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={onPass}
            disabled={isLoading}
            className={cn(
              'flex-1 rounded-lg py-2.5 font-medium transition-colors',
              'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
              'hover:bg-gray-200 dark:hover:bg-gray-700',
              'disabled:cursor-not-allowed disabled:opacity-50',
              'flex items-center justify-center gap-1'
            )}
          >
            {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <X className="h-5 w-5" />}
          </button>
          <button
            onClick={onSuperLike}
            disabled={isLoading}
            className={cn(
              'rounded-lg px-4 py-2.5 font-medium transition-colors',
              'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
              'hover:bg-blue-200 dark:hover:bg-blue-900/50',
              'disabled:cursor-not-allowed disabled:opacity-50',
              'flex items-center justify-center gap-1'
            )}
          >
            <Star className="h-5 w-5" />
          </button>
          <button
            onClick={onLike}
            disabled={isLoading}
            className={cn(
              'flex-1 rounded-lg py-2.5 font-medium transition-colors',
              'bg-gradient-to-r from-pink-500 to-rose-500 text-white',
              'hover:from-pink-600 hover:to-rose-600',
              'disabled:cursor-not-allowed disabled:opacity-50',
              'flex items-center justify-center gap-1'
            )}
          >
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Heart className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>
    </Card>
  );
}
