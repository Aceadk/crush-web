'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore, userService, authService } from '@crush/core';
import { Card, Button, Input, Badge } from '@crush/ui';
import { cn } from '@crush/ui';
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
  AlertTriangle,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Pause,
  Play,
} from 'lucide-react';

export default function AccountManagementPage() {
  const router = useRouter();
  const { user, profile, refreshProfile } = useAuthStore();

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

  const isEmailVerified = user?.emailVerified;
  const isPaused = profile?.settings?.showOnlineStatus === false;

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
        showOnlineStatus: isPaused,
      });
      await refreshProfile();
    } catch (error) {
      console.error('Failed to toggle pause:', error);
    } finally {
      setPauseLoading(false);
    }
  }, [user, isPaused, refreshProfile]);

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
            Account Management
          </h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Email Section */}
        <Card className="overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              Email Address
            </h2>
          </div>
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                  <Mail className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {user?.email || 'Not set'}
                  </p>
                  <div className="flex items-center gap-2">
                    {isEmailVerified ? (
                      <Badge className="bg-green-100 text-green-700 border-0">
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        Verified
                      </Badge>
                    ) : (
                      <Badge className="bg-amber-100 text-amber-700 border-0">
                        <XCircle className="w-3 h-3 mr-1" />
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
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : verificationSent ? (
                    <>
                      <Check className="w-4 h-4 mr-1" />
                      Sent
                    </>
                  ) : (
                    'Verify'
                  )}
                </Button>
              )}
            </div>

            {!showEmailChange ? (
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setShowEmailChange(true)}
              >
                Change Email
              </Button>
            ) : (
              <div className="space-y-3 pt-4 border-t border-gray-100 dark:border-gray-800">
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
                {emailError && (
                  <p className="text-sm text-red-500">{emailError}</p>
                )}
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
                    {emailLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      'Update Email'
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Phone Section */}
        <Card className="overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              Phone Number
            </h2>
          </div>
          <div className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                <Phone className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-gray-900 dark:text-white">
                  {user?.phoneNumber || 'Not linked'}
                </p>
                {user?.phoneNumber && (
                  <Badge className="bg-green-100 text-green-700 border-0">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    Verified
                  </Badge>
                )}
              </div>
            </div>
            <p className="text-sm text-gray-500 mt-3">
              To change your phone number, please contact support.
            </p>
          </div>
        </Card>

        {/* Password Section */}
        <Card className="overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
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
                <Lock className="w-4 h-4 mr-2" />
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
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showCurrentPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
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
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showNewPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
                <Input
                  type="password"
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
                {passwordError && (
                  <p className="text-sm text-red-500">{passwordError}</p>
                )}
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
                    disabled={passwordLoading || !currentPassword || !newPassword || !confirmPassword}
                  >
                    {passwordLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      'Update Password'
                    )}
                  </Button>
                </div>
              </div>
            )}
            {!user?.email && (
              <p className="text-sm text-gray-500 mt-2">
                Link an email address to set a password
              </p>
            )}
          </div>
        </Card>

        {/* Account Status */}
        <Card className="overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              Account Status
            </h2>
          </div>
          <div className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={cn(
                  'w-10 h-10 rounded-full flex items-center justify-center',
                  isPaused ? 'bg-amber-100 dark:bg-amber-900/30' : 'bg-green-100 dark:bg-green-900/30'
                )}>
                  {isPaused ? (
                    <Pause className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                  ) : (
                    <Play className="w-5 h-5 text-green-600 dark:text-green-400" />
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
              <Button
                variant="outline"
                onClick={handleTogglePause}
                disabled={pauseLoading}
              >
                {pauseLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : isPaused ? (
                  'Show Profile'
                ) : (
                  'Hide Profile'
                )}
              </Button>
            </div>
          </div>
        </Card>

        {/* Data Export */}
        <Card className="overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              Your Data
            </h2>
          </div>
          <div className="p-4">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <Download className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-gray-900 dark:text-white">
                  Export Your Data
                </p>
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
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Preparing...
                </>
              ) : exportSuccess ? (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Downloaded!
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Download My Data
                </>
              )}
            </Button>
          </div>
        </Card>

        {/* Security Note */}
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-blue-700 dark:text-blue-300">
                Security Tips
              </p>
              <ul className="text-sm text-blue-600 dark:text-blue-400 mt-1 space-y-1">
                <li>Use a strong, unique password</li>
                <li>Verify your email for account recovery</li>
                <li>Never share your login credentials</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
