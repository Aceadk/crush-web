import type { Metadata } from 'next';
import { Space_Grotesk } from 'next/font/google';
import { PublicHeader } from './_components/landing/public-header';
import { PublicFooter } from './_components/landing/public-footer';

// Display face for the cinematic landing type. Self-hosted via next/font
// (downloaded at build time), so no external font origin is needed under the
// production CSP. Exposed as --font-display / Tailwind `font-display`.
const displayFont = Space_Grotesk({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-display',
  display: 'swap',
});

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
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Crush - Find Your Perfect Match',
    description:
      'Join millions finding love on Crush. Smart matching, meaningful conversations, and a safe community.',
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
  // One shared public shell for every marketing page: previously the header
  // and footer were duplicated per page (with drifting link sets) and six
  // public pages had no header/footer or mobile navigation at all.
  return (
    <div className={displayFont.variable}>
      <PublicHeader />
      <main id="main-content">{children}</main>
      <PublicFooter />
    </div>
  );
}
