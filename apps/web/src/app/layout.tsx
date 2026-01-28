import type { Metadata, Viewport } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import '../styles/globals.css';
import { Providers } from '@/shared/providers/app-providers';
import { themeInitScript } from '@/shared/lib/theme';
import { SkipLink } from '@/components/accessibility';

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
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://crush.app'),
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: '/',
    siteName: 'Crush',
    title: 'Crush - Find Your Match',
    description:
      'Crush is a modern dating app designed to help you find meaningful connections.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Crush Dating App',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Crush - Find Your Match',
    description:
      'Crush is a modern dating app designed to help you find meaningful connections.',
    images: ['/og-image.png'],
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
    icon: '/favicon.ico',
    shortcut: '/favicon-16x16.png',
    apple: '/apple-touch-icon.png',
  },
  manifest: '/manifest.json',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#FFFFFF' },
    { media: '(prefers-color-scheme: dark)', color: '#0F0F10' },
  ],
};

// Schema.org structured data for the organization
const organizationSchema = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'Crush',
  url: process.env.NEXT_PUBLIC_APP_URL || 'https://crush.app',
  logo: `${process.env.NEXT_PUBLIC_APP_URL || 'https://crush.app'}/logo.png`,
  sameAs: [
    'https://twitter.com/crushapp',
    'https://instagram.com/crushapp',
    'https://facebook.com/crushapp',
  ],
  contactPoint: {
    '@type': 'ContactPoint',
    contactType: 'customer support',
    email: 'support@crushapp.com',
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
  aggregateRating: {
    '@type': 'AggregateRating',
    ratingValue: '4.8',
    ratingCount: '150000',
    bestRating: '5',
    worstRating: '1',
  },
  description: 'Crush is a modern dating app designed to help you find meaningful connections.',
};

// Schema.org structured data for the website
const websiteSchema = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'Crush',
  url: process.env.NEXT_PUBLIC_APP_URL || 'https://crush.app',
  potentialAction: {
    '@type': 'SearchAction',
    target: {
      '@type': 'EntryPoint',
      urlTemplate: `${process.env.NEXT_PUBLIC_APP_URL || 'https://crush.app'}/search?q={search_term_string}`,
    },
    'query-input': 'required name=search_term_string',
  },
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
