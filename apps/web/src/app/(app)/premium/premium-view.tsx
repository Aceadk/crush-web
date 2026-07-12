'use client';

import { analytics } from '@/lib/analytics';
import { ManageSubscriptionButton } from '@/features/premium';
import {
  BILLING_CONFIG,
  useAuthStore,
  usePromoCodeStore,
  useUIStore,
  type BillingPeriod,
  type SubscriptionTier,
} from '@crush/core';
import { Badge, Button, Card, cn } from '@crush/ui';
import { loadStripe } from '@stripe/stripe-js';
import { ArrowLeft, Check, Crown, Loader2, Shield, Sparkles, Tag, X, Zap } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

const PERIODS: { id: BillingPeriod; name: string }[] = [
  { id: 'monthly', name: '1 Month' },
  { id: 'quarterly', name: '3 Months' },
  { id: 'yearly', name: '12 Months' },
];

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '');

export default function PremiumView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, profile } = useAuthStore();
  const { addToast } = useUIStore();
  const { validatePromoCode, clearPromoCode } = usePromoCodeStore();

  const [selectedTier, setSelectedTier] = useState<SubscriptionTier>('plus');
  const [selectedPeriod, setSelectedPeriod] = useState<BillingPeriod>('monthly');
  const [loading, setLoading] = useState(false);
  const [appliedPromoCode, setAppliedPromoCode] = useState<string | null>(null);
  const [appliedDiscount, setAppliedDiscount] = useState<number>(0);
  const [promoCodeInput, setPromoCodeInput] = useState('');
  const [validatingPromo, setValidatingPromo] = useState(false);

  const availableTiers = BILLING_CONFIG.plans.filter((p) => p.tier !== 'free');
  const activePlanConfig =
    BILLING_CONFIG.plans.find((p) => p.tier === selectedTier) || availableTiers[0];
  const activePriceForPeriod = BILLING_CONFIG.getPriceForPeriod(activePlanConfig, selectedPeriod);

  // Set default period to quarterly if the config considers it popular, else keep monthly
  useEffect(() => {
    setSelectedPeriod('quarterly'); // Based on previous hardcoded default
  }, []);

  useEffect(() => {
    analytics.track({
      name: 'paywall_viewed',
      properties: { source: searchParams.get('source') || 'direct' },
    });
    analytics.funnelStep('subscription', 'premium_page_view', 'started');
  }, [searchParams]);

  // Handle promo code from URL params (redirected from settings)
  useEffect(() => {
    const promoFromUrl = searchParams.get('promo');
    const tierFromUrl = searchParams.get('tier') as SubscriptionTier;
    const periodFromUrl = searchParams.get('period') as BillingPeriod;

    if (tierFromUrl && ['plus', 'platinum'].includes(tierFromUrl)) {
      setSelectedTier(tierFromUrl);
    }
    if (periodFromUrl && ['monthly', 'quarterly', 'yearly'].includes(periodFromUrl)) {
      setSelectedPeriod(periodFromUrl);
    }

    if (promoFromUrl) {
      setAppliedPromoCode(promoFromUrl);
      setPromoCodeInput(promoFromUrl);

      // Validate the promo code
      if (user) {
        validatePromoCode(promoFromUrl, user.uid, periodFromUrl || selectedPeriod).then(
          (result) => {
            if (result.isValid && result.discountPercent) {
              setAppliedDiscount(result.discountPercent);
              addToast({
                type: 'success',
                title: 'Promo Code Applied!',
                description: `${result.discountPercent}% discount will be applied at checkout.`,
              });
            }
          }
        );
      }

      // Clear URL params
      router.replace('/premium');
    }
  }, [searchParams, user, selectedPeriod, validatePromoCode, addToast, router]);

  // Handle canceled payment redirect
  useEffect(() => {
    if (searchParams.get('canceled') === 'true') {
      addToast({
        type: 'info',
        title: 'Payment Canceled',
        description: 'Your payment was canceled. You can try again anytime.',
      });
      analytics.funnelStep('subscription', 'checkout', 'abandoned', {
        reason: 'checkout_canceled',
      });
      // Remove the query param
      router.replace('/premium');
    }
  }, [searchParams, addToast, router]);

  // Handle promo code validation
  const handleValidatePromo = useCallback(async () => {
    if (!user || !promoCodeInput) return;

    setValidatingPromo(true);
    try {
      const result = await validatePromoCode(promoCodeInput, user.uid, selectedPeriod);
      if (result.isValid && result.discountPercent) {
        setAppliedPromoCode(promoCodeInput);
        setAppliedDiscount(result.discountPercent);
        addToast({
          type: 'success',
          title: 'Valid Promo Code!',
          description: `${result.discountPercent}% discount will be applied.`,
        });
      } else {
        addToast({
          type: 'error',
          title: 'Invalid Code',
          description: result.error || 'This promo code is not valid.',
        });
      }
    } finally {
      setValidatingPromo(false);
    }
  }, [user, promoCodeInput, selectedPeriod, validatePromoCode, addToast]);

  // Clear promo code
  const handleClearPromo = useCallback(() => {
    setAppliedPromoCode(null);
    setAppliedDiscount(0);
    setPromoCodeInput('');
    clearPromoCode();
  }, [clearPromoCode]);

  // Calculate discounted price
  const getDiscountedPrice = (originalPrice: number) => {
    if (appliedDiscount > 0) {
      return ((originalPrice * (100 - appliedDiscount)) / 100).toFixed(2);
    }
    return originalPrice.toFixed(2);
  };

  const handleSubscribe = async () => {
    if (!user) {
      addToast({
        type: 'error',
        title: 'Not logged in',
        description: 'Please log in to subscribe.',
      });
      analytics.funnelStep('subscription', 'checkout', 'failed', {
        reason: 'not_authenticated',
      });
      return;
    }

    analytics.funnelStep('subscription', 'checkout', 'started', {
      method: selectedPeriod,
      tier: selectedTier,
      value: activePriceForPeriod,
    });
    setLoading(true);
    try {
      const response = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        // Identity is derived server-side from the verified session cookie.
        body: JSON.stringify({
          tier: selectedTier,
          period: selectedPeriod,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create checkout session');
      }

      analytics.track({
        name: 'checkout_started',
        properties: {
          tier: selectedTier,
          period: selectedPeriod,
          price: activePriceForPeriod,
          currency: 'USD',
        },
      });
      analytics.funnelStep('subscription', 'checkout_redirect', 'completed', {
        method: selectedPeriod,
        tier: selectedTier,
        value: activePriceForPeriod,
      });

      // Redirect to Stripe Checkout
      if (data.url) {
        window.location.href = data.url;
      } else {
        const stripe = await stripePromise;
        if (stripe && data.sessionId) {
          const { error } = await stripe.redirectToCheckout({
            sessionId: data.sessionId,
          });
          if (error) {
            throw error;
          }
        }
      }
    } catch (error) {
      console.error('Subscription error:', error);
      analytics.funnelStep('subscription', 'checkout', 'failed', {
        method: selectedPeriod,
        tier: selectedTier,
        reason: error instanceof Error ? error.message : 'unknown_error',
      });
      addToast({
        type: 'error',
        title: 'Payment Error',
        description:
          error instanceof Error ? error.message : 'Failed to start payment. Please try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  if (profile?.subscriptionTier && profile.subscriptionTier !== 'free') {
    // Get subscription details from profile (would be populated by webhook)
    const subscriptionEndDate = profile.premiumExpiresAt
      ? new Date(profile.premiumExpiresAt)
      : null;
    const daysRemaining = subscriptionEndDate
      ? Math.max(0, Math.ceil((subscriptionEndDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
      : null;

    return (
      <div className="min-h-screen bg-gray-50 pb-20 dark:bg-gray-900">
        <div className="sticky top-0 z-20 border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
          <div className="mx-auto flex max-w-2xl items-center gap-4 px-4 py-4">
            <button
              onClick={() => router.back()}
              className="-ml-2 p-2 text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
            >
              <ArrowLeft className="h-6 w-6" />
            </button>
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Premium</h1>
          </div>
        </div>

        <div className="mx-auto max-w-2xl space-y-6 px-4 py-8">
          {/* Subscription Status Card */}
          <Card className="overflow-hidden">
            <div className="bg-gradient-to-br from-primary to-secondary p-6 text-center text-white">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white/20">
                <Crown className="h-8 w-8" />
              </div>
              <h2 className="mb-1 text-2xl font-bold capitalize">
                Crush {profile.subscriptionTier}
              </h2>
              <p className="text-white/80">You have full access to premium features</p>
            </div>

            <div className="space-y-4 p-6">
              {/* Subscription Status */}
              <div className="flex items-center justify-between border-b border-gray-100 py-3 dark:border-gray-800">
                <div>
                  <p className="text-sm text-gray-500">Status</p>
                  <p className="flex items-center gap-2 font-medium text-gray-900 dark:text-white">
                    <span className="h-2 w-2 rounded-full bg-green-500" />
                    Active
                  </p>
                </div>
                <Badge variant="secondary" className="bg-green-100 capitalize text-green-700">
                  {profile.subscriptionTier}
                </Badge>
              </div>

              {/* Plan Type */}
              {profile.billingPeriod && (
                <div className="flex items-center justify-between border-b border-gray-100 py-3 dark:border-gray-800">
                  <div>
                    <p className="text-sm text-gray-500">Current Plan</p>
                    <p className="font-medium capitalize text-gray-900 dark:text-white">
                      {profile.billingPeriod} Plan
                    </p>
                  </div>
                </div>
              )}

              {/* Renewal Date */}
              {subscriptionEndDate && (
                <div className="flex items-center justify-between border-b border-gray-100 py-3 dark:border-gray-800">
                  <div>
                    <p className="text-sm text-gray-500">
                      {profile.premiumAutoRenew ? 'Renews on' : 'Expires on'}
                    </p>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {subscriptionEndDate.toLocaleDateString('en-US', {
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                  {daysRemaining !== null && daysRemaining <= 7 && (
                    <Badge variant="outline" className="border-orange-300 text-orange-600">
                      {daysRemaining} days left
                    </Badge>
                  )}
                </div>
              )}

              {/* Auto-Renewal Status */}
              <div className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm text-gray-500">Auto-Renewal</p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {profile.premiumAutoRenew ? 'Enabled' : 'Disabled'}
                  </p>
                </div>
                <span
                  className={cn(
                    'text-sm font-medium',
                    profile.premiumAutoRenew ? 'text-green-600' : 'text-gray-500'
                  )}
                >
                  {profile.premiumAutoRenew ? 'On' : 'Off'}
                </span>
              </div>
            </div>
          </Card>

          {/* Manage Subscription */}
          <Card className="p-4">
            {profile.stripeCustomerId ? (
              <ManageSubscriptionButton />
            ) : (
              <p className="text-center text-sm text-gray-500">
                This subscription is managed through the store where it was purchased.
              </p>
            )}
          </Card>

          {/* Your Benefits */}
          <Card className="p-6">
            <h3 className="mb-4 font-semibold text-gray-900 dark:text-white">
              Your {profile.subscriptionTier} Benefits
            </h3>
            <ul className="space-y-3">
              {(
                BILLING_CONFIG.plans.find((p) => p.tier === profile.subscriptionTier) ||
                availableTiers[0]
              ).features.map((feature) => (
                <li key={feature.name} className="flex items-center gap-3">
                  <div className="flex-1">
                    <span className="text-gray-700 dark:text-gray-300">{feature.name}</span>
                  </div>
                  {feature.included === true || typeof feature.included === 'string' ? (
                    <div className="flex items-center gap-2">
                      {typeof feature.included === 'string' && (
                        <span className="text-sm font-medium text-primary">{feature.included}</span>
                      )}
                      <Check className="h-5 w-5 text-green-500" />
                    </div>
                  ) : (
                    <X className="h-5 w-5 text-gray-300" />
                  )}
                </li>
              ))}
            </ul>
          </Card>

          {/* Help Section */}
          <div className="text-center text-sm text-gray-500">
            <p>
              Need help with your subscription?{' '}
              <button onClick={() => router.push('/help')} className="text-primary hover:underline">
                Contact Support
              </button>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-32 dark:bg-gray-900">
      {/* Header */}
      <div className="sticky top-0 z-20 border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <div className="mx-auto flex max-w-2xl items-center gap-4 px-4 py-4">
          <button
            onClick={() => router.back()}
            className="-ml-2 p-2 text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
          >
            <ArrowLeft className="h-6 w-6" />
          </button>
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Get Premium</h1>
        </div>
      </div>

      <div className="mx-auto max-w-2xl space-y-8 px-4 py-6">
        {/* Hero section */}
        <div className="py-8 text-center">
          <div className="relative mb-6 inline-block">
            <div className="flex h-24 w-24 animate-pulse items-center justify-center rounded-full bg-gradient-to-br from-primary via-secondary to-primary">
              <Sparkles className="h-12 w-12 text-white" />
            </div>
            <div className="absolute -right-2 -top-2 flex h-8 w-8 items-center justify-center rounded-full bg-yellow-400 shadow-lg">
              <Crown className="h-4 w-4 text-yellow-900" />
            </div>
          </div>
          <h1 className="mb-2 text-3xl font-bold text-gray-900 dark:text-white">
            Unlock Your Best Dating Life
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            Choose the tier that gives you the best chances.
          </p>
        </div>

        {/* Tier switcher */}
        <div className="mx-auto flex max-w-md rounded-2xl bg-gray-200/50 p-1 dark:bg-gray-800/50">
          {availableTiers.map((plan) => (
            <button
              key={plan.tier}
              onClick={() => setSelectedTier(plan.tier)}
              className={cn(
                'flex-1 rounded-xl py-3 text-sm font-bold transition-all duration-200',
                selectedTier === plan.tier
                  ? 'bg-white text-primary shadow-sm dark:bg-gray-700'
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
              )}
            >
              {plan.name}
            </button>
          ))}
        </div>

        {/* Features list based on active tier */}
        <Card className="overflow-hidden">
          <div className="bg-gradient-to-r from-primary to-secondary px-4 py-3">
            <h2 className="text-center font-semibold text-white">
              {activePlanConfig.name} Features
            </h2>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {activePlanConfig.features.map((feature) => (
              <div key={feature.name} className="flex items-center gap-4 p-4">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-gray-900 dark:text-white">
                    {feature.name}
                  </p>
                </div>
                <div className="flex w-24 flex-shrink-0 items-center justify-end text-sm font-medium">
                  {feature.included === false ? (
                    <X className="h-5 w-5 text-gray-300" />
                  ) : feature.included === true ? (
                    <Check className="h-5 w-5 text-primary" />
                  ) : (
                    <span className="text-primary">{feature.included}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Plan selection */}
        <div>
          <h2 className="mb-4 text-center text-xl font-bold text-gray-900 dark:text-white">
            Choose Your Billing Period
          </h2>
          <div className="space-y-3">
            {PERIODS.map((period) => {
              const price = BILLING_CONFIG.getPriceForPeriod(activePlanConfig, period.id);
              const savings = BILLING_CONFIG.getSavingsPercentage(activePlanConfig, period.id);
              return (
                <button
                  key={period.id}
                  onClick={() => setSelectedPeriod(period.id)}
                  className={cn(
                    'relative w-full rounded-2xl border-2 p-4 text-left transition-all',
                    selectedPeriod === period.id
                      ? 'border-primary bg-primary/5 shadow-lg shadow-primary/10'
                      : 'border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600'
                  )}
                >
                  {savings > 0 && period.id === 'yearly' && (
                    <Badge variant="premium" className="absolute -top-3 left-1/2 -translate-x-1/2">
                      Best Value
                    </Badge>
                  )}
                  {period.id === 'quarterly' && (
                    <Badge variant="premium" className="absolute -top-3 left-1/2 -translate-x-1/2">
                      Most Popular
                    </Badge>
                  )}
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white">{period.name}</p>
                      {savings > 0 && <p className="text-sm text-primary">Save {savings}%</p>}
                    </div>
                    <div className="text-right">
                      {appliedDiscount > 0 ? (
                        <>
                          <p className="text-lg text-gray-500 line-through">${price}</p>
                          <p className="text-2xl font-bold text-green-600">
                            ${getDiscountedPrice(price)}
                          </p>
                        </>
                      ) : (
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">${price}</p>
                      )}
                      <p className="text-sm text-gray-500">/{period.name}</p>
                    </div>
                  </div>
                  {selectedPeriod === period.id && (
                    <div className="absolute right-4 top-1/2 -translate-y-1/2">
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary">
                        <Check className="h-4 w-4 text-white" />
                      </div>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Promo Code Section */}
        <Card className="overflow-hidden">
          <div className="border-b border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-700 dark:bg-gray-800">
            <div className="flex items-center gap-2">
              <Tag className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold text-gray-900 dark:text-white">
                Have a Promo Code?
              </span>
            </div>
          </div>
          <div className="p-4">
            {appliedPromoCode ? (
              <div className="flex items-center justify-between rounded-xl border border-green-200 bg-green-50 p-3 dark:border-green-800 dark:bg-green-900/20">
                <div className="flex items-center gap-2">
                  <Check className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="font-medium text-green-700 dark:text-green-400">
                      {appliedPromoCode}
                    </p>
                    <p className="text-sm text-green-600 dark:text-green-500">
                      {appliedDiscount}% discount applied
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleClearPromo}
                  className="rounded-full p-1.5 transition-colors hover:bg-green-100 dark:hover:bg-green-800"
                >
                  <X className="h-4 w-4 text-green-600" />
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Tag className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                  <input
                    type="text"
                    value={promoCodeInput}
                    onChange={(e) => setPromoCodeInput(e.target.value.toUpperCase())}
                    placeholder="Enter code"
                    maxLength={20}
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-10 pr-4 text-sm font-medium uppercase tracking-wider focus:outline-none focus:ring-2 focus:ring-primary/50 dark:border-gray-700 dark:bg-gray-800"
                  />
                </div>
                <Button
                  onClick={handleValidatePromo}
                  disabled={!promoCodeInput || validatingPromo}
                  variant="outline"
                >
                  {validatingPromo ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Apply'}
                </Button>
              </div>
            )}
          </div>
        </Card>

        {/* Trust badges */}
        <div className="flex justify-center gap-6 text-center text-sm text-gray-500">
          <div>
            <Shield className="mx-auto mb-1 h-6 w-6 text-gray-500" />
            <p>Secure Payment</p>
          </div>
          <div>
            <Zap className="mx-auto mb-1 h-6 w-6 text-gray-500" />
            <p>Instant Access</p>
          </div>
          <div>
            <X className="mx-auto mb-1 h-6 w-6 text-gray-500" />
            <p>Cancel Anytime</p>
          </div>
        </div>
      </div>

      {/* Bottom CTA */}
      <div className="fixed bottom-0 left-0 right-0 border-t border-gray-200/50 bg-white/80 p-4 backdrop-blur-lg dark:border-gray-800/50 dark:bg-gray-900/80">
        <div className="mx-auto max-w-2xl">
          {appliedDiscount > 0 && (
            <div className="mb-2 flex items-center justify-center gap-2">
              <Badge variant="secondary" className="bg-green-100 text-green-700">
                {appliedDiscount}% OFF with {appliedPromoCode}
              </Badge>
            </div>
          )}
          <Button onClick={handleSubscribe} disabled={loading} className="w-full gap-2" size="lg">
            {loading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Sparkles className="h-5 w-5" />
                {appliedDiscount > 0 ? (
                  <>
                    Get {activePlanConfig.name} for ${getDiscountedPrice(activePriceForPeriod)}/
                    {selectedPeriod}
                  </>
                ) : (
                  <>
                    Get {activePlanConfig.name} for ${activePriceForPeriod}/{selectedPeriod}
                  </>
                )}
              </>
            )}
          </Button>
          <p className="mt-2 text-center text-xs text-gray-500">
            {appliedDiscount > 0
              ? `Discount applied. Recurring billing after first period. Cancel anytime.`
              : 'Recurring billing. Cancel anytime in settings.'}
          </p>
        </div>
      </div>
    </div>
  );
}
