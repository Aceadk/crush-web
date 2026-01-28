'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore, userService } from '@crush/core';
import { Button, Card } from '@crush/ui';
import { cn } from '@crush/ui';
import {
  ArrowLeft,
  Eye,
  EyeOff,
  MapPin,
  User,
  Clock,
  Shield,
  Users,
  Search,
  Heart,
  ChevronRight,
  Loader2,
  Check,
  Info,
} from 'lucide-react';
import Link from 'next/link';

interface PrivacySettings {
  showOnlineStatus: boolean;
  showLastActive: boolean;
  showDistance: boolean;
  showAge: boolean;
  showReadReceipts: boolean;
  discoverableByContacts: boolean;
  showInDiscovery: boolean;
}

interface ToggleProps {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  loading?: boolean;
  disabled?: boolean;
}

function Toggle({ enabled, onChange, loading, disabled }: ToggleProps) {
  return (
    <button
      onClick={() => !loading && !disabled && onChange(!enabled)}
      disabled={loading || disabled}
      className={cn(
        'relative w-12 h-7 rounded-full transition-colors',
        enabled ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-600',
        (loading || disabled) && 'opacity-50 cursor-not-allowed'
      )}
    >
      {loading ? (
        <div className="absolute inset-0 flex items-center justify-center">
          <Loader2 className="w-4 h-4 animate-spin text-white" />
        </div>
      ) : (
        <div
          className={cn(
            'absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-transform',
            enabled ? 'translate-x-6' : 'translate-x-1'
          )}
        />
      )}
    </button>
  );
}

interface SettingRowProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  loading?: boolean;
  disabled?: boolean;
  hint?: string;
}

function SettingRow({ icon, title, description, enabled, onChange, loading, disabled, hint }: SettingRowProps) {
  return (
    <div className="p-4">
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="font-medium text-gray-900 dark:text-white">{title}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">{description}</p>
            </div>
            <Toggle enabled={enabled} onChange={onChange} loading={loading} disabled={disabled} />
          </div>
          {hint && (
            <div className="mt-2 flex items-start gap-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-blue-600 dark:text-blue-400">{hint}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function PrivacySettingsPage() {
  const router = useRouter();
  const { user, profile, refreshProfile } = useAuthStore();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loadingField, setLoadingField] = useState<string | null>(null);

  const [settings, setSettings] = useState<PrivacySettings>({
    showOnlineStatus: profile?.settings?.showOnlineStatus ?? true,
    showLastActive: true,
    showDistance: profile?.settings?.showDistance ?? true,
    showAge: profile?.settings?.showAge ?? true,
    showReadReceipts: true,
    discoverableByContacts: false,
    showInDiscovery: true,
  });

  // Load settings from profile
  useEffect(() => {
    if (profile?.settings) {
      setSettings(prev => ({
        ...prev,
        showOnlineStatus: profile.settings?.showOnlineStatus ?? true,
        showDistance: profile.settings?.showDistance ?? true,
        showAge: profile.settings?.showAge ?? true,
      }));
    }
  }, [profile?.settings]);

  const updateSetting = useCallback(async (key: keyof PrivacySettings, value: boolean) => {
    if (!user) return;

    setLoadingField(key);
    setSettings(prev => ({ ...prev, [key]: value }));

    try {
      // Map frontend keys to backend settings
      const settingsUpdate: Record<string, boolean> = {};

      if (key === 'showOnlineStatus') settingsUpdate.showOnlineStatus = value;
      if (key === 'showDistance') settingsUpdate.showDistance = value;
      if (key === 'showAge') settingsUpdate.showAge = value;

      if (Object.keys(settingsUpdate).length > 0) {
        await userService.updateUserSettings(user.uid, settingsUpdate);
        await refreshProfile();
      }

      // Show saved indicator
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      console.error('Failed to update privacy setting:', error);
      // Revert on error
      setSettings(prev => ({ ...prev, [key]: !value }));
    } finally {
      setLoadingField(null);
    }
  }, [user, refreshProfile]);

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
            Privacy Settings
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
        {/* Profile Visibility */}
        <Card className="overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              Profile Visibility
            </h2>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            <SettingRow
              icon={<Eye className="w-5 h-5 text-gray-600 dark:text-gray-400" />}
              title="Show Online Status"
              description="Let others see when you're active"
              enabled={settings.showOnlineStatus}
              onChange={(v) => updateSetting('showOnlineStatus', v)}
              loading={loadingField === 'showOnlineStatus'}
            />
            <SettingRow
              icon={<Clock className="w-5 h-5 text-gray-600 dark:text-gray-400" />}
              title="Show Last Active"
              description="Show when you were last online"
              enabled={settings.showLastActive}
              onChange={(v) => updateSetting('showLastActive', v)}
              loading={loadingField === 'showLastActive'}
              hint="When disabled, you also won't see others' last active status"
            />
            <SettingRow
              icon={<User className="w-5 h-5 text-gray-600 dark:text-gray-400" />}
              title="Show Age"
              description="Display your age on your profile"
              enabled={settings.showAge}
              onChange={(v) => updateSetting('showAge', v)}
              loading={loadingField === 'showAge'}
            />
            <SettingRow
              icon={<MapPin className="w-5 h-5 text-gray-600 dark:text-gray-400" />}
              title="Show Distance"
              description="Show how far away you are from others"
              enabled={settings.showDistance}
              onChange={(v) => updateSetting('showDistance', v)}
              loading={loadingField === 'showDistance'}
            />
          </div>
        </Card>

        {/* Discovery Settings */}
        <Card className="overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              Discovery
            </h2>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            <SettingRow
              icon={<Search className="w-5 h-5 text-gray-600 dark:text-gray-400" />}
              title="Show Me in Discovery"
              description="Appear in other people's discovery deck"
              enabled={settings.showInDiscovery}
              onChange={(v) => updateSetting('showInDiscovery', v)}
              loading={loadingField === 'showInDiscovery'}
              hint="When disabled, you won't appear in others' discovery, but you also won't be able to see new profiles"
            />
            <SettingRow
              icon={<Users className="w-5 h-5 text-gray-600 dark:text-gray-400" />}
              title="Discoverable by Contacts"
              description="Allow people in your contacts to find you"
              enabled={settings.discoverableByContacts}
              onChange={(v) => updateSetting('discoverableByContacts', v)}
              loading={loadingField === 'discoverableByContacts'}
            />
          </div>
        </Card>

        {/* Read Receipts */}
        <Card className="overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              Messages
            </h2>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            <SettingRow
              icon={<Heart className="w-5 h-5 text-gray-600 dark:text-gray-400" />}
              title="Read Receipts"
              description="Let others know when you've read their messages"
              enabled={settings.showReadReceipts}
              onChange={(v) => updateSetting('showReadReceipts', v)}
              loading={loadingField === 'showReadReceipts'}
              hint="When disabled, you also won't see others' read receipts"
            />
          </div>
        </Card>

        {/* Blocked Users Link */}
        <Card className="overflow-hidden">
          <Link href="/settings/blocked">
            <div className="p-4 flex items-center gap-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                <Shield className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-gray-900 dark:text-white">Blocked Users</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Manage blocked profiles
                </p>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </div>
          </Link>
        </Card>

        {/* Data Privacy Note */}
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-blue-700 dark:text-blue-300">Your Data Privacy</p>
              <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">
                We take your privacy seriously. Your personal data is encrypted and never sold to third parties.
                Read our{' '}
                <Link href="/privacy" className="underline hover:no-underline">
                  Privacy Policy
                </Link>{' '}
                to learn more about how we protect your information.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
