import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Crush - Find Your Perfect Match | Modern Dating App',
  description:
    'Crush is a modern dating app designed to help you find meaningful connections. Swipe, match, and chat with people who share your interests and values. Download free today!',
  keywords: [
    'dating app',
    'online dating',
    'find love',
    'meet singles',
    'relationship app',
    'match making',
    'dating site',
    'swipe dating',
  ],
  openGraph: {
    title: 'Crush - Find Your Perfect Match',
    description:
      'Join millions finding love on Crush. Smart matching, meaningful conversations, and a safe community. Start for free!',
    type: 'website',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Crush - Modern Dating App',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Crush - Find Your Perfect Match',
    description:
      'Join millions finding love on Crush. Smart matching, meaningful conversations, and a safe community.',
    images: ['/og-image.png'],
  },
  alternates: {
    canonical: '/',
  },
};

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
