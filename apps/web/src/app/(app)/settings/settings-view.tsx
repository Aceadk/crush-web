'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore, userService } from '@crush/core';
import { Button, Card, Input } from '@crush/ui';
import { cn } from '@crush/ui';
import {
  ArrowLeft,
  User,
  Bell,
  Shield,
  Eye,
  Heart,
  MapPin,
  LogOut,
  Trash2,
  ChevronRight,
  Moon,
  Sun,
  Globe,
  Lock,
  Mail,
  Phone,
  HelpCircle,
  FileText,
  MessageSquare,
  Sparkles,
  AlertTriangle,
  Loader2,
  MapPinOff,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { useLocation } from '@/shared/hooks';

interface SettingItemProps {
  icon: React.ReactNode;
  title: string;
  description?: string;
  onClick?: () => void;
  href?: string;
  rightElement?: React.ReactNode;
  danger?: boolean;
  disabled?: boolean;
}

function SettingItem({ icon, title, description, onClick, href, rightElement, danger, disabled }: SettingItemProps) {
  const content = (
    <div
      className={cn(
        'flex items-center gap-4 p-4 rounded-xl transition-colors',
        onClick || href ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800' : '',
        danger && 'text-red-500',
        disabled && 'opacity-50 cursor-not-allowed'
      )}
      onClick={disabled ? undefined : onClick}
    >
      <div className={cn(
        'w-10 h-10 rounded-full flex items-center justify-center',
        danger ? 'bg-red-100 dark:bg-red-900/30' : 'bg-gray-100 dark:bg-gray-800'
      )}>
        {icon}
      </div>
      <div className="flex-1">
        <p className={cn(
          'font-medium',
          danger ? 'text-red-500' : 'text-gray-900 dark:text-white'
        )}>
          {title}
        </p>
        {description && (
          <p className="text-sm text-gray-500">{description}</p>
        )}
      </div>
      {rightElement || (onClick || href) && (
        <ChevronRight className="w-5 h-5 text-gray-400" />
      )}
    </div>
  );

  if (href && !disabled) {
    return <Link href={href}>{content}</Link>;
  }

  return content;
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

export default function SettingsView() {
  const router = useRouter();
  const { user, profile, signOut, refreshProfile } = useAuthStore();
  const { theme, setTheme } = useTheme();

  // Location hook
  const {
    locationName,
    permissionStatus,
    isPermissionDenied,
    isLoading: locationLoading,
    error: locationError,
    isLocationEnabled,
    enableLocation,
    disableLocation,
    refreshLocation,
  } = useLocation({ updateProfile: true });

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [preferences, setPreferences] = useState({
    notifications: {
      matches: true,
      messages: true,
      likes: true,
      marketing: false,
    },
    privacy: {
      showOnlineStatus: true,
      showDistance: true,
      showAge: true,
    },
    discovery: {
      showMe: profile?.gender === 'male' ? 'women' : 'men',
      ageMin: 18,
      ageMax: 50,
      distance: 50,
    },
  });

  const handleSignOut = useCallback(async () => {
    await signOut();
    router.replace('/');
  }, [signOut, router]);

  const handleDeleteAccount = useCallback(async () => {
    if (!user) return;

    setDeleting(true);
    try {
      await userService.deleteAccount(user.uid);
      await signOut();
      router.replace('/');
    } catch (error) {
      console.error('Failed to delete account:', error);
    } finally {
      setDeleting(false);
    }
  }, [user, signOut, router]);

  const updateNotificationPreference = (key: keyof typeof preferences.notifications, value: boolean) => {
    setPreferences(prev => ({
      ...prev,
      notifications: { ...prev.notifications, [key]: value },
    }));
  };

  const updatePrivacyPreference = (key: keyof typeof preferences.privacy, value: boolean) => {
    setPreferences(prev => ({
      ...prev,
      privacy: { ...prev.privacy, [key]: value },
    }));
  };

  const handleLocationToggle = useCallback(async (enabled: boolean) => {
    if (enabled) {
      await enableLocation();
    } else {
      await disableLocation();
    }
  }, [enableLocation, disableLocation]);

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
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
            Settings
          </h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Account section */}
        <Card className="overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              Account
            </h2>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            <SettingItem
              icon={<User className="w-5 h-5 text-gray-600 dark:text-gray-400" />}
              title="Edit Profile"
              description="Update your photos and info"
              href="/profile/edit"
            />
            <SettingItem
              icon={<Mail className="w-5 h-5 text-gray-600 dark:text-gray-400" />}
              title="Email"
              description={user?.email || 'Not set'}
            />
            <SettingItem
              icon={<Phone className="w-5 h-5 text-gray-600 dark:text-gray-400" />}
              title="Phone Number"
              description={user?.phoneNumber || 'Not set'}
            />
            <SettingItem
              icon={<Lock className="w-5 h-5 text-gray-600 dark:text-gray-400" />}
              title="Change Password"
              onClick={() => {}}
            />
          </div>
        </Card>

        {/* Premium section */}
        <Card className="overflow-hidden bg-gradient-to-r from-primary/10 to-secondary/10 border-primary/20">
          <Link href="/premium">
            <div className="p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-gray-900 dark:text-white">
                  Upgrade to Premium
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Unlimited likes, see who likes you, and more
                </p>
              </div>
              <ChevronRight className="w-5 h-5 text-primary" />
            </div>
          </Link>
        </Card>

        {/* Location section - NEW */}
        <Card className="overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              Location
            </h2>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {/* Location toggle */}
            <SettingItem
              icon={
                isLocationEnabled ? (
                  <MapPin className="w-5 h-5 text-primary" />
                ) : (
                  <MapPinOff className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                )
              }
              title="Location Services"
              description={
                isPermissionDenied
                  ? 'Permission denied - enable in browser settings'
                  : isLocationEnabled
                    ? 'Enabled - helps find matches nearby'
                    : 'Disabled - enable to find matches nearby'
              }
              rightElement={
                <Toggle
                  enabled={isLocationEnabled}
                  onChange={handleLocationToggle}
                  loading={locationLoading}
                  disabled={isPermissionDenied}
                />
              }
            />

            {/* Current location display */}
            {isLocationEnabled && locationName && (
              <div className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                      Current Location
                    </p>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {locationName}
                    </p>
                  </div>
                  <button
                    onClick={refreshLocation}
                    disabled={locationLoading}
                    className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  >
                    <RefreshCw className={cn(
                      'w-5 h-5 text-gray-500',
                      locationLoading && 'animate-spin'
                    )} />
                  </button>
                </div>
              </div>
            )}

            {/* Location error */}
            {locationError && (
              <div className="p-4 bg-red-50 dark:bg-red-900/20">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-red-600 dark:text-red-400">
                      Location Error
                    </p>
                    <p className="text-sm text-red-500 dark:text-red-400/80">
                      {locationError.message}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Permission denied help */}
            {isPermissionDenied && (
              <div className="p-4 bg-amber-50 dark:bg-amber-900/20">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-amber-600 dark:text-amber-400">
                      Location Permission Denied
                    </p>
                    <p className="text-sm text-amber-600/80 dark:text-amber-400/80">
                      To enable location services, please allow location access in your browser settings, then refresh this page.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Discovery section */}
        <Card className="overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              Discovery
            </h2>
          </div>
          <div className="p-4 space-y-6">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Show Me
                </label>
                <span className="text-sm text-primary capitalize">{preferences.discovery.showMe}</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {['men', 'women', 'everyone'].map((option) => (
                  <button
                    key={option}
                    onClick={() => setPreferences(prev => ({
                      ...prev,
                      discovery: { ...prev.discovery, showMe: option }
                    }))}
                    className={cn(
                      'py-2 px-3 rounded-lg text-sm font-medium transition-all capitalize',
                      preferences.discovery.showMe === option
                        ? 'bg-primary text-white'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                    )}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Age Range
                </label>
                <span className="text-sm text-primary">
                  {preferences.discovery.ageMin} - {preferences.discovery.ageMax}
                </span>
              </div>
              <div className="flex gap-4">
                <Input
                  type="number"
                  value={preferences.discovery.ageMin}
                  onChange={(e) => setPreferences(prev => ({
                    ...prev,
                    discovery: { ...prev.discovery, ageMin: parseInt(e.target.value) || 18 }
                  }))}
                  min={18}
                  max={99}
                  className="text-center"
                />
                <span className="self-center text-gray-400">to</span>
                <Input
                  type="number"
                  value={preferences.discovery.ageMax}
                  onChange={(e) => setPreferences(prev => ({
                    ...prev,
                    discovery: { ...prev.discovery, ageMax: parseInt(e.target.value) || 99 }
                  }))}
                  min={18}
                  max={99}
                  className="text-center"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Maximum Distance
                </label>
                <span className="text-sm text-primary">{preferences.discovery.distance} km</span>
              </div>
              <input
                type="range"
                value={preferences.discovery.distance}
                onChange={(e) => setPreferences(prev => ({
                  ...prev,
                  discovery: { ...prev.discovery, distance: parseInt(e.target.value) }
                }))}
                min={1}
                max={500}
                className="w-full accent-primary"
              />
              {!isLocationEnabled && (
                <p className="text-xs text-amber-500 mt-1">
                  Enable location services to filter by distance
                </p>
              )}
            </div>
          </div>
        </Card>

        {/* Notifications section */}
        <Card className="overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              Notifications
            </h2>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            <SettingItem
              icon={<Heart className="w-5 h-5 text-gray-600 dark:text-gray-400" />}
              title="New Matches"
              description="Get notified when you match"
              rightElement={
                <Toggle
                  enabled={preferences.notifications.matches}
                  onChange={(v) => updateNotificationPreference('matches', v)}
                />
              }
            />
            <SettingItem
              icon={<MessageSquare className="w-5 h-5 text-gray-600 dark:text-gray-400" />}
              title="Messages"
              description="Get notified for new messages"
              rightElement={
                <Toggle
                  enabled={preferences.notifications.messages}
                  onChange={(v) => updateNotificationPreference('messages', v)}
                />
              }
            />
            <SettingItem
              icon={<Sparkles className="w-5 h-5 text-gray-600 dark:text-gray-400" />}
              title="Likes"
              description="Get notified when someone likes you"
              rightElement={
                <Toggle
                  enabled={preferences.notifications.likes}
                  onChange={(v) => updateNotificationPreference('likes', v)}
                />
              }
            />
            <SettingItem
              icon={<Bell className="w-5 h-5 text-gray-600 dark:text-gray-400" />}
              title="Marketing"
              description="Tips, offers, and promotions"
              rightElement={
                <Toggle
                  enabled={preferences.notifications.marketing}
                  onChange={(v) => updateNotificationPreference('marketing', v)}
                />
              }
            />
          </div>
        </Card>

        {/* Privacy section */}
        <Card className="overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              Privacy
            </h2>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            <SettingItem
              icon={<Eye className="w-5 h-5 text-gray-600 dark:text-gray-400" />}
              title="Online Status"
              description="Let others see when you're online"
              rightElement={
                <Toggle
                  enabled={preferences.privacy.showOnlineStatus}
                  onChange={(v) => updatePrivacyPreference('showOnlineStatus', v)}
                />
              }
            />
            <SettingItem
              icon={<MapPin className="w-5 h-5 text-gray-600 dark:text-gray-400" />}
              title="Show Distance"
              description="Show how far away you are"
              rightElement={
                <Toggle
                  enabled={preferences.privacy.showDistance}
                  onChange={(v) => updatePrivacyPreference('showDistance', v)}
                  disabled={!isLocationEnabled}
                />
              }
            />
            <SettingItem
              icon={<User className="w-5 h-5 text-gray-600 dark:text-gray-400" />}
              title="Show Age"
              description="Display your age on profile"
              rightElement={
                <Toggle
                  enabled={preferences.privacy.showAge}
                  onChange={(v) => updatePrivacyPreference('showAge', v)}
                />
              }
            />
            <SettingItem
              icon={<Shield className="w-5 h-5 text-gray-600 dark:text-gray-400" />}
              title="Blocked Users"
              description="Manage blocked profiles"
              onClick={() => {}}
            />
          </div>
        </Card>

        {/* Appearance section */}
        <Card className="overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              Appearance
            </h2>
          </div>
          <div className="p-4">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 block">
              Theme
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: 'light', icon: Sun, label: 'Light' },
                { value: 'dark', icon: Moon, label: 'Dark' },
                { value: 'system', icon: Globe, label: 'System' },
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => setTheme(option.value)}
                  className={cn(
                    'flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-medium transition-all',
                    theme === option.value
                      ? 'bg-primary text-white'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                  )}
                >
                  <option.icon className="w-4 h-4" />
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </Card>

        {/* Support section */}
        <Card className="overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              Support
            </h2>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            <SettingItem
              icon={<HelpCircle className="w-5 h-5 text-gray-600 dark:text-gray-400" />}
              title="Help Center"
              onClick={() => {}}
            />
            <SettingItem
              icon={<FileText className="w-5 h-5 text-gray-600 dark:text-gray-400" />}
              title="Terms of Service"
              onClick={() => {}}
            />
            <SettingItem
              icon={<Shield className="w-5 h-5 text-gray-600 dark:text-gray-400" />}
              title="Privacy Policy"
              onClick={() => {}}
            />
          </div>
        </Card>

        {/* Danger zone */}
        <Card className="overflow-hidden">
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            <SettingItem
              icon={<LogOut className="w-5 h-5 text-gray-600 dark:text-gray-400" />}
              title="Sign Out"
              onClick={handleSignOut}
            />
            <SettingItem
              icon={<Trash2 className="w-5 h-5" />}
              title="Delete Account"
              description="Permanently delete your account and data"
              onClick={() => setShowDeleteConfirm(true)}
              danger
            />
          </div>
        </Card>

        {/* App version */}
        <div className="text-center text-sm text-gray-400">
          Crush v1.0.0
        </div>
      </div>

      {/* Delete confirmation modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <Card className="w-full max-w-md p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-500" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Delete Account?
                </h3>
                <p className="text-sm text-gray-500">
                  This action cannot be undone
                </p>
              </div>
            </div>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              All your data, matches, and messages will be permanently deleted. Are you sure you want to continue?
            </p>
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowDeleteConfirm(false)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                onClick={handleDeleteAccount}
                disabled={deleting}
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
