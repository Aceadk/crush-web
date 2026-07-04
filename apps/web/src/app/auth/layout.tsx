import Link from 'next/link';
import { Space_Grotesk } from 'next/font/google';
import { Heart } from 'lucide-react';
import { RuntimeProviders } from '@/shared/providers/runtime-providers';
import { MagneticScene } from '../(marketing)/_components/three/magnetic-scene';
import { GrainOverlay } from '../(marketing)/_components/motion/grain-overlay';

// Same display face as the landing page so the brand voice carries through.
const displayFont = Space_Grotesk({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-display',
  display: 'swap',
});

/**
 * Auth stage — the same cinematic world as the landing page, subdued.
 *
 * A dark (`dark`-scoped tokens) full-viewport stage with the ambient preset
 * of the Magnetic Attraction particle field behind a centred glass card
 * column. The `auth-stage` class scopes the glowing input focus treatment
 * (see globals.css). All form logic lives in the pages; this layout is
 * presentation only.
 */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RuntimeProviders>
      <div
        className={`auth-stage dark relative min-h-screen overflow-hidden bg-[#0d0e12] text-foreground ${displayFont.variable}`}
      >
        {/* Subdued particle field (fewer particles, slower drift). */}
        <MagneticScene preset="ambient" className="fixed inset-0" />
        <GrainOverlay />

        {/* Readability vignette behind the card column. */}
        <div
          aria-hidden="true"
          className="pointer-events-none fixed inset-0 bg-[radial-gradient(70%_60%_at_50%_45%,rgba(13,14,18,0.5),transparent_78%)]"
        />

        <div className="relative z-10 flex min-h-screen flex-col">
          {/* Brand header */}
          <header className="flex items-center justify-between px-6 py-5">
            <Link
              href="/"
              className="group inline-flex items-center gap-2 text-white transition-opacity hover:opacity-80"
            >
              <Heart
                className="h-6 w-6 fill-[#ff3f7f] text-[#ff3f7f] drop-shadow-[0_0_12px_rgba(255,63,127,0.7)]"
                aria-hidden="true"
              />
              <span className="font-display text-xl font-semibold tracking-tight">Crush</span>
            </Link>
            <Link
              href="/"
              className="font-mono text-[11px] uppercase tracking-[0.3em] text-white/40 transition-colors hover:text-white/80"
            >
              Back to site
            </Link>
          </header>

          {/* Form column */}
          <main className="flex flex-1 items-center justify-center px-4 py-10 sm:px-6">
            <div className="w-full max-w-md">{children}</div>
          </main>

          {/* Legal footer */}
          <footer className="px-6 pb-6 text-center text-sm text-muted-foreground">
            <p>
              By continuing, you agree to our{' '}
              <Link href="/terms" className="text-primary hover:underline">
                Terms of Service
              </Link>{' '}
              and{' '}
              <Link href="/privacy" className="text-primary hover:underline">
                Privacy Policy
              </Link>
            </p>
          </footer>
        </div>
      </div>
    </RuntimeProviders>
  );
}
