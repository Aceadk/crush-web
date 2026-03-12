'use client';

import { ThemeToggle } from '@/shared/components/theme';
import { BILLING_CONFIG, BillingPeriod, BillingPlanConfig } from '@crush/core';
import {
    ArrowRight,
    Check,
    Crown,
    Eye,
    Globe,
    Heart,
    Shield,
    Sparkles,
    Star,
    X,
    Zap,
} from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

export function PricingContent() {
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>('monthly');

  const freePlan = BILLING_CONFIG.plans.find((p) => p.tier === 'free')!;
  const plusPlan = BILLING_CONFIG.plans.find((p) => p.tier === 'plus')!;
  const platinumPlan = BILLING_CONFIG.plans.find((p) => p.tier === 'platinum')!;

  const getPrice = (plan: BillingPlanConfig) =>
    BILLING_CONFIG.getPriceForPeriod(plan, billingPeriod);
  const getMonthlyEquivalent = (plan: BillingPlanConfig) =>
    BILLING_CONFIG.getMonthlyEquivalent(plan, billingPeriod).toFixed(2);
  const getSavings = (plan: BillingPlanConfig) =>
    BILLING_CONFIG.getSavingsPercentage(plan, billingPeriod);

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="glass fixed left-0 right-0 top-0 z-50 border-b border-border/50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-14 items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <Heart className="h-6 w-6 fill-primary text-primary" />
              <span className="text-gradient text-lg font-semibold">Crush</span>
            </Link>

            <div className="hidden items-center gap-6 md:flex">
              <Link
                href="/features"
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                Features
              </Link>
              <Link href="/pricing" className="text-sm font-medium text-foreground">
                Pricing
              </Link>
              <Link
                href="/about"
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                About
              </Link>
              <Link
                href="/safety"
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                Safety
              </Link>
            </div>

            <div className="flex items-center gap-3">
              <ThemeToggle />
              <Link
                href="/auth/login"
                className="hidden text-sm font-medium text-muted-foreground transition-colors hover:text-foreground sm:inline-flex"
              >
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
      <section className="px-4 pb-12 pt-28 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-accent px-3 py-1.5 text-xs font-medium text-accent-foreground">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Simple, transparent pricing</span>
            </div>

            <h1 className="mb-4 text-3xl font-semibold tracking-tight sm:text-4xl md:text-5xl">
              Choose Your <span className="text-gradient">Perfect Plan</span>
            </h1>

            <p className="mx-auto mb-8 max-w-2xl text-base text-muted-foreground sm:text-lg">
              Start for free, upgrade when you're ready. No hidden fees, cancel anytime.
            </p>

            {/* Billing Toggle */}
            <div className="inline-flex items-center rounded-full bg-muted p-1">
              <button
                onClick={() => setBillingPeriod('monthly')}
                className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                  billingPeriod === 'monthly'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingPeriod('quarterly')}
                className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                  billingPeriod === 'quarterly'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Quarterly
              </button>
              <button
                onClick={() => setBillingPeriod('yearly')}
                className={`relative rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                  billingPeriod === 'yearly'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Yearly
                <span className="absolute -right-2 -top-2 rounded-full bg-success px-1.5 py-0.5 text-[10px] font-semibold text-success-foreground">
                  -33%
                </span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="px-4 pb-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-6 md:grid-cols-3">
            {/* Free Plan */}
            <PricingCard
              plan={freePlan}
              price={getPrice(freePlan)}
              monthlyEquivalent={getMonthlyEquivalent(freePlan)}
              billingPeriod={billingPeriod}
              savings={getSavings(freePlan)}
            />

            {/* Plus Plan */}
            <PricingCard
              plan={plusPlan}
              price={getPrice(plusPlan)}
              monthlyEquivalent={getMonthlyEquivalent(plusPlan)}
              billingPeriod={billingPeriod}
              savings={getSavings(plusPlan)}
              popular={plusPlan.popular}
            />

            {/* Platinum Plan */}
            <PricingCard
              plan={platinumPlan}
              price={getPrice(platinumPlan)}
              monthlyEquivalent={getMonthlyEquivalent(platinumPlan)}
              billingPeriod={billingPeriod}
              savings={getSavings(platinumPlan)}
            />
          </div>
        </div>
      </section>

      {/* Feature Comparison Table */}
      <section className="bg-muted/30 px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="mb-12 text-center">
            <h2 className="mb-3 text-2xl font-semibold tracking-tight sm:text-3xl">
              Compare All <span className="text-gradient">Features</span>
            </h2>
            <p className="mx-auto max-w-xl text-muted-foreground">
              See exactly what you get with each plan
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-4 py-4 text-left font-semibold">Feature</th>
                  <th className="px-4 py-4 text-center font-semibold">Free</th>
                  <th className="px-4 py-4 text-center font-semibold">
                    <div className="flex items-center justify-center gap-1">
                      Crush+
                      <Star className="h-4 w-4 fill-primary text-primary" />
                    </div>
                  </th>
                  <th className="px-4 py-4 text-center font-semibold">
                    <div className="flex items-center justify-center gap-1">
                      Platinum
                      <Crown className="h-4 w-4 text-warning" />
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                <ComparisonRow feature="Unlimited swipes" free={true} plus={true} platinum={true} />
                <ComparisonRow feature="See your matches" free={true} plus={true} platinum={true} />
                <ComparisonRow feature="Send messages" free={true} plus={true} platinum={true} />
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
                <ComparisonRow feature="Passport mode" free={false} plus={true} platinum={true} />
                <ComparisonRow
                  feature="Profile boosts"
                  free={false}
                  plus="1/month"
                  platinum="5/month"
                />
                <ComparisonRow feature="Incognito mode" free={false} plus={false} platinum={true} />
                <ComparisonRow feature="Read receipts" free={false} plus={false} platinum={true} />
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
      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-12 text-center">
            <h2 className="mb-3 text-2xl font-semibold tracking-tight sm:text-3xl">
              Why Go <span className="text-gradient">Premium</span>?
            </h2>
            <p className="mx-auto max-w-xl text-muted-foreground">
              Premium members get more matches and find love faster
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <BenefitCard
              icon={<Eye className="h-6 w-6" />}
              title="3x More Matches"
              description="See who likes you and match instantly instead of waiting"
            />
            <BenefitCard
              icon={<Zap className="h-6 w-6" />}
              title="10x More Views"
              description="Boost your profile to the top and get seen by more people"
            />
            <BenefitCard
              icon={<Globe className="h-6 w-6" />}
              title="Global Access"
              description="Match with people anywhere in the world with Passport"
            />
            <BenefitCard
              icon={<Shield className="h-6 w-6" />}
              title="Full Control"
              description="Browse privately with Incognito mode and choose who sees you"
            />
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="bg-muted/30 px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <div className="mb-12 text-center">
            <h2 className="mb-3 text-2xl font-semibold tracking-tight sm:text-3xl">
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

          <div className="mt-8 text-center">
            <Link
              href="/faq"
              className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
            >
              View all FAQs
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <div className="rounded-2xl border border-border bg-card p-8 sm:p-12">
            <h2 className="mb-3 text-2xl font-semibold tracking-tight sm:text-3xl">
              Ready to Find Your <span className="text-gradient">Match</span>?
            </h2>
            <p className="mx-auto mb-6 max-w-lg text-muted-foreground">
              Join millions of singles who have found love on Crush. Start free today.
            </p>
            <Link href="/auth/signup" className="btn-primary px-6 py-2.5">
              Create Free Account
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8 grid grid-cols-2 gap-8 md:grid-cols-4">
            <div>
              <Link href="/" className="mb-4 flex items-center gap-2">
                <Heart className="h-5 w-5 fill-primary text-primary" />
                <span className="text-gradient font-semibold">Crush</span>
              </Link>
              <p className="text-xs text-muted-foreground">
                Find meaningful connections with people who share your interests.
              </p>
            </div>

            <div>
              <h4 className="mb-3 text-sm font-medium">Product</h4>
              <ul className="space-y-2 text-xs text-muted-foreground">
                <li>
                  <Link href="/features" className="transition-colors hover:text-foreground">
                    Features
                  </Link>
                </li>
                <li>
                  <Link href="/pricing" className="transition-colors hover:text-foreground">
                    Pricing
                  </Link>
                </li>
                <li>
                  <Link href="/#download" className="transition-colors hover:text-foreground">
                    Download
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="mb-3 text-sm font-medium">Company</h4>
              <ul className="space-y-2 text-xs text-muted-foreground">
                <li>
                  <Link href="/about" className="transition-colors hover:text-foreground">
                    About
                  </Link>
                </li>
                <li>
                  <Link href="/contact" className="transition-colors hover:text-foreground">
                    Contact
                  </Link>
                </li>
                <li>
                  <Link href="/faq" className="transition-colors hover:text-foreground">
                    FAQ
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="mb-3 text-sm font-medium">Legal</h4>
              <ul className="space-y-2 text-xs text-muted-foreground">
                <li>
                  <Link href="/privacy" className="transition-colors hover:text-foreground">
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link href="/terms" className="transition-colors hover:text-foreground">
                    Terms of Service
                  </Link>
                </li>
                <li>
                  <Link href="/safety" className="transition-colors hover:text-foreground">
                    Safety
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="flex flex-col items-center justify-between gap-4 border-t border-border pt-6 sm:flex-row">
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
  plan: BillingPlanConfig;
  price: number;
  monthlyEquivalent: string;
  billingPeriod: BillingPeriod;
  savings: number;
  popular?: boolean;
}) {
  return (
    <div
      className={`relative rounded-2xl border bg-card p-6 ${
        popular ? 'scale-105 border-primary shadow-lg' : 'border-border'
      }`}
    >
      {popular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground">
          Most Popular
        </div>
      )}

      <div className="mb-6 text-center">
        <h3 className="mb-1 text-lg font-semibold">{plan.name}</h3>
        <p className="mb-4 text-sm text-muted-foreground">{plan.description}</p>

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
            <p className="text-xs text-muted-foreground">${monthlyEquivalent}/month</p>
            {savings > 0 && (
              <span className="inline-block rounded-full bg-success/10 px-2 py-0.5 text-xs font-medium text-success">
                Save {savings}%
              </span>
            )}
          </div>
        )}
      </div>

      <ul className="mb-6 space-y-3">
        {plan.features.slice(0, 8).map((feature, i) => (
          <li key={i} className="flex items-center gap-2.5 text-sm">
            {feature.included ? (
              <Check className="h-4 w-4 flex-shrink-0 text-success" />
            ) : (
              <X className="h-4 w-4 flex-shrink-0 text-muted-foreground/50" />
            )}
            <span className={feature.included ? '' : 'text-muted-foreground/50'}>
              {feature.name}
            </span>
          </li>
        ))}
      </ul>

      <Link
        href={price === 0 ? '/auth/signup' : `/auth/signup?plan=${plan.tier}&source=marketing`}
        className={`block w-full rounded-lg py-3 text-center text-sm font-medium transition-colors ${
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
        <Check className="mx-auto h-5 w-5 text-success" />
      ) : (
        <X className="mx-auto h-5 w-5 text-muted-foreground/30" />
      );
    }
    return <span className="text-sm">{value}</span>;
  };

  return (
    <tr className="border-b border-border/50 transition-colors hover:bg-muted/30">
      <td className="px-4 py-4 text-sm">{feature}</td>
      <td className="px-4 py-4 text-center">{renderValue(free)}</td>
      <td className="bg-primary/5 px-4 py-4 text-center">{renderValue(plus)}</td>
      <td className="px-4 py-4 text-center">{renderValue(platinum)}</td>
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
    <div className="p-6 text-center">
      <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        {icon}
      </div>
      <h3 className="mb-2 font-semibold">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="rounded-lg border border-border bg-card">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between px-6 py-4 text-left"
      >
        <span className="font-medium">{question}</span>
        <svg
          className={`h-5 w-5 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`}
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
