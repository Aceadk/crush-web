'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthStore, matchService, ReceivedLike } from '@crush/core';
import { Card, Avatar, AvatarImage, AvatarFallback, Badge, Button, SkeletonProfile } from '@crush/ui';
import { cn } from '@crush/ui';
import { Heart, Sparkles, Crown, Lock, X, Check, Eye, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

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
        setLikes(prev => prev.filter(l => l.id !== like.id));
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
      setLikes(prev => prev.filter(l => l.id !== like.id));
    } catch (err) {
      console.error('Failed to pass:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const superLikesCount = likes.filter(l => l.isSuperLike).length;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Heart className="w-8 h-8 text-primary fill-primary" />
          <h1 className="text-3xl font-bold">Likes You</h1>
        </div>
        <p className="text-muted-foreground">
          {likes.length} {likes.length === 1 ? 'person likes' : 'people like'} you
          {superLikesCount > 0 && (
            <span className="ml-2">
              <Sparkles className="w-4 h-4 inline text-yellow-500" /> {superLikesCount} Super {superLikesCount === 1 ? 'Like' : 'Likes'}
            </span>
          )}
        </p>
      </div>

      {/* Premium upsell for non-premium users */}
      {!isPremium && (
        <Card className="mb-6 overflow-hidden">
          <div className="bg-gradient-to-r from-primary/10 via-secondary/10 to-primary/10 p-6">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center flex-shrink-0">
                <Crown className="w-7 h-7 text-white" />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-semibold mb-1">Unlock who likes you</h2>
                <p className="text-muted-foreground mb-4">
                  Upgrade to Premium to see everyone who likes you and match instantly.
                  Stop waiting - start connecting!
                </p>
                <div className="flex gap-3">
                  <Link href="/premium">
                    <Button className="bg-gradient-to-r from-primary to-secondary">
                      <Sparkles className="w-4 h-4 mr-2" />
                      Get Premium
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}

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
        <div className="text-center py-16">
          <p className="text-red-500 mb-4">{error}</p>
          <Button onClick={loadLikes}>Try Again</Button>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && likes.length === 0 && (
        <div className="text-center py-16">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-muted flex items-center justify-center">
            <Heart className="w-10 h-10 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-semibold mb-2">No likes yet</h2>
          <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
            When someone likes your profile, they'll appear here. Make sure your
            profile is complete to get more likes!
          </p>
          <div className="flex gap-3 justify-center">
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
    <Card className="overflow-hidden group">
      {/* Photo area */}
      <div className="relative aspect-[3/4] bg-muted">
        {isPremium ? (
          // Show actual photo for premium users
          <>
            {like.likerPhotoUrl ? (
              <img
                src={like.likerPhotoUrl}
                alt={like.likerName}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-secondary/20">
                <span className="text-6xl font-bold text-primary/30">
                  {like.likerName.charAt(0)}
                </span>
              </div>
            )}

            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

            {/* User info */}
            <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-lg">
                  {like.likerName}{like.likerAge ? `, ${like.likerAge}` : ''}
                </h3>
                {like.isSuperLike && (
                  <Badge variant="premium" className="bg-yellow-500">
                    <Sparkles className="w-3 h-3 mr-1" />
                    Super Like
                  </Badge>
                )}
              </div>
              <p className="text-sm text-white/70">
                Liked you {formatDistanceToNow(new Date(like.timestamp), { addSuffix: true })}
              </p>
            </div>

            {/* Action buttons */}
            <div className="absolute bottom-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                size="icon"
                variant="secondary"
                className="rounded-full w-12 h-12 bg-white/90 hover:bg-white"
                onClick={onPass}
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="w-6 h-6 animate-spin text-gray-600" />
                ) : (
                  <X className="w-6 h-6 text-gray-600" />
                )}
              </Button>
              <Button
                size="icon"
                className="rounded-full w-12 h-12 bg-primary hover:bg-primary/90"
                onClick={onLikeBack}
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="w-6 h-6 animate-spin text-white" />
                ) : (
                  <Heart className="w-6 h-6 text-white fill-white" />
                )}
              </Button>
            </div>

            {/* View profile link */}
            <Link
              href={`/profile/${like.likerUserId}`}
              className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Button size="sm" variant="secondary" className="bg-white/90 hover:bg-white">
                <Eye className="w-4 h-4 mr-1" />
                View
              </Button>
            </Link>
          </>
        ) : (
          // Blurred view for non-premium users
          <>
            {like.likerPhotoUrl ? (
              <img
                src={like.likerPhotoUrl}
                alt="Blurred profile"
                className="w-full h-full object-cover blur-xl scale-110"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-primary/30 to-secondary/30 blur-xl" />
            )}

            {/* Lock overlay */}
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/30">
              <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center mb-3">
                <Lock className="w-8 h-8 text-white" />
              </div>
              <p className="text-white font-medium text-center px-4">
                Upgrade to see who likes you
              </p>
              {like.isSuperLike && (
                <Badge variant="premium" className="mt-2 bg-yellow-500">
                  <Sparkles className="w-3 h-3 mr-1" />
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
