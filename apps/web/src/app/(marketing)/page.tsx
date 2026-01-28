'use client';

import Link from 'next/link';
import { Heart, MessageCircle, Shield, Sparkles, ArrowRight, Star, Check, Users, Zap, Globe, Eye, Rewind, UserCheck } from 'lucide-react';
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
              <span className="text-lg font-semibold text-gradient">Crush</span>
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
              Crush is the dating app that focuses on meaningful connections.
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
              Why Choose <span className="text-gradient">Crush</span>?
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
            <FeatureCard
              icon={<Eye className="w-6 h-6" />}
              title="See Who Likes You"
              description="No more guessing! Premium members can see everyone who's already interested in them."
            />
            <FeatureCard
              icon={<Rewind className="w-6 h-6" />}
              title="Undo Swipes"
              description="Changed your mind? Use rewind to take back your last swipe and get a second chance."
            />
            <FeatureCard
              icon={<Globe className="w-6 h-6" />}
              title="Passport Mode"
              description="Match with people anywhere in the world. Perfect for planning trips or long-distance connections."
            />
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight mb-3">
              How <span className="text-gradient">Crush</span> Works
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Finding love has never been easier. Just three simple steps.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <StepCard
              number={1}
              icon={<UserCheck className="w-6 h-6" />}
              title="Create Your Profile"
              description="Sign up in seconds and build a profile that shows off the real you. Add photos, answer prompts, and share your interests."
            />
            <StepCard
              number={2}
              icon={<Heart className="w-6 h-6" />}
              title="Discover Matches"
              description="Swipe through profiles tailored to your preferences. Like someone? Swipe right. Not interested? Swipe left."
            />
            <StepCard
              number={3}
              icon={<MessageCircle className="w-6 h-6" />}
              title="Start Chatting"
              description="When you both like each other, it's a match! Break the ice and start a conversation that could change your life."
            />
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-muted/30">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight mb-3">
              Love Stories From <span className="text-gradient">Crush</span>
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Hear from real couples who found each other on Crush
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <TestimonialCard
              quote="I was skeptical about dating apps until I tried Crush. The quality of matches is incredible - I met my boyfriend within two weeks!"
              author="Sarah M."
              location="New York, NY"
              rating={5}
            />
            <TestimonialCard
              quote="What I love about Crush is that people actually want to have real conversations. Not just 'hey'. We're getting married next spring!"
              author="Michael T."
              location="Los Angeles, CA"
              rating={5}
            />
            <TestimonialCard
              quote="The safety features gave me so much peace of mind. I felt comfortable being myself, and that's how I found my soulmate."
              author="Emily R."
              location="Chicago, IL"
              rating={5}
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
              name="Crush+"
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
              ctaText="Try Crush+"
              ctaHref="/auth/signup?plan=plus"
              highlighted
            />
          </div>
        </div>
      </section>

      {/* Download Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-muted/30">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent text-accent-foreground text-xs font-medium mb-6">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Available on all platforms</span>
              </div>

              <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight mb-4">
                Get <span className="text-gradient">Crush</span> on Your Phone
              </h2>

              <p className="text-muted-foreground mb-8 max-w-lg">
                Download the Crush app for the best experience. Available for free on iOS and Android.
                Swipe, match, and chat wherever you go.
              </p>

              <div className="flex flex-wrap gap-4 mb-8">
                {/* App Store Button */}
                <a
                  href="#"
                  className="inline-flex items-center gap-3 px-5 py-3 rounded-xl bg-foreground text-background hover:opacity-90 transition-opacity"
                >
                  <svg className="w-7 h-7" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                  </svg>
                  <div className="text-left">
                    <div className="text-[10px] opacity-80">Download on the</div>
                    <div className="text-base font-semibold -mt-0.5">App Store</div>
                  </div>
                </a>

                {/* Google Play Button */}
                <a
                  href="#"
                  className="inline-flex items-center gap-3 px-5 py-3 rounded-xl bg-foreground text-background hover:opacity-90 transition-opacity"
                >
                  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M3.609 1.814L13.792 12 3.609 22.186a.996.996 0 01-.609-.92V2.734a1 1 0 01.609-.92zm10.89 10.893l2.302 2.302-10.937 6.333 8.635-8.635zm3.199-3.198l2.807 1.626a1 1 0 010 1.73l-2.807 1.626L15.206 12l2.492-2.491zM5.864 2.658L16.8 8.991l-2.302 2.302-8.634-8.635z"/>
                  </svg>
                  <div className="text-left">
                    <div className="text-[10px] opacity-80">GET IT ON</div>
                    <div className="text-base font-semibold -mt-0.5">Google Play</div>
                  </div>
                </a>
              </div>

              <div className="flex items-center gap-6 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Free to download</span>
                </div>
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>No ads</span>
                </div>
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Secure</span>
                </div>
              </div>
            </div>

            {/* Phone Mockup */}
            <div className="relative flex justify-center">
              <div className="relative">
                {/* Phone Frame */}
                <div className="w-64 h-[520px] bg-gradient-to-br from-foreground/5 to-foreground/10 rounded-[3rem] p-3 shadow-2xl">
                  <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/5 rounded-[2.5rem] flex items-center justify-center overflow-hidden">
                    <div className="text-center p-6">
                      <Heart className="w-16 h-16 text-primary fill-primary mx-auto mb-4" />
                      <h3 className="text-xl font-semibold text-gradient mb-2">Crush</h3>
                      <p className="text-sm text-muted-foreground">Find your perfect match</p>
                    </div>
                  </div>
                </div>

                {/* Floating Elements */}
                <div className="absolute -right-8 top-20 bg-card rounded-xl p-3 shadow-lg border border-border animate-pulse">
                  <div className="flex items-center gap-2">
                    <Heart className="w-5 h-5 text-primary fill-primary" />
                    <span className="text-sm font-medium">New Match!</span>
                  </div>
                </div>

                <div className="absolute -left-8 bottom-32 bg-card rounded-xl p-3 shadow-lg border border-border">
                  <div className="flex items-center gap-2">
                    <MessageCircle className="w-5 h-5 text-primary" />
                    <span className="text-sm font-medium">Hey there! 👋</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center">
          <div className="rounded-2xl border border-border bg-card p-8 sm:p-12">
            <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight mb-3">
              Ready to Find Your <span className="text-gradient">Crush</span>?
            </h2>
            <p className="text-muted-foreground mb-6 max-w-lg mx-auto">
              Join millions of singles who have found love on Crush. Your perfect match is waiting.
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
                <li><Link href="/guidelines" className="hover:text-foreground transition-colors">Guidelines</Link></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-border pt-6 flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-xs text-muted-foreground">
              &copy; {new Date().getFullYear()} Crush. All rights reserved.
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

function StepCard({
  number,
  icon,
  title,
  description,
}: {
  number: number;
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="text-center">
      <div className="relative inline-flex mb-6">
        <div className="w-16 h-16 rounded-2xl bg-accent flex items-center justify-center text-accent-foreground">
          {icon}
        </div>
        <div className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-primary text-primary-foreground text-sm font-semibold flex items-center justify-center">
          {number}
        </div>
      </div>
      <h3 className="text-base font-semibold mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground">
        {description}
      </p>
    </div>
  );
}

function TestimonialCard({
  quote,
  author,
  location,
  rating,
}: {
  quote: string;
  author: string;
  location: string;
  rating: number;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <div className="flex items-center gap-0.5 mb-4">
        {[...Array(rating)].map((_, i) => (
          <Star key={i} className="w-4 h-4 text-warning fill-warning" />
        ))}
      </div>
      <p className="text-sm text-foreground mb-4 italic">
        "{quote}"
      </p>
      <div>
        <p className="text-sm font-semibold">{author}</p>
        <p className="text-xs text-muted-foreground">{location}</p>
      </div>
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
