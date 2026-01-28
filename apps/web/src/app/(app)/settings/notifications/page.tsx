'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore, userService } from '@crush/core';
import { Card } from '@crush/ui';
import { cn } from '@crush/ui';
import {
  ArrowLeft,
  Bell,
  MessageSquare,
  Heart,
  Star,
  Users,
  Gift,
  Megaphone,
  Loader2,
  Check,
  Info,
  BellOff,
} from 'lucide-react';

interface NotificationSettings {
  // Match & Messages
  newMatches: boolean;
  newMessages: boolean;
  messageRequests: boolean;

  // Activity
  likesReceived: boolean;
  superLikesReceived: boolean;
  profileViews: boolean;

  // Promotions
  weeklyPicks: boolean;
  specialOffers: boolean;
  productUpdates: boolean;

  // Email
  emailNotifications: boolean;
  emailMarketing: boolean;
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
}

function SettingRow({ icon, title, description, enabled, onChange, loading, disabled }: SettingRowProps) {
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
        </div>
      </div>
    </div>
  );
}

export default function NotificationSettingsPage() {
  const router = useRouter();
  const { user, profile, refreshProfile } = useAuthStore();
  const [saved, setSaved] = useState(false);
  const [loadingField, setLoadingField] = useState<string | null>(null);
  const [pushPermission, setPushPermission] = useState<'granted' | 'denied' | 'default'>('default');

  const [settings, setSettings] = useState<NotificationSettings>({
    // Match & Messages
    newMatches: true,
    newMessages: true,
    messageRequests: true,

    // Activity
    likesReceived: true,
    superLikesReceived: true,
    profileViews: true,

    // Promotions
    weeklyPicks: true,
    specialOffers: false,
    productUpdates: true,

    // Email
    emailNotifications: true,
    emailMarketing: false,
  });

  // Check push notification permission
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPushPermission(Notification.permission);
    }
  }, []);

  // Load settings from profile
  useEffect(() => {
    if (profile?.notificationSettings) {
      setSettings(prev => ({
        ...prev,
        ...profile.notificationSettings,
      }));
    }
  }, [profile?.notificationSettings]);

  const requestPushPermission = async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      const permission = await Notification.requestPermission();
      setPushPermission(permission);
    }
  };

  const updateSetting = useCallback(async (key: keyof NotificationSettings, value: boolean) => {
    if (!user) return;

    setLoadingField(key);
    setSettings(prev => ({ ...prev, [key]: value }));

    try {
      // Update notification settings in Firestore
      await userService.updateNotificationSettings(user.uid, { [key]: value });
      await refreshProfile();

      // Show saved indicator
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      console.error('Failed to update notification setting:', error);
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
            Notification Settings
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
        {/* Push Notification Permission */}
        {pushPermission !== 'granted' && (
          <Card className="overflow-hidden">
            <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-yellow-100 dark:bg-yellow-800 flex items-center justify-center flex-shrink-0">
                  <BellOff className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-yellow-800 dark:text-yellow-200">
                    Push Notifications Disabled
                  </p>
                  <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                    Enable push notifications to get instant updates about matches and messages.
                  </p>
                  <button
                    onClick={requestPushPermission}
                    className="mt-3 px-4 py-2 bg-yellow-600 text-white rounded-lg text-sm font-medium hover:bg-yellow-700 transition-colors"
                  >
                    Enable Notifications
                  </button>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Matches & Messages */}
        <Card className="overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              Matches & Messages
            </h2>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            <SettingRow
              icon={<Heart className="w-5 h-5 text-pink-500" />}
              title="New Matches"
              description="Get notified when you match with someone"
              enabled={settings.newMatches}
              onChange={(v) => updateSetting('newMatches', v)}
              loading={loadingField === 'newMatches'}
            />
            <SettingRow
              icon={<MessageSquare className="w-5 h-5 text-blue-500" />}
              title="New Messages"
              description="Get notified when you receive a message"
              enabled={settings.newMessages}
              onChange={(v) => updateSetting('newMessages', v)}
              loading={loadingField === 'newMessages'}
            />
            <SettingRow
              icon={<Users className="w-5 h-5 text-purple-500" />}
              title="Message Requests"
              description="Get notified about message requests"
              enabled={settings.messageRequests}
              onChange={(v) => updateSetting('messageRequests', v)}
              loading={loadingField === 'messageRequests'}
            />
          </div>
        </Card>

        {/* Activity */}
        <Card className="overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              Activity
            </h2>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            <SettingRow
              icon={<Heart className="w-5 h-5 text-red-500" />}
              title="Likes Received"
              description="Get notified when someone likes your profile"
              enabled={settings.likesReceived}
              onChange={(v) => updateSetting('likesReceived', v)}
              loading={loadingField === 'likesReceived'}
            />
            <SettingRow
              icon={<Star className="w-5 h-5 text-yellow-500" />}
              title="Super Likes"
              description="Get notified when someone super likes you"
              enabled={settings.superLikesReceived}
              onChange={(v) => updateSetting('superLikesReceived', v)}
              loading={loadingField === 'superLikesReceived'}
            />
          </div>
        </Card>

        {/* Promotions & Updates */}
        <Card className="overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              Promotions & Updates
            </h2>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            <SettingRow
              icon={<Users className="w-5 h-5 text-indigo-500" />}
              title="Weekly Picks"
              description="Get notified about your weekly curated picks"
              enabled={settings.weeklyPicks}
              onChange={(v) => updateSetting('weeklyPicks', v)}
              loading={loadingField === 'weeklyPicks'}
            />
            <SettingRow
              icon={<Gift className="w-5 h-5 text-green-500" />}
              title="Special Offers"
              description="Get notified about discounts and promotions"
              enabled={settings.specialOffers}
              onChange={(v) => updateSetting('specialOffers', v)}
              loading={loadingField === 'specialOffers'}
            />
            <SettingRow
              icon={<Megaphone className="w-5 h-5 text-orange-500" />}
              title="Product Updates"
              description="Get notified about new features"
              enabled={settings.productUpdates}
              onChange={(v) => updateSetting('productUpdates', v)}
              loading={loadingField === 'productUpdates'}
            />
          </div>
        </Card>

        {/* Email Notifications */}
        <Card className="overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              Email Notifications
            </h2>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            <SettingRow
              icon={<Bell className="w-5 h-5 text-gray-600 dark:text-gray-400" />}
              title="Email Notifications"
              description="Receive important updates via email"
              enabled={settings.emailNotifications}
              onChange={(v) => updateSetting('emailNotifications', v)}
              loading={loadingField === 'emailNotifications'}
            />
            <SettingRow
              icon={<Megaphone className="w-5 h-5 text-gray-600 dark:text-gray-400" />}
              title="Marketing Emails"
              description="Receive promotional emails and tips"
              enabled={settings.emailMarketing}
              onChange={(v) => updateSetting('emailMarketing', v)}
              loading={loadingField === 'emailMarketing'}
            />
          </div>
        </Card>

        {/* Info note */}
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-blue-700 dark:text-blue-300">About Notifications</p>
              <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">
                We'll always notify you about important security updates and account-related information,
                even if you disable other notifications.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
