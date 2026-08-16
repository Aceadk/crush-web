'use client';

import { ProtectedImage } from '@/shared/components/content-protection';
import {
  calculateAge,
  discoveryDisplayName,
  DiscoveryProfile,
  locationService,
} from '@crush/core';
import { Badge, cn } from '@crush/ui';
import { motion, PanInfo, useMotionValue, useTransform } from 'framer-motion';
import { ChevronLeft, ChevronRight, Info, MapPin, Sparkles, Verified, Zap } from 'lucide-react';
import { useRef, useState } from 'react';

interface SwipeCardProps {
  profile: DiscoveryProfile;
  onSwipe: (direction: 'left' | 'right' | 'up') => void;
  isTop: boolean;
  storyCount?: number;
  hasUnseenStories?: boolean;
  onOpenStories?: () => void;
}

export function SwipeCard({
  profile,
  onSwipe,
  isTop,
  storyCount = 0,
  hasUnseenStories = false,
  onOpenStories,
}: SwipeCardProps) {
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [showDetails, setShowDetails] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const hasMultiplePhotos = profile.photos.length > 1;
  const hasStories = storyCount > 0;
  const formattedDistance =
    profile.distance == null ? null : locationService.formatDistance(profile.distance);

  const x = useMotionValue(0);
  const y = useMotionValue(0);

  // Rotation based on drag
  const rotate = useTransform(x, [-200, 200], [-15, 15]);

  // Opacity for action indicators
  const likeOpacity = useTransform(x, [0, 100], [0, 1]);
  const nopeOpacity = useTransform(x, [-100, 0], [1, 0]);
  const superlikeOpacity = useTransform(y, [-100, 0], [1, 0]);

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    const { offset, velocity } = info;
    const swipeThreshold = 100;
    const velocityThreshold = 500;

    // Check for superlike (up swipe)
    if (offset.y < -swipeThreshold || velocity.y < -velocityThreshold) {
      onSwipe('up');
      return;
    }

    // Check for like (right swipe)
    if (offset.x > swipeThreshold || velocity.x > velocityThreshold) {
      onSwipe('right');
      return;
    }

    // Check for nope (left swipe)
    if (offset.x < -swipeThreshold || velocity.x < -velocityThreshold) {
      onSwipe('left');
      return;
    }
  };

  const nextPhoto = () => {
    setCurrentPhotoIndex((previous) => Math.min(previous + 1, profile.photos.length - 1));
  };

  const prevPhoto = () => {
    setCurrentPhotoIndex((previous) => Math.max(previous - 1, 0));
  };

  // Tap-to-navigate, split at the card's center: left half = previous photo,
  // right half = next.
  //
  // Deliberately NOT implemented as invisible <button> zones (the previous
  // approach). The card is a framer-motion drag surface, and drag activates
  // after ~3px of pointer movement — a normal thumb tap wobbles more than
  // that, so drag started, the card sprang back, and the browser click was
  // suppressed. Result: tapping the photo "did nothing" on phones. Tracking
  // the pointer ourselves and treating small-displacement releases as taps
  // works regardless of what the drag gesture consumed.
  const tapStartRef = useRef<{ x: number; y: number; t: number } | null>(null);

  const handlePhotoPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    tapStartRef.current = { x: event.clientX, y: event.clientY, t: Date.now() };
  };

  const handlePhotoPointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    const start = tapStartRef.current;
    tapStartRef.current = null;
    if (!start || !isTop || !hasMultiplePhotos || showDetails) return;

    // A swipe, not a tap: meaningful displacement or a long press.
    const moved = Math.hypot(event.clientX - start.x, event.clientY - start.y);
    if (moved > 10 || Date.now() - start.t > 500) return;

    // Real controls (chevrons, stories, info, details) keep their own clicks.
    if ((event.target as HTMLElement).closest('button, a')) return;

    const rect = event.currentTarget.getBoundingClientRect();
    if (event.clientX - rect.left < rect.width / 2) {
      prevPhoto();
    } else {
      nextPhoto();
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!hasMultiplePhotos) return;
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      prevPhoto();
    }
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      nextPhoto();
    }
  };

  return (
    <motion.div
      ref={cardRef}
      className={cn(
        // Fills its container instead of self-limiting to a 3/4 box capped at
        // max-w-md. That cap was what made the photo a small letterbox while
        // the page scrolled around it; the mobile card is edge-to-edge
        // (deck_screen.dart Positioned.fill), and the parent now owns the
        // sizing so desktop can still constrain width in one place.
        'absolute inset-0 cursor-grab overflow-hidden rounded-3xl shadow-2xl active:cursor-grabbing',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
        !isTop && 'pointer-events-none'
      )}
      style={{ x, y, rotate }}
      drag={isTop}
      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
      dragElastic={0.9}
      onDragEnd={handleDragEnd}
      tabIndex={isTop ? 0 : -1}
      onKeyDown={handleKeyDown}
      initial={{ scale: isTop ? 1 : 0.95, opacity: isTop ? 1 : 0.5 }}
      animate={{ scale: isTop ? 1 : 0.95, opacity: isTop ? 1 : 0.5 }}
    >
      {/* Photo */}
      <div
        className="relative h-full w-full bg-muted"
        onPointerDown={handlePhotoPointerDown}
        onPointerUp={handlePhotoPointerUp}
      >
        {profile.photos.length > 0 ? (
          <ProtectedImage
            src={profile.photos[currentPhotoIndex]}
            alt={profile.displayName}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary to-secondary">
            <span className="text-8xl font-bold text-white">{profile.displayName.charAt(0)}</span>
          </div>
        )}

        {/* Photo navigation indicators */}
        {hasMultiplePhotos && (
          <div className="absolute left-4 right-4 top-4 flex gap-1">
            {profile.photos.map((_, index) => (
              <div
                key={index}
                className={cn(
                  'h-1 flex-1 rounded-full transition-colors',
                  index === currentPhotoIndex ? 'bg-white' : 'bg-white/40'
                )}
              />
            ))}
          </div>
        )}

        {/* Tap navigation lives on the photo container's pointer handlers
            (left half = previous, right half = next) — see
            handlePhotoPointerUp. Keyboard arrows and the visible chevron
            buttons below remain the accessible affordances. */}

        {/* Visible carousel controls */}
        {hasMultiplePhotos && (
          <>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                prevPhoto();
              }}
              disabled={currentPhotoIndex === 0}
              aria-label="Show previous photo"
              className={cn(
                'absolute left-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-sm transition',
                currentPhotoIndex === 0 ? 'cursor-not-allowed opacity-35' : 'hover:bg-black/60'
              )}
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                nextPhoto();
              }}
              disabled={currentPhotoIndex >= profile.photos.length - 1}
              aria-label="Show next photo"
              className={cn(
                'absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-sm transition',
                currentPhotoIndex >= profile.photos.length - 1
                  ? 'cursor-not-allowed opacity-35'
                  : 'hover:bg-black/60'
              )}
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </>
        )}

        {/* Carousel position */}
        {hasMultiplePhotos && (
          <div className="absolute right-4 top-7 rounded-full bg-black/50 px-2.5 py-1 text-xs font-medium text-white">
            {currentPhotoIndex + 1}/{profile.photos.length}
          </div>
        )}

        {profile.boost?.isActive && (
          <div className="absolute left-4 top-12 flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-500/90 to-orange-500/90 px-3 py-1 text-xs font-semibold text-white backdrop-blur-sm">
            <Zap className="h-3.5 w-3.5 fill-current" />
            Boosted
          </div>
        )}

        {hasStories && (
          <button
            type="button"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onOpenStories?.();
            }}
            className={cn(
              'absolute left-4 flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold text-white backdrop-blur-sm',
              profile.boost?.isActive ? 'top-24' : 'top-12',
              hasUnseenStories
                ? 'border-white/40 bg-gradient-to-r from-fuchsia-500/90 to-rose-500/90'
                : 'border-white/30 bg-white/20'
            )}
            aria-label={`View ${storyCount} stories from ${profile.displayName}`}
          >
            <Sparkles className="h-3.5 w-3.5" />
            {storyCount} {storyCount === 1 ? 'Story' : 'Stories'}
          </button>
        )}

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

        {/* Action indicators */}
        <motion.div
          className="absolute right-8 top-8 rotate-12 rounded-xl border-4 border-action-like px-6 py-3 text-2xl font-bold text-action-like"
          style={{ opacity: likeOpacity }}
        >
          LIKE
        </motion.div>

        <motion.div
          className="absolute left-8 top-8 -rotate-12 rounded-xl border-4 border-action-pass px-6 py-3 text-2xl font-bold text-action-pass"
          style={{ opacity: nopeOpacity }}
        >
          NOPE
        </motion.div>

        <motion.div
          className="absolute left-1/2 top-1/3 -translate-x-1/2 rounded-xl border-4 border-action-superlike px-6 py-3 text-2xl font-bold text-action-superlike"
          style={{ opacity: superlikeOpacity }}
        >
          SUPER LIKE
        </motion.div>

        {/* Profile info */}
        <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
          <div className="mb-2 flex items-center gap-2">
            <h2 className="text-3xl font-bold">
              {discoveryDisplayName(profile)}
              {calculateAge(profile.birthDate) || profile.age ? (
                <span>, {calculateAge(profile.birthDate) ?? profile.age}</span>
              ) : null}
            </h2>
            {profile.isVerified && <Verified className="h-6 w-6 fill-blue-400 text-blue-400" />}
          </div>

          {formattedDistance && (
            <div className="mb-3 flex items-center gap-1 text-white/80">
              <MapPin className="h-4 w-4" />
              <span>{formattedDistance}</span>
            </div>
          )}

          {profile.bio && !showDetails && (
            <p className="line-clamp-2 text-white/90">{profile.bio}</p>
          )}

          {/* Interests */}
          {profile.interests && profile.interests.length > 0 && !showDetails && (
            <div className="mt-3 flex flex-wrap gap-2">
              {profile.interests.slice(0, 4).map((interest) => (
                <Badge key={interest} variant="secondary" className="bg-white/20 text-white">
                  {interest}
                </Badge>
              ))}
              {profile.interests.length > 4 && (
                <Badge variant="secondary" className="bg-white/20 text-white">
                  +{profile.interests.length - 4}
                </Badge>
              )}
            </div>
          )}

          {/* More info button */}
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="absolute bottom-6 right-6 flex h-10 w-10 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm"
          >
            <Info className="h-5 w-5" />
          </button>
        </div>

        {/* Expanded details */}
        {showDetails && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute inset-0 overflow-y-auto bg-black/90 p-6"
            onClick={() => setShowDetails(false)}
          >
            <div className="mx-auto max-w-md pt-8 text-white">
              <h2 className="mb-4 text-3xl font-bold">
                {discoveryDisplayName(profile)}
                {calculateAge(profile.birthDate) || profile.age ? (
                  <span>, {calculateAge(profile.birthDate) ?? profile.age}</span>
                ) : null}
              </h2>

              {profile.bio && (
                <div className="mb-6">
                  <h3 className="mb-2 text-sm uppercase text-white/60">About</h3>
                  <p className="text-lg">{profile.bio}</p>
                </div>
              )}

              {profile.interests && profile.interests.length > 0 && (
                <div className="mb-6">
                  <h3 className="mb-2 text-sm uppercase text-white/60">Interests</h3>
                  <div className="flex flex-wrap gap-2">
                    {profile.interests.map((interest) => (
                      <Badge key={interest} variant="secondary" className="bg-white/20 text-white">
                        {interest}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {profile.prompts && profile.prompts.length > 0 && (
                <div className="space-y-4">
                  {profile.prompts.map((prompt, index) => (
                    <div key={index} className="rounded-xl bg-white/10 p-4">
                      <p className="mb-1 text-sm text-white/60">{prompt.question}</p>
                      <p className="text-lg">{prompt.answer}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
