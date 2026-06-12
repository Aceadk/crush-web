'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore, userService, authService } from '@crush/core';
import {
  Button,
  Card,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@crush/ui';
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
import { toast } from 'sonner';
import { useTheme } from '@/shared/components/theme';
import { type Theme } from '@/shared/lib/theme';
import { useLocation } from '@/shared/hooks';
import { PromoCodeInput } from '@/features/premium';

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

function SettingItem({
  icon,
  title,
  description,
  onClick,
  href,
  rightElement,
  danger,
  disabled,
}: SettingItemProps) {
  const content = (
    <div
      className={cn(
        'flex items-center gap-4 rounded-xl p-4 transition-colors',
        onClick || href ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800' : '',
        danger && 'text-red-500',
        disabled && 'cursor-not-allowed opacity-50'
      )}
      onClick={disabled ? undefined : onClick}
    >
      <div
        className={cn(
          'flex h-10 w-10 items-center justify-center rounded-full',
          danger ? 'bg-red-100 dark:bg-red-900/30' : 'bg-gray-100 dark:bg-gray-800'
        )}
      >
        {icon}
      </div>
      <div className="flex-1">
        <p className={cn('font-medium', danger ? 'text-red-500' : 'text-gray-900 dark:text-white')}>
          {title}
        </p>
        {description && <p className="text-sm text-gray-500">{description}</p>}
      </div>
      {rightElement || ((onClick || href) && <ChevronRight className="h-5 w-5 text-gray-500" />)}
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

const themeOptions: { value: Theme; icon: typeof Sun; label: string }[] = [
  { value: 'light', icon: Sun, label: 'Light' },
  { value: 'dark', icon: Moon, label: 'Dark' },
  { value: 'system', icon: Globe, label: 'System' },
];

function Toggle({ enabled, onChange, loading, disabled }: ToggleProps) {
  return (
    <button
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

export default function SettingsView() {
  const router = useRouter();
  const { user, profile, signOut } = useAuthStore();
  const { theme, setTheme } = useTheme();

  // Location hook
  const {
    locationName,
    isPermissionDenied,
    isLoading: locationLoading,
    error: locationError,
    isLocationEnabled,
    enableLocation,
    disableLocation,
    refreshLocation,
  } = useLocation({ updateProfile: true });

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [sendingReset, setSendingReset] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const [notificationPrefs, setNotificationPrefs] = useState({
    matches: true,
    messages: true,
    likes: true,
    marketing: false,
  });

  useEffect(() => {
    const remotePrefs = profile?.notificationPrefs ?? profile?.notificationSettings;
    if (!remotePrefs) return;
    setNotificationPrefs({
      matches: remotePrefs.matches ?? remotePrefs.newMatches ?? true,
      messages: remotePrefs.messages ?? remotePrefs.newMessages ?? true,
      likes: remotePrefs.likes ?? remotePrefs.likesReceived ?? true,
      marketing: remotePrefs.promotions ?? remotePrefs.emailMarketing ?? false,
    });
  }, [profile?.notificationPrefs, profile?.notificationSettings]);

  const handleSignOut = useCallback(async () => {
    try {
      await signOut();
      router.replace('/');
    } catch (error) {
      console.error('Failed to sign out:', error);
    }
  }, [signOut, router]);

  const requestSignOutConfirmation = useCallback(() => {
    toast('Sign out now?', {
      description: 'You can stay logged in by selecting Cancel.',
      duration: 10000,
      action: {
        label: 'Sign out',
        onClick: () => {
          void handleSignOut();
        },
      },
      cancel: {
        label: 'Cancel',
        onClick: () => {
          // Intentionally no-op; user stays signed in.
        },
      },
    });
  }, [handleSignOut]);

  const handleDeleteAccount = useCallback(async () => {
    if (!user) return;

    setDeleting(true);
    try {
      const result = await userService.deleteAccount(user.uid);
      // Account is now scheduled for deletion, not immediately deleted
      await signOut();
      // Redirect with message about grace period
      router.replace(`/auth/login?deleted=scheduled&days=${result.gracePeriodDays}`);
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Failed to delete account:', error);
      }
    } finally {
      setDeleting(false);
    }
  }, [user, signOut, router]);

  const updateNotificationPreference = async (
    key: keyof typeof notificationPrefs,
    value: boolean
  ) => {
    if (!user) return;
    setNotificationPrefs((prev) => ({
      ...prev,
      [key]: value,
    }));
    const remoteKey = key === 'marketing' ? 'promotions' : key;
    try {
      await userService.updateNotificationSettings(user.uid, { [remoteKey]: value });
    } catch (error) {
      setNotificationPrefs((prev) => ({
        ...prev,
        [key]: !value,
      }));
      if (process.env.NODE_ENV === 'development') {
        console.error('Failed to update notification preference:', error);
      }
    }
  };

  const handleLocationToggle = useCallback(
    async (enabled: boolean) => {
      if (enabled) {
        await enableLocation();
      } else {
        await disableLocation();
      }
    },
    [enableLocation, disableLocation]
  );

  const handleSendPasswordReset = useCallback(async () => {
    if (!user?.email) return;

    setSendingReset(true);
    try {
      await authService.sendPasswordReset(user.email);
      setResetSent(true);
    } catch (error) {
      console.error('Failed to send password reset:', error);
    } finally {
      setSendingReset(false);
    }
  }, [user?.email]);

  return (
    <div className="min-h-screen bg-gray-50 pb-20 dark:bg-gray-900">
      {/* Header */}
      <div className="sticky top-0 z-20 border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <div className="mx-auto flex max-w-2xl items-center gap-4 px-4 py-4">
          <button
            onClick={() => router.back()}
            className="-ml-2 p-2 text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
            aria-label="Go back"
          >
            <ArrowLeft className="h-6 w-6" />
          </button>
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Settings</h1>
        </div>
      </div>

      <div className="mx-auto max-w-2xl space-y-6 px-4 py-6">
        {/* Account section */}
        <Card className="overflow-hidden">
          <div className="border-b border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-700 dark:bg-gray-800">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Account
            </h2>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            <SettingItem
              icon={<User className="h-5 w-5 text-gray-600 dark:text-gray-400" />}
              title="Edit Profile"
              description="Update your photos and info"
              href="/profile/edit"
            />
            <SettingItem
              icon={<Mail className="h-5 w-5 text-gray-600 dark:text-gray-400" />}
              title="Email"
              description={user?.email || 'Not set'}
            />
            <SettingItem
              icon={<Phone className="h-5 w-5 text-gray-600 dark:text-gray-400" />}
              title="Phone Number"
              description={user?.phoneNumber || 'Not set'}
            />
            <SettingItem
              icon={<Lock className="h-5 w-5 text-gray-600 dark:text-gray-400" />}
              title="Account Management"
              description="Email, password, data export"
              href="/settings/account"
            />
          </div>
        </Card>

        {/* Premium section - show upgrade if not premium */}
        {!profile?.isPremium && (
          <Card className="overflow-hidden border-primary/20 bg-gradient-to-r from-primary/10 to-secondary/10">
            <Link href="/premium">
              <div className="flex items-center gap-4 p-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-primary to-secondary">
                  <Sparkles className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-gray-900 dark:text-white">Upgrade to Premium</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Unlimited likes, see who likes you, and more
                  </p>
                </div>
                <ChevronRight className="h-5 w-5 text-primary" />
              </div>
            </Link>
          </Card>
        )}

        {/* Premium status - show if already premium */}
        {profile?.isPremium && (
          <Card className="overflow-hidden border-primary/20 bg-gradient-to-r from-primary/10 to-secondary/10">
            <Link href="/premium">
              <div className="flex items-center gap-4 p-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-primary to-secondary">
                  <Sparkles className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-gray-900 dark:text-white">Premium Member</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Enjoy all premium features
                  </p>
                </div>
                <ChevronRight className="h-5 w-5 text-primary" />
              </div>
            </Link>
          </Card>
        )}

        {/* Promo Code section - only show if not premium */}
        {!profile?.isPremium && <PromoCodeInput collapsible={true} defaultExpanded={false} />}

        {/* Location section - NEW */}
        <Card className="overflow-hidden">
          <div className="border-b border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-700 dark:bg-gray-800">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Location
            </h2>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {/* Location toggle */}
            <SettingItem
              icon={
                isLocationEnabled ? (
                  <MapPin className="h-5 w-5 text-primary" />
                ) : (
                  <MapPinOff className="h-5 w-5 text-gray-600 dark:text-gray-400" />
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
                    <p className="mb-1 text-sm text-gray-500 dark:text-gray-400">
                      Current Location
                    </p>
                    <p className="font-medium text-gray-900 dark:text-white">{locationName}</p>
                  </div>
                  <button
                    onClick={refreshLocation}
                    disabled={locationLoading}
                    className="rounded-full p-2 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
                  >
                    <RefreshCw
                      className={cn('h-5 w-5 text-gray-500', locationLoading && 'animate-spin')}
                    />
                  </button>
                </div>
              </div>
            )}

            {/* Location error */}
            {locationError && (
              <div className="bg-red-50 p-4 dark:bg-red-900/20">
                <div className="flex items-start gap-3">
                  <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-500" />
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
              <div className="bg-amber-50 p-4 dark:bg-amber-900/20">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-500" />
                  <div>
                    <p className="text-sm font-medium text-amber-600 dark:text-amber-400">
                      Location Permission Denied
                    </p>
                    <p className="text-sm text-amber-600/80 dark:text-amber-400/80">
                      To enable location services, please allow location access in your browser
                      settings, then refresh this page.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Discovery section */}
        <Card className="overflow-hidden">
          <div className="border-b border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-700 dark:bg-gray-800">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Discovery
            </h2>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            <SettingItem
              icon={<Heart className="h-5 w-5 text-gray-600 dark:text-gray-400" />}
              title="Discovery Preferences"
              description="Distance, age range, and who you see"
              href="/settings/discovery"
            />
          </div>
        </Card>

        {/* Notifications section */}
        <Card className="overflow-hidden">
          <div className="border-b border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-700 dark:bg-gray-800">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Notifications
            </h2>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            <SettingItem
              icon={<Heart className="h-5 w-5 text-gray-600 dark:text-gray-400" />}
              title="New Matches"
              description="Get notified when you match"
              rightElement={
                <Toggle
                  enabled={notificationPrefs.matches}
                  onChange={(v) => updateNotificationPreference('matches', v)}
                />
              }
            />
            <SettingItem
              icon={<MessageSquare className="h-5 w-5 text-gray-600 dark:text-gray-400" />}
              title="Messages"
              description="Get notified for new messages"
              rightElement={
                <Toggle
                  enabled={notificationPrefs.messages}
                  onChange={(v) => updateNotificationPreference('messages', v)}
                />
              }
            />
            <SettingItem
              icon={<Sparkles className="h-5 w-5 text-gray-600 dark:text-gray-400" />}
              title="Likes"
              description="Get notified when someone likes you"
              rightElement={
                <Toggle
                  enabled={notificationPrefs.likes}
                  onChange={(v) => updateNotificationPreference('likes', v)}
                />
              }
            />
            <SettingItem
              icon={<Bell className="h-5 w-5 text-gray-600 dark:text-gray-400" />}
              title="Marketing"
              description="Tips, offers, and promotions"
              rightElement={
                <Toggle
                  enabled={notificationPrefs.marketing}
                  onChange={(v) => updateNotificationPreference('marketing', v)}
                />
              }
            />
          </div>
        </Card>

        {/* Privacy section */}
        <Card className="overflow-hidden">
          <div className="border-b border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-700 dark:bg-gray-800">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Privacy & Safety
            </h2>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            <SettingItem
              icon={<Eye className="h-5 w-5 text-purple-500" />}
              title="Incognito Mode"
              description="Browse privately without being seen"
              href="/settings/incognito"
            />
            <SettingItem
              icon={<Eye className="h-5 w-5 text-gray-600 dark:text-gray-400" />}
              title="Privacy Settings"
              description="Control what others can see"
              href="/settings/privacy"
            />
            <SettingItem
              icon={<Bell className="h-5 w-5 text-gray-600 dark:text-gray-400" />}
              title="Notification Settings"
              description="Manage push & email notifications"
              href="/settings/notifications"
            />
            <SettingItem
              icon={<Shield className="h-5 w-5 text-gray-600 dark:text-gray-400" />}
              title="Blocked Users"
              description="Manage blocked profiles"
              href="/settings/blocked"
            />
          </div>
        </Card>

        {/* Appearance section */}
        <Card className="overflow-hidden">
          <div className="border-b border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-700 dark:bg-gray-800">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Appearance
            </h2>
          </div>
          <div className="p-4">
            <label className="mb-3 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Theme
            </label>
            <div className="grid grid-cols-3 gap-2">
              {themeOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setTheme(option.value)}
                  className={cn(
                    'flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-medium transition-all',
                    theme === option.value
                      ? 'bg-primary text-white'
                      : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                  )}
                >
                  <option.icon className="h-4 w-4" />
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </Card>

        {/* Support section */}
        <Card className="overflow-hidden">
          <div className="border-b border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-700 dark:bg-gray-800">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Support
            </h2>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            <SettingItem
              icon={<HelpCircle className="h-5 w-5 text-gray-600 dark:text-gray-400" />}
              title="Help Center"
              href="/help"
            />
            <SettingItem
              icon={<FileText className="h-5 w-5 text-gray-600 dark:text-gray-400" />}
              title="Terms of Service"
              href="/terms"
            />
            <SettingItem
              icon={<Shield className="h-5 w-5 text-gray-600 dark:text-gray-400" />}
              title="Privacy Policy"
              href="/privacy"
            />
          </div>
        </Card>

        {/* Danger zone */}
        <Card className="overflow-hidden">
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            <SettingItem
              icon={<LogOut className="h-5 w-5 text-gray-600 dark:text-gray-400" />}
              title="Sign Out"
              onClick={requestSignOutConfirmation}
            />
            <SettingItem
              icon={<Trash2 className="h-5 w-5" />}
              title="Delete Account"
              description="Permanently delete your account and data"
              onClick={() => setShowDeleteConfirm(true)}
              danger
            />
          </div>
        </Card>

        {/* App version */}
        <div className="text-center text-sm text-gray-500">Crush v1.0.0</div>
      </div>

      {/* Delete confirmation modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-md p-6">
            <div className="mb-4 flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
                <AlertTriangle className="h-6 w-6 text-red-500" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Delete Account?
                </h3>
                <p className="text-sm text-gray-500">You have 14 days to change your mind</p>
              </div>
            </div>
            <p className="mb-6 text-gray-600 dark:text-gray-300">
              Your account will be scheduled for deletion. After 14 days, all your data, matches,
              and messages will be permanently removed. You can cancel by signing back in within the
              grace period.
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

      {/* Password Reset Dialog */}
      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{resetSent ? 'Email Sent!' : 'Change Password'}</DialogTitle>
            <DialogDescription>
              {resetSent
                ? `We've sent a password reset link to ${user?.email}. Check your inbox and follow the instructions.`
                : `We'll send a password reset link to ${user?.email}.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            {resetSent ? (
              <Button
                onClick={() => {
                  setShowPasswordDialog(false);
                  setResetSent(false);
                }}
              >
                Done
              </Button>
            ) : (
              <>
                <Button variant="outline" onClick={() => setShowPasswordDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSendPasswordReset} disabled={sendingReset}>
                  {sendingReset ? 'Sending...' : 'Send Reset Link'}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
