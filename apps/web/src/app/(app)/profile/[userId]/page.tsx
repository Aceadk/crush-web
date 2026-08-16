'use client';

/**
 * Peer profile view — /profile/[userId].
 *
 * Five surfaces already linked here (chat header, likes, weekly picks, and
 * two spots on matches) but the route never existed, so every "view
 * profile" tap 404'd. Renders another user's public profile: photos,
 * name/age/verified, bio, interests, and prompts.
 */

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import {
  userService,
  useAuthStore,
  type UserProfile,
} from '@crush/core';
import {
  ArrowLeft,
  BadgeCheck,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  UserX,
} from 'lucide-react';

export default function PeerProfilePage() {
  const router = useRouter();
  const params = useParams<{ userId: string }>();
  const userId = params?.userId;
  const { user } = useAuthStore();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'missing' | 'failed'>(
    'loading'
  );
  const [photoIndex, setPhotoIndex] = useState(0);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    if (!userId) return;
    // Viewing yourself: use the richer own-profile page.
    if (user && userId === user.uid) {
      router.replace('/profile');
      return;
    }
    let cancelled = false;
    setStatus('loading');
    void (async () => {
      try {
        const loaded = await userService.getUserProfile(userId);
        if (cancelled) return;
        setProfile(loaded);
        // getUserProfile builds a profile from whatever the document has, so a
        // half-finished account (common for ones started on the web, where the
        // profile map fills in step by step) renders with its empty states
        // rather than reading as "removed". Only a genuinely absent document
        // is missing.
        setStatus(loaded ? 'ready' : 'missing');
        setPhotoIndex(loaded?.primaryPhotoIndex ?? 0);
      } catch {
        // A read that FAILED is not a profile that does not exist: offline and
        // rules-denied both land here. Offer a retry instead of telling the
        // user the person was removed.
        if (!cancelled) setStatus('failed');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, user, router, reloadToken]);

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (status === 'failed') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="max-w-sm text-center">
          <UserX className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
          <h1 className="mb-2 text-xl font-semibold">Could not load this profile</h1>
          <p className="mb-6 text-sm text-muted-foreground">
            Check your connection and try again.
          </p>
          <div className="flex justify-center gap-2">
            <button
              onClick={() => setReloadToken((token) => token + 1)}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              <RefreshCw className="h-4 w-4" />
              Retry
            </button>
            <button
              onClick={() => router.back()}
              className="inline-flex items-center gap-2 rounded-lg border border-border px-5 py-2.5 text-sm font-medium hover:bg-muted"
            >
              <ArrowLeft className="h-4 w-4" />
              Go back
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'missing' || !profile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="max-w-sm text-center">
          <UserX className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
          <h1 className="mb-2 text-xl font-semibold">Profile unavailable</h1>
          <p className="mb-6 text-sm text-muted-foreground">
            This profile may have been removed or is not visible to you.
          </p>
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <ArrowLeft className="h-4 w-4" />
            Go back
          </button>
        </div>
      </div>
    );
  }

  const photos = profile.photos.length
    ? profile.photos
    : profile.profilePhotoUrl
      ? [profile.profilePhotoUrl]
      : [];
  const safeIndex = Math.min(photoIndex, Math.max(photos.length - 1, 0));
  const city = profile.location?.city;

  return (
    <div className="min-h-screen bg-background pb-12">
      <div className="mx-auto max-w-lg">
        {/* Photos */}
        <div className="relative aspect-[4/5] w-full overflow-hidden bg-muted sm:mt-4 sm:rounded-2xl">
          <button
            onClick={() => router.back()}
            aria-label="Go back"
            className="absolute left-3 top-3 z-10 rounded-full bg-black/40 p-2 text-white backdrop-blur-sm hover:bg-black/60"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>

          {photos.length > 0 ? (
            <Image
              src={photos[safeIndex]}
              alt={`${profile.displayName}'s photo`}
              fill
              sizes="(max-width: 640px) 100vw, 512px"
              className="object-cover"
              priority
            />
          ) : (
            <div className="flex h-full items-center justify-center text-6xl font-semibold text-muted-foreground">
              {profile.displayName.charAt(0).toUpperCase()}
            </div>
          )}

          {photos.length > 1 && (
            <>
              <div className="absolute inset-x-0 top-0 z-10 flex gap-1 p-2">
                {photos.map((_, i) => (
                  <div
                    key={i}
                    className={`h-1 flex-1 rounded-full ${
                      i === safeIndex ? 'bg-white' : 'bg-white/30'
                    }`}
                  />
                ))}
              </div>
              <button
                onClick={() =>
                  setPhotoIndex((i) => (i - 1 + photos.length) % photos.length)
                }
                aria-label="Previous photo"
                className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/30 p-1.5 text-white hover:bg-black/50"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                onClick={() => setPhotoIndex((i) => (i + 1) % photos.length)}
                aria-label="Next photo"
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/30 p-1.5 text-white hover:bg-black/50"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </>
          )}
        </div>

        {/* Identity */}
        <div className="px-4 pt-5 sm:px-0">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">
              {profile.displayName}
              {profile.age ? (
                <span className="font-normal text-muted-foreground">
                  , {profile.age}
                </span>
              ) : null}
            </h1>
            {profile.isVerified && (
              <BadgeCheck
                className="h-6 w-6 text-primary"
                aria-label="Verified profile"
              />
            )}
          </div>
          {city && (
            <p className="mt-1 text-sm text-muted-foreground">{city}</p>
          )}

          {profile.bio && (
            <p className="mt-4 whitespace-pre-wrap text-[15px] leading-relaxed">
              {profile.bio}
            </p>
          )}

          {(profile.interests?.length ?? 0) > 0 && (
            <div className="mt-5">
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Interests
              </h2>
              <div className="flex flex-wrap gap-2">
                {profile.interests!.map((interest) => (
                  <span
                    key={interest}
                    className="rounded-full border border-border bg-muted px-3 py-1 text-sm"
                  >
                    {interest}
                  </span>
                ))}
              </div>
            </div>
          )}

          {(profile.prompts?.length ?? 0) > 0 && (
            <div className="mt-6 space-y-4">
              {profile.prompts!.map((prompt, i) => (
                <div
                  key={`${prompt.question}-${i}`}
                  className="rounded-xl border border-border bg-card p-4"
                >
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {prompt.question}
                  </p>
                  <p className="mt-1.5 text-[15px]">{prompt.answer}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
