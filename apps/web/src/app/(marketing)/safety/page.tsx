import { Metadata } from 'next';
import Link from 'next/link';
import {
  Shield,
  Eye,
  AlertTriangle,
  MessageSquare,
  MapPin,
  Phone,
  UserX,
  Flag,
  Lock,
  Heart,
  CheckCircle,
  ArrowRight,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Safety - Crush',
  description:
    'Your safety is our priority. Learn about the tools and guidelines we provide to keep you safe while dating on Crush.',
  openGraph: {
    title: 'Safety - Crush',
    description:
      'Your safety is our priority. Learn about the tools and guidelines we provide to keep you safe while dating on Crush.',
  },
};

const safetyFeatures = [
  {
    icon: Eye,
    title: 'Photo Verification',
    description:
      'Our verification system helps confirm that your matches are who they say they are. Look for the blue verification badge.',
  },
  {
    icon: Shield,
    title: 'AI Content Moderation',
    description:
      'Our AI-powered moderation system automatically detects and removes inappropriate content, keeping the platform safe for everyone.',
  },
  {
    icon: UserX,
    title: 'Block & Report',
    description:
      'Easily block or report anyone who makes you uncomfortable. Our team reviews reports within 24 hours.',
  },
  {
    icon: Lock,
    title: 'End-to-End Encryption',
    description:
      'Your messages are encrypted by default, so only you and your match can read them. Your privacy is protected.',
  },
  {
    icon: MapPin,
    title: 'Date Safety Plans',
    description:
      'Share your date plans with trusted contacts. They will be notified of your location and who you are meeting.',
  },
  {
    icon: Flag,
    title: 'Safety Alerts',
    description:
      'We proactively warn you about suspicious activity and provide safety tips before your first meet-up.',
  },
];

const safetyTips = [
  {
    number: 1,
    title: 'Chat First',
    description:
      'Get to know your match through messages and video calls before meeting in person. Trust your instincts.',
  },
  {
    number: 2,
    title: 'Meet in Public',
    description:
      'Always choose a well-lit, public place for your first few dates. Coffee shops and restaurants are great options.',
  },
  {
    number: 3,
    title: 'Tell Someone',
    description:
      'Let a friend or family member know where you are going, who you are meeting, and when you expect to be back.',
  },
  {
    number: 4,
    title: 'Arrange Your Own Transport',
    description:
      'Drive yourself or use a rideshare to your date. Never depend on your date for a ride until you know them well.',
  },
  {
    number: 5,
    title: 'Stay Sober',
    description:
      'Keep a clear head on early dates. Watch your drink and never leave it unattended.',
  },
  {
    number: 6,
    title: 'Trust Your Gut',
    description:
      'If something feels off, leave. Your safety is more important than being polite. You can always block and report.',
  },
];

export default function SafetyPage() {
  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative py-20 sm:py-28">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-6">
            <Shield className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4">
            Your Safety Comes First
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            At Crush, we are committed to creating a safe and respectful
            community. We provide tools, resources, and guidelines to help you
            have a positive experience.
          </p>
        </div>
      </section>

      {/* Safety Features */}
      <section className="py-16 bg-muted/30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold mb-3">
              Built-In Safety Features
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              We have built powerful tools to help protect you on every step of
              your journey.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {safetyFeatures.map((feature) => (
              <div
                key={feature.title}
                className="rounded-xl border border-border bg-card p-6"
              >
                <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-accent text-accent-foreground mb-4">
                  <feature.icon className="w-5 h-5" />
                </div>
                <h3 className="text-base font-semibold mb-2">
                  {feature.title}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Dating Safety Tips */}
      <section className="py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold mb-3">
              Dating Safety Tips
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Follow these guidelines to stay safe while meeting new people.
            </p>
          </div>
          <div className="space-y-4">
            {safetyTips.map((tip) => (
              <div
                key={tip.number}
                className="flex gap-4 rounded-xl border border-border bg-card p-5"
              >
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary text-primary-foreground text-sm font-semibold flex items-center justify-center">
                  {tip.number}
                </div>
                <div>
                  <h3 className="font-semibold mb-1">{tip.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    {tip.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Emergency Resources */}
      <section className="py-16 bg-muted/30">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold mb-3">
              Emergency Resources
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              If you or someone you know is in danger, please reach out to these
              resources immediately.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-xl border border-border bg-card p-6 text-center">
              <Phone className="w-6 h-6 text-red-500 mx-auto mb-3" />
              <h3 className="font-semibold mb-1">Emergency</h3>
              <p className="text-2xl font-bold text-primary">911</p>
              <p className="text-xs text-muted-foreground mt-1">
                For immediate danger
              </p>
            </div>
            <div className="rounded-xl border border-border bg-card p-6 text-center">
              <Heart className="w-6 h-6 text-red-500 mx-auto mb-3" />
              <h3 className="font-semibold mb-1">Domestic Violence</h3>
              <p className="text-lg font-bold text-primary">
                1-800-799-7233
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                National Hotline (24/7)
              </p>
            </div>
            <div className="rounded-xl border border-border bg-card p-6 text-center">
              <AlertTriangle className="w-6 h-6 text-red-500 mx-auto mb-3" />
              <h3 className="font-semibold mb-1">Sexual Assault</h3>
              <p className="text-lg font-bold text-primary">
                1-800-656-4673
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                RAINN Hotline (24/7)
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <CheckCircle className="w-10 h-10 text-primary mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-3">
            Ready to Date Safely?
          </h2>
          <p className="text-muted-foreground mb-6">
            Join Crush and start meeting verified, respectful people in your
            area.
          </p>
          <Link
            href="/auth/signup"
            className="btn-primary inline-flex items-center gap-2 text-sm"
          >
            Get Started
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}
