'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore, userService } from '@crush/core';
import { Button, Card } from '@crush/ui';
import { cn } from '@crush/ui';
import {
  ArrowLeft,
  MapPin,
  Users,
  Calendar,
  Compass,
  Loader2,
  Check,
  Info,
} from 'lucide-react';
import type { Gender } from '@crush/core';

interface DiscoverySettings {
  maxDistance: number;
  ageRangeMin: number;
  ageRangeMax: number;
  interestedIn: Gender[];
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
          "w-full h-2 rounded-full appearance-none cursor-pointer",
          "bg-gray-200 dark:bg-gray-700",
          "[&::-webkit-slider-thumb]:appearance-none",
          "[&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5",
          "[&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary",
          "[&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-md",
          "[&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white",
          "[&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5",
          "[&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-primary",
          "[&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:border-2",
          "[&::-moz-range-thumb]:border-white",
          disabled && "opacity-50 cursor-not-allowed"
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
  disabled
}: RangeSliderProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Min</label>
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
          <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Max</label>
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
  gender: Gender;
  label: string;
  selected: boolean;
  onChange: (selected: boolean) => void;
  disabled?: boolean;
}

function GenderButton({ gender, label, selected, onChange, disabled }: GenderButtonProps) {
  return (
    <button
      onClick={() => !disabled && onChange(!selected)}
      disabled={disabled}
      className={cn(
        "px-4 py-2 rounded-full text-sm font-medium transition-colors",
        selected
          ? "bg-primary text-white"
          : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700",
        disabled && "opacity-50 cursor-not-allowed"
      )}
    >
      {label}
    </button>
  );
}

export default function DiscoverySettingsPage() {
  const router = useRouter();
  const { user, profile, refreshProfile } = useAuthStore();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [savingField, setSavingField] = useState<string | null>(null);

  const [settings, setSettings] = useState<DiscoverySettings>({
    maxDistance: profile?.settings?.maxDistance ?? 50,
    ageRangeMin: profile?.settings?.ageRangeMin ?? 18,
    ageRangeMax: profile?.settings?.ageRangeMax ?? 50,
    interestedIn: profile?.interestedIn ?? ['female'],
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
    }
  }, [profile]);

  const updateSettings = useCallback(async (
    key: keyof DiscoverySettings,
    value: number | Gender[]
  ) => {
    if (!user) return;

    setSavingField(key);
    setSettings(prev => ({ ...prev, [key]: value }));

    try {
      if (key === 'interestedIn') {
        // Update profile field directly
        await userService.updateUserProfile(user.uid, {
          interestedIn: value as Gender[],
        });
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
  }, [user, profile, refreshProfile]);

  const toggleGender = useCallback((gender: Gender) => {
    const currentInterests = settings.interestedIn;
    let newInterests: Gender[];

    if (currentInterests.includes(gender)) {
      // Don't allow deselecting all genders
      if (currentInterests.length === 1) return;
      newInterests = currentInterests.filter(g => g !== gender);
    } else {
      newInterests = [...currentInterests, gender];
    }

    updateSettings('interestedIn', newInterests);
  }, [settings.interestedIn, updateSettings]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-2 -ml-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white flex-1">
            Discovery Settings
          </h1>
          {saved && (
            <div className="flex items-center gap-1 text-green-500 text-sm">
              <Check className="w-4 h-4" />
              <span>Saved</span>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Distance Preference */}
        <Card className="overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              Location
            </h2>
          </div>
          <div className="p-4 space-y-4">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
                <MapPin className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">Maximum Distance</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Show people within this distance
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {savingField === 'maxDistance' && (
                      <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
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
                <div className="flex justify-between mt-1 text-xs text-gray-400">
                  <span>1 km</span>
                  <span>200 km</span>
                </div>
              </div>
            </div>

            {profile?.location && (
              <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <Compass className="w-4 h-4" />
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
          <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              Age Preference
            </h2>
          </div>
          <div className="p-4">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
                <Calendar className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">Age Range</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Show people within this age range
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {(savingField === 'ageRangeMin' || savingField === 'ageRangeMax') && (
                      <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
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
                <div className="flex justify-between mt-1 text-xs text-gray-400">
                  <span>18</span>
                  <span>100</span>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Gender Preferences */}
        <Card className="overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              Show Me
            </h2>
          </div>
          <div className="p-4">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
                <Users className="w-5 h-5 text-gray-600 dark:text-gray-400" />
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
                      gender={value}
                      label={label}
                      selected={settings.interestedIn.includes(value)}
                      onChange={() => toggleGender(value)}
                      disabled={savingField === 'interestedIn'}
                    />
                  ))}
                </div>
                {savingField === 'interestedIn' && (
                  <div className="mt-2 flex items-center gap-2 text-sm text-gray-500">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Saving...</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </Card>

        {/* Info Note */}
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-blue-700 dark:text-blue-300">Discovery Tips</p>
              <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">
                Expanding your distance and age range can help you find more potential matches.
                Your preferences are saved automatically as you adjust them.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
