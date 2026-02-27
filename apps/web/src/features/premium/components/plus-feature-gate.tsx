'use client';

import { analytics } from '@/lib/analytics';
import { Button, Card, cn } from '@crush/ui';
import { Crown, Sparkles } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useState, type ReactNode } from 'react';

const UpsellModal = dynamic(() => import('./upsell-modal').then((mod) => mod.UpsellModal), {
  ssr: false,
});

type GateVariant = 'purple' | 'amber';

interface PlusFeatureGateProps {
  isPremium?: boolean;
  featureKey: string;
  title: string;
  description: string;
  children?: ReactNode;
  className?: string;
  gateClassName?: string;
  ctaLabel?: string;
  modalTitle?: string;
  modalDescription?: string;
  modalBenefits?: string[];
  lockWhenFree?: boolean;
  lockClassName?: string;
  variant?: GateVariant;
  upgradePath?: string;
}

const VARIANT_STYLES: Record<
  GateVariant,
  {
    panel: string;
    icon: string;
    title: string;
    description: string;
    button: string;
  }
> = {
  purple: {
    panel: 'bg-gradient-to-br from-purple-500 to-indigo-600',
    icon: 'bg-white/20 text-white',
    title: 'text-white',
    description: 'text-white/85',
    button: 'bg-white text-purple-700 hover:bg-white/90',
  },
  amber: {
    panel:
      'bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20',
    icon: 'bg-gradient-to-br from-amber-400 to-orange-500 text-white',
    title: 'text-gray-900 dark:text-white',
    description: 'text-gray-600 dark:text-gray-400',
    button:
      'bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600',
  },
};

export function PlusFeatureGate({
  isPremium,
  featureKey,
  title,
  description,
  children,
  className,
  gateClassName,
  ctaLabel = 'Upgrade to Premium',
  modalTitle,
  modalDescription,
  modalBenefits,
  lockWhenFree = false,
  lockClassName,
  variant = 'amber',
  upgradePath = '/premium',
}: PlusFeatureGateProps) {
  const [upsellOpen, setUpsellOpen] = useState(false);
  const styles = VARIANT_STYLES[variant];

  if (isPremium) {
    if (!children) return null;
    return <div className={className}>{children}</div>;
  }

  const handleUpsellOpen = () => {
    analytics.track({
      name: 'feature_used',
      properties: { feature: `${featureKey}_upsell_banner_click` },
    });
    setUpsellOpen(true);
  };

  return (
    <>
      <div className={cn('space-y-6', className)}>
        <Card className={cn('overflow-hidden', gateClassName)}>
          <div className={cn('p-6', styles.panel)}>
            <div className="flex items-start gap-4">
              <div
                className={cn(
                  'flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full',
                  styles.icon
                )}
              >
                <Crown className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <h2 className={cn('mb-2 text-xl font-semibold', styles.title)}>{title}</h2>
                <p className={cn('mb-4 text-sm', styles.description)}>{description}</p>
                <Button className={styles.button} onClick={handleUpsellOpen}>
                  <Sparkles className="mr-2 h-4 w-4" />
                  {ctaLabel}
                </Button>
              </div>
            </div>
          </div>
        </Card>

        {children && (
          <div
            className={cn(
              lockWhenFree && 'pointer-events-none select-none opacity-60',
              lockClassName
            )}
          >
            {children}
          </div>
        )}
      </div>

      <UpsellModal
        open={upsellOpen}
        onOpenChange={setUpsellOpen}
        featureKey={featureKey}
        title={modalTitle ?? title}
        description={modalDescription ?? description}
        benefits={modalBenefits}
        upgradePath={upgradePath}
      />
    </>
  );
}
