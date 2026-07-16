'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  authVerificationFactsFromUser,
  locationService,
  onboardingService,
  useAuthStore,
  userService,
  type Gender,
  type GeoLocation,
} from '@crush/core';
import { Button, Card, Input } from '@crush/ui';
import { cn } from '@crush/ui';
import { PlusFeatureGate } from '@/features/premium';
import { analytics } from '@/lib/analytics';
import {
  ArrowLeft,
  MapPin,
  Users,
  Calendar,
  Compass,
  Globe,
  Navigation,
  Loader2,
  Check,
  Info,
} from 'lucide-react';

interface DiscoverySettings {
  maxDistance: number;
  ageRangeMin: number;
  ageRangeMax: number;
  interestedIn: Gender[];
}

interface PassportState {
  city: string;
  country: string;
  latitude?: number;
  longitude?: number;
}

const GENDER_OPTIONS: { value: Gender; label: string }[] = [
  { value: 'male', label: 'Men' },
  { value: 'female', label: 'Women' },
  { value: 'non_binary', label: 'Non-binary' },
  { value: 'other', label: 'Other' },
];

interface SliderProps {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}

function Slider({ value, min, max, step = 1, onChange, disabled }: SliderProps) {
  const percentage = ((value - min) / (max - min)) * 100;

  return (
    <div className="relative w-full">
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        disabled={disabled}
        className={cn(
          'h-2 w-full cursor-pointer appearance-none rounded-full',
          'bg-gray-200 dark:bg-gray-700',
          '[&::-webkit-slider-thumb]:appearance-none',
          '[&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5',
          '[&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary',
          '[&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-md',
          '[&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white',
          '[&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:w-5',
          '[&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-primary',
          '[&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:border-2',
          '[&::-moz-range-thumb]:border-white',
          disabled && 'cursor-not-allowed opacity-50'
        )}
        style={{
          background: `linear-gradient(to right, var(--primary) 0%, var(--primary) ${percentage}%, rgb(229 231 235) ${percentage}%, rgb(229 231 235) 100%)`,
        }}
      />
    </div>
  );
}

interface RangeSliderProps {
  minValue: number;
  maxValue: number;
  min: number;
  max: number;
  step?: number;
  onMinChange: (value: number) => void;
  onMaxChange: (value: number) => void;
  disabled?: boolean;
}

function RangeSlider({
  minValue,
  maxValue,
  min,
  max,
  step = 1,
  onMinChange,
  onMaxChange,
  disabled,
}: RangeSliderProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">Min</label>
          <Slider
            value={minValue}
            min={min}
            max={maxValue - step}
            step={step}
            onChange={onMinChange}
            disabled={disabled}
          />
        </div>
        <div className="flex-1">
          <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">Max</label>
          <Slider
            value={maxValue}
            min={minValue + step}
            max={max}
            step={step}
            onChange={onMaxChange}
            disabled={disabled}
          />
        </div>
      </div>
    </div>
  );
}

interface GenderButtonProps {
  label: string;
  selected: boolean;
  onChange: (selected: boolean) => void;
  disabled?: boolean;
}

function GenderButton({ label, selected, onChange, disabled }: GenderButtonProps) {
  return (
    <button
      onClick={() => !disabled && onChange(!selected)}
      disabled={disabled}
      className={cn(
        'rounded-full px-4 py-2 text-sm font-medium transition-colors',
        selected
          ? 'bg-primary text-white'
          : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700',
        disabled && 'cursor-not-allowed opacity-50'
      )}
    >
      {label}
    </button>
  );
}

export default function DiscoverySettingsPage() {
  const router = useRouter();
  const { user, profile, refreshProfile } = useAuthStore();
  const isPremium = profile?.isPremium ?? false;
  const [saved, setSaved] = useState(false);
  const [savingField, setSavingField] = useState<string | null>(null);
  const [detectingPassportLocation, setDetectingPassportLocation] = useState(false);
  const [passportError, setPassportError] = useState<string | null>(null);

  const [settings, setSettings] = useState<DiscoverySettings>({
    maxDistance: profile?.settings?.maxDistance ?? 50,
    ageRangeMin: profile?.settings?.ageRangeMin ?? 18,
    ageRangeMax: profile?.settings?.ageRangeMax ?? 50,
    interestedIn: profile?.interestedIn ?? ['female'],
  });
  const [passportMode, setPassportMode] = useState<boolean>(
    profile?.settings?.passportMode ?? false
  );
  const [passportLocation, setPassportLocation] = useState<PassportState>({
    city: profile?.settings?.passportLocation?.city ?? profile?.location?.city ?? '',
    country: profile?.settings?.passportLocation?.country ?? profile?.location?.country ?? '',
    latitude: profile?.settings?.passportLocation?.latitude,
    longitude: profile?.settings?.passportLocation?.longitude,
  });

  // Load settings from profile
  useEffect(() => {
    if (profile) {
      setSettings({
        maxDistance: profile.settings?.maxDistance ?? 50,
        ageRangeMin: profile.settings?.ageRangeMin ?? 18,
        ageRangeMax: profile.settings?.ageRangeMax ?? 50,
        interestedIn: profile.interestedIn ?? ['female'],
      });
      setPassportMode(profile.settings?.passportMode ?? false);
      setPassportLocation({
        city: profile.settings?.passportLocation?.city ?? profile.location?.city ?? '',
        country: profile.settings?.passportLocation?.country ?? profile.location?.country ?? '',
        latitude: profile.settings?.passportLocation?.latitude,
        longitude: profile.settings?.passportLocation?.longitude,
      });
    }
  }, [profile]);

  const updateSettings = useCallback(
    async (key: keyof DiscoverySettings, value: number | Gender[]) => {
      if (!user) return;

      setSavingField(key);
      setSettings((prev) => ({ ...prev, [key]: value }));

      try {
        if (key === 'interestedIn') {
          await onboardingService.saveStep(
            'discoveryPreferences',
            { interestedIn: value as Gender[] },
            authVerificationFactsFromUser(useAuthStore.getState().user)
          );
        } else {
          // Update settings object
          const settingsUpdate: Record<string, number> = {};
          settingsUpdate[key] = value as number;
          await userService.updateUserSettings(user.uid, settingsUpdate);
        }

        await refreshProfile();

        // Show saved indicator
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      } catch (error) {
        console.error('Failed to update discovery setting:', error);
        // Revert on error
        if (profile) {
          setSettings({
            maxDistance: profile.settings?.maxDistance ?? 50,
            ageRangeMin: profile.settings?.ageRangeMin ?? 18,
            ageRangeMax: profile.settings?.ageRangeMax ?? 50,
            interestedIn: profile.interestedIn ?? ['female'],
          });
        }
      } finally {
        setSavingField(null);
      }
    },
    [user, profile, refreshProfile]
  );

  const toggleGender = useCallback(
    (gender: Gender) => {
      const currentInterests = settings.interestedIn;
      let newInterests: Gender[];

      if (currentInterests.includes(gender)) {
        // Don't allow deselecting all genders
        if (currentInterests.length === 1) return;
        newInterests = currentInterests.filter((g) => g !== gender);
      } else {
        newInterests = [...currentInterests, gender];
      }

      updateSettings('interestedIn', newInterests);
    },
    [settings.interestedIn, updateSettings]
  );

  const toPassportGeoLocation = useCallback((value: PassportState): GeoLocation | undefined => {
    const city = value.city.trim();
    const country = value.country.trim();
    const latitude = typeof value.latitude === 'number' ? value.latitude : undefined;
    const longitude = typeof value.longitude === 'number' ? value.longitude : undefined;

    if (!city && !country && latitude === undefined && longitude === undefined) {
      return undefined;
    }

    return {
      city: city || undefined,
      country: country || undefined,
      latitude,
      longitude,
    };
  }, []);

  const persistPassportSettings = useCallback(
    async (nextMode: boolean, nextLocation: PassportState, analyticsFeature: string) => {
      if (!user) return;

      const normalizedLocation = toPassportGeoLocation(nextLocation);
      if (nextMode && !normalizedLocation) {
        setPassportError('Set a destination before enabling Passport mode.');
        return;
      }

      setSavingField('passport');
      setPassportError(null);

      try {
        const settingsPayload: { passportMode: boolean; passportLocation?: GeoLocation } = {
          passportMode: nextMode,
        };
        if (normalizedLocation) {
          settingsPayload.passportLocation = normalizedLocation;
        }

        await userService.updateUserSettings(user.uid, settingsPayload);
        setPassportMode(nextMode);
        setPassportLocation(nextLocation);
        analytics.track({
          name: 'feature_used',
          properties: { feature: analyticsFeature },
        });
        await refreshProfile();
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      } catch (error) {
        console.error('Failed to update passport settings:', error);
        setPassportError(
          error instanceof Error
            ? error.message
            : 'Failed to update passport settings. Please try again.'
        );
      } finally {
        setSavingField(null);
      }
    },
    [user, toPassportGeoLocation, refreshProfile]
  );

  const handleTogglePassportMode = useCallback(async () => {
    if (!isPremium) {
      setPassportError('Passport mode is available for Premium members.');
      return;
    }

    const nextMode = !passportMode;
    let nextLocation = passportLocation;
    if (nextMode && !toPassportGeoLocation(nextLocation)) {
      if (profile?.location?.city || profile?.location?.country) {
        nextLocation = {
          city: profile.location.city ?? '',
          country: profile.location.country ?? '',
          latitude: profile.location.latitude,
          longitude: profile.location.longitude,
        };
      } else {
        setPassportError('Add a destination first, then enable Passport mode.');
        return;
      }
    }

    await persistPassportSettings(nextMode, nextLocation, 'passport_mode_toggled');
  }, [
    isPremium,
    passportMode,
    passportLocation,
    profile?.location,
    persistPassportSettings,
    toPassportGeoLocation,
  ]);

  const handleDetectPassportLocation = useCallback(async () => {
    setDetectingPassportLocation(true);
    setPassportError(null);
    try {
      const detected = await locationService.getCurrentLocation(true);
      const nextLocation: PassportState = {
        city: detected.city ?? '',
        country: detected.country ?? '',
        latitude: detected.latitude,
        longitude: detected.longitude,
      };
      await persistPassportSettings(passportMode, nextLocation, 'passport_location_detected');
    } catch (error) {
      setPassportError(
        error instanceof Error
          ? error.message
          : 'Unable to detect location. Enter destination manually.'
      );
    } finally {
      setDetectingPassportLocation(false);
    }
  }, [passportMode, persistPassportSettings]);

  const handleSavePassportDestination = useCallback(async () => {
    const nextLocation: PassportState = {
      city: passportLocation.city.trim(),
      country: passportLocation.country.trim(),
    };
    await persistPassportSettings(passportMode, nextLocation, 'passport_destination_updated');
  }, [passportLocation.city, passportLocation.country, passportMode, persistPassportSettings]);

  const passportDestinationLabel = [passportLocation.city.trim(), passportLocation.country.trim()]
    .filter(Boolean)
    .join(', ');

  return (
    <div className="min-h-screen bg-gray-50 pb-20 dark:bg-gray-900">
      {/* Header */}
      <div className="sticky top-0 z-20 border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <div className="mx-auto flex max-w-2xl items-center gap-4 px-4 py-4">
          <button
            onClick={() => router.back()}
            className="-ml-2 p-2 text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
          >
            <ArrowLeft className="h-6 w-6" />
          </button>
          <h1 className="flex-1 text-lg font-semibold text-gray-900 dark:text-white">
            Discovery Settings
          </h1>
          {saved && (
            <div className="flex items-center gap-1 text-sm text-green-500">
              <Check className="h-4 w-4" />
              <span>Saved</span>
            </div>
          )}
        </div>
      </div>

      <div className="mx-auto max-w-2xl space-y-6 px-4 py-6">
        {/* Distance Preference */}
        <Card className="overflow-hidden">
          <div className="border-b border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-700 dark:bg-gray-800">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Location
            </h2>
          </div>
          <div className="space-y-4 p-4">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
                <MapPin className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              </div>
              <div className="flex-1">
                <div className="mb-2 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">Maximum Distance</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Show people within this distance
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {savingField === 'maxDistance' && (
                      <Loader2 className="h-4 w-4 animate-spin text-gray-500" />
                    )}
                    <span className="text-lg font-semibold text-primary">
                      {settings.maxDistance} km
                    </span>
                  </div>
                </div>
                <Slider
                  value={settings.maxDistance}
                  min={1}
                  max={200}
                  step={1}
                  onChange={(value) => updateSettings('maxDistance', value)}
                  disabled={savingField === 'maxDistance'}
                />
                <div className="mt-1 flex justify-between text-xs text-gray-500">
                  <span>1 km</span>
                  <span>200 km</span>
                </div>
              </div>
            </div>

            {profile?.location && (
              <div className="mt-4 rounded-lg bg-gray-50 p-3 dark:bg-gray-800">
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <Compass className="h-4 w-4" />
                  <span>
                    Current location: {profile.location.city || 'Unknown'}
                    {profile.location.country && `, ${profile.location.country}`}
                  </span>
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Age Range */}
        <Card className="overflow-hidden">
          <div className="border-b border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-700 dark:bg-gray-800">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Age Preference
            </h2>
          </div>
          <div className="p-4">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
                <Calendar className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              </div>
              <div className="flex-1">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">Age Range</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Show people within this age range
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {(savingField === 'ageRangeMin' || savingField === 'ageRangeMax') && (
                      <Loader2 className="h-4 w-4 animate-spin text-gray-500" />
                    )}
                    <span className="text-lg font-semibold text-primary">
                      {settings.ageRangeMin} - {settings.ageRangeMax}
                    </span>
                  </div>
                </div>
                <RangeSlider
                  minValue={settings.ageRangeMin}
                  maxValue={settings.ageRangeMax}
                  min={18}
                  max={100}
                  step={1}
                  onMinChange={(value) => updateSettings('ageRangeMin', value)}
                  onMaxChange={(value) => updateSettings('ageRangeMax', value)}
                  disabled={savingField === 'ageRangeMin' || savingField === 'ageRangeMax'}
                />
                <div className="mt-1 flex justify-between text-xs text-gray-500">
                  <span>18</span>
                  <span>100</span>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Gender Preferences */}
        <Card className="overflow-hidden">
          <div className="border-b border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-700 dark:bg-gray-800">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Show Me
            </h2>
          </div>
          <div className="p-4">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
                <Users className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              </div>
              <div className="flex-1">
                <div className="mb-4">
                  <p className="font-medium text-gray-900 dark:text-white">I'm interested in</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Select who you'd like to see
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {GENDER_OPTIONS.map(({ value, label }) => (
                    <GenderButton
                      key={value}
                      label={label}
                      selected={settings.interestedIn.includes(value)}
                      onChange={() => toggleGender(value)}
                      disabled={savingField === 'interestedIn'}
                    />
                  ))}
                </div>
                {savingField === 'interestedIn' && (
                  <div className="mt-2 flex items-center gap-2 text-sm text-gray-500">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Saving...</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </Card>

        {/* Passport Mode */}
        <PlusFeatureGate
          isPremium={isPremium}
          featureKey="passport_mode"
          title="Passport Mode"
          description="Change your discovery location and match with people from any destination."
          ctaLabel="Unlock Passport"
          variant="amber"
          lockWhenFree
          lockClassName="space-y-4"
          modalTitle="Passport Mode is Premium-only"
          modalDescription="Upgrade to set a destination and discover people outside your current location."
          modalBenefits={[
            'Set your destination city for discovery',
            'Travel-match before arriving',
            'Switch between destinations anytime',
          ]}
        >
          <Card className="overflow-hidden">
            <div className="border-b border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-700 dark:bg-gray-800">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Passport
              </h2>
            </div>
            <div className="space-y-4 p-4">
              <div className="flex items-start gap-4">
                <div
                  className={cn(
                    'flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full',
                    passportMode
                      ? 'bg-amber-100 dark:bg-amber-900/30'
                      : 'bg-gray-100 dark:bg-gray-800'
                  )}
                >
                  <Globe
                    className={cn('h-5 w-5', passportMode ? 'text-amber-600' : 'text-gray-500')}
                  />
                </div>
                <div className="flex-1">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        Passport Mode {passportMode ? 'On' : 'Off'}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Use a destination location for discovery instead of your current area.
                      </p>
                    </div>
                    <button
                      onClick={handleTogglePassportMode}
                      disabled={savingField === 'passport'}
                      className={cn(
                        'relative h-7 w-12 rounded-full transition-colors',
                        passportMode ? 'bg-amber-500' : 'bg-gray-300 dark:bg-gray-600',
                        savingField === 'passport' && 'cursor-not-allowed opacity-60'
                      )}
                      aria-label="Toggle Passport mode"
                    >
                      <div
                        className={cn(
                          'absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-transform',
                          passportMode ? 'translate-x-6' : 'translate-x-1'
                        )}
                      />
                    </button>
                  </div>
                  {passportDestinationLabel && (
                    <p className="text-sm text-amber-700 dark:text-amber-400">
                      Active destination: {passportDestinationLabel}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-3 rounded-xl border border-gray-200 p-3 dark:border-gray-700">
                <p className="text-sm font-medium text-gray-900 dark:text-white">Destination</p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Input
                    value={passportLocation.city}
                    onChange={(event) =>
                      setPassportLocation((previous) => ({
                        ...previous,
                        city: event.target.value,
                        latitude: undefined,
                        longitude: undefined,
                      }))
                    }
                    placeholder="City"
                    disabled={savingField === 'passport'}
                  />
                  <Input
                    value={passportLocation.country}
                    onChange={(event) =>
                      setPassportLocation((previous) => ({
                        ...previous,
                        country: event.target.value,
                        latitude: undefined,
                        longitude: undefined,
                      }))
                    }
                    placeholder="Country"
                    disabled={savingField === 'passport'}
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleDetectPassportLocation}
                    disabled={detectingPassportLocation || savingField === 'passport'}
                  >
                    {detectingPassportLocation ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Navigation className="mr-2 h-4 w-4" />
                    )}
                    Use Current Location
                  </Button>
                  <Button
                    type="button"
                    onClick={handleSavePassportDestination}
                    disabled={savingField === 'passport'}
                  >
                    {savingField === 'passport' ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <MapPin className="mr-2 h-4 w-4" />
                    )}
                    Save Destination
                  </Button>
                </div>
                {passportError && (
                  <p className="text-sm text-red-600 dark:text-red-400">{passportError}</p>
                )}
              </div>
            </div>
          </Card>
        </PlusFeatureGate>

        {/* Info Note */}
        <div className="rounded-xl bg-blue-50 p-4 dark:bg-blue-900/20">
          <div className="flex items-start gap-3">
            <Info className="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-500" />
            <div>
              <p className="font-medium text-blue-700 dark:text-blue-300">Discovery Tips</p>
              <p className="mt-1 text-sm text-blue-600 dark:text-blue-400">
                Expanding your distance and age range can help you find more potential matches. Your
                preferences are saved automatically as you adjust them.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
