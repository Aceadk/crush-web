'use client';

import { PlusFeatureGate } from '@/features/premium';
import { matchService, ReceivedLike, useAuthStore } from '@crush/core';
import { Badge, Button, Card, SkeletonProfile } from '@crush/ui';
import { formatDistanceToNow } from 'date-fns';
import { Eye, Heart, Loader2, Lock, Sparkles, X } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

export default function LikesPage() {
  const router = useRouter();
  const { user, profile } = useAuthStore();
  const [likes, setLikes] = useState<ReceivedLike[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const isPremium = profile?.isPremium ?? false;

  const loadLikes = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      const receivedLikes = await matchService.getLikesReceived(user.uid);
      setLikes(receivedLikes);
    } catch (err) {
      console.error('Failed to load likes:', err);
      setError('Failed to load likes. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadLikes();
  }, [loadLikes]);

  const handleLikeBack = async (like: ReceivedLike) => {
    if (!user || !isPremium) return;

    setActionLoading(like.id);

    try {
      const result = await matchService.swipe(user.uid, like.likerUserId, 'like');
      if (result.isMatch) {
        // Remove from likes list and show match notification
        setLikes((prev) => prev.filter((l) => l.id !== like.id));
        // Could show a match modal here
        router.push(`/messages/${result.matchId}`);
      }
    } catch (err) {
      console.error('Failed to like back:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const handlePass = async (like: ReceivedLike) => {
    if (!user || !isPremium) return;

    setActionLoading(like.id);

    try {
      await matchService.swipe(user.uid, like.likerUserId, 'pass');
      setLikes((prev) => prev.filter((l) => l.id !== like.id));
    } catch (err) {
      console.error('Failed to pass:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const superLikesCount = likes.filter((l) => l.isSuperLike).length;

  return (
    <div className="mx-auto max-w-4xl p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="mb-2 flex items-center gap-3">
          <Heart className="h-8 w-8 fill-primary text-primary" />
          <h1 className="text-3xl font-bold">Likes You</h1>
        </div>
        <p className="text-muted-foreground">
          {likes.length} {likes.length === 1 ? 'person likes' : 'people like'} you
          {superLikesCount > 0 && (
            <span className="ml-2">
              <Sparkles className="inline h-4 w-4 text-yellow-500" /> {superLikesCount} Super{' '}
              {superLikesCount === 1 ? 'Like' : 'Likes'}
            </span>
          )}
        </p>
      </div>

      {/* Premium upsell for non-premium users */}
      <PlusFeatureGate
        isPremium={isPremium}
        featureKey="likes_you"
        title="Unlock who likes you"
        description="Upgrade to Premium to see everyone who likes you and match instantly."
        ctaLabel="Get Premium"
        className="mb-6"
        variant="amber"
        modalTitle="Likes You is a Premium feature"
        modalDescription="Unlock full access to everyone who already likes your profile."
        modalBenefits={[
          'See all incoming likes without blur',
          'Match instantly by liking back',
          'Prioritize Super Likes and top prospects',
        ]}
      />

      {/* Loading state */}
      {loading && (
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <Card key={i} className="p-4">
              <SkeletonProfile />
            </Card>
          ))}
        </div>
      )}

      {/* Error state */}
      {error && !loading && (
        <div className="py-16 text-center">
          <p className="mb-4 text-red-500">{error}</p>
          <Button onClick={loadLikes}>Try Again</Button>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && likes.length === 0 && (
        <div className="py-16 text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-muted">
            <Heart className="h-10 w-10 text-muted-foreground" />
          </div>
          <h2 className="mb-2 text-xl font-semibold">No likes yet</h2>
          <p className="mx-auto mb-6 max-w-sm text-muted-foreground">
            When someone likes your profile, they'll appear here. Make sure your profile is complete
            to get more likes!
          </p>
          <div className="flex justify-center gap-3">
            <Link href="/discover">
              <Button>Start Swiping</Button>
            </Link>
            <Link href="/profile/edit">
              <Button variant="outline">Edit Profile</Button>
            </Link>
          </div>
        </div>
      )}

      {/* Likes grid */}
      {!loading && !error && likes.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {likes.map((like) => (
            <LikeCard
              key={like.id}
              like={like}
              isPremium={isPremium}
              loading={actionLoading === like.id}
              onLikeBack={() => handleLikeBack(like)}
              onPass={() => handlePass(like)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface LikeCardProps {
  like: ReceivedLike;
  isPremium: boolean;
  loading: boolean;
  onLikeBack: () => void;
  onPass: () => void;
}

function LikeCard({ like, isPremium, loading, onLikeBack, onPass }: LikeCardProps) {
  return (
    <Card className="group overflow-hidden">
      {/* Photo area */}
      <div className="relative aspect-[3/4] bg-muted">
        {isPremium ? (
          // Show actual photo for premium users
          <>
            {like.likerPhotoUrl ? (
              <Image
                src={like.likerPhotoUrl}
                alt={like.likerName}
                fill
                className="object-cover"
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/20 to-secondary/20">
                <span className="text-6xl font-bold text-primary/30">
                  {like.likerName.charAt(0)}
                </span>
              </div>
            )}

            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

            {/* User info */}
            <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
              <div className="mb-1 flex items-center gap-2">
                <h3 className="text-lg font-semibold">
                  {like.likerName}
                  {like.likerAge ? `, ${like.likerAge}` : ''}
                </h3>
                {like.isSuperLike && (
                  <Badge variant="premium" className="bg-yellow-500">
                    <Sparkles className="mr-1 h-3 w-3" />
                    Super Like
                  </Badge>
                )}
              </div>
              <p className="text-sm text-white/70">
                Liked you {formatDistanceToNow(new Date(like.timestamp), { addSuffix: true })}
              </p>
            </div>

            {/* Action buttons */}
            <div className="absolute bottom-4 right-4 flex gap-2 opacity-0 transition-opacity group-hover:opacity-100">
              <Button
                size="icon"
                variant="secondary"
                className="h-12 w-12 rounded-full bg-white/90 hover:bg-white"
                onClick={onPass}
                disabled={loading}
                aria-label={`Pass on ${like.likerName}`}
              >
                {loading ? (
                  <Loader2 className="h-6 w-6 animate-spin text-gray-600" />
                ) : (
                  <X className="h-6 w-6 text-gray-600" />
                )}
              </Button>
              <Button
                size="icon"
                className="h-12 w-12 rounded-full bg-primary hover:bg-primary/90"
                onClick={onLikeBack}
                disabled={loading}
                aria-label={`Like ${like.likerName} back`}
              >
                {loading ? (
                  <Loader2 className="h-6 w-6 animate-spin text-white" />
                ) : (
                  <Heart className="h-6 w-6 fill-white text-white" />
                )}
              </Button>
            </div>

            {/* View profile link */}
            <Link
              href={`/profile/${like.likerUserId}`}
              className="absolute right-4 top-4 opacity-0 transition-opacity group-hover:opacity-100"
            >
              <Button size="sm" variant="secondary" className="bg-white/90 hover:bg-white">
                <Eye className="mr-1 h-4 w-4" />
                View
              </Button>
            </Link>
          </>
        ) : (
          // Blurred view for non-premium users
          <>
            {like.likerPhotoUrl ? (
              <Image
                src={like.likerPhotoUrl}
                alt="Blurred profile"
                fill
                className="scale-110 object-cover blur-xl"
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              />
            ) : (
              <div className="h-full w-full bg-gradient-to-br from-primary/30 to-secondary/30 blur-xl" />
            )}

            {/* Lock overlay */}
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/30">
              <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
                <Lock className="h-8 w-8 text-white" />
              </div>
              <p className="px-4 text-center font-medium text-white">
                Upgrade to see who likes you
              </p>
              {like.isSuperLike && (
                <Badge variant="premium" className="mt-2 bg-yellow-500">
                  <Sparkles className="mr-1 h-3 w-3" />
                  Super Like
                </Badge>
              )}
            </div>
          </>
        )}
      </div>

      {/* Bottom info for non-premium */}
      {!isPremium && (
        <div className="p-3 text-center">
          <p className="text-sm text-muted-foreground">
            Liked you {formatDistanceToNow(new Date(like.timestamp), { addSuffix: true })}
          </p>
        </div>
      )}
    </Card>
  );
}
