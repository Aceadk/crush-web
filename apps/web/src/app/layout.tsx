import type { Metadata, Viewport } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import '../styles/globals.css';
import { Providers } from '@/shared/providers/app-providers';
import { themeInitScript } from '@/shared/lib/theme';
import { SkipLink } from '@/components/accessibility';
import { localeInitScript } from '@/i18n/locale-cookie';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});

const appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'https://crush.app').trim();

export const metadata: Metadata = {
  title: {
    default: 'Crush - Find Your Match',
    template: '%s | Crush',
  },
  description:
    'Crush is a modern dating app designed to help you find meaningful connections. Swipe, match, and chat with people who share your interests.',
  keywords: [
    'dating app',
    'dating',
    'relationships',
    'match',
    'love',
    'singles',
    'meet people',
  ],
  authors: [{ name: 'Crush Team' }],
  creator: 'Crush',
  publisher: 'Crush',
  metadataBase: new URL(appUrl),
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: '/',
    siteName: 'Crush',
    title: 'Crush - Find Your Match',
    description:
      'Crush is a modern dating app designed to help you find meaningful connections.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Crush - Find Your Match',
    description:
      'Crush is a modern dating app designed to help you find meaningful connections.',
    creator: '@crushapp',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
    ],
  },
  manifest: '/manifest.json',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#FFFFFF' },
    // Canonical brand dark background (matches mobile splash + adaptive icon).
    { media: '(prefers-color-scheme: dark)', color: '#0D0E12' },
  ],
};

// Schema.org structured data for the organization
const organizationSchema = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'Crush',
  url: appUrl,
  logo: `${appUrl}/favicon.svg`,
  sameAs: [
    'https://twitter.com/crushapp',
    'https://instagram.com/crushapp',
    'https://facebook.com/crushapp',
  ],
  contactPoint: {
    '@type': 'ContactPoint',
    contactType: 'customer support',
    email: 'support@crush.app',
    availableLanguage: 'English',
  },
};

// Schema.org structured data for the app
const softwareAppSchema = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'Crush',
  applicationCategory: 'SocialNetworkingApplication',
  operatingSystem: 'iOS, Android, Web',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'USD',
  },
  description: 'Crush is a modern dating app designed to help you find meaningful connections.',
};

// Schema.org structured data for the website
const websiteSchema = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'Crush',
  url: appUrl,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${jetbrainsMono.variable}`}
      suppressHydrationWarning
    >
      <head>
        {/* No-flash theme initialization script */}
        <script
          dangerouslySetInnerHTML={{ __html: themeInitScript }}
        />
        {/* No-flash locale init: sets <html lang/dir> from cookie/browser */}
        <script
          dangerouslySetInnerHTML={{ __html: localeInitScript }}
        />
        {/* Schema.org structured data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareAppSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
        />
      </head>
      <body className="min-h-screen bg-background text-foreground font-sans antialiased">
        <SkipLink />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
