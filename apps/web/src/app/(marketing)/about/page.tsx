import { Metadata } from 'next';
import Link from 'next/link';
import { Heart, Shield, Sparkles, Users, Globe, Award } from 'lucide-react';

export const metadata: Metadata = {
  title: 'About - Crush',
  description: 'Learn about Crush and our mission to help people find meaningful connections.',
};

const values = [
  {
    icon: Heart,
    title: 'Authentic Connections',
    description:
      'We believe in fostering genuine relationships, not just swipes. Our matching algorithm focuses on compatibility and shared interests.',
  },
  {
    icon: Shield,
    title: 'Safety First',
    description:
      'Your safety is our priority. We have robust verification systems and moderation to ensure a secure dating environment.',
  },
  {
    icon: Users,
    title: 'Inclusive Community',
    description:
      'Everyone deserves love. Crush welcomes people of all backgrounds, orientations, and identities.',
  },
  {
    icon: Sparkles,
    title: 'Quality Over Quantity',
    description:
      'We encourage meaningful conversations over endless swiping. Quality matches lead to quality relationships.',
  },
];

const stats = [
  { value: '10M+', label: 'Users Worldwide' },
  { value: '50K+', label: 'Daily Matches' },
  { value: '4.8', label: 'App Store Rating' },
  { value: '150+', label: 'Countries' },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      {/* Hero */}
      <div className="bg-gradient-to-br from-primary to-secondary py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Finding Love, Made Simple
          </h1>
          <p className="text-xl text-white/80 max-w-2xl mx-auto">
            Crush is more than a dating app. We&apos;re building a community where
            meaningful connections thrive.
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="bg-gray-50 dark:bg-gray-800 py-12">
        <div className="max-w-4xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-primary mb-1">
                  {stat.value}
                </div>
                <div className="text-sm text-gray-500">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Our Story */}
      <div className="max-w-4xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            Our Story
          </h2>
          <p className="text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Crush was founded with a simple belief: everyone deserves to find
            meaningful connections. In a world of endless swiping, we wanted to
            create something different - a place where authenticity and genuine
            interest lead the way.
          </p>
        </div>

        <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-8 mb-16">
          <div className="flex items-center gap-4 mb-4">
            <Globe className="w-8 h-8 text-primary" />
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
              Our Mission
            </h3>
          </div>
          <p className="text-gray-600 dark:text-gray-300">
            To create a dating platform that prioritizes genuine connections over
            superficial interactions. We use thoughtful design and smart technology
            to help people find compatible partners and build lasting relationships.
          </p>
        </div>

        {/* Values */}
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-8 text-center">
          Our Values
        </h2>
        <div className="grid md:grid-cols-2 gap-6 mb-16">
          {values.map((value) => (
            <div
              key={value.title}
              className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-100 dark:border-gray-700"
            >
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                <value.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                {value.title}
              </h3>
              <p className="text-gray-600 dark:text-gray-300">{value.description}</p>
            </div>
          ))}
        </div>

        {/* Awards */}
        <div className="bg-gradient-to-r from-primary/10 to-secondary/10 rounded-2xl p-8 text-center">
          <Award className="w-12 h-12 text-primary mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Award-Winning App
          </h3>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            Recognized as one of the top dating apps for meaningful connections.
          </p>
          <div className="flex flex-wrap justify-center gap-4 text-sm text-gray-500">
            <span className="px-4 py-2 bg-white dark:bg-gray-800 rounded-full">
              Best New App 2024
            </span>
            <span className="px-4 py-2 bg-white dark:bg-gray-800 rounded-full">
              Editor&apos;s Choice
            </span>
            <span className="px-4 py-2 bg-white dark:bg-gray-800 rounded-full">
              Top Dating App
            </span>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="bg-gray-900 dark:bg-gray-950 py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to find your match?
          </h2>
          <p className="text-gray-400 mb-8 max-w-xl mx-auto">
            Join millions of people who have found meaningful connections on Crush.
          </p>
          <Link
            href="/auth/signup"
            className="inline-flex items-center gap-2 bg-primary text-white px-8 py-4 rounded-full font-semibold hover:bg-primary-dark transition-colors"
          >
            <Heart className="w-5 h-5" />
            Get Started Free
          </Link>
        </div>
      </div>
    </div>
  );
}
