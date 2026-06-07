export type SubscriptionTier = 'free' | 'plus' | 'platinum';
export type BillingPeriod = 'monthly' | 'quarterly' | 'yearly';

export interface BillingFeature {
  name: string;
  included: boolean;
}

export interface BillingPlanConfig {
  tier: SubscriptionTier;
  name: string;
  description: string;
  monthlyPrice: number;
  quarterlyPrice: number;
  yearlyPrice: number;
  features: BillingFeature[];
  popular?: boolean;
}

export const BILLING_CONFIG = {
  successUrl: 'https://crush.app/pay/success',
  cancelUrl: 'https://crush.app/pay/cancel',
  plans: [
    {
      tier: 'free' as SubscriptionTier,
      name: 'Free',
      description: 'Everything you need to get started',
      monthlyPrice: 0,
      quarterlyPrice: 0,
      yearlyPrice: 0,
      features: [
        { name: 'Unlimited swipes', included: true },
        { name: 'See your matches', included: true },
        { name: 'Send messages', included: true },
        { name: 'Basic discovery filters', included: true },
        { name: 'Profile prompts', included: true },
        { name: 'See who likes you', included: false },
        { name: 'Unlimited rewinds', included: false },
        { name: 'Super likes', included: false },
        { name: 'Passport mode', included: false },
        { name: 'Profile boost', included: false },
        { name: 'Incognito mode', included: false },
        { name: 'Read receipts', included: false },
        { name: 'Priority support', included: false },
      ],
    },
    {
      tier: 'plus' as SubscriptionTier,
      name: 'Crush+',
      description: 'Unlock premium features',
      monthlyPrice: 9.99,
      quarterlyPrice: 24.99,
      yearlyPrice: 79.99,
      popular: true,
      features: [
        { name: 'Unlimited swipes', included: true },
        { name: 'See your matches', included: true },
        { name: 'Send messages', included: true },
        { name: 'Basic discovery filters', included: true },
        { name: 'Profile prompts', included: true },
        { name: 'See who likes you', included: true },
        { name: 'Unlimited rewinds', included: true },
        { name: '5 Super likes/day', included: true },
        { name: 'Passport mode', included: true },
        { name: '1 Boost/month', included: true },
        { name: 'Incognito mode', included: false },
        { name: 'Read receipts', included: false },
        { name: 'Priority support', included: false },
      ],
    },
    {
      tier: 'platinum' as SubscriptionTier,
      name: 'Crush Platinum',
      description: 'The ultimate dating experience',
      monthlyPrice: 19.99,
      quarterlyPrice: 49.99,
      yearlyPrice: 149.99,
      features: [
        { name: 'Unlimited swipes', included: true },
        { name: 'See your matches', included: true },
        { name: 'Send messages', included: true },
        { name: 'Advanced discovery filters', included: true },
        { name: 'Profile prompts', included: true },
        { name: 'See who likes you', included: true },
        { name: 'Unlimited rewinds', included: true },
        { name: 'Unlimited Super likes', included: true },
        { name: 'Passport mode', included: true },
        { name: '5 Boosts/month', included: true },
        { name: 'Incognito mode', included: true },
        { name: 'Read receipts', included: true },
        { name: 'Priority support', included: true },
      ],
    },
  ],

  getPriceForPeriod: (plan: BillingPlanConfig, period: BillingPeriod) => {
    switch (period) {
      case 'monthly':
        return plan.monthlyPrice;
      case 'quarterly':
        return plan.quarterlyPrice;
      case 'yearly':
        return plan.yearlyPrice;
    }
  },

  getMonthlyEquivalent: (plan: BillingPlanConfig, period: BillingPeriod) => {
    switch (period) {
      case 'monthly':
        return plan.monthlyPrice;
      case 'quarterly':
        return plan.quarterlyPrice / 3;
      case 'yearly':
        return plan.yearlyPrice / 12;
    }
  },

  getSavingsPercentage: (plan: BillingPlanConfig, period: BillingPeriod) => {
    if (plan.monthlyPrice === 0 || period === 'monthly') return 0;
    const totalMonthly = plan.monthlyPrice * (period === 'yearly' ? 12 : 3);
    const discountedPrice = BILLING_CONFIG.getPriceForPeriod(plan, period);
    return Math.round((1 - discountedPrice / totalMonthly) * 100);
  },
};
