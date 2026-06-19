'use client';

import { PhotoGridReorder } from '@/components/profile/photo-grid-reorder';
import { analytics } from '@/lib/analytics';
import { sanitizeRedirectPath } from '@/shared/lib/auth-redirect';
import {
    Gender,
    LocationDetails,
    locationService,
    MAX_PROFILE_PHOTOS,
    SexualOrientation,
    storageService,
    useAuthStore,
    userService,
} from '@crush/core';
import { Button, Card, cn, Input } from '@crush/ui';
import {
    AlertCircle,
    ArrowLeft,
    ArrowRight,
    Camera,
    Check,
    ExternalLink,
    FileText,
    Heart,
    Loader2,
    MapPin,
    MapPinOff,
    Navigation,
    Shield,
    Sparkles,
    User,
    Users,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

const STEPS = [
  { id: 'welcome', title: 'Welcome', icon: Heart },
  { id: 'terms', title: 'Terms', icon: FileText },
  { id: 'basics', title: 'Basics', icon: User },
  { id: 'preferences', title: 'Preferences', icon: Users },
  { id: 'photos', title: 'Photos', icon: Camera },
  { id: 'interests', title: 'Interests', icon: Sparkles },
  { id: 'location', title: 'Location', icon: MapPin },
  { id: 'complete', title: 'Complete', icon: Check },
];

const AVAILABLE_INTERESTS = [
  'Travel',
  'Music',
  'Movies',
  'Reading',
  'Cooking',
  'Fitness',
  'Gaming',
  'Photography',
  'Art',
  'Dancing',
  'Hiking',
  'Yoga',
  'Coffee',
  'Wine',
  'Food',
  'Fashion',
  'Tech',
  'Sports',
  'Pets',
  'Nature',
  'Beach',
  'Mountains',
  'Meditation',
  'Writing',
];

interface OnboardingData {
  termsAccepted: boolean;
  privacyAccepted: boolean;
  displayName: string;
  birthDate: string;
  gender: 'male' | 'female' | 'other' | '';
  sexualOrientation: SexualOrientation | '';
  interestedIn: Gender[];
  photos: string[];
  interests: string[];
  bio: string;
  location: LocationDetails | null;
  manualLocation: { city: string; country: string };
  useAutoLocation: boolean;
}

/**
 * Turn a photo-upload failure into a clear, actionable message. Firebase Storage
 * surfaces the real cause via `error.code`; the most common production failure is
 * a permission/App Check rejection (storage/unauthorized), which otherwise looks
 * like "nothing happened" to the user.
 */
function describePhotoUploadError(error: unknown): string {
  const code =
    typeof error === 'object' && error !== null && 'code' in error
      ? String((error as { code: unknown }).code)
      : '';

  switch (code) {
    case 'storage/unauthorized':
    case 'storage/unauthenticated':
      return "We couldn't save that photo because the upload was rejected. Please sign out and back in, then try again. If it keeps happening, the app's photo storage permissions need attention.";
    case 'storage/quota-exceeded':
      return 'Photo storage is temporarily full. Please try again later.';
    case 'storage/retry-limit-exceeded':
    case 'storage/canceled':
      return 'The upload timed out. Check your connection and try again.';
    default:
      if (error instanceof Error && error.message) {
        return `Couldn't upload that photo: ${error.message}`;
      }
      return "Couldn't upload that photo. Please try a different image or try again.";
  }
}

export default function OnboardingFlow() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, profile, refreshProfile } = useAuthStore();
  const needsEmailVerification = Boolean(user?.email && !user.emailVerified);
  const redirectAfterAuth = sanitizeRedirectPath(searchParams.get('redirect'));
  const postOnboardingRedirect = redirectAfterAuth.startsWith('/onboarding')
    ? '/discover'
    : redirectAfterAuth;

  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);

  // Location states
  const [detectingLocation, setDetectingLocation] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [locationPermissionDenied, setLocationPermissionDenied] = useState(false);

  const [data, setData] = useState<OnboardingData>({
    termsAccepted: false,
    privacyAccepted: false,
    displayName: profile?.displayName || user?.displayName || '',
    birthDate: '',
    gender: '',
    sexualOrientation: '',
    interestedIn: [],
    photos: [],
    interests: [],
    bio: '',
    location: null,
    manualLocation: { city: '', country: '' },
    useAutoLocation: true,
  });

  const stepId = STEPS[currentStep].id;

  useEffect(() => {
    analytics.funnelStep('onboarding', `${stepId}_view`, 'started');
  }, [stepId]);

  useEffect(() => {
    if (profile?.onboardingComplete && !needsEmailVerification) {
      router.replace(postOnboardingRedirect);
    }
  }, [profile, needsEmailVerification, postOnboardingRedirect, router]);

  useEffect(() => {
    if (needsEmailVerification) {
      router.replace('/auth/verify-email');
    }
  }, [needsEmailVerification, router]);

  // Auto-detect location when reaching location step
  useEffect(() => {
    if (
      stepId === 'location' &&
      !data.location &&
      data.useAutoLocation &&
      !locationPermissionDenied
    ) {
      handleDetectLocation();
    }
  }, [stepId, data.location, data.useAutoLocation, locationPermissionDenied]);

  const handleDetectLocation = async () => {
    setDetectingLocation(true);
    setLocationError(null);

    try {
      const locationDetails = await locationService.getCurrentLocation(true);
      setData((prev) => ({ ...prev, location: locationDetails }));
    } catch (error: unknown) {
      const err = error as { code?: string; message?: string };
      if (err.code === 'PERMISSION_DENIED') {
        setLocationPermissionDenied(true);
        setData((prev) => ({ ...prev, useAutoLocation: false }));
      }
      setLocationError(err.message || 'Failed to detect location');
    } finally {
      setDetectingLocation(false);
    }
  };

  const handlePhotoUpload = async (file?: File) => {
    if (!file || !user) return;

    setUploading(true);
    setPhotoError(null);
    try {
      const photoUrl = await storageService.uploadProfilePhoto(user.uid, file);
      setData((prev) => ({ ...prev, photos: [...prev.photos, photoUrl] }));
    } catch (error) {
      console.error('Failed to upload photo:', error);
      setPhotoError(describePhotoUploadError(error));
    } finally {
      setUploading(false);
    }
  };

  const handleRemovePhoto = (index: number) => {
    setData((prev) => ({
      ...prev,
      photos: prev.photos.filter((_, i) => i !== index),
    }));
  };

  const handlePhotosReorder = (newPhotos: string[]) => {
    setData((prev) => ({ ...prev, photos: newPhotos }));
  };

  const toggleInterest = (interest: string) => {
    setData((prev) => ({
      ...prev,
      interests: prev.interests.includes(interest)
        ? prev.interests.filter((i) => i !== interest)
        : prev.interests.length < 10
          ? [...prev.interests, interest]
          : prev.interests,
    }));
  };

  const getLocationDisplay = useCallback(() => {
    if (data.useAutoLocation && data.location) {
      return locationService.formatLocationForDisplay(data.location);
    }
    if (!data.useAutoLocation && data.manualLocation.city && data.manualLocation.country) {
      return `${data.manualLocation.city}, ${data.manualLocation.country}`;
    }
    return '';
  }, [data.useAutoLocation, data.location, data.manualLocation]);

  const hasValidLocation = useCallback(() => {
    if (data.useAutoLocation) {
      return data.location !== null && (data.location.city || data.location.country);
    }
    return data.manualLocation.city.trim() && data.manualLocation.country.trim();
  }, [data.useAutoLocation, data.location, data.manualLocation]);

  const canProceed = useCallback(() => {
    switch (stepId) {
      case 'welcome':
        return true;
      case 'terms':
        return data.termsAccepted && data.privacyAccepted;
      case 'basics':
        return data.displayName.trim().length >= 2 && data.birthDate && data.gender;
      case 'preferences':
        return data.interestedIn.length > 0;
      case 'photos':
        return data.photos.length >= 1;
      case 'interests':
        return data.interests.length >= 3;
      case 'location':
        return hasValidLocation();
      case 'complete':
        return true;
      default:
        return false;
    }
  }, [stepId, data, hasValidLocation]);

  const handleNext = useCallback(async () => {
    // Save terms acceptance when moving past the terms step
    if (stepId === 'terms' && user) {
      setLoading(true);
      try {
        await userService.acceptTermsAndConditions(user.uid);
        await refreshProfile();
        analytics.funnelStep('onboarding', 'terms_accepted', 'completed');
      } catch (error) {
        console.error('Failed to save terms acceptance:', error);
        analytics.funnelStep('onboarding', 'terms_accepted', 'failed', {
          reason: error instanceof Error ? error.message : 'unknown_error',
        });
      } finally {
        setLoading(false);
      }
    }

    if (currentStep < STEPS.length - 1) {
      analytics.funnelStep('onboarding', `${stepId}_completed`, 'completed');
      setCurrentStep((prev) => prev + 1);
    } else {
      setLoading(true);
      try {
        if (!user) return;

        const birthDate = new Date(data.birthDate);
        const age = Math.floor((Date.now() - birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000));

        // Prepare location data - never expose raw coordinates to user
        const locationData =
          data.useAutoLocation && data.location
            ? {
                latitude: data.location.latitude,
                longitude: data.location.longitude,
                city: data.location.city,
                country: data.location.country,
              }
            : {
                city: data.manualLocation.city.trim(),
                country: data.manualLocation.country.trim(),
              };

        await userService.updateUserProfile(user.uid, {
          displayName: data.displayName.trim(),
          birthDate: data.birthDate,
          age,
          gender: data.gender as 'male' | 'female' | 'other',
          sexualOrientation: data.sexualOrientation || undefined,
          interestedIn: data.interestedIn,
          photos: data.photos,
          profilePhotoUrl: data.photos[0],
          interests: data.interests,
          bio: data.bio.trim(),
          location: locationData,
          onboardingComplete: true,
          profileComplete: true,
        });

        // Save location preference
        localStorage.setItem('crush_location_enabled', data.useAutoLocation ? 'true' : 'false');

        await refreshProfile();
        analytics.track({
          name: 'profile_complete',
          properties: { completeness: 100 },
        });
        analytics.funnelStep('onboarding', 'completed', 'completed', {
          value: STEPS.length,
        });
        router.replace(postOnboardingRedirect);
      } catch (error) {
        console.error('Failed to complete onboarding:', error);
        analytics.funnelStep('onboarding', 'completed', 'failed', {
          reason: error instanceof Error ? error.message : 'unknown_error',
        });
      } finally {
        setLoading(false);
      }
    }
  }, [currentStep, data, user, refreshProfile, postOnboardingRedirect, router, stepId]);

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const progressPercentage = ((currentStep + 1) / STEPS.length) * 100;

  if (needsEmailVerification) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="flex items-center gap-3 text-gray-600 dark:text-gray-300">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Redirecting to email verification...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      {/* Progress bar */}
      <div className="fixed left-0 right-0 top-0 z-50 h-1 bg-gray-200 dark:bg-gray-700">
        <div
          className="h-full bg-gradient-to-r from-primary to-secondary transition-all duration-500"
          style={{ width: `${progressPercentage}%` }}
        />
      </div>

      {/* Header */}
      <div className="fixed left-0 right-0 top-0 z-40 border-b border-gray-200/50 bg-white/80 backdrop-blur-lg dark:border-gray-800/50 dark:bg-gray-900/80">
        <div className="mx-auto flex max-w-md items-center justify-between px-4 py-4">
          {currentStep > 0 ? (
            <button
              onClick={handleBack}
              className="-ml-2 p-2 text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
            >
              <ArrowLeft className="h-6 w-6" />
            </button>
          ) : (
            <div className="w-10" />
          )}

          <div className="flex items-center gap-2">
            {STEPS.map((step, index) => (
              <div
                key={step.id}
                className={cn(
                  'h-2 w-2 rounded-full transition-all duration-300',
                  index === currentStep
                    ? 'w-8 bg-primary'
                    : index < currentStep
                      ? 'bg-primary'
                      : 'bg-gray-300 dark:bg-gray-600'
                )}
              />
            ))}
          </div>

          <div className="w-10" />
        </div>
      </div>

      {/* Content */}
      <div className="px-4 pb-32 pt-20">
        <div className="mx-auto max-w-md">
          {/* Welcome step */}
          {stepId === 'welcome' && (
            <div className="animate-in fade-in slide-in-from-right-4 py-12 text-center duration-500">
              <div className="mx-auto mb-8 flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-primary to-secondary">
                <Heart className="h-12 w-12 text-white" />
              </div>
              <h1 className="mb-4 text-3xl font-bold text-gray-900 dark:text-white">
                Welcome to Crush
              </h1>
              <p className="mb-8 text-lg text-gray-600 dark:text-gray-300">
                Let's set up your profile to help you find meaningful connections.
              </p>
              <div className="space-y-4 rounded-2xl bg-white p-6 text-left shadow-lg dark:bg-gray-800">
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                    <Camera className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      Add your best photos
                    </p>
                    <p className="text-sm text-gray-500">Show your personality</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                    <Sparkles className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      Share your interests
                    </p>
                    <p className="text-sm text-gray-500">Find compatible matches</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                    <MapPin className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">Set your location</p>
                    <p className="text-sm text-gray-500">Meet people nearby</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Terms step */}
          {stepId === 'terms' && (
            <div className="animate-in fade-in slide-in-from-right-4 py-8 duration-500">
              <div className="mb-8 text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                  <FileText className="h-8 w-8 text-primary" />
                </div>
                <h1 className="mb-2 text-2xl font-bold text-gray-900 dark:text-white">
                  Terms & Conditions
                </h1>
                <p className="text-gray-600 dark:text-gray-300">
                  Please review and accept our terms to continue
                </p>
              </div>

              <Card className="space-y-6 p-6">
                {/* Safety Commitment */}
                <div className="rounded-xl bg-primary/5 p-4">
                  <div className="flex items-start gap-3">
                    <Shield className="mt-0.5 h-6 w-6 flex-shrink-0 text-primary" />
                    <div>
                      <h3 className="mb-1 font-semibold text-gray-900 dark:text-white">
                        Our Safety Commitment
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        We're committed to creating a safe and respectful community. We have zero
                        tolerance for harassment, hate speech, or inappropriate behavior.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Inline Terms Summary */}
                <div className="h-48 overflow-y-auto rounded-xl border border-gray-200 bg-gray-50/50 p-4 text-sm text-gray-600 dark:border-gray-800 dark:bg-gray-900/50 dark:text-gray-400">
                  <h4 className="mb-2 font-semibold text-gray-900 dark:text-white">
                    Terms of Service Highlights
                  </h4>
                  <p className="mb-3">
                    By using Crush, you agree to these key rules. Please read the full terms linked
                    below.
                  </p>
                  <ul className="list-outside list-disc space-y-2 pl-4">
                    <li>
                      <strong>Eligibility:</strong> You must be at least 18 years old and legally
                      permitted to use the app.
                    </li>
                    <li>
                      <strong>Community Rules:</strong> Treat others with respect. No harassment,
                      hate speech, or explicit content.
                    </li>
                    <li>
                      <strong>Account Accuracy:</strong> Provide truthful information. No
                      impersonation or fake accounts.
                    </li>
                    <li>
                      <strong>Your Safety:</strong> You are responsible for your interactions.
                      Exercise caution when meeting offline.
                    </li>
                    <li>
                      <strong>Content:</strong> You own what you post but grant us permission to
                      display it. Do not post illegal or infringing material.
                    </li>
                    <li>
                      <strong>Termination:</strong> We reserve the right to ban accounts that
                      violate our community guidelines.
                    </li>
                  </ul>
                  <p className="mt-4 text-xs">Scroll down and check the boxes below to accept.</p>
                </div>

                {/* Terms checkbox */}
                <label className="group flex cursor-pointer items-start gap-3">
                  <div className="relative mt-0.5 flex-shrink-0">
                    <input
                      type="checkbox"
                      checked={data.termsAccepted}
                      onChange={(e) =>
                        setData((prev) => ({ ...prev, termsAccepted: e.target.checked }))
                      }
                      className="sr-only"
                    />
                    <div
                      className={cn(
                        'flex h-6 w-6 items-center justify-center rounded-md border-2 transition-all',
                        data.termsAccepted
                          ? 'border-primary bg-primary'
                          : 'border-gray-300 group-hover:border-primary dark:border-gray-600'
                      )}
                    >
                      {data.termsAccepted && <Check className="h-4 w-4 text-white" />}
                    </div>
                  </div>
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    I agree to the{' '}
                    <Link
                      href="/terms"
                      target="_blank"
                      className="inline-flex items-center gap-1 text-primary hover:underline"
                    >
                      Terms of Service
                      <ExternalLink className="h-3 w-3" />
                    </Link>{' '}
                    and confirm that I am at least 18 years old.
                  </span>
                </label>

                {/* Privacy checkbox */}
                <label className="group flex cursor-pointer items-start gap-3">
                  <div className="relative mt-0.5 flex-shrink-0">
                    <input
                      type="checkbox"
                      checked={data.privacyAccepted}
                      onChange={(e) =>
                        setData((prev) => ({ ...prev, privacyAccepted: e.target.checked }))
                      }
                      className="sr-only"
                    />
                    <div
                      className={cn(
                        'flex h-6 w-6 items-center justify-center rounded-md border-2 transition-all',
                        data.privacyAccepted
                          ? 'border-primary bg-primary'
                          : 'border-gray-300 group-hover:border-primary dark:border-gray-600'
                      )}
                    >
                      {data.privacyAccepted && <Check className="h-4 w-4 text-white" />}
                    </div>
                  </div>
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    I have read and agree to the{' '}
                    <Link
                      href="/privacy"
                      target="_blank"
                      className="inline-flex items-center gap-1 text-primary hover:underline"
                    >
                      Privacy Policy
                      <ExternalLink className="h-3 w-3" />
                    </Link>{' '}
                    and understand how my data will be used.
                  </span>
                </label>

                {/* Community Guidelines */}
                <div className="border-t border-gray-200 pt-4 dark:border-gray-700">
                  <p className="text-center text-xs text-gray-500 dark:text-gray-400">
                    By continuing, you also agree to follow our{' '}
                    <Link
                      href="/terms#community-guidelines"
                      target="_blank"
                      className="text-primary hover:underline"
                    >
                      Community Guidelines
                    </Link>
                    . Violations may result in account suspension.
                  </p>
                </div>
              </Card>
            </div>
          )}

          {/* Basics step */}
          {stepId === 'basics' && (
            <div className="animate-in fade-in slide-in-from-right-4 py-8 duration-500">
              <div className="mb-8 text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                  <User className="h-8 w-8 text-primary" />
                </div>
                <h1 className="mb-2 text-2xl font-bold text-gray-900 dark:text-white">
                  Tell us about yourself
                </h1>
                <p className="text-gray-600 dark:text-gray-300">
                  This helps us personalize your experience
                </p>
              </div>

              <Card className="space-y-6 p-6">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    What's your name?
                  </label>
                  <Input
                    value={data.displayName}
                    onChange={(e) => setData((prev) => ({ ...prev, displayName: e.target.value }))}
                    placeholder="Your first name"
                    maxLength={50}
                    className="text-lg"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    When's your birthday?
                  </label>
                  <Input
                    type="date"
                    value={data.birthDate}
                    onChange={(e) => setData((prev) => ({ ...prev, birthDate: e.target.value }))}
                    max={
                      new Date(Date.now() - 18 * 365.25 * 24 * 60 * 60 * 1000)
                        .toISOString()
                        .split('T')[0]
                    }
                    className="text-lg"
                  />
                  <p className="mt-1 text-xs text-gray-500">You must be 18+ to use Crush</p>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    I am a...
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { value: 'male', label: 'Man' },
                      { value: 'female', label: 'Woman' },
                      { value: 'other', label: 'Other' },
                    ].map((option) => (
                      <button
                        key={option.value}
                        onClick={() =>
                          setData((prev) => ({
                            ...prev,
                            gender: option.value as OnboardingData['gender'],
                          }))
                        }
                        className={cn(
                          'rounded-xl px-4 py-3 text-sm font-medium transition-all',
                          data.gender === option.value
                            ? 'bg-primary text-white shadow-lg shadow-primary/25'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
                        )}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* Preferences step */}
          {stepId === 'preferences' && (
            <div className="animate-in fade-in slide-in-from-right-4 py-8 duration-500">
              <div className="mb-8 text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                  <Users className="h-8 w-8 text-primary" />
                </div>
                <h1 className="mb-2 text-2xl font-bold text-gray-900 dark:text-white">
                  Your dating preferences
                </h1>
                <p className="text-gray-600 dark:text-gray-300">Help us find your perfect match</p>
              </div>

              <Card className="space-y-6 p-6">
                {/* Sexual Orientation */}
                <div>
                  <label className="mb-3 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Sexual orientation <span className="text-gray-500">(optional)</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { value: 'straight', label: 'Straight' },
                      { value: 'gay', label: 'Gay' },
                      { value: 'lesbian', label: 'Lesbian' },
                      { value: 'bisexual', label: 'Bisexual' },
                      { value: 'pansexual', label: 'Pansexual' },
                      { value: 'asexual', label: 'Asexual' },
                      { value: 'other', label: 'Other' },
                      { value: 'prefer_not_to_say', label: 'Prefer not to say' },
                    ].map((option) => (
                      <button
                        key={option.value}
                        onClick={() =>
                          setData((prev) => ({
                            ...prev,
                            sexualOrientation: option.value as SexualOrientation,
                          }))
                        }
                        className={cn(
                          'rounded-xl px-4 py-2.5 text-left text-sm font-medium transition-all',
                          data.sexualOrientation === option.value
                            ? 'bg-primary text-white shadow-lg shadow-primary/25'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
                        )}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Interested In */}
                <div>
                  <label className="mb-3 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    I'm interested in...
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {(['male', 'female', 'everyone'] as const).map((optionValue) => {
                      const label =
                        optionValue === 'male'
                          ? 'Men'
                          : optionValue === 'female'
                            ? 'Women'
                            : 'Everyone';
                      const isSelected =
                        optionValue === 'everyone'
                          ? data.interestedIn.length >= 2
                          : data.interestedIn.includes(optionValue as Gender);
                      return (
                        <button
                          key={optionValue}
                          onClick={() => {
                            if (optionValue === 'everyone') {
                              // "Everyone" selects male and female
                              setData((prev) => ({
                                ...prev,
                                interestedIn: ['male', 'female'] as Gender[],
                              }));
                            } else {
                              const genderValue = optionValue as Gender;
                              setData((prev) => {
                                const hasGender = prev.interestedIn.includes(genderValue);
                                const updated: Gender[] = hasGender
                                  ? prev.interestedIn.filter((g) => g !== genderValue)
                                  : [...prev.interestedIn, genderValue];
                                return { ...prev, interestedIn: updated };
                              });
                            }
                          }}
                          className={cn(
                            'rounded-xl px-4 py-3 text-sm font-medium transition-all',
                            isSelected
                              ? 'bg-primary text-white shadow-lg shadow-primary/25'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
                          )}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                  <p className="mt-2 text-xs text-gray-500">Select one or more</p>
                </div>

                {/* Privacy note */}
                <div className="rounded-xl bg-primary/5 p-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    <span className="font-medium text-primary">Privacy:</span> Your sexual
                    orientation is only shown to other users if you choose to display it in your
                    settings.
                  </p>
                </div>
              </Card>
            </div>
          )}

          {/* Photos step */}
          {stepId === 'photos' && (
            <div className="animate-in fade-in slide-in-from-right-4 py-8 duration-500">
              <div className="mb-8 text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                  <Camera className="h-8 w-8 text-primary" />
                </div>
                <h1 className="mb-2 text-2xl font-bold text-gray-900 dark:text-white">
                  Add your photos
                </h1>
                <p className="text-gray-600 dark:text-gray-300">
                  Add at least 1 photo to continue. More photos = more matches!
                </p>
              </div>

              <Card className="p-6">
                <PhotoGridReorder
                  photos={data.photos}
                  onPhotosChange={handlePhotosReorder}
                  onAddPhoto={handlePhotoUpload}
                  onRemovePhoto={handleRemovePhoto}
                  isUploading={uploading}
                  maxPhotos={MAX_PROFILE_PHOTOS}
                />

                {photoError && (
                  <p
                    role="alert"
                    className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-300"
                  >
                    {photoError}
                  </p>
                )}

                <div className="mt-4 rounded-xl bg-primary/5 p-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    <span className="font-medium text-primary">Tip:</span> Profiles with 3+ photos
                    get 5x more matches. Show your smile, hobbies, and personality!
                  </p>
                </div>
              </Card>
            </div>
          )}

          {/* Interests step */}
          {stepId === 'interests' && (
            <div className="animate-in fade-in slide-in-from-right-4 py-8 duration-500">
              <div className="mb-8 text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                  <Sparkles className="h-8 w-8 text-primary" />
                </div>
                <h1 className="mb-2 text-2xl font-bold text-gray-900 dark:text-white">
                  What are you into?
                </h1>
                <p className="text-gray-600 dark:text-gray-300">
                  Select at least 3 interests ({data.interests.length}/10)
                </p>
              </div>

              <Card className="p-6">
                <div className="flex flex-wrap gap-2">
                  {AVAILABLE_INTERESTS.map((interest) => {
                    const isSelected = data.interests.includes(interest);
                    return (
                      <button
                        key={interest}
                        onClick={() => toggleInterest(interest)}
                        className={cn(
                          'rounded-full px-4 py-2 text-sm font-medium transition-all',
                          isSelected
                            ? 'bg-primary text-white shadow-lg shadow-primary/25'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
                        )}
                      >
                        {interest}
                      </button>
                    );
                  })}
                </div>
              </Card>
            </div>
          )}

          {/* Location step - ENHANCED */}
          {stepId === 'location' && (
            <div className="animate-in fade-in slide-in-from-right-4 py-8 duration-500">
              <div className="mb-8 text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                  <MapPin className="h-8 w-8 text-primary" />
                </div>
                <h1 className="mb-2 text-2xl font-bold text-gray-900 dark:text-white">
                  Where are you located?
                </h1>
                <p className="text-gray-600 dark:text-gray-300">
                  This helps us show you people nearby
                </p>
              </div>

              {/* Auto-detect option */}
              {!locationPermissionDenied && (
                <Card className="mb-4 p-4">
                  <button
                    onClick={() => {
                      setData((prev) => ({ ...prev, useAutoLocation: true }));
                      if (!data.location) {
                        handleDetectLocation();
                      }
                    }}
                    className={cn(
                      'flex w-full items-center gap-4 rounded-xl p-4 transition-all',
                      data.useAutoLocation
                        ? 'border-2 border-primary bg-primary/10'
                        : 'border-2 border-transparent bg-gray-50 hover:border-gray-200 dark:bg-gray-800 dark:hover:border-gray-700'
                    )}
                  >
                    <div
                      className={cn(
                        'flex h-12 w-12 items-center justify-center rounded-full',
                        data.useAutoLocation ? 'bg-primary' : 'bg-gray-200 dark:bg-gray-700'
                      )}
                    >
                      {detectingLocation ? (
                        <Loader2 className="h-6 w-6 animate-spin text-white" />
                      ) : (
                        <Navigation
                          className={cn(
                            'h-6 w-6',
                            data.useAutoLocation ? 'text-white' : 'text-gray-500'
                          )}
                        />
                      )}
                    </div>
                    <div className="flex-1 text-left">
                      <p
                        className={cn(
                          'font-medium',
                          data.useAutoLocation ? 'text-primary' : 'text-gray-900 dark:text-white'
                        )}
                      >
                        Use my current location
                      </p>
                      {data.useAutoLocation && data.location ? (
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {locationService.formatLocationForDisplay(data.location)}
                        </p>
                      ) : detectingLocation ? (
                        <p className="text-sm text-gray-500">Detecting your location...</p>
                      ) : (
                        <p className="text-sm text-gray-500">Automatically detect location</p>
                      )}
                    </div>
                    {data.useAutoLocation && <Check className="h-5 w-5 text-primary" />}
                  </button>

                  {data.useAutoLocation && locationError && (
                    <div className="mt-3 flex items-start gap-2 rounded-lg bg-red-50 p-3 dark:bg-red-900/20">
                      <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-500" />
                      <div>
                        <p className="text-sm text-red-600 dark:text-red-400">{locationError}</p>
                        <button
                          onClick={handleDetectLocation}
                          className="mt-1 text-sm text-primary hover:underline"
                        >
                          Try again
                        </button>
                      </div>
                    </div>
                  )}
                </Card>
              )}

              {/* Permission denied warning */}
              {locationPermissionDenied && (
                <Card className="mb-4 border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-900/20">
                  <div className="flex items-start gap-3">
                    <MapPinOff className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-500" />
                    <div>
                      <p className="font-medium text-amber-700 dark:text-amber-300">
                        Location access denied
                      </p>
                      <p className="mt-1 text-sm text-amber-600 dark:text-amber-400">
                        You've denied location access. You can enter your location manually below,
                        or enable location in your browser settings.
                      </p>
                    </div>
                  </div>
                </Card>
              )}

              {/* Manual entry option */}
              <Card className="p-4">
                <button
                  onClick={() => setData((prev) => ({ ...prev, useAutoLocation: false }))}
                  className={cn(
                    'mb-4 flex w-full items-center gap-4 rounded-xl p-4 transition-all',
                    !data.useAutoLocation
                      ? 'border-2 border-primary bg-primary/10'
                      : 'border-2 border-transparent bg-gray-50 hover:border-gray-200 dark:bg-gray-800 dark:hover:border-gray-700'
                  )}
                >
                  <div
                    className={cn(
                      'flex h-12 w-12 items-center justify-center rounded-full',
                      !data.useAutoLocation ? 'bg-primary' : 'bg-gray-200 dark:bg-gray-700'
                    )}
                  >
                    <MapPin
                      className={cn(
                        'h-6 w-6',
                        !data.useAutoLocation ? 'text-white' : 'text-gray-500'
                      )}
                    />
                  </div>
                  <div className="flex-1 text-left">
                    <p
                      className={cn(
                        'font-medium',
                        !data.useAutoLocation ? 'text-primary' : 'text-gray-900 dark:text-white'
                      )}
                    >
                      Enter location manually
                    </p>
                    <p className="text-sm text-gray-500">Type your city and country</p>
                  </div>
                  {!data.useAutoLocation && <Check className="h-5 w-5 text-primary" />}
                </button>

                {!data.useAutoLocation && (
                  <div className="animate-in fade-in slide-in-from-top-2 space-y-4 duration-300">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                        City
                      </label>
                      <Input
                        value={data.manualLocation.city}
                        onChange={(e) =>
                          setData((prev) => ({
                            ...prev,
                            manualLocation: { ...prev.manualLocation, city: e.target.value },
                          }))
                        }
                        placeholder="e.g., San Francisco"
                        className="text-lg"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Country
                      </label>
                      <Input
                        value={data.manualLocation.country}
                        onChange={(e) =>
                          setData((prev) => ({
                            ...prev,
                            manualLocation: { ...prev.manualLocation, country: e.target.value },
                          }))
                        }
                        placeholder="e.g., United States"
                        className="text-lg"
                      />
                    </div>
                  </div>
                )}
              </Card>

              {/* Privacy note */}
              <p className="mt-4 text-center text-xs text-gray-500">
                Your exact location coordinates are never shown to other users. Only your city name
                will be displayed on your profile.
              </p>
            </div>
          )}

          {/* Complete step */}
          {stepId === 'complete' && (
            <div className="animate-in fade-in slide-in-from-right-4 py-12 text-center duration-500">
              <div className="mx-auto mb-8 flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-green-400 to-green-600">
                <Check className="h-12 w-12 text-white" />
              </div>
              <h1 className="mb-4 text-3xl font-bold text-gray-900 dark:text-white">
                You're all set!
              </h1>
              <p className="mb-8 text-lg text-gray-600 dark:text-gray-300">
                Your profile is ready. Let's find your perfect match!
              </p>

              <Card className="p-6 text-left">
                <div className="mb-4 flex items-center gap-4">
                  {data.photos[0] && (
                    <Image
                      src={data.photos[0]}
                      alt={`${data.displayName || 'Your'} profile photo`}
                      width={64}
                      height={64}
                      className="rounded-full object-cover"
                      sizes="64px"
                    />
                  )}
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      {data.displayName}
                    </h3>
                    <p className="text-sm text-gray-500">{getLocationDisplay()}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {data.interests.slice(0, 5).map((interest) => (
                    <span
                      key={interest}
                      className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary"
                    >
                      {interest}
                    </span>
                  ))}
                  {data.interests.length > 5 && (
                    <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-500 dark:bg-gray-800">
                      +{data.interests.length - 5} more
                    </span>
                  )}
                </div>
              </Card>
            </div>
          )}
        </div>
      </div>

      {/* Bottom action */}
      <div className="fixed bottom-0 left-0 right-0 border-t border-gray-200/50 bg-white/80 p-4 backdrop-blur-lg dark:border-gray-800/50 dark:bg-gray-900/80">
        <div className="mx-auto max-w-md">
          <Button
            onClick={handleNext}
            disabled={!canProceed() || loading || (stepId === 'location' && detectingLocation)}
            className="w-full gap-2"
            size="lg"
          >
            {loading ? (
              'Setting up...'
            ) : stepId === 'complete' ? (
              <>
                Start Swiping
                <Heart className="h-5 w-5" />
              </>
            ) : stepId === 'location' && detectingLocation ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Detecting location...
              </>
            ) : (
              <>
                Continue
                <ArrowRight className="h-5 w-5" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
