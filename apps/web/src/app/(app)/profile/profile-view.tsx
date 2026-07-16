'use client';

import { buildProfileCompletionState } from '@/components/profile/profile-completion';
import {
  calculateAge,
  authVerificationFactsFromUser,
  describeProfilePhotoUploadError,
  locationService,
  onboardingService,
  PROFILE_PHOTO_ALLOWED_MIME_TYPES,
  PROFILE_PHOTO_MAX_BYTES,
  storageService,
  useAuthStore,
} from '@crush/core';
import { Badge, Button, Card, cn } from '@crush/ui';
import {
  AlertCircle,
  Calendar,
  Camera,
  Cigarette,
  Dumbbell,
  Eye,
  GraduationCap,
  Heart,
  MapPin,
  Plus,
  Ruler,
  Settings,
  Share2,
  Shield,
  Sparkles,
  Wine,
  X,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

const ACCEPTED_IMAGE_TYPES = new Set<string>(PROFILE_PHOTO_ALLOWED_MIME_TYPES);

export default function ProfileView() {
  const { user, profile, refreshProfile } = useAuthStore();
  const [uploading, setUploading] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [trustedPhotoRecords, setTrustedPhotoRecords] = useState(profile?.photoRecords ?? []);
  const [trustedLocation, setTrustedLocation] = useState(profile?.location);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;
    const expectedUid = user.uid;
    let cancelled = false;
    void onboardingService
      .resolve(authVerificationFactsFromUser(user))
      .then((resolution) => {
        if (cancelled || useAuthStore.getState().user?.uid !== expectedUid) return;
        setTrustedPhotoRecords(resolution.snapshot.photos);
        setTrustedLocation(resolution.snapshot.location ?? undefined);
      })
      .catch((caught) => {
        if (!cancelled) console.warn('Could not hydrate trusted profile readiness:', caught);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setPhotoError(null);

    if (!ACCEPTED_IMAGE_TYPES.has(file.type)) {
      setPhotoError('Choose a JPG, PNG, WebP, HEIC, or HEIF image.');
      e.target.value = '';
      return;
    }

    if (file.size > PROFILE_PHOTO_MAX_BYTES) {
      setPhotoError('Choose an image smaller than 10 MB.');
      e.target.value = '';
      return;
    }

    setUploading(true);
    try {
      const upload = await storageService.uploadProfilePhotoForValidation(user.uid, file);
      const validated = await onboardingService.validateProfilePhoto({
        storagePath: upload.storagePath,
        isPrimary: (profile?.photos.length ?? 0) === 0,
      });
      URL.revokeObjectURL(upload.downloadUrl);
      if (validated.status !== 'approved') {
        setPhotoError(
          validated.status === 'rejected'
            ? validated.reason || 'That photo did not pass the profile-photo checks.'
            : validated.status === 'failed'
              ? 'The photo check failed. Please retry with another image.'
              : 'That photo is still processing and will appear after server approval.'
        );
        return;
      }
      const trustedSnapshot =
        validated.snapshot ??
        (
          await onboardingService.resolve(
            authVerificationFactsFromUser(useAuthStore.getState().user)
          )
        ).snapshot;
      setTrustedPhotoRecords(trustedSnapshot.photos);
      const approvedIds = trustedSnapshot.photos
        .filter((photo) => photo.status === 'approved')
        .map((photo) => photo.mediaId)
        .filter((id): id is string => Boolean(id));
      await onboardingService.saveStep(
        'photos',
        { mediaIds: approvedIds },
        authVerificationFactsFromUser(useAuthStore.getState().user)
      );
      await refreshProfile();
    } catch (error) {
      console.error('Failed to upload photo:', error);
      setPhotoError(describeProfilePhotoUploadError(error));
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleRemovePhoto = async (index: number) => {
    if (!user || !profile) return;

    const removedUrl = profile.photos[index];
    const resolution = await onboardingService.resolve(
      authVerificationFactsFromUser(useAuthStore.getState().user)
    );
    setTrustedPhotoRecords(resolution.snapshot.photos);
    const mediaIds = resolution.snapshot.photos
      .filter((photo) => photo.status === 'approved' && photo.downloadUrl !== removedUrl)
      .map((photo) => photo.mediaId)
      .filter((id): id is string => Boolean(id));
    await onboardingService.saveStep(
      'photos',
      { mediaIds },
      authVerificationFactsFromUser(useAuthStore.getState().user)
    );
    await refreshProfile();
  };

  const handleSetMainPhoto = async (index: number) => {
    if (!user || !profile || index === 0) return;

    const primaryUrl = profile.photos[index];
    const resolution = await onboardingService.resolve(
      authVerificationFactsFromUser(useAuthStore.getState().user)
    );
    setTrustedPhotoRecords(resolution.snapshot.photos);
    const approvedRecords = resolution.snapshot.photos.filter(
      (photo) => photo.status === 'approved' && photo.mediaId
    );
    const mediaIds = [
      ...approvedRecords.filter((photo) => photo.downloadUrl === primaryUrl),
      ...approvedRecords.filter((photo) => photo.downloadUrl !== primaryUrl),
    ].map((photo) => photo.mediaId as string);
    await onboardingService.saveStep(
      'photos',
      { mediaIds },
      authVerificationFactsFromUser(useAuthStore.getState().user)
    );
    await refreshProfile();
  };

  const completionState = buildProfileCompletionState({
    accountVerified: Boolean(user && (!user.email || user.emailVerified)),
    username: profile?.username,
    displayName: profile?.displayName,
    birthDate: profile?.birthDate,
    gender: profile?.gender,
    interestedIn: profile?.interestedIn,
    bio: profile?.bio,
    interests: profile?.interests,
    location: trustedLocation,
    photos: profile?.photos,
    photoRecords: trustedPhotoRecords,
    prompts: profile?.prompts,
  });
  const completeness = completionState.percent;

  if (!profile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header with gradient */}
      <div className="relative h-48 bg-gradient-to-br from-primary via-primary-dark to-secondary">
        <div className="absolute inset-0 bg-black/20" />
        <div className="absolute right-4 top-4 flex gap-2">
          <Link href="/settings">
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/20"
              aria-label="Open settings"
            >
              <Settings className="h-5 w-5" />
            </Button>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/20"
            aria-label="Share profile"
          >
            <Share2 className="h-5 w-5" />
          </Button>
        </div>
      </div>

      <div className="relative z-10 mx-auto -mt-24 max-w-6xl px-4 pb-20">
        {/* Profile header */}
        <div className="mb-6 text-center">
          {/* Main photo */}
          <div className="relative mb-4 inline-block">
            <div className="relative h-32 w-32 overflow-hidden rounded-full border-4 border-white shadow-xl">
              {profile.profilePhotoUrl ? (
                <Image
                  src={profile.profilePhotoUrl}
                  alt={profile.displayName}
                  fill
                  className="object-cover"
                  sizes="128px"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary to-secondary text-4xl font-bold text-white">
                  {profile.displayName?.charAt(0) || '?'}
                </div>
              )}
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="absolute bottom-0 right-0 flex h-10 w-10 items-center justify-center rounded-full bg-primary text-white shadow-lg transition-colors hover:bg-primary-dark"
              aria-label="Upload profile photo"
              type="button"
            >
              <Camera className="h-5 w-5" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
              onChange={handlePhotoUpload}
              className="hidden"
            />
          </div>

          {/* Name and badges */}
          <h1 className="mb-1 text-2xl font-bold text-gray-900 dark:text-white">
            {profile.displayName}
            {(calculateAge(profile.birthDate) || profile.age) && (
              <span className="font-normal text-gray-600 dark:text-gray-300">
                , {calculateAge(profile.birthDate) ?? profile.age}
              </span>
            )}
          </h1>

          <div className="mb-4 flex items-center justify-center gap-2">
            {profile.isVerified && (
              <Badge variant="verified" className="gap-1">
                <Shield className="h-3 w-3" /> Verified
              </Badge>
            )}
            {profile.isPremium && (
              <Badge variant="premium" className="gap-1">
                <Sparkles className="h-3 w-3" /> Premium
              </Badge>
            )}
          </div>

          {/* Quick stats */}
          <div className="flex justify-center gap-8 text-center">
            <div>
              <div className="text-2xl font-bold text-primary">-</div>
              <div className="text-xs text-gray-500">Likes</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-primary">-</div>
              <div className="text-xs text-gray-500">Matches</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-primary">{completeness}%</div>
              <div className="text-xs text-gray-500">Complete</div>
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)] lg:items-start">
          <aside className="space-y-6 lg:sticky lg:top-24">
            {/* Profile completion card */}
            {completeness < 100 && (
              <Card className="border-primary/20 bg-primary/5 p-4">
                <div className="flex items-center gap-4">
                  <div className="flex-shrink-0">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                      <Sparkles className="h-6 w-6 text-primary" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      Complete your profile
                    </h3>
                    <p className="text-sm text-gray-500">{completionState.primaryMessage}</p>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                      <div
                        className="h-full bg-gradient-to-r from-primary to-secondary transition-all duration-500"
                        style={{ width: `${completeness}%` }}
                      />
                    </div>
                  </div>
                  <Link href="/profile/edit">
                    <Button size="sm">Complete</Button>
                  </Link>
                </div>
                {(completionState.missingRequired.length > 0 ||
                  completionState.missingRecommended.length > 0) && (
                  <div className="mt-4 space-y-2 border-t border-primary/10 pt-4">
                    {[...completionState.missingRequired, ...completionState.missingRecommended]
                      .slice(0, 4)
                      .map((item) => (
                        <div
                          key={item.id}
                          className="flex gap-2 text-sm text-gray-600 dark:text-gray-300"
                        >
                          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                          <span>{item.label}</span>
                        </div>
                      ))}
                  </div>
                )}
              </Card>
            )}

            {/* Photo grid */}
            <Card className="p-4">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-semibold text-gray-900 dark:text-white">Photos</h2>
                <Link href="/profile/edit" className="text-sm text-primary hover:underline">
                  Edit
                </Link>
              </div>
              {photoError && (
                <div className="mb-3 flex gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-300">
                  <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                  <span>{photoError}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3">
                {profile.photos.map((photo, index) => (
                  <div
                    key={index}
                    className={cn(
                      'group relative aspect-[3/4] overflow-hidden rounded-xl',
                      index === 0 && 'col-span-2 row-span-2'
                    )}
                  >
                    <Image
                      src={photo}
                      alt={`Profile photo ${index + 1}`}
                      fill
                      className="object-cover"
                      sizes={
                        index === 0
                          ? '(max-width: 640px) 66vw, 400px'
                          : '(max-width: 640px) 33vw, 200px'
                      }
                    />

                    {/* Hover overlay */}
                    <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                      {index !== 0 && (
                        <button
                          onClick={() => handleSetMainPhoto(index)}
                          className="rounded-full bg-white p-2 text-gray-800 hover:bg-gray-100"
                          title="Set as main photo"
                          aria-label={`Set photo ${index + 1} as main photo`}
                          type="button"
                        >
                          <Heart className="h-4 w-4" />
                        </button>
                      )}
                      <button
                        onClick={() => handleRemovePhoto(index)}
                        className="rounded-full bg-white p-2 text-red-500 hover:bg-gray-100"
                        title="Remove photo"
                        aria-label={`Remove photo ${index + 1}`}
                        type="button"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>

                    {/* Main photo badge */}
                    {index === 0 && (
                      <div className="absolute left-2 top-2 rounded-full bg-black/50 px-2 py-1 text-xs text-white">
                        Main photo
                      </div>
                    )}
                  </div>
                ))}

                {/* Add photo button */}
                {profile.photos.length < 6 && (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className={cn(
                      'aspect-[3/4] rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600',
                      'flex flex-col items-center justify-center gap-2 text-gray-500',
                      'transition-colors hover:border-primary hover:text-primary',
                      uploading && 'cursor-not-allowed opacity-50'
                    )}
                    aria-label="Add profile photo"
                    type="button"
                  >
                    {uploading ? (
                      <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    ) : (
                      <>
                        <Plus className="h-8 w-8" />
                        <span className="text-xs">Add Photo</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </Card>
          </aside>

          <section className="space-y-6">
            {/* About section */}
            <Card className="p-4">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-semibold text-gray-900 dark:text-white">About</h2>
                <Link href="/profile/edit" className="text-sm text-primary hover:underline">
                  Edit
                </Link>
              </div>

              {profile.bio ? (
                <p className="whitespace-pre-wrap text-gray-700 dark:text-gray-300">
                  {profile.bio}
                </p>
              ) : (
                <Link href="/profile/edit" className="text-gray-500 hover:text-primary">
                  + Add a bio to tell others about yourself
                </Link>
              )}
            </Card>

            {/* Details section */}
            <Card className="p-4">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-semibold text-gray-900 dark:text-white">Details</h2>
                <Link href="/profile/edit" className="text-sm text-primary hover:underline">
                  Edit
                </Link>
              </div>

              <div className="space-y-3">
                {profile.location && (profile.location.city || profile.location.country) && (
                  <div className="flex items-center gap-3 text-gray-600 dark:text-gray-300">
                    <MapPin className="h-5 w-5 text-gray-500" />
                    <span>{locationService.formatLocationForDisplay(profile.location)}</span>
                  </div>
                )}
                {profile.birthDate && (
                  <div className="flex items-center gap-3 text-gray-600 dark:text-gray-300">
                    <Calendar className="h-5 w-5 text-gray-500" />
                    <span>{calculateAge(profile.birthDate) ?? profile.age} years old</span>
                  </div>
                )}
                {profile.lifestyle?.height && (
                  <div className="flex items-center gap-3 text-gray-600 dark:text-gray-300">
                    <Ruler className="h-5 w-5 text-gray-500" />
                    <span>{profile.lifestyle.height}</span>
                  </div>
                )}
                {profile.lifestyle?.education && (
                  <div className="flex items-center gap-3 text-gray-600 dark:text-gray-300">
                    <GraduationCap className="h-5 w-5 text-gray-500" />
                    <span>{profile.lifestyle.education}</span>
                  </div>
                )}
                {profile.lifestyle?.drinking && (
                  <div className="flex items-center gap-3 text-gray-600 dark:text-gray-300">
                    <Wine className="h-5 w-5 text-gray-500" />
                    <span className="capitalize">{profile.lifestyle.drinking}</span>
                  </div>
                )}
                {profile.lifestyle?.smoking && (
                  <div className="flex items-center gap-3 text-gray-600 dark:text-gray-300">
                    <Cigarette className="h-5 w-5 text-gray-500" />
                    <span className="capitalize">{profile.lifestyle.smoking}</span>
                  </div>
                )}
                {profile.lifestyle?.workout && (
                  <div className="flex items-center gap-3 text-gray-600 dark:text-gray-300">
                    <Dumbbell className="h-5 w-5 text-gray-500" />
                    <span className="capitalize">{profile.lifestyle.workout}</span>
                  </div>
                )}
              </div>
            </Card>

            {/* Interests section */}
            <Card className="p-4">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-semibold text-gray-900 dark:text-white">Interests</h2>
                <Link href="/profile/edit" className="text-sm text-primary hover:underline">
                  Edit
                </Link>
              </div>

              {profile.interests && profile.interests.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {profile.interests.map((interest) => (
                    <Badge key={interest} variant="secondary" className="px-3 py-1.5">
                      {interest}
                    </Badge>
                  ))}
                </div>
              ) : (
                <Link href="/profile/edit" className="text-gray-500 hover:text-primary">
                  + Add interests to find better matches
                </Link>
              )}
            </Card>

            {/* Prompts section */}
            <Card className="p-4">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-semibold text-gray-900 dark:text-white">Prompts</h2>
                <Link href="/profile/edit" className="text-sm text-primary hover:underline">
                  Edit
                </Link>
              </div>

              {profile.prompts && profile.prompts.length > 0 ? (
                <div className="space-y-4">
                  {profile.prompts.map((prompt, index) => (
                    <div key={index} className="rounded-xl bg-gray-50 p-4 dark:bg-gray-800">
                      <p className="mb-1 text-sm text-gray-500 dark:text-gray-400">
                        {prompt.question}
                      </p>
                      <p className="text-gray-900 dark:text-white">{prompt.answer}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <Link href="/profile/edit" className="text-gray-500 hover:text-primary">
                  + Add prompts to show your personality
                </Link>
              )}
            </Card>

            {/* Preview profile button */}
            <div className="flex justify-center">
              <Link href="/profile/preview">
                <Button variant="outline" className="gap-2">
                  <Eye className="h-4 w-4" />
                  Preview Profile
                </Button>
              </Link>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
