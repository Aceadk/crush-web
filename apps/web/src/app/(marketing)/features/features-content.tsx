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

export function FeaturesContent() {
  return (
    <div className="min-h-screen bg-background">

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
              description="Video call your matches safely in the Crush mobile app"
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
