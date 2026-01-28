import type { Metadata } from 'next';
import { FeaturesContent } from './features-content';

export const metadata: Metadata = {
  title: 'Features - Crush Dating App',
  description:
    'Discover all the features that make Crush the best dating app. Smart matching, secure messaging, photo verification, passport mode, and more. See why millions choose Crush.',
  openGraph: {
    title: 'Crush Features - Everything You Need to Find Love',
    description:
      'Smart matching, secure messaging, photo verification, and more. Discover why millions choose Crush.',
    type: 'website',
  },
  twitter: {
    title: 'Crush Features - Everything You Need to Find Love',
    description:
      'Smart matching, secure messaging, photo verification, and more. Discover why millions choose Crush.',
  },
  alternates: {
    canonical: '/features',
  },
};

export default function FeaturesPage() {
  return <FeaturesContent />;
}
