'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Heart,
  Check,
  X,
  ArrowRight,
  Star,
  Sparkles,
  Eye,
  Rewind,
  Globe,
  Zap,
  Lock,
  Flame,
  MessageCircle,
  Crown,
  Shield
} from 'lucide-react';
import { ThemeToggle } from '@/shared/components/theme';

type BillingPeriod = 'monthly' | 'quarterly' | 'yearly';

const plans = {
  free: {
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
  plus: {
    name: 'Crush+',
    description: 'Unlock premium features',
    monthlyPrice: 9.99,
    quarterlyPrice: 24.99,
    yearlyPrice: 79.99,
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
    popular: true,
  },
  platinum: {
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
};

export function PricingContent() {
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>('monthly');

  const getPrice = (plan: typeof plans.free | typeof plans.plus | typeof plans.platinum) => {
    switch (billingPeriod) {
      case 'quarterly':
        return plan.quarterlyPrice;
      case 'yearly':
        return plan.yearlyPrice;
      default:
        return plan.monthlyPrice;
    }
  };

  const getMonthlyEquivalent = (plan: typeof plans.free | typeof plans.plus | typeof plans.platinum) => {
    switch (billingPeriod) {
      case 'quarterly':
        return (plan.quarterlyPrice / 3).toFixed(2);
      case 'yearly':
        return (plan.yearlyPrice / 12).toFixed(2);
      default:
        return plan.monthlyPrice.toFixed(2);
    }
  };

  const getSavings = (plan: typeof plans.free | typeof plans.plus | typeof plans.platinum) => {
    if (plan.monthlyPrice === 0) return 0;
    const monthlyTotal = plan.monthlyPrice * (billingPeriod === 'yearly' ? 12 : billingPeriod === 'quarterly' ? 3 : 1);
    const discountedPrice = getPrice(plan);
    return Math.round((1 - discountedPrice / monthlyTotal) * 100);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-border/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            <Link href="/" className="flex items-center gap-2">
              <Heart className="w-6 h-6 text-primary fill-primary" />
              <span className="text-lg font-semibold text-gradient">Crush</span>
            </Link>

            <div className="hidden md:flex items-center gap-6">
              <Link href="/features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Features
              </Link>
              <Link href="/pricing" className="text-sm text-foreground font-medium">
                Pricing
              </Link>
              <Link href="/about" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                About
              </Link>
              <Link href="/safety" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Safety
              </Link>
            </div>

            <div className="flex items-center gap-3">
              <ThemeToggle />
              <Link href="/auth/login" className="hidden sm:inline-flex text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                Log in
              </Link>
              <Link href="/auth/signup" className="btn-primary text-sm">
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-28 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent text-accent-foreground text-xs font-medium mb-6">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Simple, transparent pricing</span>
            </div>

            <h1 className="text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight mb-4">
              Choose Your{' '}
              <span className="text-gradient">Perfect Plan</span>
            </h1>

            <p className="text-base sm:text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
              Start for free, upgrade when you're ready. No hidden fees, cancel anytime.
            </p>

            {/* Billing Toggle */}
            <div className="inline-flex items-center p-1 rounded-full bg-muted">
              <button
                onClick={() => setBillingPeriod('monthly')}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  billingPeriod === 'monthly'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingPeriod('quarterly')}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  billingPeriod === 'quarterly'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Quarterly
              </button>
              <button
                onClick={() => setBillingPeriod('yearly')}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors relative ${
                  billingPeriod === 'yearly'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Yearly
                <span className="absolute -top-2 -right-2 px-1.5 py-0.5 rounded-full bg-success text-success-foreground text-[10px] font-semibold">
                  -33%
                </span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-3 gap-6">
            {/* Free Plan */}
            <PricingCard
              plan={plans.free}
              price={getPrice(plans.free)}
              monthlyEquivalent={getMonthlyEquivalent(plans.free)}
              billingPeriod={billingPeriod}
              savings={getSavings(plans.free)}
            />

            {/* Plus Plan */}
            <PricingCard
              plan={plans.plus}
              price={getPrice(plans.plus)}
              monthlyEquivalent={getMonthlyEquivalent(plans.plus)}
              billingPeriod={billingPeriod}
              savings={getSavings(plans.plus)}
              popular
            />

            {/* Platinum Plan */}
            <PricingCard
              plan={plans.platinum}
              price={getPrice(plans.platinum)}
              monthlyEquivalent={getMonthlyEquivalent(plans.platinum)}
              billingPeriod={billingPeriod}
              savings={getSavings(plans.platinum)}
            />
          </div>
        </div>
      </section>

      {/* Feature Comparison Table */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-muted/30">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight mb-3">
              Compare All <span className="text-gradient">Features</span>
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              See exactly what you get with each plan
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-4 px-4 font-semibold">Feature</th>
                  <th className="text-center py-4 px-4 font-semibold">Free</th>
                  <th className="text-center py-4 px-4 font-semibold">
                    <div className="flex items-center justify-center gap-1">
                      Crush+
                      <Star className="w-4 h-4 text-primary fill-primary" />
                    </div>
                  </th>
                  <th className="text-center py-4 px-4 font-semibold">
                    <div className="flex items-center justify-center gap-1">
                      Platinum
                      <Crown className="w-4 h-4 text-warning" />
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                <ComparisonRow
                  feature="Unlimited swipes"
                  free={true}
                  plus={true}
                  platinum={true}
                />
                <ComparisonRow
                  feature="See your matches"
                  free={true}
                  plus={true}
                  platinum={true}
                />
                <ComparisonRow
                  feature="Send messages"
                  free={true}
                  plus={true}
                  platinum={true}
                />
                <ComparisonRow
                  feature="Discovery filters"
                  free="Basic"
                  plus="Basic"
                  platinum="Advanced"
                />
                <ComparisonRow
                  feature="See who likes you"
                  free={false}
                  plus={true}
                  platinum={true}
                />
                <ComparisonRow
                  feature="Rewinds"
                  free="1/day"
                  plus="Unlimited"
                  platinum="Unlimited"
                />
                <ComparisonRow
                  feature="Super likes"
                  free="1/week"
                  plus="5/day"
                  platinum="Unlimited"
                />
                <ComparisonRow
                  feature="Passport mode"
                  free={false}
                  plus={true}
                  platinum={true}
                />
                <ComparisonRow
                  feature="Profile boosts"
                  free={false}
                  plus="1/month"
                  platinum="5/month"
                />
                <ComparisonRow
                  feature="Incognito mode"
                  free={false}
                  plus={false}
                  platinum={true}
                />
                <ComparisonRow
                  feature="Read receipts"
                  free={false}
                  plus={false}
                  platinum={true}
                />
                <ComparisonRow
                  feature="Priority support"
                  free={false}
                  plus={false}
                  platinum={true}
                />
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Premium Benefits */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight mb-3">
              Why Go <span className="text-gradient">Premium</span>?
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Premium members get more matches and find love faster
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <BenefitCard
              icon={<Eye className="w-6 h-6" />}
              title="3x More Matches"
              description="See who likes you and match instantly instead of waiting"
            />
            <BenefitCard
              icon={<Zap className="w-6 h-6" />}
              title="10x More Views"
              description="Boost your profile to the top and get seen by more people"
            />
            <BenefitCard
              icon={<Globe className="w-6 h-6" />}
              title="Global Access"
              description="Match with people anywhere in the world with Passport"
            />
            <BenefitCard
              icon={<Shield className="w-6 h-6" />}
              title="Full Control"
              description="Browse privately with Incognito mode and choose who sees you"
            />
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-muted/30">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight mb-3">
              Frequently Asked <span className="text-gradient">Questions</span>
            </h2>
          </div>

          <div className="space-y-4">
            <FAQItem
              question="Can I cancel my subscription anytime?"
              answer="Yes! You can cancel your subscription at any time. You'll continue to have access to premium features until the end of your billing period."
            />
            <FAQItem
              question="What payment methods do you accept?"
              answer="We accept all major credit cards (Visa, Mastercard, American Express), PayPal, and Apple Pay. All payments are securely processed."
            />
            <FAQItem
              question="Will my subscription auto-renew?"
              answer="Yes, subscriptions auto-renew at the end of each billing period. You can turn off auto-renewal in your account settings at any time."
            />
            <FAQItem
              question="Can I switch between plans?"
              answer="You can upgrade or downgrade your plan at any time. When upgrading, you'll be charged the prorated difference. When downgrading, the change takes effect at your next billing date."
            />
            <FAQItem
              question="Is there a free trial?"
              answer="We don't offer a free trial, but our Free plan lets you use all core features forever. You can upgrade whenever you're ready to unlock premium features."
            />
            <FAQItem
              question="Do you offer refunds?"
              answer="We offer a 7-day money-back guarantee for new subscribers. If you're not satisfied, contact support within 7 days of your purchase for a full refund."
            />
          </div>

          <div className="text-center mt-8">
            <Link href="/faq" className="text-primary font-medium hover:underline inline-flex items-center gap-1">
              View all FAQs
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center">
          <div className="rounded-2xl border border-border bg-card p-8 sm:p-12">
            <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight mb-3">
              Ready to Find Your <span className="text-gradient">Match</span>?
            </h2>
            <p className="text-muted-foreground mb-6 max-w-lg mx-auto">
              Join millions of singles who have found love on Crush. Start free today.
            </p>
            <Link href="/auth/signup" className="btn-primary px-6 py-2.5">
              Create Free Account
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 sm:px-6 lg:px-8 border-t border-border">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
            <div>
              <Link href="/" className="flex items-center gap-2 mb-4">
                <Heart className="w-5 h-5 text-primary fill-primary" />
                <span className="font-semibold text-gradient">Crush</span>
              </Link>
              <p className="text-xs text-muted-foreground">
                Find meaningful connections with people who share your interests.
              </p>
            </div>

            <div>
              <h4 className="text-sm font-medium mb-3">Product</h4>
              <ul className="space-y-2 text-xs text-muted-foreground">
                <li><Link href="/features" className="hover:text-foreground transition-colors">Features</Link></li>
                <li><Link href="/pricing" className="hover:text-foreground transition-colors">Pricing</Link></li>
                <li><Link href="/download" className="hover:text-foreground transition-colors">Download</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="text-sm font-medium mb-3">Company</h4>
              <ul className="space-y-2 text-xs text-muted-foreground">
                <li><Link href="/about" className="hover:text-foreground transition-colors">About</Link></li>
                <li><Link href="/contact" className="hover:text-foreground transition-colors">Contact</Link></li>
                <li><Link href="/faq" className="hover:text-foreground transition-colors">FAQ</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="text-sm font-medium mb-3">Legal</h4>
              <ul className="space-y-2 text-xs text-muted-foreground">
                <li><Link href="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link></li>
                <li><Link href="/terms" className="hover:text-foreground transition-colors">Terms of Service</Link></li>
                <li><Link href="/safety" className="hover:text-foreground transition-colors">Safety</Link></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-border pt-6 flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-xs text-muted-foreground">
              &copy; {new Date().getFullYear()} Crush. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

function PricingCard({
  plan,
  price,
  monthlyEquivalent,
  billingPeriod,
  savings,
  popular,
}: {
  plan: typeof plans.free;
  price: number;
  monthlyEquivalent: string;
  billingPeriod: BillingPeriod;
  savings: number;
  popular?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border bg-card p-6 relative ${
        popular ? 'border-primary shadow-lg scale-105' : 'border-border'
      }`}
    >
      {popular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-primary text-primary-foreground text-xs font-medium">
          Most Popular
        </div>
      )}

      <div className="text-center mb-6">
        <h3 className="text-lg font-semibold mb-1">{plan.name}</h3>
        <p className="text-sm text-muted-foreground mb-4">{plan.description}</p>

        <div className="flex items-baseline justify-center gap-1">
          <span className="text-4xl font-bold">${price === 0 ? '0' : price.toFixed(2)}</span>
          {price > 0 && (
            <span className="text-muted-foreground">
              /{billingPeriod === 'monthly' ? 'mo' : billingPeriod === 'quarterly' ? '3mo' : 'yr'}
            </span>
          )}
        </div>

        {price > 0 && billingPeriod !== 'monthly' && (
          <div className="mt-2 space-y-1">
            <p className="text-xs text-muted-foreground">
              ${monthlyEquivalent}/month
            </p>
            {savings > 0 && (
              <span className="inline-block px-2 py-0.5 rounded-full bg-success/10 text-success text-xs font-medium">
                Save {savings}%
              </span>
            )}
          </div>
        )}
      </div>

      <ul className="space-y-3 mb-6">
        {plan.features.slice(0, 8).map((feature, i) => (
          <li key={i} className="flex items-center gap-2.5 text-sm">
            {feature.included ? (
              <Check className="w-4 h-4 text-success flex-shrink-0" />
            ) : (
              <X className="w-4 h-4 text-muted-foreground/50 flex-shrink-0" />
            )}
            <span className={feature.included ? '' : 'text-muted-foreground/50'}>
              {feature.name}
            </span>
          </li>
        ))}
      </ul>

      <Link
        href={price === 0 ? '/auth/signup' : `/auth/signup?plan=${plan.name.toLowerCase().replace(' ', '-')}`}
        className={`block text-center w-full py-3 rounded-lg text-sm font-medium transition-colors ${
          popular ? 'btn-primary' : 'btn-outline'
        }`}
      >
        {price === 0 ? 'Get Started Free' : `Get ${plan.name}`}
      </Link>
    </div>
  );
}

function ComparisonRow({
  feature,
  free,
  plus,
  platinum,
}: {
  feature: string;
  free: boolean | string;
  plus: boolean | string;
  platinum: boolean | string;
}) {
  const renderValue = (value: boolean | string) => {
    if (typeof value === 'boolean') {
      return value ? (
        <Check className="w-5 h-5 text-success mx-auto" />
      ) : (
        <X className="w-5 h-5 text-muted-foreground/30 mx-auto" />
      );
    }
    return <span className="text-sm">{value}</span>;
  };

  return (
    <tr className="border-b border-border/50 hover:bg-muted/30 transition-colors">
      <td className="py-4 px-4 text-sm">{feature}</td>
      <td className="py-4 px-4 text-center">{renderValue(free)}</td>
      <td className="py-4 px-4 text-center bg-primary/5">{renderValue(plus)}</td>
      <td className="py-4 px-4 text-center">{renderValue(platinum)}</td>
    </tr>
  );
}

function BenefitCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="text-center p-6">
      <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 text-primary mb-4">
        {icon}
      </div>
      <h3 className="font-semibold mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

function FAQItem({
  question,
  answer,
}: {
  question: string;
  answer: string;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="rounded-lg border border-border bg-card">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-6 py-4 flex items-center justify-between text-left"
      >
        <span className="font-medium">{question}</span>
        <svg
          className={`w-5 h-5 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isOpen && (
        <div className="px-6 pb-4">
          <p className="text-sm text-muted-foreground">{answer}</p>
        </div>
      )}
    </div>
  );
}
