'use client';

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import {
  notificationService,
  userService,
  useAuthStore,
  WEB_NOTIFICATION_PREF_DEFAULTS,
  type WebNotificationPrefs,
} from '@crush/core';
import { Card } from '@crush/ui';
import { cn } from '@crush/ui';
import {
  ArrowLeft,
  Bell,
  BellOff,
  Check,
  Heart,
  Info,
  Loader2,
  MessageSquare,
  Shield,
  Sparkles,
  UserRound,
  Vibrate,
  Volume2,
} from 'lucide-react';

type PermissionState = NotificationPermission | 'unsupported';

interface ToggleProps {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  label: string;
  loading?: boolean;
  disabled?: boolean;
}

function Toggle({ enabled, onChange, label, loading, disabled }: ToggleProps) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={enabled}
      onClick={() => !loading && !disabled && onChange(!enabled)}
      disabled={loading || disabled}
      className={cn(
        'relative h-7 w-12 rounded-full transition-colors',
        enabled ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-600',
        (loading || disabled) && 'cursor-not-allowed opacity-50'
      )}
    >
      {loading ? (
        <div className="absolute inset-0 flex items-center justify-center">
          <Loader2 className="h-4 w-4 animate-spin text-white" />
        </div>
      ) : (
        <div
          className={cn(
            'absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-transform',
            enabled ? 'translate-x-6' : 'translate-x-1'
          )}
        />
      )}
    </button>
  );
}

interface SettingRowProps {
  icon: ReactNode;
  title: string;
  description: string;
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  loading?: boolean;
  disabled?: boolean;
}

function SettingRow({
  icon,
  title,
  description,
  enabled,
  onChange,
  loading,
  disabled,
}: SettingRowProps) {
  return (
    <div className="p-4">
      <div className="flex items-start gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="font-medium text-gray-900 dark:text-white">{title}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">{description}</p>
            </div>
            <Toggle
              enabled={enabled}
              onChange={onChange}
              label={title}
              loading={loading}
              disabled={disabled}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function normalizePrefs(raw?: Record<string, unknown>): WebNotificationPrefs {
  return {
    ...WEB_NOTIFICATION_PREF_DEFAULTS,
    push: asBool(raw?.push ?? raw?.pushNotifications, WEB_NOTIFICATION_PREF_DEFAULTS.push),
    email: asBool(raw?.email ?? raw?.emailNotifications, WEB_NOTIFICATION_PREF_DEFAULTS.email),
    sound: asBool(raw?.sound, WEB_NOTIFICATION_PREF_DEFAULTS.sound),
    vibration: asBool(raw?.vibration, WEB_NOTIFICATION_PREF_DEFAULTS.vibration),
    matches: asBool(raw?.matches ?? raw?.newMatches, WEB_NOTIFICATION_PREF_DEFAULTS.matches),
    messages: asBool(raw?.messages ?? raw?.newMessages, WEB_NOTIFICATION_PREF_DEFAULTS.messages),
    likes: asBool(
      raw?.likes ?? raw?.likesReceived ?? raw?.superLikesReceived,
      WEB_NOTIFICATION_PREF_DEFAULTS.likes
    ),
    profileViews: asBool(raw?.profileViews, WEB_NOTIFICATION_PREF_DEFAULTS.profileViews),
    promotions: asBool(
      raw?.promotions ?? raw?.weeklyPicks ?? raw?.specialOffers ?? raw?.productUpdates,
      WEB_NOTIFICATION_PREF_DEFAULTS.promotions
    ),
    subscriptions: asBool(raw?.subscriptions, WEB_NOTIFICATION_PREF_DEFAULTS.subscriptions),
    safetyAlerts: true,
  };
}

function asBool(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

export default function NotificationSettingsPage() {
  const router = useRouter();
  const { user, profile, refreshProfile } = useAuthStore();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingField, setLoadingField] = useState<keyof WebNotificationPrefs | null>(null);
  const [pushPermission, setPushPermission] = useState<PermissionState>('unsupported');
  const [settings, setSettings] = useState<WebNotificationPrefs>(WEB_NOTIFICATION_PREF_DEFAULTS);

  useEffect(() => {
    setPushPermission(notificationService.getPermission());
  }, []);

  useEffect(() => {
    const remotePrefs =
      (profile?.notificationPrefs as Record<string, unknown> | undefined) ??
      (profile?.notificationSettings as Record<string, unknown> | undefined);
    setSettings(normalizePrefs(remotePrefs));
  }, [profile?.notificationPrefs, profile?.notificationSettings]);

  useEffect(() => {
    if (!saved) return undefined;
    const timer = window.setTimeout(() => setSaved(false), 2000);
    return () => window.clearTimeout(timer);
  }, [saved]);

  const updateSetting = useCallback(
    async (key: keyof WebNotificationPrefs, value: boolean) => {
      if (!user || key === 'safetyAlerts') return;

      setLoadingField(key);
      setError(null);
      const previous = settings;
      let nextValue = value;
      setSettings((current) => ({ ...current, [key]: value }));

      try {
        if (key === 'push') {
          if (value) {
            const token = await notificationService.requestPermissionAndRegister(user.uid);
            const permission = notificationService.getPermission();
            setPushPermission(permission);
            nextValue = Boolean(token && permission === 'granted');
          } else {
            await notificationService.deleteCurrentTokenForUser(user.uid);
            nextValue = false;
          }
          setSettings((current) => ({ ...current, push: nextValue }));
        }

        await userService.updateNotificationSettings(user.uid, { [key]: nextValue });
        await refreshProfile();
        setSaved(true);
      } catch (updateError) {
        setSettings(previous);
        setError(
          updateError instanceof Error
            ? updateError.message
            : 'Notification settings could not be saved.'
        );
      } finally {
        setLoadingField(null);
      }
    },
    [refreshProfile, settings, user]
  );

  const pushBlocked = pushPermission === 'denied';
  const pushUnsupported = pushPermission === 'unsupported';

  return (
    <div className="min-h-screen bg-gray-50 pb-20 dark:bg-gray-900">
      <div className="sticky top-0 z-20 border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <div className="mx-auto flex max-w-2xl items-center gap-4 px-4 py-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="-ml-2 p-2 text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
            aria-label="Back"
          >
            <ArrowLeft className="h-6 w-6" />
          </button>
          <h1 className="flex-1 text-lg font-semibold text-gray-900 dark:text-white">
            Notification Settings
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
        {(pushPermission !== 'granted' || error) && (
          <Card className="overflow-hidden">
            <div className="bg-yellow-50 p-4 dark:bg-yellow-900/20">
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-yellow-100 dark:bg-yellow-800">
                  <BellOff className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-yellow-800 dark:text-yellow-200">
                    Browser Push{' '}
                    {pushBlocked ? 'Blocked' : pushUnsupported ? 'Unavailable' : 'Disabled'}
                  </p>
                  <p className="mt-1 text-sm text-yellow-700 dark:text-yellow-300">
                    {error ??
                      (pushBlocked
                        ? 'Use browser site settings to allow notifications for Crush.'
                        : pushUnsupported
                          ? 'Use a supported secure browser for web push.'
                          : 'Enable browser push for matches, messages, and account updates.')}
                  </p>
                  {!pushBlocked && !pushUnsupported && (
                    <button
                      type="button"
                      onClick={() => updateSetting('push', true)}
                      disabled={loadingField === 'push'}
                      className="mt-3 rounded-lg bg-yellow-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-yellow-700 disabled:opacity-60"
                    >
                      {loadingField === 'push' ? 'Enabling...' : 'Enable Notifications'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </Card>
        )}

        <Card className="overflow-hidden">
          <div className="border-b border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-700 dark:bg-gray-800">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Delivery
            </h2>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            <SettingRow
              icon={<Bell className="h-5 w-5 text-primary" />}
              title="Browser Push"
              description="Matches, messages, and important account updates"
              enabled={settings.push && pushPermission === 'granted'}
              onChange={(v) => updateSetting('push', v)}
              loading={loadingField === 'push'}
              disabled={pushBlocked || pushUnsupported}
            />
            <SettingRow
              icon={<Bell className="h-5 w-5 text-gray-600 dark:text-gray-400" />}
              title="Email"
              description="Important updates sent to your email"
              enabled={settings.email}
              onChange={(v) => updateSetting('email', v)}
              loading={loadingField === 'email'}
            />
            <SettingRow
              icon={<Volume2 className="h-5 w-5 text-teal-500" />}
              title="Sound"
              description="Play a sound with push notifications on your devices"
              enabled={settings.sound}
              onChange={(v) => updateSetting('sound', v)}
              loading={loadingField === 'sound'}
              disabled={!settings.push}
            />
            <SettingRow
              icon={<Vibrate className="h-5 w-5 text-teal-500" />}
              title="Vibration"
              description="Vibrate with push notifications on your devices"
              enabled={settings.vibration}
              onChange={(v) => updateSetting('vibration', v)}
              loading={loadingField === 'vibration'}
              disabled={!settings.push}
            />
          </div>
        </Card>

        <Card className="overflow-hidden">
          <div className="border-b border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-700 dark:bg-gray-800">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Categories
            </h2>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            <SettingRow
              icon={<Heart className="h-5 w-5 text-pink-500" />}
              title="New Matches"
              description="When a like turns into a match"
              enabled={settings.matches}
              onChange={(v) => updateSetting('matches', v)}
              loading={loadingField === 'matches'}
            />
            <SettingRow
              icon={<MessageSquare className="h-5 w-5 text-blue-500" />}
              title="Messages"
              description="New messages and message requests"
              enabled={settings.messages}
              onChange={(v) => updateSetting('messages', v)}
              loading={loadingField === 'messages'}
            />
            <SettingRow
              icon={<Sparkles className="h-5 w-5 text-violet-500" />}
              title="Likes"
              description="Likes and super likes received"
              enabled={settings.likes}
              onChange={(v) => updateSetting('likes', v)}
              loading={loadingField === 'likes'}
            />
            <SettingRow
              icon={<UserRound className="h-5 w-5 text-indigo-500" />}
              title="Profile Activity"
              description="Profile views and weekly picks"
              enabled={settings.profileViews}
              onChange={(v) => updateSetting('profileViews', v)}
              loading={loadingField === 'profileViews'}
            />
            <SettingRow
              icon={<Bell className="h-5 w-5 text-orange-500" />}
              title="Promotions"
              description="Offers, product updates, and recommendations"
              enabled={settings.promotions}
              onChange={(v) => updateSetting('promotions', v)}
              loading={loadingField === 'promotions'}
            />
            <SettingRow
              icon={<Shield className="h-5 w-5 text-emerald-500" />}
              title="Safety Alerts"
              description="Security, call safety, and urgent account alerts"
              enabled
              onChange={() => {}}
              disabled
            />
          </div>
        </Card>

        <div className="rounded-xl bg-blue-50 p-4 dark:bg-blue-900/20">
          <div className="flex items-start gap-3">
            <Info className="mt-0.5 h-5 w-5 shrink-0 text-blue-500" />
            <p className="text-sm text-blue-600 dark:text-blue-400">
              Safety alerts remain on so account, trust, and call-safety events can still reach you.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
