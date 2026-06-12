import Link from 'next/link';
import { ArrowRight, Check, Sparkles } from 'lucide-react';
import { cn } from '@crush/ui';
import { Reveal } from './reveal';

interface Plan {
  name: string;
  price: string;
  period?: string;
  description: string;
  features: string[];
  ctaText: string;
  ctaHref: string;
  highlighted?: boolean;
}

const PLANS: Plan[] = [
  {
    name: 'Free',
    price: '$0',
    description: 'Everything you need to get started',
    features: [
      'Unlimited swipes',
      'See who you matched with',
      'Send messages',
      'Basic discovery filters',
    ],
    ctaText: 'Get Started',
    ctaHref: '/auth/signup',
  },
  {
    name: 'Crush+',
    price: '$9.99',
    period: '/month',
    description: 'Unlock premium features',
    features: [
      'Everything in Free',
      'See who likes you',
      'Unlimited rewinds',
      'Super likes',
      'Advanced filters',
      'Read receipts',
    ],
    ctaText: 'Try Crush+',
    ctaHref: '/auth/signup?plan=plus',
    highlighted: true,
  },
];

/** Pricing preview — Free vs Crush+ with a link to the full pricing page. */
export function PricingPreviewSection() {
  return (
    <section className="relative overflow-hidden px-4 py-20 sm:px-6 lg:px-8">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/2 h-80 w-[40rem] max-w-full -translate-x-1/2 -translate-y-1/2 rounded-full bg-secondary/5 blur-3xl"
      />
      <div className="relative mx-auto max-w-7xl">
        <Reveal>
          <div className="mb-14 text-center">
            <h2 className="mb-3 text-3xl font-semibold tracking-tight sm:text-4xl">
              Simple, Transparent Pricing
            </h2>
            <p className="mx-auto max-w-xl text-muted-foreground">
              Start for free, upgrade when you&apos;re ready
            </p>
          </div>
        </Reveal>

        <div className="mx-auto grid max-w-3xl gap-6 md:grid-cols-2">
          {PLANS.map((plan, i) => (
            <Reveal key={plan.name} delay={i * 150}>
              <div
                className={cn(
                  'relative h-full rounded-2xl p-px transition-shadow duration-300',
                  plan.highlighted
                    ? 'bg-gradient-to-br from-primary via-primary/40 to-secondary shadow-[0_16px_64px_-24px_hsl(var(--primary)/0.5)]'
                    : 'bg-border'
                )}
              >
                {plan.highlighted && (
                  <div className="absolute -top-3 left-1/2 z-10 -translate-x-1/2">
                    <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-primary to-secondary px-3 py-1 text-xs font-medium text-white shadow-md">
                      <Sparkles className="h-3 w-3" aria-hidden="true" />
                      Most Popular
                    </span>
                  </div>
                )}
                <div className="flex h-full flex-col rounded-[calc(theme(borderRadius.2xl)-1px)] bg-card p-6 pt-8">
                  <div className="mb-6 text-center">
                    <h3 className="mb-1 text-base font-semibold">{plan.name}</h3>
                    <div className="flex items-baseline justify-center gap-0.5">
                      <span
                        className={cn(
                          'text-4xl font-semibold tracking-tight',
                          plan.highlighted && 'text-gradient'
                        )}
                      >
                        {plan.price}
                      </span>
                      {plan.period && (
                        <span className="text-sm text-muted-foreground">{plan.period}</span>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{plan.description}</p>
                  </div>
                  <ul className="mb-6 flex-1 space-y-2.5">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-center gap-2.5 text-sm">
                        <Check className="h-4 w-4 flex-shrink-0 text-success" aria-hidden="true" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Link
                    href={plan.ctaHref}
                    className={cn(
                      'block w-full rounded-lg py-2.5 text-center text-sm font-medium transition-colors',
                      plan.highlighted ? 'btn-primary' : 'btn-outline'
                    )}
                  >
                    {plan.ctaText}
                  </Link>
                </div>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal delay={300}>
          <div className="mt-10 text-center">
            <Link
              href="/pricing"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Compare all plans and billing options
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
