'use client';

import { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore, userService, storageService } from '@crush/core';
import { Button, Card, Badge, Input, Textarea } from '@crush/ui';
import { cn } from '@crush/ui';
import {
  ArrowLeft,
  Plus,
  X,
  Sparkles,
  Check,
  AlertCircle,
} from 'lucide-react';
import { PhotoGridReorder } from '@/components/profile/photo-grid-reorder';

const AVAILABLE_INTERESTS = [
  'Travel', 'Music', 'Movies', 'Reading', 'Cooking', 'Fitness',
  'Gaming', 'Photography', 'Art', 'Dancing', 'Hiking', 'Yoga',
  'Coffee', 'Wine', 'Food', 'Fashion', 'Tech', 'Sports',
  'Pets', 'Nature', 'Beach', 'Mountains', 'Meditation', 'Writing',
];

const PROMPT_QUESTIONS = [
  "I'm looking for...",
  "My ideal first date would be...",
  "Two truths and a lie...",
  "The way to my heart is...",
  "I geek out on...",
  "My most controversial opinion is...",
  "A life goal of mine is...",
  "I'm known for...",
  "My simple pleasures are...",
  "I won't shut up about...",
];

interface FormData {
  displayName: string;
  bio: string;
  interests: string[];
  prompts: { question: string; answer: string }[];
  location: { city: string; country: string };
}

export default function ProfileEditForm() {
  const router = useRouter();
  const { user, profile, refreshProfile } = useAuthStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState<FormData>({
    displayName: profile?.displayName || '',
    bio: profile?.bio || '',
    interests: profile?.interests || [],
    prompts: profile?.prompts || [],
    location: { city: profile?.location?.city || '', country: profile?.location?.country || '' },
  });

  const [photos, setPhotos] = useState<string[]>(profile?.photos || []);
  const [activePromptIndex, setActivePromptIndex] = useState<number | null>(null);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploading(true);
    setError(null);

    try {
      const photoUrl = await storageService.uploadProfilePhoto(user.uid, file);
      setPhotos(prev => [...prev, photoUrl]);
    } catch (err) {
      setError('Failed to upload photo. Please try again.');
      console.error('Failed to upload photo:', err);
    } finally {
      setUploading(false);
    }
  };

  const handleRemovePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const handlePhotosReorder = (newPhotos: string[]) => {
    setPhotos(newPhotos);
  };

  const toggleInterest = (interest: string) => {
    setFormData(prev => ({
      ...prev,
      interests: prev.interests.includes(interest)
        ? prev.interests.filter(i => i !== interest)
        : prev.interests.length < 10
          ? [...prev.interests, interest]
          : prev.interests,
    }));
  };

  const addPrompt = (question: string) => {
    if (formData.prompts.length >= 3) return;
    if (formData.prompts.some(p => p.question === question)) return;

    setFormData(prev => ({
      ...prev,
      prompts: [...prev.prompts, { question, answer: '' }],
    }));
    setActivePromptIndex(formData.prompts.length);
  };

  const updatePromptAnswer = (index: number, answer: string) => {
    setFormData(prev => ({
      ...prev,
      prompts: prev.prompts.map((p, i) =>
        i === index ? { ...p, answer } : p
      ),
    }));
  };

  const removePrompt = (index: number) => {
    setFormData(prev => ({
      ...prev,
      prompts: prev.prompts.filter((_, i) => i !== index),
    }));
    setActivePromptIndex(null);
  };

  const handleSave = useCallback(async () => {
    if (!user) return;

    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      await userService.updateUserProfile(user.uid, {
        displayName: formData.displayName.trim(),
        bio: formData.bio.trim(),
        interests: formData.interests,
        prompts: formData.prompts.filter(p => p.answer.trim()),
        photos,
        profilePhotoUrl: photos[0] || undefined,
        location: formData.location.city ? formData.location : undefined,
        // Ensure profileComplete is set for existing users who may not have this flag
        profileComplete: true,
      });

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
  }, [user, formData, photos, refreshProfile, router]);

  const completeness = profile ? userService.calculateProfileCompleteness({
    ...profile,
    displayName: formData.displayName,
    bio: formData.bio,
    interests: formData.interests,
    prompts: formData.prompts,
    location: formData.location.city ? formData.location : undefined,
    photos,
    profilePhotoUrl: photos[0],
  }) : 0;

  if (!profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="p-2 -ml-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
            Edit Profile
          </h1>
          <Button
            onClick={handleSave}
            disabled={saving}
            size="sm"
          >
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Status messages */}
        {error && (
          <div className="flex items-center gap-2 p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm">{error}</p>
          </div>
        )}

        {success && (
          <div className="flex items-center gap-2 p-4 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-xl">
            <Check className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm">Profile saved successfully!</p>
          </div>
        )}

        {/* Completeness indicator */}
        <Card className="p-4">
          <div className="flex items-center gap-4">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-primary" />
              </div>
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  Profile completeness
                </span>
                <span className="text-sm font-semibold text-primary">{completeness}%</span>
              </div>
              <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-primary to-secondary transition-all duration-500"
                  style={{ width: `${completeness}%` }}
                />
              </div>
            </div>
          </div>
        </Card>

        {/* Photos section */}
        <Card className="p-4">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-4">
            Photos
          </h2>

          <PhotoGridReorder
            photos={photos}
            onPhotosChange={handlePhotosReorder}
            onAddPhoto={() => fileInputRef.current?.click()}
            onRemovePhoto={handleRemovePhoto}
            isUploading={uploading}
            maxPhotos={6}
          />

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handlePhotoUpload}
            className="hidden"
          />
        </Card>

        {/* Basic info section */}
        <Card className="p-4 space-y-4">
          <h2 className="font-semibold text-gray-900 dark:text-white">
            Basic Info
          </h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Display Name
            </label>
            <Input
              value={formData.displayName}
              onChange={(e) => setFormData(prev => ({ ...prev, displayName: e.target.value }))}
              placeholder="Your name"
              maxLength={50}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Bio
            </label>
            <Textarea
              value={formData.bio}
              onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
              placeholder="Tell others about yourself..."
              rows={4}
              maxLength={500}
            />
            <p className="text-xs text-gray-400 mt-1 text-right">
              {formData.bio.length}/500
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                City
              </label>
              <Input
                value={formData.location?.city || ''}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  location: { city: e.target.value, country: prev.location?.country || '' }
                }))}
                placeholder="Your city"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Country
              </label>
              <Input
                value={formData.location?.country || ''}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  location: { city: prev.location?.city || '', country: e.target.value }
                }))}
                placeholder="Your country"
              />
            </div>
          </div>
        </Card>

        {/* Interests section */}
        <Card className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900 dark:text-white">
              Interests
            </h2>
            <span className="text-sm text-gray-500">
              {formData.interests.length}/10 selected
            </span>
          </div>
          <p className="text-sm text-gray-500 mb-4">
            Select up to 10 interests to help find better matches.
          </p>

          <div className="flex flex-wrap gap-2">
            {AVAILABLE_INTERESTS.map((interest) => {
              const isSelected = formData.interests.includes(interest);
              return (
                <button
                  key={interest}
                  onClick={() => toggleInterest(interest)}
                  className={cn(
                    'px-3 py-1.5 rounded-full text-sm font-medium transition-all',
                    isSelected
                      ? 'bg-primary text-white'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
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
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900 dark:text-white">
              Prompts
            </h2>
            <span className="text-sm text-gray-500">
              {formData.prompts.length}/3 prompts
            </span>
          </div>
          <p className="text-sm text-gray-500 mb-4">
            Answer prompts to show your personality and spark conversations.
          </p>

          {/* Existing prompts */}
          <div className="space-y-4 mb-4">
            {formData.prompts.map((prompt, index) => (
              <div
                key={index}
                className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4"
              >
                <div className="flex items-start justify-between mb-2">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    {prompt.question}
                  </p>
                  <button
                    onClick={() => removePrompt(index)}
                    className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <X className="w-4 h-4" />
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
                <p className="text-xs text-gray-400 mt-1 text-right">
                  {prompt.answer.length}/200
                </p>
              </div>
            ))}
          </div>

          {/* Add prompt */}
          {formData.prompts.length < 3 && (
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                Choose a prompt:
              </p>
              <div className="flex flex-wrap gap-2">
                {PROMPT_QUESTIONS
                  .filter(q => !formData.prompts.some(p => p.question === q))
                  .slice(0, 5)
                  .map((question) => (
                    <button
                      key={question}
                      onClick={() => addPrompt(question)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-full text-sm bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-primary/10 hover:text-primary transition-colors"
                    >
                      <Plus className="w-3 h-3" />
                      {question}
                    </button>
                  ))}
              </div>
            </div>
          )}
        </Card>

        {/* Save button (bottom) */}
        <Button
          onClick={handleSave}
          disabled={saving}
          className="w-full"
          size="lg"
        >
          {saving ? 'Saving...' : 'Save Profile'}
        </Button>
      </div>
    </div>
  );
}
