'use client';

import { useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@crush/ui';
import { CheckCircle2, Crown, Sparkles } from 'lucide-react';
import { analytics } from '@/lib/analytics';

interface UpsellModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  featureKey: string;
  title: string;
  description: string;
  benefits?: string[];
  upgradeLabel?: string;
  cancelLabel?: string;
  upgradePath?: string;
}

export function UpsellModal({
  open,
  onOpenChange,
  featureKey,
  title,
  description,
  benefits = [],
  upgradeLabel = 'Upgrade to Premium',
  cancelLabel = 'Not now',
  upgradePath = '/premium',
}: UpsellModalProps) {
  const router = useRouter();
  const wasOpenRef = useRef(false);

  useEffect(() => {
    if (!open || wasOpenRef.current) {
      wasOpenRef.current = open;
      return;
    }

    analytics.track({
      name: 'feature_used',
      properties: { feature: `${featureKey}_upsell_modal_view` },
    });
    analytics.funnelStep('subscription', 'upsell_modal_view', 'started', {
      reason: featureKey,
    });
    wasOpenRef.current = open;
  }, [open, featureKey]);

  const handleDismiss = useCallback(() => {
    analytics.funnelStep('subscription', 'upsell_modal_dismissed', 'abandoned', {
      reason: featureKey,
    });
    onOpenChange(false);
  }, [featureKey, onOpenChange]);

  const handleUpgrade = useCallback(() => {
    analytics.track({
      name: 'feature_used',
      properties: { feature: `${featureKey}_upsell_upgrade_click` },
    });
    analytics.funnelStep('subscription', 'upsell_upgrade_clicked', 'started', {
      reason: featureKey,
    });
    onOpenChange(false);

    const targetPath = upgradePath.includes('source=')
      ? upgradePath
      : `${upgradePath}${upgradePath.includes('?') ? '&' : '?'}source=${encodeURIComponent(featureKey)}`;
    router.push(targetPath);
  }, [featureKey, onOpenChange, router, upgradePath]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Crown className="w-5 h-5 text-amber-500" />
            {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-1">
          {benefits.map((benefit) => (
            <div key={benefit} className="flex items-start gap-3">
              <CheckCircle2 className="w-4 h-4 mt-0.5 text-green-500 flex-shrink-0" />
              <span className="text-sm text-muted-foreground">{benefit}</span>
            </div>
          ))}
        </div>

        <div className="rounded-xl bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-200/50 dark:border-amber-700/50 p-4">
          <p className="text-sm font-medium text-gray-900 dark:text-white">
            Get full access to Premium features
          </p>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
            See who likes you, unlock private browsing, and get deeper insights.
          </p>
        </div>

        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={handleDismiss}>
            {cancelLabel}
          </Button>
          <Button
            onClick={handleUpgrade}
            className="bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            {upgradeLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
