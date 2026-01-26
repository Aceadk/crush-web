import type { Metadata, Viewport } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import '../styles/globals.css';
import { Providers } from '@/shared/providers/app-providers';
import { themeInitScript } from '@/shared/lib/theme';

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
    default: 'CRUSH - Find Your Match',
    template: '%s | CRUSH',
  },
  description:
    'CRUSH is a modern dating app designed to help you find meaningful connections. Swipe, match, and chat with people who share your interests.',
  keywords: [
    'dating app',
    'dating',
    'relationships',
    'match',
    'love',
    'singles',
    'meet people',
  ],
  authors: [{ name: 'CRUSH Team' }],
  creator: 'CRUSH',
  publisher: 'CRUSH',
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://crush.app'),
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: '/',
    siteName: 'CRUSH',
    title: 'CRUSH - Find Your Match',
    description:
      'CRUSH is a modern dating app designed to help you find meaningful connections.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'CRUSH Dating App',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'CRUSH - Find Your Match',
    description:
      'CRUSH is a modern dating app designed to help you find meaningful connections.',
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
      </head>
      <body className="min-h-screen bg-background text-foreground font-sans antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
