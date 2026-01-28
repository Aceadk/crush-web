'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore, useUIStore } from '@crush/core';
import { Button, Card, Badge } from '@crush/ui';
import { cn } from '@crush/ui';
import { loadStripe } from '@stripe/stripe-js';
import {
  ArrowLeft,
  Sparkles,
  Heart,
  Eye,
  Rewind,
  MessageCircle,
  Shield,
  Star,
  Zap,
  Globe,
  Crown,
  Check,
  X,
} from 'lucide-react';

const PREMIUM_FEATURES = [
  {
    icon: Heart,
    title: 'Unlimited Likes',
    description: 'Like as many profiles as you want',
    free: false,
    premium: true,
  },
  {
    icon: Eye,
    title: 'See Who Likes You',
    description: 'View all your admirers instantly',
    free: false,
    premium: true,
  },
  {
    icon: Rewind,
    title: 'Rewind',
    description: 'Take back your last swipe',
    free: false,
    premium: true,
  },
  {
    icon: Star,
    title: 'Super Likes',
    description: '5 Super Likes per day to stand out',
    free: '1/week',
    premium: '5/day',
  },
  {
    icon: Zap,
    title: 'Boost',
    description: 'Get more visibility for 30 minutes',
    free: false,
    premium: '1/month',
  },
  {
    icon: Globe,
    title: 'Passport',
    description: 'Match with people anywhere in the world',
    free: false,
    premium: true,
  },
  {
    icon: Shield,
    title: 'Priority Support',
    description: 'Get help faster with dedicated support',
    free: false,
    premium: true,
  },
  {
    icon: MessageCircle,
    title: 'Read Receipts',
    description: 'See when your messages are read',
    free: false,
    premium: true,
  },
];

const PLANS = [
  {
    id: 'monthly',
    name: '1 Month',
    price: 29.99,
    period: 'month',
    savings: null,
  },
  {
    id: 'quarterly',
    name: '3 Months',
    price: 19.99,
    period: 'month',
    savings: 33,
    popular: true,
  },
  {
    id: 'yearly',
    name: '12 Months',
    price: 12.99,
    period: 'month',
    savings: 57,
  },
];

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '');

export default function PremiumView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, profile } = useAuthStore();
  const { addToast } = useUIStore();
  const [selectedPlan, setSelectedPlan] = useState('quarterly');
  const [loading, setLoading] = useState(false);

  // Handle canceled payment redirect
  useEffect(() => {
    if (searchParams.get('canceled') === 'true') {
      addToast({
        type: 'info',
        title: 'Payment Canceled',
        description: 'Your payment was canceled. You can try again anytime.',
      });
      // Remove the query param
      router.replace('/premium');
    }
  }, [searchParams, addToast, router]);

  const handleSubscribe = async () => {
    if (!user) {
      addToast({
        type: 'error',
        title: 'Not logged in',
        description: 'Please log in to subscribe.',
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          planId: selectedPlan,
          userId: user.uid,
          userEmail: user.email,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create checkout session');
      }

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
      addToast({
        type: 'error',
        title: 'Payment Error',
        description: error instanceof Error ? error.message : 'Failed to start payment. Please try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  if (profile?.isPremium) {
    // Get subscription details from profile (would be populated by webhook)
    const subscriptionEndDate = profile.premiumExpiresAt
      ? new Date(profile.premiumExpiresAt)
      : null;
    const daysRemaining = subscriptionEndDate
      ? Math.max(0, Math.ceil((subscriptionEndDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
      : null;

    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20">
        <div className="sticky top-0 z-20 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
          <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="p-2 -ml-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
              Premium
            </h1>
          </div>
        </div>

        <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
          {/* Subscription Status Card */}
          <Card className="overflow-hidden">
            <div className="bg-gradient-to-br from-primary to-secondary p-6 text-white text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white/20 flex items-center justify-center">
                <Crown className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-bold mb-1">Premium Member</h2>
              <p className="text-white/80">You have full access to all features</p>
            </div>

            <div className="p-6 space-y-4">
              {/* Subscription Status */}
              <div className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-gray-800">
                <div>
                  <p className="text-sm text-gray-500">Status</p>
                  <p className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-500" />
                    Active
                  </p>
                </div>
                <Badge variant="secondary" className="bg-green-100 text-green-700">
                  Premium
                </Badge>
              </div>

              {/* Plan Type */}
              {profile.premiumPlan && (
                <div className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-gray-800">
                  <div>
                    <p className="text-sm text-gray-500">Current Plan</p>
                    <p className="font-medium text-gray-900 dark:text-white capitalize">
                      {profile.premiumPlan} Plan
                    </p>
                  </div>
                </div>
              )}

              {/* Renewal Date */}
              {subscriptionEndDate && (
                <div className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-gray-800">
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
                    <Badge variant="outline" className="text-orange-600 border-orange-300">
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
                <span className={cn(
                  'text-sm font-medium',
                  profile.premiumAutoRenew ? 'text-green-600' : 'text-gray-500'
                )}>
                  {profile.premiumAutoRenew ? 'On' : 'Off'}
                </span>
              </div>
            </div>
          </Card>

          {/* Manage Subscription */}
          <Card className="p-4">
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                // Open Stripe Customer Portal or management page
                window.open('https://billing.stripe.com/p/login/test', '_blank');
              }}
            >
              Manage Subscription
            </Button>
            <p className="text-xs text-gray-500 text-center mt-2">
              Update payment method, change plan, or cancel subscription
            </p>
          </Card>

          {/* Your Benefits */}
          <Card className="p-6">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
              Your Premium Benefits
            </h3>
            <ul className="space-y-3">
              {PREMIUM_FEATURES.map((feature) => (
                <li key={feature.title} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <feature.icon className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1">
                    <span className="text-gray-700 dark:text-gray-300">{feature.title}</span>
                  </div>
                  <Check className="w-4 h-4 text-green-500" />
                </li>
              ))}
            </ul>
          </Card>

          {/* Help Section */}
          <div className="text-center text-sm text-gray-500">
            <p>
              Need help with your subscription?{' '}
              <button
                onClick={() => router.push('/help')}
                className="text-primary hover:underline"
              >
                Contact Support
              </button>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-32">
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
            Get Premium
          </h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-8">
        {/* Hero section */}
        <div className="text-center py-8">
          <div className="relative inline-block mb-6">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary via-secondary to-primary animate-pulse flex items-center justify-center">
              <Sparkles className="w-12 h-12 text-white" />
            </div>
            <div className="absolute -top-2 -right-2 w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center shadow-lg">
              <Crown className="w-4 h-4 text-yellow-900" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Crush Premium
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            Unlock the full potential of your dating life
          </p>
        </div>

        {/* Features comparison */}
        <Card className="overflow-hidden">
          <div className="px-4 py-3 bg-gradient-to-r from-primary to-secondary">
            <h2 className="text-white font-semibold text-center">
              Premium Features
            </h2>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {PREMIUM_FEATURES.map((feature) => (
              <div key={feature.title} className="flex items-center p-4 gap-4">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <feature.icon className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 dark:text-white truncate">
                    {feature.title}
                  </p>
                  <p className="text-sm text-gray-500 truncate">
                    {feature.description}
                  </p>
                </div>
                <div className="flex items-center gap-4 text-sm flex-shrink-0">
                  <div className="w-16 text-center">
                    {feature.free === false ? (
                      <X className="w-5 h-5 text-gray-300 mx-auto" />
                    ) : (
                      <span className="text-gray-500">{feature.free}</span>
                    )}
                  </div>
                  <div className="w-16 text-center">
                    {feature.premium === true ? (
                      <Check className="w-5 h-5 text-primary mx-auto" />
                    ) : (
                      <span className="text-primary font-medium">{feature.premium}</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="flex border-t border-gray-200 dark:border-gray-700">
            <div className="flex-1 p-3 text-center text-sm text-gray-500">
              Free
            </div>
            <div className="flex-1 p-3 text-center text-sm font-medium text-primary bg-primary/5">
              Premium
            </div>
          </div>
        </Card>

        {/* Plan selection */}
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 text-center">
            Choose Your Plan
          </h2>
          <div className="space-y-3">
            {PLANS.map((plan) => (
              <button
                key={plan.id}
                onClick={() => setSelectedPlan(plan.id)}
                className={cn(
                  'w-full p-4 rounded-2xl border-2 transition-all text-left relative',
                  selectedPlan === plan.id
                    ? 'border-primary bg-primary/5 shadow-lg shadow-primary/10'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                )}
              >
                {plan.popular && (
                  <Badge
                    variant="premium"
                    className="absolute -top-3 left-1/2 -translate-x-1/2"
                  >
                    Most Popular
                  </Badge>
                )}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white">
                      {plan.name}
                    </p>
                    {plan.savings && (
                      <p className="text-sm text-primary">
                        Save {plan.savings}%
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      ${plan.price}
                    </p>
                    <p className="text-sm text-gray-500">
                      /{plan.period}
                    </p>
                  </div>
                </div>
                {selectedPlan === plan.id && (
                  <div className="absolute right-4 top-1/2 -translate-y-1/2">
                    <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Trust badges */}
        <div className="flex justify-center gap-6 text-center text-sm text-gray-500">
          <div>
            <Shield className="w-6 h-6 mx-auto mb-1 text-gray-400" />
            <p>Secure Payment</p>
          </div>
          <div>
            <Zap className="w-6 h-6 mx-auto mb-1 text-gray-400" />
            <p>Instant Access</p>
          </div>
          <div>
            <X className="w-6 h-6 mx-auto mb-1 text-gray-400" />
            <p>Cancel Anytime</p>
          </div>
        </div>
      </div>

      {/* Bottom CTA */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg border-t border-gray-200/50 dark:border-gray-800/50 p-4">
        <div className="max-w-2xl mx-auto">
          <Button
            onClick={handleSubscribe}
            disabled={loading}
            className="w-full gap-2"
            size="lg"
          >
            {loading ? (
              'Processing...'
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                Get Premium for ${PLANS.find(p => p.id === selectedPlan)?.price}/month
              </>
            )}
          </Button>
          <p className="text-center text-xs text-gray-500 mt-2">
            Recurring billing. Cancel anytime in settings.
          </p>
        </div>
      </div>
    </div>
  );
}
