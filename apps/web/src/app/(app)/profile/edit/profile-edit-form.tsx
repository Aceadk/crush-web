'use client';

import { PhotoGridReorder } from '@/components/profile/photo-grid-reorder';
import { buildProfileCompletionState } from '@/components/profile/profile-completion';
import {
  describeProfilePhotoUploadError,
  storageService,
  errorText,
  useAuthStore,
  userService,
  MAX_PROFILE_PHOTOS,
  MAX_INTERESTS,
  MAX_PROMPTS,
  authVerificationFactsFromUser,
  calculateCalendarAge,
  latestAllowedAdultBirthDate,
  locationService,
  onboardingService,
  normalizeInterestId,
} from '@crush/core';
import { Button, Card, cn, Input, Textarea } from '@crush/ui';
import {
  AlertCircle,
  ArrowLeft,
  Check,
  Loader2,
  MapPin,
  Plus,
  Shield,
  ShieldCheck,
  Sparkles,
  X,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { AVAILABLE_INTERESTS, PROMPT_QUESTIONS, type FormData } from './profile-edit-constants';

export default function ProfileEditForm() {
  const router = useRouter();
  const { user, profile, refreshProfile } = useAuthStore();

  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState<FormData>({
    displayName: profile?.displayName || '',
    birthDate: profile?.birthDate?.slice(0, 10) || '',
    gender: profile?.gender || '',
    sexualOrientation: profile?.sexualOrientation || '',
    bio: profile?.bio || '',
    // Legacy profiles can hold more than MAX_INTERESTS (or duplicates after
    // normalization); the server and rules cap at 5, so trim on load or the
    // save is rejected wholesale.
    interests: Array.from(
      new Set(profile?.interests?.map(normalizeInterestId) || [])
    ).slice(0, MAX_INTERESTS),
    prompts: profile?.prompts || [],
    location: {
      latitude: profile?.location?.latitude,
      longitude: profile?.location?.longitude,
      accuracyMeters: profile?.location?.accuracyMeters,
      city: profile?.location?.city || '',
      region: profile?.location?.region,
      country: profile?.location?.country || '',
      capturedAt: profile?.location?.capturedAt,
      confirmedAt: profile?.location?.confirmedAt,
    },
    lifestyle: {
      height: profile?.lifestyle?.height || '',
      education: profile?.school || profile?.lifestyle?.education || '',
      drinking: profile?.lifestyle?.drinking || '',
      smoking: profile?.lifestyle?.smoking || '',
      workout: profile?.lifestyle?.workout || '',
    },
  });

  const [photos, setPhotos] = useState<string[]>(profile?.photos || []);
  const [photoRecords, setPhotoRecords] = useState(profile?.photoRecords || []);

  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    if (!user) return;
    const expectedUid = user.uid;
    let cancelled = false;
    void onboardingService
      .resolve(authVerificationFactsFromUser(user))
      .then((resolution) => {
        if (cancelled || useAuthStore.getState().user?.uid !== expectedUid) return;
        const trustedPhotos = resolution.snapshot.photos;
        setPhotoRecords(trustedPhotos);
        setPhotos(
          trustedPhotos.flatMap((photo) =>
            photo.status === 'approved' && photo.downloadUrl ? [photo.downloadUrl] : []
          )
        );
        const confirmedLocation = resolution.snapshot.location;
        if (confirmedLocation?.confirmedAt) {
          setFormData((current) => ({
            ...current,
            location: {
              ...current.location,
              accuracyMeters: confirmedLocation.accuracyMeters,
              city: confirmedLocation.city ?? current.location.city,
              region: confirmedLocation.region ?? current.location.region,
              country: confirmedLocation.country ?? current.location.country,
              capturedAt: confirmedLocation.capturedAt,
              confirmedAt: confirmedLocation.confirmedAt,
            },
          }));
        }
      })
      .catch((caught) => {
        if (!cancelled) console.warn('Could not hydrate trusted profile state:', caught);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  const completionState = useMemo(
    () =>
      buildProfileCompletionState({
        accountVerified: Boolean(user && (!user.email || user.emailVerified)),
        username: profile?.username,
        displayName: formData.displayName,
        birthDate: formData.birthDate,
        gender: formData.gender || undefined,
        interestedIn: profile?.interestedIn,
        bio: formData.bio,
        interests: formData.interests,
        prompts: formData.prompts,
        location:
          formData.location.city || formData.location.country ? formData.location : undefined,
        photos,
        photoRecords,
      }),
    [
      formData.bio,
      formData.birthDate,
      formData.displayName,
      formData.gender,
      formData.interests,
      formData.location,
      formData.prompts,
      photos,
      photoRecords,
      profile?.interestedIn,
      profile?.username,
      user,
    ]
  );
  const completeness = completionState.percent;

  useEffect(() => {
    if (!profile) return;

    // Helper to check arrays
    const arraysEqual = (a: string[], b: string[]) =>
      a.length === b.length && a.every((val, index) => val === b[index]);

    // Check prompts deep equality
    const promptsEqual = (
      a: { question: string; answer: string }[],
      b: { question: string; answer: string }[]
    ) =>
      a.length === b.length &&
      a.every((val, i) => val.question === b[i].question && val.answer === b[i].answer);

    const checkDirty = () => {
      if (formData.displayName !== (profile.displayName || '')) return true;
      if (formData.birthDate !== (profile.birthDate?.slice(0, 10) || '')) return true;
      if (formData.gender !== (profile.gender || '')) return true;
      if (formData.sexualOrientation !== (profile.sexualOrientation || '')) return true;
      if (formData.bio !== (profile.bio || '')) return true;
      if (formData.location.city !== (profile.location?.city || '')) return true;
      if (formData.location.country !== (profile.location?.country || '')) return true;
      if (formData.lifestyle.height !== (profile.lifestyle?.height || '')) return true;
      if (formData.lifestyle.education !== (profile.school || profile.lifestyle?.education || ''))
        return true;
      if (formData.lifestyle.drinking !== (profile.lifestyle?.drinking || '')) return true;
      if (formData.lifestyle.smoking !== (profile.lifestyle?.smoking || '')) return true;
      if (formData.lifestyle.workout !== (profile.lifestyle?.workout || '')) return true;

      if (!arraysEqual(photos, profile.photos || [])) return true;
      if (!arraysEqual(formData.interests, (profile.interests || []).map(normalizeInterestId)))
        return true;
      if (!promptsEqual(formData.prompts, profile.prompts || [])) return true;

      return false;
    };

    setIsDirty(checkDirty());
  }, [formData, photos, profile]);

  // Handle browser tab close warning
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        const message = 'You have unsaved changes. Are you sure you want to leave?';
        e.returnValue = message;
        return message;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  const handleBackNavigation = () => {
    if (isDirty) {
      if (window.confirm('You have unsaved changes. Are you sure you want to discard them?')) {
        router.back();
      }
    } else {
      router.back();
    }
  };

  const handlePhotoUpload = async (file?: File) => {
    if (!file || !user) return;

    setUploading(true);
    setError(null);

    try {
      const upload = await storageService.uploadProfilePhotoForValidation(user.uid, file);
      const validated = await onboardingService.validateProfilePhoto({
        storagePath: upload.storagePath,
        isPrimary: photos.length === 0,
      });
      if (validated.snapshot) {
        setPhotoRecords(validated.snapshot.photos);
        setPhotos(
          validated.snapshot.photos.flatMap((photo) =>
            photo.status === 'approved' && photo.downloadUrl ? [photo.downloadUrl] : []
          )
        );
        URL.revokeObjectURL(upload.downloadUrl);
      } else {
        setPhotoRecords((prev) => [
          ...prev,
          {
            mediaId: validated.mediaId,
            storagePath: upload.storagePath,
            downloadUrl: validated.downloadUrl ?? upload.downloadUrl,
            status: validated.status,
            reason: validated.reason,
            isPrimary: photos.length === 0,
          },
        ]);
        if (validated.status === 'approved' && validated.downloadUrl) {
          setPhotos((prev) => [...prev, validated.downloadUrl!]);
          URL.revokeObjectURL(upload.downloadUrl);
        }
      }
      if (validated.status === 'rejected') {
        setError(validated.reason || 'That photo did not pass the profile-photo checks.');
      } else if (validated.status === 'failed') {
        setError('The photo check failed. Please retry with another image.');
      } else if (validated.status !== 'approved') {
        setError('Your photo is still processing. It will be available after server approval.');
      }
      setIsDirty(true);
    } catch (err) {
      setError(describeProfilePhotoUploadError(err));
      console.error('Failed to upload photo:', err);
    } finally {
      setUploading(false);
    }
  };

  const handleRemovePhoto = (index: number) => {
    const removedUrl = photos[index];
    setPhotos((prev) => prev.filter((_, i) => i !== index));
    setPhotoRecords((prev) => prev.filter((photo) => photo.downloadUrl !== removedUrl));
    setIsDirty(true);
  };

  const handlePhotosReorder = (newPhotos: string[]) => {
    setPhotos(newPhotos);
    setPhotoRecords((records) =>
      newPhotos.flatMap((url) => {
        const record = records.find((entry) => entry.downloadUrl === url);
        return record ? [record] : [];
      })
    );
    setIsDirty(true);
  };

  const handleCaptureLocation = useCallback(async () => {
    if (!user || locating) return;
    const expectedUid = user.uid;
    setLocating(true);
    setError(null);
    try {
      const coordinates = await locationService.requestLocation({
        enableHighAccuracy: true,
        timeout: 30000,
        maximumAge: 0,
      });
      const details = await locationService.reverseGeocode(coordinates);
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
      if (useAuthStore.getState().user?.uid !== expectedUid) return;
      const confirmed = resolution.snapshot.location;
      if (confirmed) {
        setFormData((current) => ({
          ...current,
          location: {
            latitude: coordinates.latitude,
            longitude: coordinates.longitude,
            accuracyMeters: confirmed.accuracyMeters,
            city: confirmed.city || '',
            region: confirmed.region,
            country: confirmed.country || '',
            capturedAt: confirmed.capturedAt,
            confirmedAt: confirmed.confirmedAt,
          },
        }));
      }
      setIsDirty(true);
    } catch (err) {
      setError(errorText(err, 'Could not confirm current location.'));
    } finally {
      if (useAuthStore.getState().user?.uid === expectedUid) setLocating(false);
    }
  }, [locating, user]);

  const toggleInterest = (interest: string) => {
    setFormData((prev) => ({
      ...prev,
      interests: prev.interests.includes(interest)
        ? prev.interests.filter((i) => i !== interest)
        : prev.interests.length < MAX_INTERESTS
          ? [...prev.interests, interest]
          : prev.interests,
    }));
    setIsDirty(true);
  };

  const addPrompt = (question: string) => {
    if (formData.prompts.length >= MAX_PROMPTS) return;
    if (formData.prompts.some((p) => p.question === question)) return;

    setFormData((prev) => ({
      ...prev,
      prompts: [...prev.prompts, { question, answer: '' }],
    }));
    setIsDirty(true);
  };

  const updatePromptAnswer = (index: number, answer: string) => {
    setFormData((prev) => ({
      ...prev,
      prompts: prev.prompts.map((p, i) => (i === index ? { ...p, answer } : p)),
    }));
    setIsDirty(true);
  };

  const removePrompt = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      prompts: prev.prompts.filter((_, i) => i !== index),
    }));
    setIsDirty(true);
  };

  // NOTE: real verification is the mobile app's ID/selfie verification flow
  // (backed by moderation). The previous handler here SELF-WROTE
  // profile.isVerified=true after a fake 1.5s delay — granting the verified
  // badge (and its advanced-discovery ranking boost) with no verification at
  // all, visible across web AND mobile. Web intentionally has no self-serve
  // path until a backend-verified flow exists.

  const handleSave = useCallback(async () => {
    if (!user) return;

    if (!completionState.canSaveVisibleProfile) {
      const firstMissing = completionState.missingRequired[0];
      setError(
        firstMissing
          ? `${firstMissing.label}. ${firstMissing.description}`
          : 'Complete the required profile fields before saving.'
      );
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const basicInfoChanged =
        formData.displayName.trim() !== (profile?.displayName || '') ||
        formData.birthDate !== (profile?.birthDate?.slice(0, 10) || '') ||
        formData.gender !== (profile?.gender || '') ||
        formData.sexualOrientation !== (profile?.sexualOrientation || '');
      const authFacts = authVerificationFactsFromUser(useAuthStore.getState().user);
      if (basicInfoChanged) {
        await onboardingService.saveStep(
          'basicInfo',
          {
            firstName: formData.displayName.trim(),
            birthDate: formData.birthDate,
            gender: formData.gender,
            sexualOrientation:
              formData.gender === 'non_binary' ? formData.sexualOrientation || null : null,
          },
          authFacts
        );
      }
      await onboardingService.saveStep('aboutMe', { bio: formData.bio.trim() }, authFacts);
      await onboardingService.saveStep('interests', { interestIds: formData.interests }, authFacts);
      const approvedMediaIds = photoRecords
        .filter((photo) => photo.status === 'approved')
        .map((photo) => photo.mediaId)
        .filter(Boolean);
      // The photos step requires 1–9 media IDs. Accounts whose photos predate
      // the trusted-media pipeline have none; skipping keeps their existing
      // photos instead of failing the entire save.
      if (approvedMediaIds.length > 0) {
        await onboardingService.saveStep('photos', { mediaIds: approvedMediaIds }, authFacts);
      }
      await onboardingService.saveStep(
        'workEducation',
        {
          school: formData.lifestyle.education.trim(),
        },
        authFacts,
        !formData.lifestyle.education.trim()
      );
      await userService.updateUserProfile(user.uid, {
        prompts: formData.prompts.filter((p) => p.answer.trim()),
        lifestyle: {
          height: formData.lifestyle.height,
          // Canonical school is persisted through saveOnboardingStep above;
          // do not recreate the legacy profile.educationLevel alias.
          education: undefined,
          drinking: formData.lifestyle.drinking || undefined,
          smoking: formData.lifestyle.smoking || undefined,
          workout: formData.lifestyle.workout || undefined,
        },
        profileComplete: completionState.canSaveVisibleProfile,
      });

      setIsDirty(false); // Reset dirty state on successful save
      setSuccess(true);
      // Don't hold the user on this screen: refresh the store in the
      // background and navigate right away (a 1s dwell + awaited refetch
      // used to make every save feel slow). The profile page reads the
      // store, which this refresh updates.
      void refreshProfile();
      router.push('/profile');
    } catch (err) {
      setError('Failed to save profile. Please try again.');
      console.error('Failed to save profile:', err);
    } finally {
      setSaving(false);
    }
  }, [user, profile, completionState, formData, photoRecords, refreshProfile, router]);

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
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="sticky top-0 z-20 border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <button
            onClick={handleBackNavigation}
            className="-ml-2 p-2 text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
            aria-label="Back"
            type="button"
          >
            <ArrowLeft className="h-6 w-6" />
          </button>
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Edit Profile</h1>
          <Button onClick={handleSave} disabled={saving} size="sm">
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-6">
        {/* Status messages */}
        {error && (
          <div className="mb-6 flex items-center gap-2 rounded-xl bg-red-50 p-4 text-red-600 dark:bg-red-900/20 dark:text-red-400">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <p className="text-sm">{error}</p>
          </div>
        )}

        {success && (
          <div className="mb-6 flex items-center gap-2 rounded-xl bg-green-50 p-4 text-green-600 dark:bg-green-900/20 dark:text-green-400">
            <Check className="h-5 w-5 flex-shrink-0" />
            <p className="text-sm">Profile saved successfully!</p>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)] lg:items-start">
          <aside className="space-y-6 lg:sticky lg:top-24">
            {/* Completeness indicator */}
            <Card className="p-4">
              <div className="flex items-center gap-4">
                <div className="flex-shrink-0">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                    <Sparkles className="h-6 w-6 text-primary" />
                  </div>
                </div>
                <div className="flex-1">
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      Profile completeness
                    </span>
                    <span className="text-sm font-semibold text-primary">{completeness}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                    <div
                      className="h-full bg-gradient-to-r from-primary to-secondary transition-all duration-500"
                      style={{ width: `${completeness}%` }}
                    />
                  </div>
                  <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                    {completionState.primaryMessage}
                  </p>
                </div>
              </div>
              {(completionState.missingRequired.length > 0 ||
                completionState.missingRecommended.length > 0) && (
                <div className="mt-4 space-y-3 border-t border-gray-100 pt-4 dark:border-gray-800">
                  {completionState.missingRequired.length > 0 && (
                    <div>
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-red-600 dark:text-red-300">
                        Required
                      </p>
                      <div className="space-y-2">
                        {completionState.missingRequired.map((item) => (
                          <div
                            key={item.id}
                            className="rounded-lg bg-red-50 p-3 dark:bg-red-900/20"
                          >
                            <p className="text-sm font-medium text-red-700 dark:text-red-200">
                              {item.label}
                            </p>
                            <p className="mt-1 text-xs text-red-600 dark:text-red-300">
                              {item.description}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {completionState.missingRecommended.length > 0 && (
                    <div>
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-primary">
                        Recommended
                      </p>
                      <div className="space-y-2">
                        {completionState.missingRecommended.map((item) => (
                          <div key={item.id} className="rounded-lg bg-primary/5 p-3">
                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                              {item.label}
                            </p>
                            <p className="mt-1 text-xs text-gray-600 dark:text-gray-300">
                              {item.description}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </Card>

            {/* Verification section */}
            <Card
              className={cn(
                'border-2 p-6 transition-all',
                profile.isVerified
                  ? 'border-green-500/20 bg-green-50/50 dark:bg-green-900/10'
                  : 'border-primary/20 bg-gradient-to-br from-primary/5 to-secondary/5'
              )}
            >
              <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
                <div
                  className={cn(
                    'flex-shrink-0 rounded-full p-3',
                    profile.isVerified
                      ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'
                      : 'bg-primary/10 text-primary'
                  )}
                >
                  {profile.isVerified ? (
                    <ShieldCheck className="h-8 w-8" />
                  ) : (
                    <Shield className="h-8 w-8" />
                  )}
                </div>
                <div className="flex-1 text-center sm:text-left">
                  <h3 className="mb-1 text-lg font-semibold text-gray-900 dark:text-white">
                    {profile.isVerified ? 'Profile Verified!' : 'Verify your profile'}
                  </h3>
                  <p className="mb-4 text-sm text-gray-600 dark:text-gray-300">
                    {profile.isVerified
                      ? 'Your profile has the blue checkmark. You stand out from the crowd!'
                      : 'Verified profiles get more matches and build trust. Verify with a quick selfie in the Crush mobile app — web verification is coming soon.'}
                  </p>
                </div>
              </div>
            </Card>

            {/* Photos section */}
            <Card className="p-4">
              <h2 className="mb-4 font-semibold text-gray-900 dark:text-white">Photos</h2>

              <PhotoGridReorder
                photos={photos}
                onPhotosChange={handlePhotosReorder}
                onAddPhoto={handlePhotoUpload}
                onRemovePhoto={handleRemovePhoto}
                isUploading={uploading}
                maxPhotos={MAX_PROFILE_PHOTOS}
                onError={setError}
              />
            </Card>
          </aside>

          <section className="space-y-6">
            {/* Basic info section */}
            <Card className="space-y-4 p-4">
              <h2 className="font-semibold text-gray-900 dark:text-white">Basic Info</h2>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Display Name
                </label>
                <Input
                  value={formData.displayName}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, displayName: e.target.value }))
                  }
                  placeholder="Your name"
                  maxLength={50}
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Date of birth
                  </label>
                  <Input
                    type="date"
                    value={formData.birthDate}
                    max={latestAllowedAdultBirthDate()}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, birthDate: e.target.value }))
                    }
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    {calculateCalendarAge(formData.birthDate) !== undefined
                      ? `Age ${calculateCalendarAge(formData.birthDate)}. `
                      : ''}
                    DOB changes are protected by the 30-day server cooldown.
                  </p>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Gender
                  </label>
                  <select
                    value={formData.gender}
                    onChange={(e) => {
                      const gender = e.target.value as FormData['gender'];
                      setFormData((prev) => ({
                        ...prev,
                        gender,
                        sexualOrientation: gender === 'non_binary' ? prev.sexualOrientation : '',
                      }));
                    }}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="">Select</option>
                    <option value="male">Man</option>
                    <option value="female">Woman</option>
                    <option value="non_binary">Non-binary</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              {formData.gender === 'non_binary' && (
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Sexual orientation <span className="font-normal text-gray-500">(optional)</span>
                  </label>
                  <select
                    value={formData.sexualOrientation}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        sexualOrientation: e.target.value as FormData['sexualOrientation'],
                      }))
                    }
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="">Prefer not to say</option>
                    <option value="straight">Straight</option>
                    <option value="gay">Gay</option>
                    <option value="lesbian">Lesbian</option>
                    <option value="bisexual">Bisexual</option>
                    <option value="pansexual">Pansexual</option>
                    <option value="asexual">Asexual</option>
                    <option value="other">Other</option>
                    <option value="prefer_not_to_say">Prefer not to say</option>
                  </select>
                </div>
              )}

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Bio
                </label>
                <Textarea
                  value={formData.bio}
                  onChange={(e) => setFormData((prev) => ({ ...prev, bio: e.target.value }))}
                  placeholder="Tell others about yourself..."
                  rows={4}
                  maxLength={500}
                />
                <div className="mt-1 flex items-center justify-between gap-3 text-xs">
                  <p
                    className={cn(
                      formData.bio.trim().length >= 7 ? 'text-gray-500' : 'text-red-500'
                    )}
                  >
                    Minimum 7 characters required for matching.
                  </p>
                  <p className="text-gray-500">{formData.bio.length}/500</p>
                </div>
              </div>

              <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-700">
                <div className="mb-3 flex items-start gap-3">
                  <MapPin className="mt-0.5 h-5 w-5 text-primary" />
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 dark:text-white">
                      {formData.location.confirmedAt
                        ? 'Current location confirmed'
                        : 'Current location required'}
                    </p>
                    <p className="text-sm text-gray-500">
                      {formData.location.confirmedAt
                        ? [
                            formData.location.city,
                            formData.location.region,
                            formData.location.country,
                          ]
                            .filter(Boolean)
                            .join(', ') || 'Secure coordinates captured'
                        : 'Typed city/country values do not satisfy discovery readiness.'}
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => void handleCaptureLocation()}
                  disabled={locating}
                >
                  {locating ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <MapPin className="mr-2 h-4 w-4" />
                  )}
                  {locating ? 'Capturing…' : 'Capture and confirm current location'}
                </Button>
              </div>
            </Card>

            {/* Lifestyle section */}
            <Card className="space-y-4 p-4">
              <h2 className="font-semibold text-gray-900 dark:text-white">Lifestyle</h2>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Height
                  </label>
                  <Input
                    value={formData.lifestyle.height}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        lifestyle: { ...prev.lifestyle, height: e.target.value },
                      }))
                    }
                    placeholder="e.g. 5'10&quot;"
                    maxLength={20}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Education
                  </label>
                  <Input
                    value={formData.lifestyle.education}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        lifestyle: { ...prev.lifestyle, education: e.target.value },
                      }))
                    }
                    placeholder="e.g. Bachelors"
                    maxLength={50}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Drinking
                  </label>
                  <select
                    value={formData.lifestyle.drinking}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        lifestyle: {
                          ...prev.lifestyle,
                          drinking: e.target.value as FormData['lifestyle']['drinking'],
                        },
                      }))
                    }
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="">Prefer not to say</option>
                    <option value="yes">Yes</option>
                    <option value="sometimes">Sometimes</option>
                    <option value="no">No</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Smoking
                  </label>
                  <select
                    value={formData.lifestyle.smoking}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        lifestyle: {
                          ...prev.lifestyle,
                          smoking: e.target.value as FormData['lifestyle']['smoking'],
                        },
                      }))
                    }
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="">Prefer not to say</option>
                    <option value="yes">Yes</option>
                    <option value="sometimes">Sometimes</option>
                    <option value="no">No</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Workout
                  </label>
                  <select
                    value={formData.lifestyle.workout}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        lifestyle: {
                          ...prev.lifestyle,
                          workout: e.target.value as FormData['lifestyle']['workout'],
                        },
                      }))
                    }
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="">Prefer not to say</option>
                    <option value="active">Active</option>
                    <option value="sometimes">Sometimes</option>
                    <option value="never">Never</option>
                  </select>
                </div>
              </div>
            </Card>

            {/* Interests section */}
            <Card className="p-4">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-semibold text-gray-900 dark:text-white">Interests</h2>
                <span
                  className={cn(
                    'text-sm',
                    formData.interests.length >= 3 ? 'text-gray-500' : 'font-medium text-red-500'
                  )}
                >
                  {formData.interests.length}/{MAX_INTERESTS} selected
                </span>
              </div>
              <p className="mb-4 text-sm text-gray-500">
                Select at least 3 and up to {MAX_INTERESTS} interests to help find better matches.
              </p>

              <div className="flex flex-wrap gap-2">
                {AVAILABLE_INTERESTS.map(([interestId, interestLabel]) => {
                  const isSelected = formData.interests.includes(interestId);
                  return (
                    <button
                      key={interestId}
                      onClick={() => toggleInterest(interestId)}
                      className={cn(
                        'rounded-full px-3 py-1.5 text-sm font-medium transition-all',
                        isSelected
                          ? 'bg-primary text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
                      )}
                    >
                      {interestLabel}
                    </button>
                  );
                })}
              </div>
            </Card>

            {/* Prompts section */}
            <Card className="p-4">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-semibold text-gray-900 dark:text-white">Prompts</h2>
                <span className="text-sm text-gray-500">{formData.prompts.length}/3 prompts</span>
              </div>
              <p className="mb-4 text-sm text-gray-500">
                Answer prompts to show your personality and spark conversations.
              </p>

              {/* Existing prompts */}
              <div className="mb-4 space-y-4">
                {formData.prompts.map((prompt, index) => (
                  <div key={index} className="rounded-xl bg-gray-50 p-4 dark:bg-gray-800">
                    <div className="mb-2 flex items-start justify-between">
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                        {prompt.question}
                      </p>
                      <button
                        onClick={() => removePrompt(index)}
                        className="p-1 text-gray-500 transition-colors hover:text-red-500"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    <Textarea
                      value={prompt.answer}
                      onChange={(e) => updatePromptAnswer(index, e.target.value)}
                      placeholder="Write your answer..."
                      rows={2}
                      maxLength={200}
                      className="bg-white dark:bg-gray-900"
                    />
                    <p className="mt-1 text-right text-xs text-gray-500">
                      {prompt.answer.length}/200
                    </p>
                  </div>
                ))}
              </div>

              {/* Add prompt */}
              {formData.prompts.length < 3 && (
                <div>
                  <p className="mb-2 text-sm text-gray-600 dark:text-gray-400">Choose a prompt:</p>
                  <div className="flex flex-wrap gap-2">
                    {PROMPT_QUESTIONS.filter((q) => !formData.prompts.some((p) => p.question === q))
                      .slice(0, 5)
                      .map((question) => (
                        <button
                          key={question}
                          onClick={() => addPrompt(question)}
                          className="flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1.5 text-sm text-gray-700 transition-colors hover:bg-primary/10 hover:text-primary dark:bg-gray-800 dark:text-gray-300"
                        >
                          <Plus className="h-3 w-3" />
                          {question}
                        </button>
                      ))}
                  </div>
                </div>
              )}
            </Card>

            {/* Save button (bottom) */}
            <Button onClick={handleSave} disabled={saving} className="w-full" size="lg">
              {saving ? 'Saving...' : 'Save Profile'}
            </Button>
          </section>
        </div>
      </div>
    </div>
  );
}
