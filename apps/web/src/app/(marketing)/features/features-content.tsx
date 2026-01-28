'use client';

import Link from 'next/link';
import {
  Heart,
  MessageCircle,
  Shield,
  Sparkles,
  ArrowRight,
  Star,
  Eye,
  Rewind,
  Globe,
  Zap,
  Camera,
  MapPin,
  Bell,
  Lock,
  Filter,
  Flame,
  Users,
  BadgeCheck,
  Mic,
  Video,
  Gift,
  Compass
} from 'lucide-react';
import { ThemeToggle } from '@/shared/components/theme';

export function FeaturesContent() {
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
              <Link href="/features" className="text-sm text-foreground font-medium">
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
              <span>Powerful features for meaningful connections</span>
            </div>

            <h1 className="text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight mb-4">
              Everything You Need to Find{' '}
              <span className="text-gradient">Your Match</span>
            </h1>

            <p className="text-base sm:text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
              From smart matching algorithms to secure messaging, Crush is packed with features
              designed to help you find meaningful connections.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/auth/signup" className="btn-primary px-6 py-2.5">
                Start Free Today
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link href="/pricing" className="btn-outline px-6 py-2.5">
                View Pricing
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Core Features Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-muted/30">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight mb-3">
              Core <span className="text-gradient">Features</span>
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              The essentials that make dating on Crush a great experience
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <FeatureCard
              icon={<Heart className="w-6 h-6" />}
              title="Smart Matching Algorithm"
              description="Our AI-powered algorithm learns from your preferences and behavior to show you the most compatible matches based on interests, values, and lifestyle."
              badge="AI Powered"
            />
            <FeatureCard
              icon={<Filter className="w-6 h-6" />}
              title="Advanced Discovery Filters"
              description="Filter potential matches by age, distance, interests, education, and more. Find exactly who you're looking for."
            />
            <FeatureCard
              icon={<MessageCircle className="w-6 h-6" />}
              title="Rich Messaging"
              description="Send text, photos, GIFs, and voice notes. Express yourself fully with our feature-rich chat experience."
            />
            <FeatureCard
              icon={<Camera className="w-6 h-6" />}
              title="Profile Prompts"
              description="Stand out with creative prompts that showcase your personality. Break the ice before the conversation even starts."
            />
            <FeatureCard
              icon={<MapPin className="w-6 h-6" />}
              title="Location-Based Discovery"
              description="Find matches near you or expand your search to new areas. Perfect for local dating or meeting people when traveling."
            />
            <FeatureCard
              icon={<Bell className="w-6 h-6" />}
              title="Smart Notifications"
              description="Get notified when you have new matches, messages, or when someone special is nearby. Stay connected without being overwhelmed."
            />
          </div>
        </div>
      </section>

      {/* Premium Features Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-medium mb-4">
              <Star className="w-3.5 h-3.5 fill-primary" />
              <span>Crush+ Premium</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight mb-3">
              Unlock <span className="text-gradient">Premium Features</span>
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Take your dating experience to the next level with Crush+ exclusive features
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <PremiumFeatureCard
              icon={<Eye className="w-6 h-6" />}
              title="See Who Likes You"
              description="No more guessing! See everyone who has already swiped right on you and match instantly."
            />
            <PremiumFeatureCard
              icon={<Rewind className="w-6 h-6" />}
              title="Unlimited Rewinds"
              description="Changed your mind? Undo your last swipe and get a second chance with anyone you accidentally passed."
            />
            <PremiumFeatureCard
              icon={<Flame className="w-6 h-6" />}
              title="Super Likes"
              description="Stand out from the crowd. Send Super Likes to show you're really interested and get noticed faster."
            />
            <PremiumFeatureCard
              icon={<Globe className="w-6 h-6" />}
              title="Passport Mode"
              description="Match with people anywhere in the world. Perfect for planning trips or exploring long-distance connections."
            />
            <PremiumFeatureCard
              icon={<Zap className="w-6 h-6" />}
              title="Priority Boost"
              description="Get seen by more people. Boost your profile to the top of the deck and get up to 10x more matches."
            />
            <PremiumFeatureCard
              icon={<Lock className="w-6 h-6" />}
              title="Incognito Mode"
              description="Browse privately. Your profile will only be visible to people you like, giving you full control over who sees you."
            />
          </div>

          <div className="text-center mt-10">
            <Link href="/pricing" className="btn-primary px-8 py-3">
              Upgrade to Crush+
              <Star className="w-4 h-4 fill-current" />
            </Link>
          </div>
        </div>
      </section>

      {/* Safety & Security Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-muted/30">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-success/10 text-success text-xs font-medium mb-4">
                <Shield className="w-3.5 h-3.5" />
                <span>Safety First</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight mb-4">
                Your Safety is Our{' '}
                <span className="text-gradient">Top Priority</span>
              </h2>
              <p className="text-muted-foreground mb-8">
                We've built multiple layers of protection to ensure you can date with confidence.
                From photo verification to 24/7 moderation, we've got you covered.
              </p>

              <div className="space-y-4">
                <SafetyFeature
                  icon={<BadgeCheck className="w-5 h-5" />}
                  title="Photo Verification"
                  description="Verified badges for profiles that confirm their photos are real"
                />
                <SafetyFeature
                  icon={<Shield className="w-5 h-5" />}
                  title="AI-Powered Moderation"
                  description="Advanced systems detect and remove inappropriate content automatically"
                />
                <SafetyFeature
                  icon={<Users className="w-5 h-5" />}
                  title="Easy Blocking & Reporting"
                  description="Block or report anyone instantly. Our team reviews reports 24/7"
                />
                <SafetyFeature
                  icon={<Lock className="w-5 h-5" />}
                  title="Data Privacy"
                  description="Your data is encrypted and never sold. You control what you share"
                />
              </div>

              <Link href="/safety" className="inline-flex items-center gap-2 text-primary font-medium mt-6 hover:underline">
                Learn more about Safety
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="relative">
              <div className="rounded-2xl border border-border bg-card p-8 space-y-6">
                <div className="flex items-center gap-4 p-4 rounded-xl bg-success/10 border border-success/20">
                  <div className="w-12 h-12 rounded-full bg-success/20 flex items-center justify-center">
                    <BadgeCheck className="w-6 h-6 text-success" />
                  </div>
                  <div>
                    <p className="font-semibold">Verified Profile</p>
                    <p className="text-sm text-muted-foreground">This user has been verified</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 p-4 rounded-xl bg-muted">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <Shield className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold">Content Reviewed</p>
                    <p className="text-sm text-muted-foreground">All photos pass safety checks</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 p-4 rounded-xl bg-muted">
                  <div className="w-12 h-12 rounded-full bg-warning/10 flex items-center justify-center">
                    <Bell className="w-6 h-6 text-warning" />
                  </div>
                  <div>
                    <p className="font-semibold">Date Check-In</p>
                    <p className="text-sm text-muted-foreground">Share your date location with trusted contacts</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Communication Features */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight mb-3">
              Express Yourself <span className="text-gradient">Your Way</span>
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Multiple ways to communicate and show your personality
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <CommunicationCard
              icon={<MessageCircle className="w-8 h-8" />}
              title="Text Chat"
              description="Rich messaging with read receipts and typing indicators"
            />
            <CommunicationCard
              icon={<Mic className="w-8 h-8" />}
              title="Voice Notes"
              description="Send voice messages to add a personal touch"
            />
            <CommunicationCard
              icon={<Video className="w-8 h-8" />}
              title="Video Chat"
              description="Video call your matches safely within the app"
            />
            <CommunicationCard
              icon={<Gift className="w-8 h-8" />}
              title="Virtual Gifts"
              description="Send fun virtual gifts to show you care"
            />
          </div>
        </div>
      </section>

      {/* Discovery Features */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-muted/30">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight mb-3">
              Discover <span className="text-gradient">Smarter</span>
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Find compatible matches with our intelligent discovery features
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-8">
            <div className="rounded-2xl border border-border bg-card p-8">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-accent text-accent-foreground mb-6">
                <Compass className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Compatibility Quiz</h3>
              <p className="text-muted-foreground mb-6">
                Take our personality quiz to discover your dating style. We'll use your results
                to find matches who complement your personality and share your values.
              </p>
              <ul className="space-y-3">
                <QuizFeature text="10 questions, 2 minutes" />
                <QuizFeature text="5 unique personality types" />
                <QuizFeature text="Compatibility scores with matches" />
                <QuizFeature text="Personalized match suggestions" />
              </ul>
            </div>

            <div className="rounded-2xl border border-border bg-card p-8">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-accent text-accent-foreground mb-6">
                <Sparkles className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Smart Recommendations</h3>
              <p className="text-muted-foreground mb-6">
                Our AI learns from your activity to show you better matches over time.
                The more you use Crush, the smarter your recommendations become.
              </p>
              <ul className="space-y-3">
                <QuizFeature text="AI-powered match suggestions" />
                <QuizFeature text="Based on your swipe patterns" />
                <QuizFeature text="Considers mutual interests" />
                <QuizFeature text="Updates in real-time" />
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center">
          <div className="rounded-2xl border border-border bg-card p-8 sm:p-12">
            <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight mb-3">
              Ready to Experience All These <span className="text-gradient">Features</span>?
            </h2>
            <p className="text-muted-foreground mb-6 max-w-lg mx-auto">
              Join millions of singles already finding love on Crush. Sign up today and start matching.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/auth/signup" className="btn-primary px-6 py-2.5">
                Create Free Account
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link href="/pricing" className="btn-outline px-6 py-2.5">
                Compare Plans
              </Link>
            </div>
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
  badge,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  badge?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-6 relative">
      {badge && (
        <div className="absolute top-4 right-4 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium">
          {badge}
        </div>
      )}
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

function PremiumFeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 to-transparent p-6">
      <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 text-primary mb-4">
        {icon}
      </div>
      <h3 className="text-base font-semibold mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground">
        {description}
      </p>
    </div>
  );
}

function SafetyFeature({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-4">
      <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center text-success">
        {icon}
      </div>
      <div>
        <h4 className="font-semibold mb-0.5">{title}</h4>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

function CommunicationCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="text-center p-6 rounded-xl border border-border bg-card">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-accent text-accent-foreground mb-4">
        {icon}
      </div>
      <h3 className="font-semibold mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

function QuizFeature({ text }: { text: string }) {
  return (
    <li className="flex items-center gap-3 text-sm">
      <div className="w-5 h-5 rounded-full bg-success/10 flex items-center justify-center flex-shrink-0">
        <svg className="w-3 h-3 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <span className="text-muted-foreground">{text}</span>
    </li>
  );
}
