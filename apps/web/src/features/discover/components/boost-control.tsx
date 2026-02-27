'use client';

import { analytics } from '@/lib/analytics';
import {
    getBoostActiveRemainingMs,
    getBoostCooldownRemainingMs,
    useBoostStore,
    useUIStore,
} from '@crush/core';
import {
    Button,
    cn,
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@crush/ui';
import { Clock, Crown, Loader2, Sparkles, Zap } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useEffect, useMemo, useState } from 'react';

const UpsellModal = dynamic(
  () => import('@/features/premium/components/upsell-modal').then((mod) => mod.UpsellModal),
  { ssr: false }
);

interface BoostControlProps {
  userId: string;
  isPremium: boolean;
  onBoostActivated?: () => void;
}

function formatMinutesSeconds(remainingMs: number): string {
  const totalSeconds = Math.max(0, Math.floor(remainingMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function formatHoursMinutes(remainingMs: number): string {
  const totalMinutes = Math.max(0, Math.floor(remainingMs / (1000 * 60)));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours <= 0) {
    return `${minutes}m`;
  }
  return `${hours}h ${minutes}m`;
}

export function BoostControl({ userId, isPremium, onBoostActivated }: BoostControlProps) {
  const { addToast } = useUIStore();
  const { status, loading, activating, error, loadStatus, activateBoost, clearError } =
    useBoostStore();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [upsellOpen, setUpsellOpen] = useState(false);
  const [nowMs, setNowMs] = useState(Date.now());

  useEffect(() => {
    void loadStatus(userId);
  }, [userId, loadStatus]);

  useEffect(() => {
    if (!error) return;
    addToast({
      type: 'error',
      title: 'Boost unavailable',
      description: error,
    });
    clearError();
  }, [addToast, clearError, error]);

  const activeRemainingMs = useMemo(
    () => getBoostActiveRemainingMs(status, nowMs),
    [status, nowMs]
  );
  const cooldownRemainingMs = useMemo(
    () => getBoostCooldownRemainingMs(status, nowMs),
    [status, nowMs]
  );

  const shouldTick = status?.isActive || status?.unavailableReason === 'cooldown';

  useEffect(() => {
    if (!shouldTick) return;
    const interval = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [shouldTick]);

  useEffect(() => {
    if (!status) return;
    if (status.isActive && activeRemainingMs === 0) {
      void loadStatus(userId);
      return;
    }
    if (status.unavailableReason === 'cooldown' && cooldownRemainingMs === 0) {
      void loadStatus(userId);
    }
  }, [activeRemainingMs, cooldownRemainingMs, loadStatus, status, userId]);

  const isActive = Boolean(status?.isActive && activeRemainingMs > 0);
  const isOnCooldown = status?.unavailableReason === 'cooldown' && cooldownRemainingMs > 0;
  const isPremiumLocked = status?.unavailableReason === 'premium_required' && !isPremium;
  const isActionable = Boolean(status?.canBoost || isPremiumLocked);

  const label = isActive
    ? `Boosted ${formatMinutesSeconds(activeRemainingMs)}`
    : isOnCooldown
      ? `Boost ${formatHoursMinutes(cooldownRemainingMs)}`
      : 'Boost';

  const disabled = activating || isActive || isOnCooldown || loading || !isActionable;

  const handleButtonClick = () => {
    if (status?.canBoost) {
      analytics.track({
        name: 'feature_used',
        properties: { feature: 'discover_boost_confirm_open' },
      });
      setConfirmOpen(true);
      return;
    }

    if (isPremiumLocked) {
      analytics.track({
        name: 'feature_used',
        properties: { feature: 'discover_boost_upsell_open' },
      });
      setUpsellOpen(true);
      return;
    }
  };

  const handleActivateBoost = async () => {
    try {
      await activateBoost(userId);
      analytics.track({ name: 'boost_used', properties: {} });
      analytics.track({
        name: 'feature_used',
        properties: { feature: 'discover_boost_activated' },
      });
      addToast({
        type: 'success',
        title: 'Boost activated',
        description: 'Your profile is now prioritized in discovery.',
      });
      setConfirmOpen(false);
      onBoostActivated?.();
    } catch (error) {
      const description =
        error instanceof Error ? error.message : 'Unable to activate boost right now.';
      addToast({
        type: 'error',
        title: 'Boost failed',
        description,
      });
    }
  };

  return (
    <>
      <Button
        variant={isActive ? 'default' : 'outline'}
        size="sm"
        onClick={handleButtonClick}
        disabled={disabled}
        className={cn(
          'min-w-[110px]',
          isActive &&
            'border-transparent bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600',
          isPremiumLocked && 'border-amber-300 text-amber-700 dark:text-amber-400'
        )}
        aria-label={label}
      >
        {activating || loading ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : isPremiumLocked ? (
          <Crown className="mr-2 h-4 w-4" />
        ) : isOnCooldown ? (
          <Clock className="mr-2 h-4 w-4" />
        ) : (
          <Zap className={cn('mr-2 h-4 w-4', isActive && 'fill-current')} />
        )}
        {label}
      </Button>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-amber-500" />
              Activate Boost
            </DialogTitle>
            <DialogDescription>
              Your profile will be prioritized in discovery for the next 30 minutes.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 rounded-xl border border-amber-200/50 bg-amber-50/50 p-4 dark:border-amber-700/40 dark:bg-amber-900/10">
            <p className="text-sm font-medium text-amber-900 dark:text-amber-200">
              What happens when you boost
            </p>
            <ul className="space-y-1 text-sm text-amber-800 dark:text-amber-300">
              <li>Higher placement in other users&apos; discovery stacks.</li>
              <li>Faster profile visibility for active users nearby.</li>
              <li>Cooldown starts immediately after activation.</li>
            </ul>
          </div>

          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              Not now
            </Button>
            <Button
              onClick={handleActivateBoost}
              disabled={activating}
              className="bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600"
            >
              {activating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Activating...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Boost now
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <UpsellModal
        open={upsellOpen}
        onOpenChange={setUpsellOpen}
        featureKey="discover_boost"
        title="Boost Requires Premium"
        description="Upgrade to Premium to boost your profile and get prioritized visibility."
        benefits={[
          'Prioritized profile placement during boost windows',
          'Passport mode to discover people worldwide',
          'Unlimited likes and advanced matching tools',
        ]}
      />
    </>
  );
}
