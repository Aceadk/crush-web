'use client';

import { analytics } from '@/lib/analytics';
import { sanitizeRedirectPath } from '@/shared/lib/auth-redirect';
import {
  MAX_ONBOARDING_INTERESTS,
  MAX_PROFILE_PHOTOS,
  MIN_ONBOARDING_BIO_LENGTH,
  MIN_ONBOARDING_INTERESTS,
  ONBOARDING_STEP_REGISTRY,
  WEB_ONBOARDING_STEP_KEYS,
  authVerificationFactsFromUser,
  buildOnboardingStepQuery,
  calculateCalendarAge,
  clearOnboardingDraft,
  evaluateOnboardingReadiness,
  hydrateOnboardingDraft,
  isAccountVerified,
  loadOnboardingDraft,
  locationService,
  normalizeOnboardingSnapshot,
  onboardingService,
  resolveWebOnboardingStep,
  saveOnboardingDraft,
  snapshotFromProfile,
  storageService,
  useAuthStore,
  type CanonicalOnboardingSnapshot,
  type OnboardingReadiness,
  type OnboardingResolution,
  type OnboardingStepKey,
} from '@crush/core';
import { Button, Card, cn } from '@crush/ui';
import { AlertCircle, ArrowLeft, ArrowRight, Heart, Loader2, X } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { OnboardingStepContent } from './onboarding-step-content';

const USERNAME_PATTERN = /^[a-zA-Z0-9_]{3,20}$/;

function isStepKey(value: string | null): value is OnboardingStepKey {
  return Boolean(value && ONBOARDING_STEP_REGISTRY.some((step) => step.key === value));
}

function destinationIsDiscovery(destination: string): boolean {
  return (
    destination === 'discovery' ||
    destination === '/discover' ||
    destination.startsWith('/discover?')
  );
}

export default function OnboardingFlow() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, profile, initialized, loading: authLoading, refreshProfile } = useAuthStore();
  const redirectAfterAuth = sanitizeRedirectPath(searchParams.get('redirect'));
  const postOnboardingRedirect = redirectAfterAuth.startsWith('/onboarding')
    ? '/discover'
    : redirectAfterAuth;

  const [snapshot, setSnapshot] = useState<CanonicalOnboardingSnapshot>(() =>
    snapshotFromProfile(profile)
  );
  const [readiness, setReadiness] = useState<OnboardingReadiness>(() =>
    evaluateOnboardingReadiness(snapshotFromProfile(profile), authVerificationFactsFromUser(user))
  );
  const [hydrating, setHydrating] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [termsAccepted, setTermsAccepted] = useState(Boolean(profile?.hasAcceptedTerms));
  const [privacyAccepted, setPrivacyAccepted] = useState(Boolean(profile?.hasAcceptedTerms));
  const [usernameAvailability, setUsernameAvailability] = useState<
    'idle' | 'checking' | 'available' | 'taken' | 'error'
  >('idle');
  const requestSequence = useRef(0);
  const serverUsernameRef = useRef(profile?.username ?? '');

  const queryStep = searchParams.get('step');
  const activeStep = resolveWebOnboardingStep(queryStep, readiness.firstIncompleteStep);

  const visibleSteps = useMemo(
    () => ONBOARDING_STEP_REGISTRY.filter((step) => WEB_ONBOARDING_STEP_KEYS.includes(step.key)),
    []
  );
  const currentIndex = Math.max(
    0,
    visibleSteps.findIndex((step) => step.key === activeStep)
  );
  const progressPercentage = ((currentIndex + 1) / visibleSteps.length) * 100;

  const stepHref = useCallback(
    (stepKey: OnboardingStepKey) => {
      const params = new URLSearchParams(
        buildOnboardingStepQuery(searchParams.toString(), stepKey)
      );
      if (redirectAfterAuth !== '/discover') params.set('redirect', redirectAfterAuth);
      return `/onboarding?${params.toString()}`;
    },
    [redirectAfterAuth, searchParams]
  );

  const navigateToStep = useCallback(
    (stepKey: OnboardingStepKey, replace = false) => {
      const href = stepHref(stepKey);
      if (replace) router.replace(href);
      else router.push(href);
    },
    [router, stepHref]
  );

  const applyResolution = useCallback(
    (resolution: OnboardingResolution, localDraft?: CanonicalOnboardingSnapshot) => {
      if (!user || (resolution.snapshot.uid && resolution.snapshot.uid !== user.uid)) return;
      const hydratedSnapshot = hydrateOnboardingDraft(resolution.snapshot, localDraft);
      serverUsernameRef.current = resolution.snapshot.username;
      setSnapshot(hydratedSnapshot);
      setReadiness(resolution.readiness);
      saveOnboardingDraft(user.uid, hydratedSnapshot);
    },
    [user]
  );

  const resolveProgress = useCallback(async () => {
    if (!user) return;
    const sequence = ++requestSequence.current;
    const expectedUid = user.uid;
    // reload() may update a Firebase User in place. Always sample the current
    // store value at operation time instead of closing over identity-memoized
    // verification facts.
    const currentAuthFacts = authVerificationFactsFromUser(useAuthStore.getState().user);
    setHydrating(true);
    setError(null);

    const localDraft = loadOnboardingDraft(expectedUid);
    const optimistic = hydrateOnboardingDraft(snapshotFromProfile(profile), localDraft);
    setSnapshot(optimistic);
    setReadiness(evaluateOnboardingReadiness(optimistic, currentAuthFacts));

    try {
      const resolution = await onboardingService.resolve(currentAuthFacts);
      if (sequence !== requestSequence.current || useAuthStore.getState().user?.uid !== expectedUid)
        return;
      applyResolution(resolution, localDraft);

      if (destinationIsDiscovery(String(resolution.destination))) {
        clearOnboardingDraft(expectedUid);
        router.replace(postOnboardingRedirect);
        return;
      }

      const requested = searchParams.get('step');
      if (!isStepKey(requested) || !WEB_ONBOARDING_STEP_KEYS.includes(requested)) {
        const next = resolution.readiness.firstIncompleteStep;
        if (next === 'emailVerification') {
          router.replace(
            `/auth/verify-email?redirect=${encodeURIComponent(postOnboardingRedirect)}`
          );
        } else if (next === 'phoneVerification') {
          router.replace(`/auth/phone?redirect=${encodeURIComponent(postOnboardingRedirect)}`);
        } else if (next !== 'discovery') {
          navigateToStep(next, true);
        }
      }
    } catch (caught) {
      if (sequence !== requestSequence.current) return;
      setError(caught instanceof Error ? caught.message : 'Could not load onboarding progress.');
    } finally {
      if (sequence === requestSequence.current) setHydrating(false);
    }
  }, [
    user,
    profile,
    applyResolution,
    navigateToStep,
    postOnboardingRedirect,
    router,
    searchParams,
  ]);

  useEffect(() => {
    if (!initialized || authLoading) return;
    if (!user) {
      router.replace('/auth/login');
      return;
    }
    const currentAuthFacts = authVerificationFactsFromUser(useAuthStore.getState().user);
    if (!isAccountVerified(currentAuthFacts)) {
      router.replace(`/auth/verify-email?redirect=${encodeURIComponent(postOnboardingRedirect)}`);
      return;
    }
    void resolveProgress();
  }, [initialized, authLoading, user?.uid, user?.emailVerified]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    analytics.funnelStep('onboarding', `v2_${activeStep}_view`, 'started');
  }, [activeStep]);

  useEffect(() => {
    if (!user || hydrating) return;
    saveOnboardingDraft(user.uid, snapshot);
  }, [hydrating, snapshot, user]);

  useEffect(() => {
    if (!snapshot.hasAcceptedTerms) return;
    setTermsAccepted(true);
    setPrivacyAccepted(true);
  }, [snapshot.hasAcceptedTerms]);

  useEffect(() => {
    if (activeStep !== 'username' || !user) return;
    const username = snapshot.username.trim();
    if (!USERNAME_PATTERN.test(username)) {
      setUsernameAvailability('idle');
      return;
    }
    if (
      serverUsernameRef.current &&
      serverUsernameRef.current.toLowerCase() === username.toLowerCase()
    ) {
      setUsernameAvailability('available');
      return;
    }

    let cancelled = false;
    setUsernameAvailability('checking');
    const timeoutId = window.setTimeout(() => {
      void onboardingService
        .checkUsernameAvailability(username)
        .then((result) => {
          if (cancelled || useAuthStore.getState().user?.uid !== user.uid) return;
          setUsernameAvailability(result.available ? 'available' : 'taken');
        })
        .catch(() => {
          if (!cancelled) setUsernameAvailability('error');
        });
    }, 400);
    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [activeStep, snapshot.username, user]);

  const updateSnapshot = useCallback((patch: Partial<CanonicalOnboardingSnapshot>) => {
    setSnapshot((current) => {
      const next = normalizeOnboardingSnapshot({ ...current, ...patch });
      setReadiness(
        evaluateOnboardingReadiness(
          next,
          authVerificationFactsFromUser(useAuthStore.getState().user)
        )
      );
      return next;
    });
    setError(null);
  }, []);

  const handlePhotoUpload = useCallback(
    async (file?: File) => {
      const currentUser = useAuthStore.getState().user;
      if (!file || !currentUser || uploadingPhoto || snapshot.photos.length >= MAX_PROFILE_PHOTOS)
        return;
      const expectedUid = currentUser.uid;
      setUploadingPhoto(true);
      setError(null);
      try {
        const upload = await storageService.uploadProfilePhotoForValidation(expectedUid, file);
        if (useAuthStore.getState().user?.uid !== expectedUid) return;
        setSnapshot((current) => ({
          ...current,
          photos: [
            ...current.photos,
            {
              storagePath: upload.storagePath,
              downloadUrl: upload.downloadUrl,
              status: 'processing',
              isPrimary: current.photos.length === 0,
            },
          ],
        }));
        const validated = await onboardingService.validateProfilePhoto({
          storagePath: upload.storagePath,
          isPrimary: snapshot.photos.length === 0,
        });
        if (useAuthStore.getState().user?.uid !== expectedUid) return;
        if (validated.snapshot) {
          const next = hydrateOnboardingDraft(validated.snapshot, loadOnboardingDraft(expectedUid));
          setSnapshot(next);
        } else {
          setSnapshot((current) => ({
            ...current,
            photos: current.photos.map((photo) =>
              photo.storagePath === upload.storagePath
                ? {
                    ...photo,
                    mediaId: validated.mediaId,
                    status: validated.status,
                    reason: validated.reason,
                  }
                : photo
            ),
          }));
        }
        const resolution = await onboardingService.resolve(
          authVerificationFactsFromUser(useAuthStore.getState().user)
        );
        applyResolution(resolution, loadOnboardingDraft(expectedUid));
      } catch (caught) {
        setError(
          caught instanceof Error ? caught.message : 'Could not upload and validate that photo.'
        );
      } finally {
        if (useAuthStore.getState().user?.uid === expectedUid) setUploadingPhoto(false);
      }
    },
    [applyResolution, snapshot.photos.length, uploadingPhoto]
  );

  const handleCaptureLocation = useCallback(async () => {
    const currentUser = useAuthStore.getState().user;
    if (!currentUser || locating) return;
    const expectedUid = currentUser.uid;
    setLocating(true);
    setError(null);
    try {
      const coordinates = await locationService.requestLocation({
        enableHighAccuracy: true,
        timeout: 30000,
        maximumAge: 0,
      });
      const details = await locationService.reverseGeocode(coordinates);
      if (useAuthStore.getState().user?.uid !== expectedUid) return;
      const resolution = await onboardingService.confirmCurrentLocation(
        {
          latitude: coordinates.latitude,
          longitude: coordinates.longitude,
          accuracyMeters: coordinates.accuracy,
          capturedAt: new Date().toISOString(),
          city: details.city,
          region: details.state,
          country: details.country,
        },
        authVerificationFactsFromUser(useAuthStore.getState().user)
      );
      applyResolution(resolution, loadOnboardingDraft(expectedUid));
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'Could not confirm your current location. Check browser permission and retry.'
      );
    } finally {
      if (useAuthStore.getState().user?.uid === expectedUid) setLocating(false);
    }
  }, [applyResolution, locating]);

  const canContinue = useMemo(() => {
    switch (activeStep) {
      case 'terms':
        return termsAccepted && privacyAccepted;
      case 'username':
        return USERNAME_PATTERN.test(snapshot.username) && usernameAvailability === 'available';
      case 'basicInfo': {
        const age = calculateCalendarAge(snapshot.birthDate);
        return (
          snapshot.firstName.trim().length >= 2 &&
          age !== undefined &&
          age >= 18 &&
          Boolean(snapshot.gender)
        );
      }
      case 'discoveryPreferences':
        return snapshot.interestedIn.length > 0;
      case 'photos':
        return snapshot.photos.some((photo) => photo.status === 'approved');
      case 'aboutMe':
        return snapshot.bio.trim().length >= MIN_ONBOARDING_BIO_LENGTH;
      case 'location':
        return Boolean(snapshot.location?.confirmedAt);
      case 'workEducation':
      case 'favourites':
        return true;
      case 'interests':
        return (
          snapshot.interests.length >= MIN_ONBOARDING_INTERESTS &&
          snapshot.interests.length <= MAX_ONBOARDING_INTERESTS
        );
      case 'ready':
        return readiness.canStartMatching;
      default:
        return false;
    }
  }, [
    activeStep,
    privacyAccepted,
    readiness.canStartMatching,
    snapshot,
    termsAccepted,
    usernameAvailability,
  ]);

  const handleContinue = useCallback(async () => {
    const currentUser = useAuthStore.getState().user;
    if (!currentUser || saving || !canContinue) return;
    const expectedUid = currentUser.uid;
    const currentFacts = authVerificationFactsFromUser(currentUser);
    setSaving(true);
    setError(null);
    try {
      let resolution: OnboardingResolution;
      switch (activeStep) {
        case 'terms':
          resolution = await onboardingService.saveStep(
            'terms',
            { accepted: true, privacyAccepted: true },
            currentFacts
          );
          break;
        case 'username':
          await onboardingService.claimUsername(snapshot.username);
          resolution = await onboardingService.resolve(currentFacts);
          break;
        case 'basicInfo':
          resolution = await onboardingService.saveStep(
            'basicInfo',
            {
              firstName: snapshot.firstName.trim(),
              lastName: snapshot.lastName.trim() || null,
              birthDate: snapshot.birthDate,
              gender: snapshot.gender,
              sexualOrientation:
                snapshot.gender === 'non_binary' ? snapshot.sexualOrientation : null,
            },
            currentFacts
          );
          break;
        case 'discoveryPreferences':
          resolution = await onboardingService.saveStep(
            'discoveryPreferences',
            { interestedIn: snapshot.interestedIn },
            currentFacts
          );
          break;
        case 'photos':
          resolution = await onboardingService.saveStep(
            'photos',
            {
              mediaIds: snapshot.photos
                .filter((photo) => photo.status === 'approved')
                .map((photo) => photo.mediaId)
                .filter(Boolean),
            },
            currentFacts
          );
          break;
        case 'aboutMe':
          resolution = await onboardingService.saveStep(
            'aboutMe',
            { bio: snapshot.bio.trim() },
            currentFacts
          );
          break;
        case 'location':
          resolution = await onboardingService.resolve(currentFacts);
          break;
        case 'workEducation':
          resolution = await onboardingService.saveStep(
            'workEducation',
            { ...snapshot.workEducation },
            currentFacts
          );
          break;
        case 'interests':
          resolution = await onboardingService.saveStep(
            'interests',
            { interestIds: snapshot.interests },
            currentFacts
          );
          break;
        case 'favourites':
          resolution = await onboardingService.saveStep(
            'favourites',
            { favourites: snapshot.favourites },
            currentFacts
          );
          break;
        case 'ready':
          resolution = await onboardingService.complete(currentFacts);
          break;
        default:
          return;
      }

      if (useAuthStore.getState().user?.uid !== expectedUid) return;
      applyResolution(resolution, snapshot);
      await refreshProfile();
      analytics.funnelStep('onboarding', `v2_${activeStep}_completed`, 'completed');

      if (activeStep === 'ready' || destinationIsDiscovery(String(resolution.destination))) {
        clearOnboardingDraft(expectedUid);
        analytics.track({ name: 'profile_complete', properties: { completeness: 100 } });
        router.replace(postOnboardingRedirect);
        return;
      }

      const next = resolution.readiness.firstIncompleteStep;
      if (next === 'emailVerification') {
        router.replace(`/auth/verify-email?redirect=${encodeURIComponent(postOnboardingRedirect)}`);
      } else if (next === 'phoneVerification') {
        router.replace(`/auth/phone?redirect=${encodeURIComponent(postOnboardingRedirect)}`);
      } else if (next === 'discovery') {
        navigateToStep('ready');
      } else {
        navigateToStep(next);
      }
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'Could not save this step. Your local draft is safe.'
      );
      analytics.funnelStep('onboarding', `v2_${activeStep}_completed`, 'failed', {
        reason: caught instanceof Error ? caught.message : 'unknown_error',
      });
    } finally {
      if (useAuthStore.getState().user?.uid === expectedUid) setSaving(false);
    }
  }, [
    activeStep,
    applyResolution,
    canContinue,
    navigateToStep,
    postOnboardingRedirect,
    refreshProfile,
    router,
    saving,
    snapshot,
  ]);

  const handleSkip = useCallback(async () => {
    const currentUser = useAuthStore.getState().user;
    if (
      !currentUser ||
      saving ||
      !['discoveryPreferences', 'workEducation', 'favourites'].includes(activeStep)
    )
      return;
    const expectedUid = currentUser.uid;
    setSaving(true);
    setError(null);
    try {
      const resolution = await onboardingService.saveStep(
        activeStep,
        {},
        authVerificationFactsFromUser(currentUser),
        true
      );
      if (useAuthStore.getState().user?.uid !== expectedUid) return;
      applyResolution(resolution, snapshot);
      const next = resolution.readiness.firstIncompleteStep;
      navigateToStep(next === 'discovery' ? 'ready' : next);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not skip this optional step.');
    } finally {
      if (useAuthStore.getState().user?.uid === expectedUid) setSaving(false);
    }
  }, [activeStep, applyResolution, navigateToStep, saving, snapshot]);

  const handleBack = useCallback(() => {
    if (currentIndex <= 0) return;
    navigateToStep(visibleSteps[currentIndex - 1].key);
  }, [currentIndex, navigateToStep, visibleSteps]);

  const handleClose = useCallback(() => {
    if (user) saveOnboardingDraft(user.uid, snapshot);
    router.push('/');
  }, [router, snapshot, user]);

  if (!initialized || authLoading || !user || hydrating) {
    return <LoadingScreen label="Loading your saved onboarding progress…" />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="fixed left-0 right-0 top-0 z-50 h-1 bg-gray-200 dark:bg-gray-700">
        <div
          className="h-full bg-gradient-to-r from-primary to-secondary transition-all"
          style={{ width: `${progressPercentage}%` }}
        />
      </div>
      <header className="fixed left-0 right-0 top-1 z-40 border-b border-gray-200/50 bg-white/90 backdrop-blur-lg dark:border-gray-800/50 dark:bg-gray-900/90">
        <div className="mx-auto flex max-w-md items-center justify-between px-4 py-3">
          <button
            type="button"
            onClick={handleBack}
            disabled={currentIndex === 0 || saving}
            aria-label="Previous onboarding step"
            className="p-2 text-gray-600 disabled:opacity-0 dark:text-gray-300"
          >
            <ArrowLeft className="h-6 w-6" />
          </button>
          <div className="min-w-0 text-center">
            <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">
              {visibleSteps[currentIndex]?.title}
            </p>
            <p className="text-xs text-gray-500">
              Step {currentIndex + 1} of {visibleSteps.length}
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={saving}
            aria-label="Save draft and close onboarding"
            className="p-2 text-gray-600 disabled:opacity-50 dark:text-gray-300"
          >
            <X className="h-6 w-6" />
          </button>
        </div>
      </header>

      <main className="px-4 pb-36 pt-20">
        <div className="mx-auto max-w-md">
          {error && (
            <Card className="mt-4 flex items-start gap-3 border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
              <div className="flex-1">
                <p>{error}</p>
                <button
                  type="button"
                  className="mt-2 font-semibold underline"
                  onClick={() => void resolveProgress()}
                >
                  Reload server progress
                </button>
              </div>
            </Card>
          )}
          <OnboardingStepContent
            stepKey={activeStep}
            snapshot={snapshot}
            readiness={readiness}
            termsAccepted={termsAccepted}
            privacyAccepted={privacyAccepted}
            uploadingPhoto={uploadingPhoto}
            maxPhotos={MAX_PROFILE_PHOTOS}
            locating={locating}
            usernameAvailability={usernameAvailability}
            onChange={updateSnapshot}
            onTermsAccepted={setTermsAccepted}
            onPrivacyAccepted={setPrivacyAccepted}
            onPhotoUpload={(file) => void handlePhotoUpload(file)}
            onCaptureLocation={() => void handleCaptureLocation()}
          />
        </div>
      </main>

      <footer className="fixed bottom-0 left-0 right-0 border-t border-gray-200/50 bg-white/90 p-4 backdrop-blur-lg dark:border-gray-800/50 dark:bg-gray-900/90">
        <div
          className={cn(
            'mx-auto grid max-w-md gap-3',
            ['discoveryPreferences', 'workEducation', 'favourites'].includes(activeStep) &&
              'grid-cols-2'
          )}
        >
          {['discoveryPreferences', 'workEducation', 'favourites'].includes(activeStep) && (
            <Button variant="outline" size="lg" onClick={() => void handleSkip()} disabled={saving}>
              Skip for now
            </Button>
          )}
          <Button
            size="lg"
            onClick={() => void handleContinue()}
            disabled={!canContinue || saving || uploadingPhoto || locating}
            className="gap-2"
          >
            {saving ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" /> Saving…
              </>
            ) : activeStep === 'ready' ? (
              <>
                Start Discovery <Heart className="h-5 w-5" />
              </>
            ) : (
              <>
                Continue <ArrowRight className="h-5 w-5" />
              </>
            )}
          </Button>
        </div>
      </footer>
    </div>
  );
}

function LoadingScreen({ label }: { label: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="flex items-center gap-3 text-gray-600 dark:text-gray-300">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span>{label}</span>
      </div>
    </div>
  );
}
