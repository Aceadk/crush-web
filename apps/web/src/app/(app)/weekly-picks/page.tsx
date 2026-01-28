'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore, useMatchStore, matchService, WeeklyPick } from '@crush/core';
import { Card, Avatar, AvatarImage, AvatarFallback, Badge, Button } from '@crush/ui';
import { cn } from '@crush/ui';
import {
  ArrowLeft,
  Sparkles,
  Heart,
  X,
  Star,
  Clock,
  ChevronRight,
  MapPin,
  Loader2,
  RefreshCw,
  Crown,
  CheckCircle2,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function WeeklyPicksPage() {
  const router = useRouter();
  const { user, profile } = useAuthStore();
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
      console.error('Failed to like:', error);
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
      console.error('Failed to super like:', error);
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-2 -ml-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-500" />
              Weekly Picks
            </h1>
            {picks.length > 0 && (
              <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                <Clock className="w-3 h-3" />
                Refreshes in {getTimeUntilRefresh()}
              </p>
            )}
          </div>
          <Button variant="ghost" size="icon" onClick={loadPicks} disabled={loading}>
            <RefreshCw className={cn('w-5 h-5', loading && 'animate-spin')} />
          </Button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Premium banner */}
        <Card className="overflow-hidden mb-6 bg-gradient-to-r from-amber-500 to-orange-500">
          <div className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <h2 className="font-semibold text-white">Your Top Picks This Week</h2>
              <p className="text-sm text-white/80">
                Hand-picked profiles based on your preferences and compatibility
              </p>
            </div>
            {!isPremium && (
              <Badge className="bg-white/20 text-white border-0">
                <Crown className="w-3 h-3 mr-1" />
                Premium
              </Badge>
            )}
          </div>
        </Card>

        {/* Loading state */}
        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[...Array(4)].map((_, i) => (
              <Card key={i} className="overflow-hidden">
                <div className="aspect-[4/5] bg-gray-200 dark:bg-gray-700 animate-pulse" />
                <div className="p-4 space-y-2">
                  <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-1/2 animate-pulse" />
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 animate-pulse" />
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && picks.length === 0 && (
          <div className="text-center py-16">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <Sparkles className="w-10 h-10 text-amber-500" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              No picks available
            </h2>
            <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-sm mx-auto">
              You've seen all your weekly picks! Check back next week for new curated matches.
            </p>
            <Button onClick={() => router.push('/discover')}>
              Continue Discovering
            </Button>
          </div>
        )}

        {/* Picks grid */}
        {!loading && picks.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
        <div className="mt-8 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl">
          <div className="flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-amber-700 dark:text-amber-300">
                About Weekly Picks
              </p>
              <p className="text-sm text-amber-600 dark:text-amber-400 mt-1">
                Every week, we curate a selection of profiles based on your preferences, interests,
                and compatibility. Your picks refresh every Sunday at midnight.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Match Modal */}
      {showMatchModal && matchedPick && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <Card className="w-full max-w-sm overflow-hidden animate-in zoom-in-95">
            <div className="p-6 text-center">
              <div className="flex items-center justify-center gap-4 mb-6">
                <Avatar className="w-20 h-20 ring-4 ring-pink-500">
                  {profile?.profilePhotoUrl ? (
                    <AvatarImage src={profile.profilePhotoUrl} />
                  ) : (
                    <AvatarFallback>{profile?.displayName?.charAt(0)}</AvatarFallback>
                  )}
                </Avatar>
                <div className="w-10 h-10 rounded-full bg-pink-500 flex items-center justify-center">
                  <Heart className="w-5 h-5 text-white fill-white" />
                </div>
                <Avatar className="w-20 h-20 ring-4 ring-pink-500">
                  {matchedPick.photos[0] ? (
                    <AvatarImage src={matchedPick.photos[0]} />
                  ) : (
                    <AvatarFallback>{matchedPick.displayName.charAt(0)}</AvatarFallback>
                  )}
                </Avatar>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                It's a Match!
              </h2>
              <p className="text-gray-500 dark:text-gray-400 mb-6">
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
                <Button
                  className="flex-1"
                  onClick={() => router.push('/messages')}
                >
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
  isPremium,
  isLoading,
  onLike,
  onPass,
  onSuperLike,
  onViewProfile,
}: PickCardProps) {
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);

  return (
    <Card className="overflow-hidden group">
      {/* Photo */}
      <div className="relative aspect-[4/5]">
        {pick.photos[currentPhotoIndex] ? (
          <img
            src={pick.photos[currentPhotoIndex]}
            alt={pick.displayName}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
            <span className="text-4xl text-gray-400">{pick.displayName.charAt(0)}</span>
          </div>
        )}

        {/* Photo navigation dots */}
        {pick.photos.length > 1 && (
          <div className="absolute top-2 left-0 right-0 flex justify-center gap-1">
            {pick.photos.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentPhotoIndex(i)}
                className={cn(
                  'w-8 h-1 rounded-full transition-colors',
                  i === currentPhotoIndex ? 'bg-white' : 'bg-white/50'
                )}
              />
            ))}
          </div>
        )}

        {/* Pick badge */}
        <div className="absolute top-3 left-3">
          <Badge className="bg-amber-500 text-white border-0">
            <Sparkles className="w-3 h-3 mr-1" />
            Pick #{index + 1}
          </Badge>
        </div>

        {/* Verified badge */}
        {pick.isVerified && (
          <div className="absolute top-3 right-3">
            <Badge className="bg-blue-500 text-white border-0">
              <CheckCircle2 className="w-3 h-3 mr-1" />
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
                {pick.displayName}{pick.age && `, ${pick.age}`}
              </h3>
              {pick.distance && (
                <p className="text-sm text-white/80 flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
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
          <div className="flex items-center gap-2 mb-3 text-sm text-amber-600 dark:text-amber-400">
            <Sparkles className="w-4 h-4" />
            {pick.pickReason}
          </div>
        )}

        {/* Bio preview */}
        {pick.bio && (
          <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-3">
            {pick.bio}
          </p>
        )}

        {/* Interests */}
        {pick.interests && pick.interests.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-4">
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
              'flex-1 py-2.5 rounded-lg font-medium transition-colors',
              'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300',
              'hover:bg-gray-200 dark:hover:bg-gray-700',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              'flex items-center justify-center gap-1'
            )}
          >
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <X className="w-5 h-5" />}
          </button>
          <button
            onClick={onSuperLike}
            disabled={isLoading}
            className={cn(
              'py-2.5 px-4 rounded-lg font-medium transition-colors',
              'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
              'hover:bg-blue-200 dark:hover:bg-blue-900/50',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              'flex items-center justify-center gap-1'
            )}
          >
            <Star className="w-5 h-5" />
          </button>
          <button
            onClick={onLike}
            disabled={isLoading}
            className={cn(
              'flex-1 py-2.5 rounded-lg font-medium transition-colors',
              'bg-gradient-to-r from-pink-500 to-rose-500 text-white',
              'hover:from-pink-600 hover:to-rose-600',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              'flex items-center justify-center gap-1'
            )}
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Heart className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>
    </Card>
  );
}
