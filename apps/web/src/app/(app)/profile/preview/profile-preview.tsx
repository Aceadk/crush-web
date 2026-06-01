'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useAuthStore, locationService } from '@crush/core';
import { Badge, Button, cn } from '@crush/ui';
import { ArrowLeft, Edit2, MapPin, Shield, Sparkles, Info } from 'lucide-react';

export default function ProfilePreview() {
  const router = useRouter();
  const { profile } = useAuthStore();
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [showDetails, setShowDetails] = useState(false);

  if (!profile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-muted-foreground">Loading preview...</p>
        </div>
      </div>
    );
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
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <div className="fixed left-0 right-0 top-0 z-20 bg-gradient-to-b from-black/50 to-transparent p-4">
        <div className="mx-auto flex max-w-lg items-center justify-between">
          <button
            onClick={() => router.back()}
            className="-ml-2 rounded-full p-2 text-white transition-colors hover:bg-white/20"
            aria-label="Back"
            type="button"
          >
            <ArrowLeft className="h-6 w-6" />
          </button>
          <span className="font-medium text-white">Preview</span>
          <button
            onClick={() => router.push('/profile/edit')}
            className="-mr-2 rounded-full p-2 text-white transition-colors hover:bg-white/20"
            aria-label="Edit profile"
            type="button"
          >
            <Edit2 className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Card container */}
      <div className="flex flex-1 items-center justify-center p-4 pb-8 pt-16">
        <div className="relative aspect-[3/4] max-h-[min(780px,calc(100dvh-8rem))] w-full max-w-lg overflow-hidden rounded-3xl shadow-2xl">
          {/* Photo */}
          {photos.length > 0 ? (
            <Image
              src={photos[currentPhotoIndex]}
              alt={profile.displayName}
              fill
              className="object-cover"
              sizes="(max-width: 448px) 100vw, 448px"
              priority
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-primary to-secondary">
              <span className="text-8xl font-bold text-white/30">
                {profile.displayName?.charAt(0) || '?'}
              </span>
            </div>
          )}

          {/* Photo navigation */}
          {hasMultiplePhotos && (
            <>
              {/* Photo indicators */}
              <div className="absolute left-4 right-4 top-4 z-10 flex gap-1">
                {photos.map((_, index) => (
                  <div
                    key={index}
                    className={cn(
                      'h-1 flex-1 rounded-full transition-all',
                      index === currentPhotoIndex ? 'bg-white' : 'bg-white/40'
                    )}
                  />
                ))}
              </div>

              {/* Navigation buttons */}
              <button
                onClick={prevPhoto}
                className="absolute bottom-0 left-0 top-0 z-10 w-1/3"
                aria-label="Previous profile photo"
                type="button"
              />
              <button
                onClick={nextPhoto}
                className="absolute bottom-0 right-0 top-0 z-10 w-1/3"
                aria-label="Next profile photo"
                type="button"
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
            <div className="mb-2 flex items-center gap-2">
              <h1 className="text-3xl font-bold">
                {profile.displayName}
                {profile.age && <span className="font-normal">, {profile.age}</span>}
              </h1>
              {profile.isVerified && <Shield className="h-6 w-6 text-blue-400" />}
            </div>

            {/* Location */}
            {profile.location && (profile.location.city || profile.location.country) && (
              <div className="mb-3 flex items-center gap-1 text-white/80">
                <MapPin className="h-4 w-4" />
                <span>{locationService.formatLocationForDisplay(profile.location)}</span>
              </div>
            )}

            {/* Badges */}
            <div className="mb-4 flex items-center gap-2">
              {profile.isVerified && (
                <Badge variant="verified" className="gap-1 bg-white/20 backdrop-blur">
                  <Shield className="h-3 w-3" /> Verified
                </Badge>
              )}
              {profile.isPremium && (
                <Badge variant="premium" className="gap-1 bg-white/20 backdrop-blur">
                  <Sparkles className="h-3 w-3" /> Premium
                </Badge>
              )}
            </div>

            {/* Bio */}
            {profile.bio && <p className="mb-4 line-clamp-3 text-white/90">{profile.bio}</p>}

            {/* Interests */}
            {profile.interests && profile.interests.length > 0 && (
              <div className="mb-4 flex flex-wrap gap-2">
                {profile.interests.slice(0, 5).map((interest) => (
                  <span
                    key={interest}
                    className="rounded-full bg-white/20 px-3 py-1 text-sm backdrop-blur"
                  >
                    {interest}
                  </span>
                ))}
                {profile.interests.length > 5 && (
                  <span className="rounded-full bg-white/10 px-3 py-1 text-sm backdrop-blur">
                    +{profile.interests.length - 5}
                  </span>
                )}
              </div>
            )}

            {/* Prompts preview */}
            {profile.prompts && profile.prompts.length > 0 && (
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="flex items-center gap-2 text-white/80 transition-colors hover:text-white"
                type="button"
              >
                <Info className="h-4 w-4" />
                <span className="text-sm">View prompts</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Prompts overlay */}
      {showDetails && profile.prompts && profile.prompts.length > 0 && (
        <div
          className="fixed inset-0 z-30 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setShowDetails(false)}
        >
          <div
            className="animate-in fade-in zoom-in-95 max-h-[calc(100dvh-2rem)] w-full max-w-lg space-y-4 overflow-y-auto rounded-3xl bg-white p-6 dark:bg-gray-800"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-center text-xl font-bold text-gray-900 dark:text-white">
              {profile.displayName}'s Prompts
            </h2>
            {profile.prompts.map((prompt, index) => (
              <div key={index} className="rounded-xl bg-gray-50 p-4 dark:bg-gray-700">
                <p className="mb-1 text-sm text-gray-500 dark:text-gray-400">{prompt.question}</p>
                <p className="text-gray-900 dark:text-white">{prompt.answer}</p>
              </div>
            ))}
            <Button onClick={() => setShowDetails(false)} className="w-full">
              Close
            </Button>
          </div>
        </div>
      )}

      {/* Bottom hint */}
      <div className="pb-6 text-center text-sm text-gray-500">
        This is how others see your profile
      </div>
    </div>
  );
}
