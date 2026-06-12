import { Metadata } from 'next';
import Link from 'next/link';
import {
  Shield,
  Camera,
  MessageSquare,
  Users,
  AlertTriangle,
  CheckCircle,
  XCircle,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Community Guidelines - Crush',
  description:
    'Our community guidelines help keep Crush a safe, respectful, and enjoyable place for everyone.',
  openGraph: {
    title: 'Community Guidelines - Crush',
    description:
      'Our community guidelines help keep Crush a safe, respectful, and enjoyable place for everyone.',
  },
};

const dos = [
  'Be respectful and kind in all interactions',
  'Use recent photos that accurately represent you',
  'Report any behavior that makes you uncomfortable',
  'Communicate your intentions honestly',
  'Respect boundaries when someone is not interested',
  'Verify your profile to build trust',
];

const donts = [
  'Harass, bully, or intimidate other users',
  'Share explicit content without consent',
  'Create fake profiles or impersonate others',
  'Spam, solicit, or promote commercial content',
  'Share other users\' personal information',
  'Use hate speech or discriminatory language',
];

export default function GuidelinesPage() {
  return (
    <div className="min-h-screen pt-14">
      {/* Hero */}
      <section className="relative py-20 sm:py-28">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-6">
            <Users className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4">
            Community Guidelines
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Crush is built on respect, authenticity, and safety. These
            guidelines help us maintain a positive community where everyone can
            find meaningful connections.
          </p>
        </div>
      </section>

      {/* Do's and Don'ts */}
      <section className="py-16 bg-muted/30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Do's */}
            <div className="rounded-xl border border-border bg-card p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                </div>
                <h2 className="text-xl font-bold">Do</h2>
              </div>
              <ul className="space-y-3">
                {dos.map((item) => (
                  <li key={item} className="flex gap-3 text-sm">
                    <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-muted-foreground">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Don'ts */}
            <div className="rounded-xl border border-border bg-card p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center">
                  <XCircle className="w-5 h-5 text-red-500" />
                </div>
                <h2 className="text-xl font-bold">Don&apos;t</h2>
              </div>
              <ul className="space-y-3">
                {donts.map((item) => (
                  <li key={item} className="flex gap-3 text-sm">
                    <XCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                    <span className="text-muted-foreground">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Content Standards */}
      <section className="py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl sm:text-3xl font-bold mb-8 text-center">
            Content Standards
          </h2>
          <div className="space-y-6">
            <div className="rounded-xl border border-border bg-card p-6">
              <div className="flex gap-4">
                <Camera className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold mb-2">Photos</h3>
                  <p className="text-sm text-muted-foreground">
                    Use clear, recent photos of yourself. No nudity,
                    graphic violence, or copyrighted images. Group photos are
                    fine but your profile should make it clear which person you
                    are.
                  </p>
                </div>
              </div>
            </div>
            <div className="rounded-xl border border-border bg-card p-6">
              <div className="flex gap-4">
                <MessageSquare className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold mb-2">Messages</h3>
                  <p className="text-sm text-muted-foreground">
                    Keep conversations respectful. Do not send unsolicited
                    explicit messages. Respect when someone does not want to
                    continue chatting. No spam, scams, or commercial
                    solicitations.
                  </p>
                </div>
              </div>
            </div>
            <div className="rounded-xl border border-border bg-card p-6">
              <div className="flex gap-4">
                <Shield className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold mb-2">Profile Information</h3>
                  <p className="text-sm text-muted-foreground">
                    Be honest about who you are. Do not impersonate anyone or
                    create misleading profiles. Your age, name, and photos
                    should accurately represent you.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Enforcement */}
      <section className="py-16 bg-muted/30">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-3">Enforcement</h2>
          <p className="text-muted-foreground max-w-xl mx-auto mb-6">
            Violations of these guidelines may result in warnings, temporary
            suspensions, or permanent bans depending on the severity. We review
            all reports and take action to protect our community.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/safety"
              className="btn-primary inline-flex items-center gap-2 text-sm"
            >
              <Shield className="w-4 h-4" />
              Safety Center
            </Link>
            <Link
              href="/help"
              className="inline-flex items-center gap-2 text-sm px-4 py-2 rounded-lg border border-border hover:bg-accent transition-colors"
            >
              Report a Concern
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
