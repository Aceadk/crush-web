'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore, userService, storageService, locationService, LocationDetails } from '@crush/core';
import { Button, Card, Input } from '@crush/ui';
import { cn } from '@crush/ui';
import {
  ArrowLeft,
  ArrowRight,
  Camera,
  Plus,
  X,
  Check,
  Sparkles,
  Heart,
  MapPin,
  User,
  Loader2,
  MapPinOff,
  Navigation,
  AlertCircle,
} from 'lucide-react';

const STEPS = [
  { id: 'welcome', title: 'Welcome', icon: Heart },
  { id: 'basics', title: 'Basics', icon: User },
  { id: 'photos', title: 'Photos', icon: Camera },
  { id: 'interests', title: 'Interests', icon: Sparkles },
  { id: 'location', title: 'Location', icon: MapPin },
  { id: 'complete', title: 'Complete', icon: Check },
];

const AVAILABLE_INTERESTS = [
  'Travel', 'Music', 'Movies', 'Reading', 'Cooking', 'Fitness',
  'Gaming', 'Photography', 'Art', 'Dancing', 'Hiking', 'Yoga',
  'Coffee', 'Wine', 'Food', 'Fashion', 'Tech', 'Sports',
  'Pets', 'Nature', 'Beach', 'Mountains', 'Meditation', 'Writing',
];

interface OnboardingData {
  displayName: string;
  birthDate: string;
  gender: 'male' | 'female' | 'other' | '';
  photos: string[];
  interests: string[];
  bio: string;
  location: LocationDetails | null;
  manualLocation: { city: string; country: string };
  useAutoLocation: boolean;
}

export default function OnboardingFlow() {
  const router = useRouter();
  const { user, profile, refreshProfile } = useAuthStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Location states
  const [detectingLocation, setDetectingLocation] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [locationPermissionDenied, setLocationPermissionDenied] = useState(false);

  const [data, setData] = useState<OnboardingData>({
    displayName: profile?.displayName || user?.displayName || '',
    birthDate: '',
    gender: '',
    photos: [],
    interests: [],
    bio: '',
    location: null,
    manualLocation: { city: '', country: '' },
    useAutoLocation: true,
  });

  const stepId = STEPS[currentStep].id;

  useEffect(() => {
    if (profile?.onboardingComplete) {
      router.replace('/discover');
    }
  }, [profile, router]);

  // Auto-detect location when reaching location step
  useEffect(() => {
    if (stepId === 'location' && !data.location && data.useAutoLocation && !locationPermissionDenied) {
      handleDetectLocation();
    }
  }, [stepId]);

  const handleDetectLocation = async () => {
    setDetectingLocation(true);
    setLocationError(null);

    try {
      const locationDetails = await locationService.getCurrentLocation(true);
      setData(prev => ({ ...prev, location: locationDetails }));
    } catch (error: unknown) {
      const err = error as { code?: string; message?: string };
      if (err.code === 'PERMISSION_DENIED') {
        setLocationPermissionDenied(true);
        setData(prev => ({ ...prev, useAutoLocation: false }));
      }
      setLocationError(err.message || 'Failed to detect location');
    } finally {
      setDetectingLocation(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploading(true);
    try {
      const photoUrl = await storageService.uploadProfilePhoto(user.uid, file);
      setData(prev => ({ ...prev, photos: [...prev.photos, photoUrl] }));
    } catch (error) {
      console.error('Failed to upload photo:', error);
    } finally {
      setUploading(false);
    }
  };

  const handleRemovePhoto = (index: number) => {
    setData(prev => ({
      ...prev,
      photos: prev.photos.filter((_, i) => i !== index),
    }));
  };

  const toggleInterest = (interest: string) => {
    setData(prev => ({
      ...prev,
      interests: prev.interests.includes(interest)
        ? prev.interests.filter(i => i !== interest)
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
      case 'basics':
        return data.displayName.trim().length >= 2 && data.birthDate && data.gender;
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
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      setLoading(true);
      try {
        if (!user) return;

        const birthDate = new Date(data.birthDate);
        const age = Math.floor(
          (Date.now() - birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000)
        );

        // Prepare location data - never expose raw coordinates to user
        const locationData = data.useAutoLocation && data.location
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
          photos: data.photos,
          profilePhotoUrl: data.photos[0],
          interests: data.interests,
          bio: data.bio.trim(),
          location: locationData,
          onboardingComplete: true,
        });

        // Save location preference
        localStorage.setItem('crush_location_enabled', data.useAutoLocation ? 'true' : 'false');

        await refreshProfile();
        router.replace('/discover');
      } catch (error) {
        console.error('Failed to complete onboarding:', error);
      } finally {
        setLoading(false);
      }
    }
  }, [currentStep, data, user, refreshProfile, router]);

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const progressPercentage = ((currentStep + 1) / STEPS.length) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      {/* Progress bar */}
      <div className="fixed top-0 left-0 right-0 h-1 bg-gray-200 dark:bg-gray-700 z-50">
        <div
          className="h-full bg-gradient-to-r from-primary to-secondary transition-all duration-500"
          style={{ width: `${progressPercentage}%` }}
        />
      </div>

      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-40 bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg border-b border-gray-200/50 dark:border-gray-800/50">
        <div className="max-w-md mx-auto px-4 py-4 flex items-center justify-between">
          {currentStep > 0 ? (
            <button
              onClick={handleBack}
              className="p-2 -ml-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
          ) : (
            <div className="w-10" />
          )}

          <div className="flex items-center gap-2">
            {STEPS.map((step, index) => (
              <div
                key={step.id}
                className={cn(
                  'w-2 h-2 rounded-full transition-all duration-300',
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
      <div className="pt-20 pb-32 px-4">
        <div className="max-w-md mx-auto">
          {/* Welcome step */}
          {stepId === 'welcome' && (
            <div className="text-center py-12 animate-in fade-in slide-in-from-right-4 duration-500">
              <div className="w-24 h-24 mx-auto mb-8 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                <Heart className="w-12 h-12 text-white" />
              </div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
                Welcome to CRUSH
              </h1>
              <p className="text-lg text-gray-600 dark:text-gray-300 mb-8">
                Let's set up your profile to help you find meaningful connections.
              </p>
              <div className="space-y-4 text-left bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Camera className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">Add your best photos</p>
                    <p className="text-sm text-gray-500">Show your personality</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">Share your interests</p>
                    <p className="text-sm text-gray-500">Find compatible matches</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <MapPin className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">Set your location</p>
                    <p className="text-sm text-gray-500">Meet people nearby</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Basics step */}
          {stepId === 'basics' && (
            <div className="py-8 animate-in fade-in slide-in-from-right-4 duration-500">
              <div className="text-center mb-8">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="w-8 h-8 text-primary" />
                </div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  Tell us about yourself
                </h1>
                <p className="text-gray-600 dark:text-gray-300">
                  This helps us personalize your experience
                </p>
              </div>

              <Card className="p-6 space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    What's your name?
                  </label>
                  <Input
                    value={data.displayName}
                    onChange={(e) => setData(prev => ({ ...prev, displayName: e.target.value }))}
                    placeholder="Your first name"
                    maxLength={50}
                    className="text-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    When's your birthday?
                  </label>
                  <Input
                    type="date"
                    value={data.birthDate}
                    onChange={(e) => setData(prev => ({ ...prev, birthDate: e.target.value }))}
                    max={new Date(Date.now() - 18 * 365.25 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
                    className="text-lg"
                  />
                  <p className="text-xs text-gray-500 mt-1">You must be 18+ to use CRUSH</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
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
                        onClick={() => setData(prev => ({ ...prev, gender: option.value as OnboardingData['gender'] }))}
                        className={cn(
                          'py-3 px-4 rounded-xl text-sm font-medium transition-all',
                          data.gender === option.value
                            ? 'bg-primary text-white shadow-lg shadow-primary/25'
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
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

          {/* Photos step */}
          {stepId === 'photos' && (
            <div className="py-8 animate-in fade-in slide-in-from-right-4 duration-500">
              <div className="text-center mb-8">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                  <Camera className="w-8 h-8 text-primary" />
                </div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  Add your photos
                </h1>
                <p className="text-gray-600 dark:text-gray-300">
                  Add at least 1 photo to continue. More photos = more matches!
                </p>
              </div>

              <Card className="p-6">
                <div className="grid grid-cols-3 gap-3">
                  {data.photos.map((photo, index) => (
                    <div
                      key={index}
                      className={cn(
                        'relative aspect-[3/4] rounded-xl overflow-hidden group',
                        index === 0 && 'col-span-2 row-span-2'
                      )}
                    >
                      <img src={photo} alt="" className="w-full h-full object-cover" />
                      <button
                        onClick={() => handleRemovePhoto(index)}
                        className="absolute top-2 right-2 p-1.5 bg-black/50 rounded-lg text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500"
                      >
                        <X className="w-4 h-4" />
                      </button>
                      {index === 0 && (
                        <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/50 text-white text-xs rounded-full">
                          Main photo
                        </div>
                      )}
                    </div>
                  ))}

                  {data.photos.length < 6 && (
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      className={cn(
                        'aspect-[3/4] rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600',
                        'flex flex-col items-center justify-center gap-2 text-gray-400',
                        'hover:border-primary hover:text-primary transition-colors',
                        uploading && 'opacity-50 cursor-not-allowed'
                      )}
                    >
                      {uploading ? (
                        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>
                          <Plus className="w-8 h-8" />
                          <span className="text-xs">Add</span>
                        </>
                      )}
                    </button>
                  )}
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="hidden"
                />

                <div className="mt-4 p-4 bg-primary/5 rounded-xl">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    <span className="font-medium text-primary">Tip:</span> Profiles with 3+ photos get 5x more matches. Show your smile, hobbies, and personality!
                  </p>
                </div>
              </Card>
            </div>
          )}

          {/* Interests step */}
          {stepId === 'interests' && (
            <div className="py-8 animate-in fade-in slide-in-from-right-4 duration-500">
              <div className="text-center mb-8">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                  <Sparkles className="w-8 h-8 text-primary" />
                </div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
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
                          'px-4 py-2 rounded-full text-sm font-medium transition-all',
                          isSelected
                            ? 'bg-primary text-white shadow-lg shadow-primary/25'
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
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
            <div className="py-8 animate-in fade-in slide-in-from-right-4 duration-500">
              <div className="text-center mb-8">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                  <MapPin className="w-8 h-8 text-primary" />
                </div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  Where are you located?
                </h1>
                <p className="text-gray-600 dark:text-gray-300">
                  This helps us show you people nearby
                </p>
              </div>

              {/* Auto-detect option */}
              {!locationPermissionDenied && (
                <Card className="p-4 mb-4">
                  <button
                    onClick={() => {
                      setData(prev => ({ ...prev, useAutoLocation: true }));
                      if (!data.location) {
                        handleDetectLocation();
                      }
                    }}
                    className={cn(
                      'w-full flex items-center gap-4 p-4 rounded-xl transition-all',
                      data.useAutoLocation
                        ? 'bg-primary/10 border-2 border-primary'
                        : 'bg-gray-50 dark:bg-gray-800 border-2 border-transparent hover:border-gray-200 dark:hover:border-gray-700'
                    )}
                  >
                    <div className={cn(
                      'w-12 h-12 rounded-full flex items-center justify-center',
                      data.useAutoLocation ? 'bg-primary' : 'bg-gray-200 dark:bg-gray-700'
                    )}>
                      {detectingLocation ? (
                        <Loader2 className="w-6 h-6 text-white animate-spin" />
                      ) : (
                        <Navigation className={cn(
                          'w-6 h-6',
                          data.useAutoLocation ? 'text-white' : 'text-gray-500'
                        )} />
                      )}
                    </div>
                    <div className="flex-1 text-left">
                      <p className={cn(
                        'font-medium',
                        data.useAutoLocation ? 'text-primary' : 'text-gray-900 dark:text-white'
                      )}>
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
                    {data.useAutoLocation && (
                      <Check className="w-5 h-5 text-primary" />
                    )}
                  </button>

                  {data.useAutoLocation && locationError && (
                    <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm text-red-600 dark:text-red-400">{locationError}</p>
                        <button
                          onClick={handleDetectLocation}
                          className="text-sm text-primary hover:underline mt-1"
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
                <Card className="p-4 mb-4 bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800">
                  <div className="flex items-start gap-3">
                    <MapPinOff className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-amber-700 dark:text-amber-300">
                        Location access denied
                      </p>
                      <p className="text-sm text-amber-600 dark:text-amber-400 mt-1">
                        You've denied location access. You can enter your location manually below, or enable location in your browser settings.
                      </p>
                    </div>
                  </div>
                </Card>
              )}

              {/* Manual entry option */}
              <Card className="p-4">
                <button
                  onClick={() => setData(prev => ({ ...prev, useAutoLocation: false }))}
                  className={cn(
                    'w-full flex items-center gap-4 p-4 rounded-xl transition-all mb-4',
                    !data.useAutoLocation
                      ? 'bg-primary/10 border-2 border-primary'
                      : 'bg-gray-50 dark:bg-gray-800 border-2 border-transparent hover:border-gray-200 dark:hover:border-gray-700'
                  )}
                >
                  <div className={cn(
                    'w-12 h-12 rounded-full flex items-center justify-center',
                    !data.useAutoLocation ? 'bg-primary' : 'bg-gray-200 dark:bg-gray-700'
                  )}>
                    <MapPin className={cn(
                      'w-6 h-6',
                      !data.useAutoLocation ? 'text-white' : 'text-gray-500'
                    )} />
                  </div>
                  <div className="flex-1 text-left">
                    <p className={cn(
                      'font-medium',
                      !data.useAutoLocation ? 'text-primary' : 'text-gray-900 dark:text-white'
                    )}>
                      Enter location manually
                    </p>
                    <p className="text-sm text-gray-500">Type your city and country</p>
                  </div>
                  {!data.useAutoLocation && (
                    <Check className="w-5 h-5 text-primary" />
                  )}
                </button>

                {!data.useAutoLocation && (
                  <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        City
                      </label>
                      <Input
                        value={data.manualLocation.city}
                        onChange={(e) => setData(prev => ({
                          ...prev,
                          manualLocation: { ...prev.manualLocation, city: e.target.value }
                        }))}
                        placeholder="e.g., San Francisco"
                        className="text-lg"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Country
                      </label>
                      <Input
                        value={data.manualLocation.country}
                        onChange={(e) => setData(prev => ({
                          ...prev,
                          manualLocation: { ...prev.manualLocation, country: e.target.value }
                        }))}
                        placeholder="e.g., United States"
                        className="text-lg"
                      />
                    </div>
                  </div>
                )}
              </Card>

              {/* Privacy note */}
              <p className="text-xs text-gray-500 text-center mt-4">
                Your exact location coordinates are never shown to other users.
                Only your city name will be displayed on your profile.
              </p>
            </div>
          )}

          {/* Complete step */}
          {stepId === 'complete' && (
            <div className="text-center py-12 animate-in fade-in slide-in-from-right-4 duration-500">
              <div className="w-24 h-24 mx-auto mb-8 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center">
                <Check className="w-12 h-12 text-white" />
              </div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
                You're all set!
              </h1>
              <p className="text-lg text-gray-600 dark:text-gray-300 mb-8">
                Your profile is ready. Let's find your perfect match!
              </p>

              <Card className="p-6 text-left">
                <div className="flex items-center gap-4 mb-4">
                  {data.photos[0] && (
                    <img
                      src={data.photos[0]}
                      alt=""
                      className="w-16 h-16 rounded-full object-cover"
                    />
                  )}
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      {data.displayName}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {getLocationDisplay()}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {data.interests.slice(0, 5).map((interest) => (
                    <span
                      key={interest}
                      className="px-3 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary"
                    >
                      {interest}
                    </span>
                  ))}
                  {data.interests.length > 5 && (
                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-500">
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
      <div className="fixed bottom-0 left-0 right-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg border-t border-gray-200/50 dark:border-gray-800/50 p-4">
        <div className="max-w-md mx-auto">
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
                <Heart className="w-5 h-5" />
              </>
            ) : stepId === 'location' && detectingLocation ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Detecting location...
              </>
            ) : (
              <>
                Continue
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
