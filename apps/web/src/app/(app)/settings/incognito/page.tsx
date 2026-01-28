'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore, userService } from '@crush/core';
import { Card, Button, Badge } from '@crush/ui';
import { cn } from '@crush/ui';
import {
  ArrowLeft,
  Eye,
  EyeOff,
  Ghost,
  Crown,
  Sparkles,
  Shield,
  Clock,
  Users,
  Check,
  AlertCircle,
  Loader2,
  Info,
} from 'lucide-react';

interface IncognitoFeature {
  icon: React.ReactNode;
  title: string;
  description: string;
}

const INCOGNITO_FEATURES: IncognitoFeature[] = [
  {
    icon: <EyeOff className="w-5 h-5" />,
    title: 'Browse Invisibly',
    description: "View profiles without appearing in their 'Who Viewed Me' list.",
  },
  {
    icon: <Ghost className="w-5 h-5" />,
    title: 'Hide from Discovery',
    description: "Your profile won't appear in the discovery feed for other users.",
  },
  {
    icon: <Clock className="w-5 h-5" />,
    title: 'Hide Last Active',
    description: 'Your online status and last active time will be hidden.',
  },
  {
    icon: <Shield className="w-5 h-5" />,
    title: 'Control Your Visibility',
    description: 'Only people you like will be able to see your profile.',
  },
];

export default function IncognitoModePage() {
  const router = useRouter();
  const { user, profile } = useAuthStore();
  const isPremium = profile?.isPremium;

  const [incognitoEnabled, setIncognitoEnabled] = useState(
    profile?.settings?.incognitoMode ?? false
  );
  const [showReadReceipts, setShowReadReceipts] = useState(
    profile?.settings?.showReadReceipts ?? true
  );
  const [showTypingIndicators, setShowTypingIndicators] = useState(
    profile?.settings?.showTypingIndicators ?? true
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleToggleIncognito = useCallback(async () => {
    if (!isPremium || !user) return;

    setSaving(true);
    try {
      const newValue = !incognitoEnabled;
      await userService.updateUserSettings(user.uid, {
        incognitoMode: newValue,
      });
      setIncognitoEnabled(newValue);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      console.error('Failed to update incognito mode:', error);
    } finally {
      setSaving(false);
    }
  }, [isPremium, user, incognitoEnabled]);

  const handleToggleReadReceipts = useCallback(async () => {
    if (!user) return;

    setSaving(true);
    try {
      const newValue = !showReadReceipts;
      await userService.updateUserSettings(user.uid, {
        showReadReceipts: newValue,
      });
      setShowReadReceipts(newValue);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      console.error('Failed to update read receipts:', error);
    } finally {
      setSaving(false);
    }
  }, [user, showReadReceipts]);

  const handleToggleTypingIndicators = useCallback(async () => {
    if (!user) return;

    setSaving(true);
    try {
      const newValue = !showTypingIndicators;
      await userService.updateUserSettings(user.uid, {
        showTypingIndicators: newValue,
      });
      setShowTypingIndicators(newValue);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      console.error('Failed to update typing indicators:', error);
    } finally {
      setSaving(false);
    }
  }, [user, showTypingIndicators]);

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
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Ghost className="w-5 h-5 text-purple-500" />
            Incognito Mode
          </h1>
          {saved && (
            <Badge className="bg-green-100 text-green-700 border-0 ml-auto">
              <Check className="w-3 h-3 mr-1" />
              Saved
            </Badge>
          )}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Premium Gate */}
        {!isPremium && (
          <Card className="overflow-hidden">
            <div className="p-6 bg-gradient-to-br from-purple-500 to-indigo-600 text-white">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                  <Crown className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-bold mb-2">Premium Feature</h2>
                  <p className="text-white/80 mb-4">
                    Incognito Mode is available exclusively for Premium members. Browse profiles privately and control who sees you.
                  </p>
                  <Link href="/premium">
                    <Button className="bg-white text-purple-600 hover:bg-white/90">
                      <Sparkles className="w-4 h-4 mr-2" />
                      Upgrade to Premium
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Incognito Toggle */}
        <Card className={cn('overflow-hidden', !isPremium && 'opacity-60')}>
          <div className="p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className={cn(
                  'w-14 h-14 rounded-full flex items-center justify-center transition-colors',
                  incognitoEnabled
                    ? 'bg-purple-100 dark:bg-purple-900/30'
                    : 'bg-gray-100 dark:bg-gray-800'
                )}>
                  {incognitoEnabled ? (
                    <Ghost className="w-7 h-7 text-purple-600" />
                  ) : (
                    <Eye className="w-7 h-7 text-gray-400" />
                  )}
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {incognitoEnabled ? 'Incognito is ON' : 'Incognito is OFF'}
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {incognitoEnabled
                      ? 'You are browsing privately. Only people you like can see you.'
                      : 'Your profile is visible to everyone in discovery.'}
                  </p>
                </div>
              </div>
              <button
                onClick={handleToggleIncognito}
                disabled={!isPremium || saving}
                className={cn(
                  'relative w-14 h-8 rounded-full transition-colors',
                  incognitoEnabled ? 'bg-purple-500' : 'bg-gray-300 dark:bg-gray-600',
                  (!isPremium || saving) && 'opacity-50 cursor-not-allowed'
                )}
              >
                {saving ? (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                  </div>
                ) : (
                  <div
                    className={cn(
                      'absolute top-1 w-6 h-6 rounded-full bg-white shadow transition-transform',
                      incognitoEnabled ? 'translate-x-7' : 'translate-x-1'
                    )}
                  />
                )}
              </button>
            </div>
          </div>
        </Card>

        {/* Features List */}
        <Card className={cn('overflow-hidden', !isPremium && 'opacity-60')}>
          <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide flex items-center gap-2">
              <Shield className="w-4 h-4" />
              What Incognito Mode Does
            </h2>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {INCOGNITO_FEATURES.map((feature, index) => (
              <div key={index} className="p-4 flex items-start gap-4">
                <div className={cn(
                  'w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0',
                  incognitoEnabled
                    ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-600'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-400'
                )}>
                  {feature.icon}
                </div>
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-white">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {feature.description}
                  </p>
                </div>
                {incognitoEnabled && (
                  <Check className="w-5 h-5 text-green-500 flex-shrink-0 ml-auto" />
                )}
              </div>
            ))}
          </div>
        </Card>

        {/* Additional Privacy Settings */}
        <Card className="overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide flex items-center gap-2">
              <Eye className="w-4 h-4" />
              Additional Privacy
            </h2>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {/* Read Receipts */}
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <Check className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-white">
                    Read Receipts
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Show when you've read messages
                  </p>
                </div>
              </div>
              <button
                onClick={handleToggleReadReceipts}
                disabled={saving}
                className={cn(
                  'relative w-12 h-7 rounded-full transition-colors',
                  showReadReceipts ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-600',
                  saving && 'opacity-50 cursor-not-allowed'
                )}
              >
                <div
                  className={cn(
                    'absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-transform',
                    showReadReceipts ? 'translate-x-6' : 'translate-x-1'
                  )}
                />
              </button>
            </div>

            {/* Typing Indicators */}
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <Users className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-white">
                    Typing Indicators
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Show when you're typing
                  </p>
                </div>
              </div>
              <button
                onClick={handleToggleTypingIndicators}
                disabled={saving}
                className={cn(
                  'relative w-12 h-7 rounded-full transition-colors',
                  showTypingIndicators ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-600',
                  saving && 'opacity-50 cursor-not-allowed'
                )}
              >
                <div
                  className={cn(
                    'absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-transform',
                    showTypingIndicators ? 'translate-x-6' : 'translate-x-1'
                  )}
                />
              </button>
            </div>
          </div>
        </Card>

        {/* Info Note */}
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-blue-700 dark:text-blue-300">
                About Incognito Mode
              </p>
              <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">
                When Incognito Mode is on, people you've already liked or matched with can still see your profile. This ensures your existing connections aren't affected.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
