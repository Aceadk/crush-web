'use client';

import Link from 'next/link';
import { Heart, MessageCircle, Shield, Sparkles, ArrowRight, Star, Check } from 'lucide-react';
import { ThemeToggle } from '@/shared/components/theme';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-border/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            <Link href="/" className="flex items-center gap-2">
              <Heart className="w-6 h-6 text-primary fill-primary" />
              <span className="text-lg font-semibold text-gradient">CRUSH</span>
            </Link>

            <div className="hidden md:flex items-center gap-6">
              <Link href="/features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Features
              </Link>
              <Link href="/pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
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
      <section className="pt-28 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent text-accent-foreground text-xs font-medium mb-6">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Over 1 million matches made</span>
            </div>

            <h1 className="text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight mb-4">
              Find your{' '}
              <span className="text-gradient">perfect match</span>
            </h1>

            <p className="text-base sm:text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
              CRUSH is the dating app that focuses on meaningful connections.
              Swipe, match, and chat with people who share your interests and values.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/auth/signup" className="btn-primary px-6 py-2.5">
                Start Matching
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link href="/features" className="btn-outline px-6 py-2.5">
                Learn More
              </Link>
            </div>

            {/* Social proof */}
            <div className="flex items-center justify-center gap-8 mt-12 pt-8 border-t border-border">
              <div className="text-center">
                <div className="text-2xl font-semibold text-foreground">4.8</div>
                <div className="flex items-center gap-0.5 justify-center my-1">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-3.5 h-3.5 text-warning fill-warning" />
                  ))}
                </div>
                <div className="text-xs text-muted-foreground">App Store</div>
              </div>
              <div className="h-10 w-px bg-border" />
              <div className="text-center">
                <div className="text-2xl font-semibold text-foreground">1M+</div>
                <div className="text-xs text-muted-foreground mt-1">Downloads</div>
              </div>
              <div className="h-10 w-px bg-border" />
              <div className="text-center">
                <div className="text-2xl font-semibold text-foreground">50K+</div>
                <div className="text-xs text-muted-foreground mt-1">Matches Daily</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-muted/30">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight mb-3">
              Why Choose <span className="text-gradient">CRUSH</span>?
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              We've designed every feature to help you find meaningful connections
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <FeatureCard
              icon={<Heart className="w-6 h-6" />}
              title="Smart Matching"
              description="Our algorithm learns your preferences to show you compatible matches based on interests, values, and lifestyle."
            />
            <FeatureCard
              icon={<MessageCircle className="w-6 h-6" />}
              title="Meaningful Conversations"
              description="Break the ice with profile prompts and start conversations that matter. No more awkward openers."
            />
            <FeatureCard
              icon={<Shield className="w-6 h-6" />}
              title="Safe & Secure"
              description="Photo verification, profile moderation, and robust reporting tools keep our community safe."
            />
          </div>
        </div>
      </section>

      {/* Pricing Section Preview */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight mb-3">
              Simple, Transparent Pricing
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Start for free, upgrade when you're ready
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
            <PricingCard
              name="Free"
              price="$0"
              description="Everything you need to get started"
              features={[
                'Unlimited swipes',
                'See who you matched with',
                'Send messages',
                'Basic discovery filters',
              ]}
              ctaText="Get Started"
              ctaHref="/auth/signup"
            />
            <PricingCard
              name="CRUSH+"
              price="$9.99"
              period="/month"
              description="Unlock premium features"
              features={[
                'Everything in Free',
                'See who likes you',
                'Unlimited rewinds',
                'Super likes',
                'Advanced filters',
                'Read receipts',
              ]}
              ctaText="Try CRUSH+"
              ctaHref="/auth/signup?plan=plus"
              highlighted
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center">
          <div className="rounded-2xl border border-border bg-card p-8 sm:p-12">
            <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight mb-3">
              Ready to Find Your <span className="text-gradient">CRUSH</span>?
            </h2>
            <p className="text-muted-foreground mb-6 max-w-lg mx-auto">
              Join millions of singles who have found love on CRUSH. Your perfect match is waiting.
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
                <span className="font-semibold text-gradient">CRUSH</span>
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
                <li><Link href="/guidelines" className="hover:text-foreground transition-colors">Guidelines</Link></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-border pt-6 flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-xs text-muted-foreground">
              &copy; {new Date().getFullYear()} CRUSH. All rights reserved.
            </p>
            <div className="flex items-center gap-4">
              <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"/>
                </svg>
              </a>
              <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-accent text-accent-foreground mb-4">
        {icon}
      </div>
      <h3 className="text-base font-semibold mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground">
        {description}
      </p>
    </div>
  );
}

function PricingCard({
  name,
  price,
  period,
  description,
  features,
  ctaText,
  ctaHref,
  highlighted,
}: {
  name: string;
  price: string;
  period?: string;
  description: string;
  features: string[];
  ctaText: string;
  ctaHref: string;
  highlighted?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border bg-card p-6 relative ${
        highlighted ? 'border-primary shadow-md' : 'border-border'
      }`}
    >
      {highlighted && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-primary text-primary-foreground text-xs font-medium">
          Most Popular
        </div>
      )}
      <div className="text-center mb-6">
        <h3 className="text-base font-semibold mb-1">{name}</h3>
        <div className="flex items-baseline justify-center gap-0.5">
          <span className="text-3xl font-semibold">{price}</span>
          {period && (
            <span className="text-sm text-muted-foreground">
              {period}
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          {description}
        </p>
      </div>
      <ul className="space-y-2.5 mb-6">
        {features.map((feature, i) => (
          <li key={i} className="flex items-center gap-2.5 text-sm">
            <Check className="w-4 h-4 text-success flex-shrink-0" />
            <span>{feature}</span>
          </li>
        ))}
      </ul>
      <Link
        href={ctaHref}
        className={`block text-center w-full py-2.5 rounded-lg text-sm font-medium transition-colors ${
          highlighted ? 'btn-primary' : 'btn-outline'
        }`}
      >
        {ctaText}
      </Link>
    </div>
  );
}
