'use client';

import { useState, useRef } from 'react';
import { motion, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import { DiscoveryProfile } from '@crush/core';
import { cn, Badge } from '@crush/ui';
import {
  MapPin,
  Verified,
  ChevronLeft,
  ChevronRight,
  Info,
} from 'lucide-react';

interface SwipeCardProps {
  profile: DiscoveryProfile;
  onSwipe: (direction: 'left' | 'right' | 'up') => void;
  isTop: boolean;
}

export function SwipeCard({ profile, onSwipe, isTop }: SwipeCardProps) {
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [showDetails, setShowDetails] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

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
    if (currentPhotoIndex < profile.photos.length - 1) {
      setCurrentPhotoIndex(currentPhotoIndex + 1);
    }
  };

  const prevPhoto = () => {
    if (currentPhotoIndex > 0) {
      setCurrentPhotoIndex(currentPhotoIndex - 1);
    }
  };

  return (
    <motion.div
      ref={cardRef}
      className={cn(
        'absolute w-full aspect-[3/4] max-w-md rounded-3xl overflow-hidden shadow-2xl cursor-grab active:cursor-grabbing',
        !isTop && 'pointer-events-none'
      )}
      style={{ x, y, rotate }}
      drag={isTop}
      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
      dragElastic={0.9}
      onDragEnd={handleDragEnd}
      initial={{ scale: isTop ? 1 : 0.95, opacity: isTop ? 1 : 0.5 }}
      animate={{ scale: isTop ? 1 : 0.95, opacity: isTop ? 1 : 0.5 }}
    >
      {/* Photo */}
      <div className="relative w-full h-full bg-muted">
        {profile.photos.length > 0 ? (
          <img
            src={profile.photos[currentPhotoIndex]}
            alt={profile.displayName}
            className="w-full h-full object-cover"
            draggable={false}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary to-secondary">
            <span className="text-8xl text-white font-bold">
              {profile.displayName.charAt(0)}
            </span>
          </div>
        )}

        {/* Photo navigation indicators */}
        {profile.photos.length > 1 && (
          <div className="absolute top-4 left-4 right-4 flex gap-1">
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

        {/* Photo navigation areas */}
        {profile.photos.length > 1 && (
          <>
            <button
              className="absolute left-0 top-0 w-1/3 h-full"
              onClick={prevPhoto}
            />
            <button
              className="absolute right-0 top-0 w-1/3 h-full"
              onClick={nextPhoto}
            />
          </>
        )}

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

        {/* Action indicators */}
        <motion.div
          className="absolute top-8 right-8 px-6 py-3 rounded-xl border-4 border-action-like text-action-like text-2xl font-bold rotate-12"
          style={{ opacity: likeOpacity }}
        >
          LIKE
        </motion.div>

        <motion.div
          className="absolute top-8 left-8 px-6 py-3 rounded-xl border-4 border-action-pass text-action-pass text-2xl font-bold -rotate-12"
          style={{ opacity: nopeOpacity }}
        >
          NOPE
        </motion.div>

        <motion.div
          className="absolute top-1/3 left-1/2 -translate-x-1/2 px-6 py-3 rounded-xl border-4 border-action-superlike text-action-superlike text-2xl font-bold"
          style={{ opacity: superlikeOpacity }}
        >
          SUPER LIKE
        </motion.div>

        {/* Profile info */}
        <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
          <div className="flex items-center gap-2 mb-2">
            <h2 className="text-3xl font-bold">
              {profile.displayName}
              {profile.age && <span>, {profile.age}</span>}
            </h2>
            {profile.isVerified && (
              <Verified className="w-6 h-6 text-blue-400 fill-blue-400" />
            )}
          </div>

          {profile.distance && (
            <div className="flex items-center gap-1 text-white/80 mb-3">
              <MapPin className="w-4 h-4" />
              <span>{profile.distance} miles away</span>
            </div>
          )}

          {profile.bio && !showDetails && (
            <p className="text-white/90 line-clamp-2">{profile.bio}</p>
          )}

          {/* Interests */}
          {profile.interests && profile.interests.length > 0 && !showDetails && (
            <div className="flex flex-wrap gap-2 mt-3">
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
            className="absolute right-6 bottom-6 w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center"
          >
            <Info className="w-5 h-5" />
          </button>
        </div>

        {/* Expanded details */}
        {showDetails && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute inset-0 bg-black/90 p-6 overflow-y-auto"
            onClick={() => setShowDetails(false)}
          >
            <div className="max-w-md mx-auto pt-8 text-white">
              <h2 className="text-3xl font-bold mb-4">
                {profile.displayName}
                {profile.age && <span>, {profile.age}</span>}
              </h2>

              {profile.bio && (
                <div className="mb-6">
                  <h3 className="text-sm uppercase text-white/60 mb-2">About</h3>
                  <p className="text-lg">{profile.bio}</p>
                </div>
              )}

              {profile.interests && profile.interests.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-sm uppercase text-white/60 mb-2">Interests</h3>
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
                    <div key={index} className="bg-white/10 rounded-xl p-4">
                      <p className="text-sm text-white/60 mb-1">{prompt.question}</p>
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
