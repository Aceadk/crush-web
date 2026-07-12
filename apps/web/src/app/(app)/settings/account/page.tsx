'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore, userService, authService, type TrustedDevice } from '@crush/core';
import { Card, Button, Input, Badge } from '@crush/ui';
import { cn } from '@crush/ui';
import { ManageSubscriptionButton } from '@/features/premium';
import {
  ArrowLeft,
  Mail,
  Phone,
  Lock,
  Shield,
  Download,
  Eye,
  EyeOff,
  Loader2,
  Check,
  CheckCircle2,
  XCircle,
  Pause,
  Play,
  Laptop,
} from 'lucide-react';

export default function AccountManagementPage() {
  const router = useRouter();
  const {
    user,
    profile,
    refreshProfile,
    trustedDevices,
    deviceTrustLoading,
    loadTrustedDevices,
    revokeTrustedDevice,
    trustCurrentDevice,
  } = useAuthStore();

  // Email change state
  const [showEmailChange, setShowEmailChange] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [emailPassword, setEmailPassword] = useState('');
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [emailSuccess, setEmailSuccess] = useState(false);

  // Password change state
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  // Data export state
  const [exportLoading, setExportLoading] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);

  // Account pause state
  const [pauseLoading, setPauseLoading] = useState(false);

  // Verification state
  const [verificationSent, setVerificationSent] = useState(false);
  const [verificationLoading, setVerificationLoading] = useState(false);
  const [deviceActionLoadingId, setDeviceActionLoadingId] = useState<string | null>(null);
  const [deviceActionError, setDeviceActionError] = useState<string | null>(null);
  const [deviceActionSuccess, setDeviceActionSuccess] = useState<string | null>(null);

  const isEmailVerified = user?.emailVerified;
  // "Hide Profile" = discovery visibility (canonical
  // profile.preferences.hideFromDiscovery, surfaced as settings.showInDiscovery)
  // — the field the backend deck and the mobile app honor. It previously
  // toggled showOnlineStatus, which never hid the profile.
  const isPaused = profile?.settings?.showInDiscovery === false;
  const currentTrustedDevice = trustedDevices.find((device) => device.isCurrentDevice);

  useEffect(() => {
    if (!user || !user.email || !user.emailVerified) {
      return;
    }

    void loadTrustedDevices();
  }, [user, loadTrustedDevices]);

  const formatTrustedDeviceTime = useCallback((timestamp: string) => {
    const parsed = Date.parse(timestamp);
    if (Number.isNaN(parsed)) {
      return 'Unknown';
    }

    return new Date(parsed).toLocaleString();
  }, []);

  const handleTrustCurrentDevice = useCallback(async () => {
    setDeviceActionError(null);
    setDeviceActionSuccess(null);
    setDeviceActionLoadingId('current-device');
    try {
      await trustCurrentDevice();
      await loadTrustedDevices();
      setDeviceActionSuccess('This device is now trusted.');
    } catch (error) {
      setDeviceActionError(error instanceof Error ? error.message : 'Failed to trust this device.');
    } finally {
      setDeviceActionLoadingId(null);
    }
  }, [trustCurrentDevice, loadTrustedDevices]);

  const handleRevokeDevice = useCallback(
    async (device: TrustedDevice & { isCurrentDevice?: boolean }) => {
      if (device.isCurrentDevice) {
        return;
      }

      setDeviceActionError(null);
      setDeviceActionSuccess(null);
      setDeviceActionLoadingId(device.deviceId);
      try {
        await revokeTrustedDevice(device.deviceId);
        await loadTrustedDevices();
        setDeviceActionSuccess('Device removed from trusted list.');
      } catch (error) {
        setDeviceActionError(
          error instanceof Error ? error.message : 'Failed to remove trusted device.'
        );
      } finally {
        setDeviceActionLoadingId(null);
      }
    },
    [revokeTrustedDevice, loadTrustedDevices]
  );

  const handleEmailChange = useCallback(async () => {
    if (!user || !newEmail || !emailPassword) return;

    setEmailLoading(true);
    setEmailError('');

    try {
      // This would require Firebase reauthentication and updateEmail
      // For now, send verification email to new address
      await authService.updateEmail(newEmail, emailPassword);
      setEmailSuccess(true);
      setNewEmail('');
      setEmailPassword('');
      await refreshProfile();
    } catch (error) {
      setEmailError(error instanceof Error ? error.message : 'Failed to update email');
    } finally {
      setEmailLoading(false);
    }
  }, [user, newEmail, emailPassword, refreshProfile]);

  const handlePasswordChange = useCallback(async () => {
    if (!user || !currentPassword || !newPassword) return;

    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match');
      return;
    }

    if (newPassword.length < 8) {
      setPasswordError('Password must be at least 8 characters');
      return;
    }

    setPasswordLoading(true);
    setPasswordError('');

    try {
      await authService.updatePassword(currentPassword, newPassword);
      setPasswordSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setShowPasswordChange(false);
    } catch (error) {
      setPasswordError(error instanceof Error ? error.message : 'Failed to update password');
    } finally {
      setPasswordLoading(false);
    }
  }, [user, currentPassword, newPassword, confirmPassword]);

  const handleSendVerification = useCallback(async () => {
    if (!user) return;

    setVerificationLoading(true);
    try {
      await authService.sendEmailVerification();
      setVerificationSent(true);
    } catch (error) {
      console.error('Failed to send verification:', error);
    } finally {
      setVerificationLoading(false);
    }
  }, [user]);

  const handleExportData = useCallback(async () => {
    if (!user) return;

    setExportLoading(true);
    try {
      const data = await userService.exportUserData(user.uid);

      // Download as JSON file
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `crush-data-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setExportSuccess(true);
      setTimeout(() => setExportSuccess(false), 3000);
    } catch (error) {
      console.error('Failed to export data:', error);
    } finally {
      setExportLoading(false);
    }
  }, [user]);

  const handleTogglePause = useCallback(async () => {
    if (!user) return;

    setPauseLoading(true);
    try {
      await userService.updateUserSettings(user.uid, {
        showInDiscovery: isPaused,
      });
      await refreshProfile();
    } catch (error) {
      console.error('Failed to toggle pause:', error);
    } finally {
      setPauseLoading(false);
    }
  }, [user, isPaused, refreshProfile]);

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
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
            Account Management
          </h1>
        </div>
      </div>

      <div className="mx-auto max-w-2xl space-y-6 px-4 py-6">
        {/* Email Section */}
        <Card className="overflow-hidden">
          <div className="border-b border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-700 dark:bg-gray-800">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Email Address
            </h2>
          </div>
          <div className="p-4">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
                  <Mail className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {user?.email || 'Not set'}
                  </p>
                  <div className="flex items-center gap-2">
                    {isEmailVerified ? (
                      <Badge className="border-0 bg-green-100 text-green-700">
                        <CheckCircle2 className="mr-1 h-3 w-3" />
                        Verified
                      </Badge>
                    ) : (
                      <Badge className="border-0 bg-amber-100 text-amber-700">
                        <XCircle className="mr-1 h-3 w-3" />
                        Not verified
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
              {!isEmailVerified && user?.email && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSendVerification}
                  disabled={verificationLoading || verificationSent}
                >
                  {verificationLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : verificationSent ? (
                    <>
                      <Check className="mr-1 h-4 w-4" />
                      Sent
                    </>
                  ) : (
                    'Verify'
                  )}
                </Button>
              )}
            </div>

            {!showEmailChange ? (
              <Button variant="outline" className="w-full" onClick={() => setShowEmailChange(true)}>
                Change Email
              </Button>
            ) : (
              <div className="space-y-3 border-t border-gray-100 pt-4 dark:border-gray-800">
                <Input
                  type="email"
                  placeholder="New email address"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                />
                <Input
                  type="password"
                  placeholder="Current password"
                  value={emailPassword}
                  onChange={(e) => setEmailPassword(e.target.value)}
                />
                {emailError && <p className="text-sm text-red-500">{emailError}</p>}
                {emailSuccess && (
                  <p className="text-sm text-green-500">
                    Verification email sent to your new address
                  </p>
                )}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setShowEmailChange(false);
                      setNewEmail('');
                      setEmailPassword('');
                      setEmailError('');
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={handleEmailChange}
                    disabled={emailLoading || !newEmail || !emailPassword}
                  >
                    {emailLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Update Email'}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Phone Section */}
        <Card className="overflow-hidden">
          <div className="border-b border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-700 dark:bg-gray-800">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Phone Number
            </h2>
          </div>
          <div className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
                <Phone className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-gray-900 dark:text-white">
                  {user?.phoneNumber || 'Not linked'}
                </p>
                {user?.phoneNumber && (
                  <Badge className="border-0 bg-green-100 text-green-700">
                    <CheckCircle2 className="mr-1 h-3 w-3" />
                    Verified
                  </Badge>
                )}
              </div>
            </div>
            <p className="mt-3 text-sm text-gray-500">
              To change your phone number, please contact support.
            </p>
          </div>
        </Card>

        {/* Password Section */}
        <Card className="overflow-hidden">
          <div className="border-b border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-700 dark:bg-gray-800">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Password
            </h2>
          </div>
          <div className="p-4">
            {!showPasswordChange ? (
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setShowPasswordChange(true)}
                disabled={!user?.email}
              >
                <Lock className="mr-2 h-4 w-4" />
                Change Password
              </Button>
            ) : (
              <div className="space-y-3">
                <div className="relative">
                  <Input
                    type={showCurrentPassword ? 'text' : 'password'}
                    placeholder="Current password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-600"
                  >
                    {showCurrentPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                <div className="relative">
                  <Input
                    type={showNewPassword ? 'text' : 'password'}
                    placeholder="New password (min 8 characters)"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-600"
                  >
                    {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <Input
                  type="password"
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
                {passwordError && <p className="text-sm text-red-500">{passwordError}</p>}
                {passwordSuccess && (
                  <p className="text-sm text-green-500">Password updated successfully</p>
                )}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setShowPasswordChange(false);
                      setCurrentPassword('');
                      setNewPassword('');
                      setConfirmPassword('');
                      setPasswordError('');
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={handlePasswordChange}
                    disabled={
                      passwordLoading || !currentPassword || !newPassword || !confirmPassword
                    }
                  >
                    {passwordLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      'Update Password'
                    )}
                  </Button>
                </div>
              </div>
            )}
            {!user?.email && (
              <p className="mt-2 text-sm text-gray-500">Link an email address to set a password</p>
            )}
          </div>
        </Card>

        {profile?.stripeCustomerId && (
          <Card className="overflow-hidden">
            <div className="border-b border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-700 dark:bg-gray-800">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Billing & Subscription
              </h2>
            </div>
            <div className="p-4">
              <ManageSubscriptionButton />
            </div>
          </Card>
        )}

        {/* Account Status */}
        <Card className="overflow-hidden">
          <div className="border-b border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-700 dark:bg-gray-800">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Account Status
            </h2>
          </div>
          <div className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    'flex h-10 w-10 items-center justify-center rounded-full',
                    isPaused
                      ? 'bg-amber-100 dark:bg-amber-900/30'
                      : 'bg-green-100 dark:bg-green-900/30'
                  )}
                >
                  {isPaused ? (
                    <Pause className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                  ) : (
                    <Play className="h-5 w-5 text-green-600 dark:text-green-400" />
                  )}
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {isPaused ? 'Profile Hidden' : 'Profile Active'}
                  </p>
                  <p className="text-sm text-gray-500">
                    {isPaused
                      ? 'Your profile is hidden from discovery'
                      : 'Your profile is visible to others'}
                  </p>
                </div>
              </div>
              <Button variant="outline" onClick={handleTogglePause} disabled={pauseLoading}>
                {pauseLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : isPaused ? (
                  'Show Profile'
                ) : (
                  'Hide Profile'
                )}
              </Button>
            </div>
          </div>
        </Card>

        {/* Trusted Devices */}
        <Card className="overflow-hidden">
          <div className="border-b border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-700 dark:bg-gray-800">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Trusted Devices
            </h2>
          </div>
          <div className="space-y-4 p-4">
            {!user?.email || !user.emailVerified ? (
              <p className="text-sm text-gray-500">
                Trusted-device verification is available after email verification.
              </p>
            ) : (
              <>
                {!currentTrustedDevice && (
                  <Button
                    className="w-full"
                    onClick={handleTrustCurrentDevice}
                    disabled={deviceActionLoadingId === 'current-device' || deviceTrustLoading}
                  >
                    {deviceActionLoadingId === 'current-device' ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Trusting...
                      </>
                    ) : (
                      <>
                        <Shield className="mr-2 h-4 w-4" />
                        Trust This Device
                      </>
                    )}
                  </Button>
                )}

                {trustedDevices.length === 0 ? (
                  <p className="text-sm text-gray-500">
                    No trusted devices yet. Trust this device to avoid extra verification.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {trustedDevices.map((device) => (
                      <div
                        key={device.deviceId}
                        className="flex items-start gap-3 rounded-xl border border-gray-200 p-3 dark:border-gray-700"
                      >
                        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
                          <Laptop className="h-5 w-5 text-gray-600 dark:text-gray-300" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="truncate font-medium text-gray-900 dark:text-white">
                              {device.deviceName}
                            </p>
                            {device.isCurrentDevice && (
                              <Badge className="border-0 bg-green-100 text-green-700">
                                Current device
                              </Badge>
                            )}
                          </div>
                          <p className="truncate text-xs text-gray-500">{device.userAgent}</p>
                          <p className="mt-1 text-xs text-gray-500">
                            Last active: {formatTrustedDeviceTime(device.lastUsedAt)}
                          </p>
                        </div>
                        {!device.isCurrentDevice && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => void handleRevokeDevice(device)}
                            disabled={
                              deviceActionLoadingId === device.deviceId || deviceTrustLoading
                            }
                          >
                            {deviceActionLoadingId === device.deviceId ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              'Remove'
                            )}
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {deviceActionSuccess && <p className="text-sm text-green-600">{deviceActionSuccess}</p>}
            {deviceActionError && <p className="text-sm text-red-500">{deviceActionError}</p>}
          </div>
        </Card>

        {/* Data Export */}
        <Card className="overflow-hidden">
          <div className="border-b border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-700 dark:bg-gray-800">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Your Data
            </h2>
          </div>
          <div className="p-4">
            <div className="mb-4 flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
                <Download className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-gray-900 dark:text-white">Export Your Data</p>
                <p className="text-sm text-gray-500">
                  Download a copy of your profile, matches, messages, and settings
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              className="w-full"
              onClick={handleExportData}
              disabled={exportLoading}
            >
              {exportLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Preparing...
                </>
              ) : exportSuccess ? (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Downloaded!
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Download My Data
                </>
              )}
            </Button>
          </div>
        </Card>

        {/* Security Note */}
        <div className="rounded-xl bg-blue-50 p-4 dark:bg-blue-900/20">
          <div className="flex items-start gap-3">
            <Shield className="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-500" />
            <div>
              <p className="font-medium text-blue-700 dark:text-blue-300">Security Tips</p>
              <ul className="mt-1 space-y-1 text-sm text-blue-600 dark:text-blue-400">
                <li>Use a strong, unique password</li>
                <li>Verify your email for account recovery</li>
                <li>Never share your login credentials</li>
                <li>Review and remove old trusted devices regularly</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
