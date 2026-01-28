import type { Metadata } from 'next';
import { PricingContent } from './pricing-content';

export const metadata: Metadata = {
  title: 'Pricing - Crush Dating App Plans',
  description:
    'Compare Crush dating app plans. Start free, upgrade to Crush+ or Platinum for premium features like seeing who likes you, unlimited rewinds, and passport mode.',
  openGraph: {
    title: 'Crush Pricing - Simple, Transparent Plans',
    description:
      'Start free, upgrade when ready. See all Crush premium features and choose the plan that\'s right for you.',
    type: 'website',
  },
  twitter: {
    title: 'Crush Pricing - Simple, Transparent Plans',
    description:
      'Start free, upgrade when ready. See all Crush premium features and choose the plan that\'s right for you.',
  },
  alternates: {
    canonical: '/pricing',
  },
};

export default function PricingPage() {
  return <PricingContent />;
}
