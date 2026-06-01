'use client';

import { PhotoGridReorder } from '@/components/profile/photo-grid-reorder';
import { buildProfileCompletionState } from '@/components/profile/profile-completion';
import { storageService, useAuthStore, userService } from '@crush/core';
import { Button, Card, cn, Input, Textarea } from '@crush/ui';
import {
  AlertCircle,
  ArrowLeft,
  Check,
  Plus,
  Shield,
  ShieldCheck,
  Sparkles,
  X,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';

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

const PROMPT_QUESTIONS = [
  "I'm looking for...",
  'My ideal first date would be...',
  'Two truths and a lie...',
  'The way to my heart is...',
  'I geek out on...',
  'My most controversial opinion is...',
  'A life goal of mine is...',
  "I'm known for...",
  'My simple pleasures are...',
  "I won't shut up about...",
];

interface FormData {
  displayName: string;
  bio: string;
  interests: string[];
  prompts: { question: string; answer: string }[];
  location: { city: string; country: string };
  lifestyle: {
    height: string;
    education: string;
    drinking: 'yes' | 'no' | 'sometimes' | '';
    smoking: 'yes' | 'no' | 'sometimes' | '';
    workout: 'active' | 'sometimes' | 'never' | '';
  };
}

export default function ProfileEditForm() {
  const router = useRouter();
  const { user, profile, refreshProfile } = useAuthStore();

  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState<FormData>({
    displayName: profile?.displayName || '',
    bio: profile?.bio || '',
    interests: profile?.interests || [],
    prompts: profile?.prompts || [],
    location: { city: profile?.location?.city || '', country: profile?.location?.country || '' },
    lifestyle: {
      height: profile?.lifestyle?.height || '',
      education: profile?.lifestyle?.education || '',
      drinking: profile?.lifestyle?.drinking || '',
      smoking: profile?.lifestyle?.smoking || '',
      workout: profile?.lifestyle?.workout || '',
    },
  });

  const [photos, setPhotos] = useState<string[]>(profile?.photos || []);

  const [isDirty, setIsDirty] = useState(false);

  const completionState = useMemo(
    () =>
      buildProfileCompletionState({
        displayName: formData.displayName,
        bio: formData.bio,
        interests: formData.interests,
        prompts: formData.prompts,
        location:
          formData.location.city || formData.location.country ? formData.location : undefined,
        photos,
      }),
    [
      formData.bio,
      formData.displayName,
      formData.interests,
      formData.location,
      formData.prompts,
      photos,
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
      if (formData.bio !== (profile.bio || '')) return true;
      if (formData.location.city !== (profile.location?.city || '')) return true;
      if (formData.location.country !== (profile.location?.country || '')) return true;
      if (formData.lifestyle.height !== (profile.lifestyle?.height || '')) return true;
      if (formData.lifestyle.education !== (profile.lifestyle?.education || '')) return true;
      if (formData.lifestyle.drinking !== (profile.lifestyle?.drinking || '')) return true;
      if (formData.lifestyle.smoking !== (profile.lifestyle?.smoking || '')) return true;
      if (formData.lifestyle.workout !== (profile.lifestyle?.workout || '')) return true;

      if (!arraysEqual(photos, profile.photos || [])) return true;
      if (!arraysEqual(formData.interests, profile.interests || [])) return true;
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
      const photoUrl = await storageService.uploadProfilePhoto(user.uid, file);
      setPhotos((prev) => [...prev, photoUrl]);
    } catch (err) {
      setError('Failed to upload photo. Please try again.');
      console.error('Failed to upload photo:', err);
    } finally {
      setUploading(false);
    }
  };

  const handleRemovePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
    setIsDirty(true);
  };

  const handlePhotosReorder = (newPhotos: string[]) => {
    setPhotos(newPhotos);
    setIsDirty(true);
  };

  const toggleInterest = (interest: string) => {
    setFormData((prev) => ({
      ...prev,
      interests: prev.interests.includes(interest)
        ? prev.interests.filter((i) => i !== interest)
        : prev.interests.length < 10
          ? [...prev.interests, interest]
          : prev.interests,
    }));
    setIsDirty(true);
  };

  const addPrompt = (question: string) => {
    if (formData.prompts.length >= 3) return;
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

  const handleVerifyProfile = async () => {
    if (!user) return;

    setVerifying(true);
    setError(null);

    try {
      // Simulate verification process
      await new Promise((resolve) => setTimeout(resolve, 1500));

      await userService.updateUserProfile(user.uid, {
        isVerified: true,
      });

      await refreshProfile();

      // Briefly show success before reloading or just refreshing State
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError('Verification failed. Please try again.');
      console.error(err);
    } finally {
      setVerifying(false);
    }
  };

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
      await userService.updateUserProfile(user.uid, {
        displayName: formData.displayName.trim(),
        bio: formData.bio.trim(),
        interests: formData.interests,
        prompts: formData.prompts.filter((p) => p.answer.trim()),
        photos,
        profilePhotoUrl: photos[0] || undefined,
        location: formData.location.city ? formData.location : undefined,
        lifestyle: {
          height: formData.lifestyle.height,
          education: formData.lifestyle.education,
          drinking: formData.lifestyle.drinking || undefined,
          smoking: formData.lifestyle.smoking || undefined,
          workout: formData.lifestyle.workout || undefined,
        },
        profileComplete: completionState.canSaveVisibleProfile,
      });

      setIsDirty(false); // Reset dirty state on successful save
      await refreshProfile();
      setSuccess(true);

      setTimeout(() => {
        router.push('/profile');
      }, 1000);
    } catch (err) {
      setError('Failed to save profile. Please try again.');
      console.error('Failed to save profile:', err);
    } finally {
      setSaving(false);
    }
  }, [user, completionState, formData, photos, refreshProfile, router]);

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
                      : 'Verified profiles get more matches and build trust. Take a quick selfie to get your blue checkmark.'}
                  </p>
                  {!profile.isVerified && (
                    <Button
                      onClick={handleVerifyProfile}
                      disabled={verifying}
                      className="w-full sm:w-auto"
                    >
                      {verifying ? 'Verifying...' : 'Get Verified Now'}
                    </Button>
                  )}
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
                maxPhotos={6}
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
                      formData.bio.trim().length >= 20 ? 'text-gray-500' : 'text-red-500'
                    )}
                  >
                    Minimum 20 characters required for matching.
                  </p>
                  <p className="text-gray-500">{formData.bio.length}/500</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    City
                  </label>
                  <Input
                    value={formData.location?.city || ''}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        location: { city: e.target.value, country: prev.location?.country || '' },
                      }))
                    }
                    placeholder="Your city"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Country
                  </label>
                  <Input
                    value={formData.location?.country || ''}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        location: { city: prev.location?.city || '', country: e.target.value },
                      }))
                    }
                    placeholder="Your country"
                  />
                </div>
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
                  {formData.interests.length}/10 selected
                </span>
              </div>
              <p className="mb-4 text-sm text-gray-500">
                Select at least 3 and up to 10 interests to help find better matches.
              </p>

              <div className="flex flex-wrap gap-2">
                {AVAILABLE_INTERESTS.map((interest) => {
                  const isSelected = formData.interests.includes(interest);
                  return (
                    <button
                      key={interest}
                      onClick={() => toggleInterest(interest)}
                      className={cn(
                        'rounded-full px-3 py-1.5 text-sm font-medium transition-all',
                        isSelected
                          ? 'bg-primary text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
                      )}
                    >
                      {interest}
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
