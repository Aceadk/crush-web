'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore, locationService } from '@crush/core';
import { Button, Badge } from '@crush/ui';
import { cn } from '@crush/ui';
import {
  ArrowLeft,
  Edit2,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Shield,
  Sparkles,
  Info,
} from 'lucide-react';

export default function ProfilePreview() {
  const router = useRouter();
  const { profile } = useAuthStore();
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [showDetails, setShowDetails] = useState(false);

  if (!profile) {
    return null;
  }

  const photos = profile.photos || [];
  const hasMultiplePhotos = photos.length > 1;

  const nextPhoto = () => {
    if (hasMultiplePhotos) {
      setCurrentPhotoIndex((prev) => (prev + 1) % photos.length);
    }
  };

  const prevPhoto = () => {
    if (hasMultiplePhotos) {
      setCurrentPhotoIndex((prev) => (prev - 1 + photos.length) % photos.length);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-20 bg-gradient-to-b from-black/50 to-transparent p-4">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="p-2 -ml-2 text-white hover:bg-white/20 rounded-full transition-colors"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <span className="text-white font-medium">Preview</span>
          <button
            onClick={() => router.push('/profile/edit')}
            className="p-2 -mr-2 text-white hover:bg-white/20 rounded-full transition-colors"
          >
            <Edit2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Card container */}
      <div className="flex-1 flex items-center justify-center p-4 pt-16 pb-8">
        <div className="w-full max-w-md aspect-[3/4] relative rounded-3xl overflow-hidden shadow-2xl">
          {/* Photo */}
          {photos.length > 0 ? (
            <img
              src={photos[currentPhotoIndex]}
              alt={profile.displayName}
              className="absolute inset-0 w-full h-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
              <span className="text-8xl font-bold text-white/30">
                {profile.displayName?.charAt(0) || '?'}
              </span>
            </div>
          )}

          {/* Photo navigation */}
          {hasMultiplePhotos && (
            <>
              {/* Photo indicators */}
              <div className="absolute top-4 left-4 right-4 flex gap-1 z-10">
                {photos.map((_, index) => (
                  <div
                    key={index}
                    className={cn(
                      'flex-1 h-1 rounded-full transition-all',
                      index === currentPhotoIndex
                        ? 'bg-white'
                        : 'bg-white/40'
                    )}
                  />
                ))}
              </div>

              {/* Navigation buttons */}
              <button
                onClick={prevPhoto}
                className="absolute left-0 top-0 bottom-0 w-1/3 z-10"
              />
              <button
                onClick={nextPhoto}
                className="absolute right-0 top-0 bottom-0 w-1/3 z-10"
              />
            </>
          )}

          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

          {/* Profile info */}
          <div
            className={cn(
              'absolute bottom-0 left-0 right-0 p-6 text-white transition-all duration-300',
              showDetails ? 'translate-y-0' : 'translate-y-0'
            )}
          >
            {/* Name and badges */}
            <div className="flex items-center gap-2 mb-2">
              <h1 className="text-3xl font-bold">
                {profile.displayName}
                {profile.age && <span className="font-normal">, {profile.age}</span>}
              </h1>
              {profile.isVerified && (
                <Shield className="w-6 h-6 text-blue-400" />
              )}
            </div>

            {/* Location */}
            {profile.location && (profile.location.city || profile.location.country) && (
              <div className="flex items-center gap-1 text-white/80 mb-3">
                <MapPin className="w-4 h-4" />
                <span>{locationService.formatLocationForDisplay(profile.location)}</span>
              </div>
            )}

            {/* Badges */}
            <div className="flex items-center gap-2 mb-4">
              {profile.isVerified && (
                <Badge variant="verified" className="gap-1 bg-white/20 backdrop-blur">
                  <Shield className="w-3 h-3" /> Verified
                </Badge>
              )}
              {profile.isPremium && (
                <Badge variant="premium" className="gap-1 bg-white/20 backdrop-blur">
                  <Sparkles className="w-3 h-3" /> Premium
                </Badge>
              )}
            </div>

            {/* Bio */}
            {profile.bio && (
              <p className="text-white/90 mb-4 line-clamp-3">
                {profile.bio}
              </p>
            )}

            {/* Interests */}
            {profile.interests && profile.interests.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {profile.interests.slice(0, 5).map((interest) => (
                  <span
                    key={interest}
                    className="px-3 py-1 rounded-full text-sm bg-white/20 backdrop-blur"
                  >
                    {interest}
                  </span>
                ))}
                {profile.interests.length > 5 && (
                  <span className="px-3 py-1 rounded-full text-sm bg-white/10 backdrop-blur">
                    +{profile.interests.length - 5}
                  </span>
                )}
              </div>
            )}

            {/* Prompts preview */}
            {profile.prompts && profile.prompts.length > 0 && (
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="flex items-center gap-2 text-white/80 hover:text-white transition-colors"
              >
                <Info className="w-4 h-4" />
                <span className="text-sm">View prompts</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Prompts overlay */}
      {showDetails && profile.prompts && profile.prompts.length > 0 && (
        <div
          className="fixed inset-0 z-30 bg-black/70 flex items-center justify-center p-4"
          onClick={() => setShowDetails(false)}
        >
          <div
            className="w-full max-w-md bg-white dark:bg-gray-800 rounded-3xl p-6 space-y-4 animate-in fade-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-bold text-gray-900 dark:text-white text-center">
              {profile.displayName}'s Prompts
            </h2>
            {profile.prompts.map((prompt, index) => (
              <div
                key={index}
                className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4"
              >
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                  {prompt.question}
                </p>
                <p className="text-gray-900 dark:text-white">
                  {prompt.answer}
                </p>
              </div>
            ))}
            <Button
              onClick={() => setShowDetails(false)}
              className="w-full"
            >
              Close
            </Button>
          </div>
        </div>
      )}

      {/* Bottom hint */}
      <div className="text-center pb-6 text-gray-400 text-sm">
        This is how others see your profile
      </div>
    </div>
  );
}
