import Link from 'next/link';
import { ArrowRight, Heart } from 'lucide-react';
import { Reveal } from './reveal';

// Deterministic decorative hearts for the CTA panel (SSR-safe).
const CTA_HEARTS = [
  { top: '14%', left: '8%', size: 18, delay: '0s', duration: '8s' },
  { top: '70%', left: '14%', size: 12, delay: '1.6s', duration: '10s' },
  { top: '22%', left: '86%', size: 14, delay: '0.8s', duration: '9s' },
  { top: '74%', left: '80%', size: 20, delay: '2.4s', duration: '7.5s' },
  { top: '46%', left: '94%', size: 10, delay: '1.2s', duration: '11s' },
  { top: '54%', left: '4%', size: 10, delay: '3s', duration: '9.5s' },
] as const;

/** Final conversion panel — gradient brand moment before the footer. */
export function FinalCTASection() {
  return (
    <section className="px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <Reveal direction="none">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-primary-dark to-secondary p-8 text-center shadow-[0_24px_80px_-32px_hsl(var(--primary)/0.6)] sm:p-14">
            {/* Decorative layers */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_60%_at_50%_0%,rgba(255,255,255,0.18),transparent_70%)]"
            />
            {CTA_HEARTS.map((h, i) => (
              <Heart
                key={i}
                aria-hidden="true"
                className="pointer-events-none absolute fill-white/15 text-white/15 motion-safe:animate-float"
                style={{
                  top: h.top,
                  left: h.left,
                  width: h.size,
                  height: h.size,
                  animationDelay: h.delay,
                  animationDuration: h.duration,
                }}
              />
            ))}

            <div className="relative">
              <h2 className="mb-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                Ready to Find Your Crush?
              </h2>
              <p className="mx-auto mb-8 max-w-lg text-white/85">
                Join millions of singles who have found love on Crush. Your perfect match is waiting.
              </p>
              <Link
                href="/auth/signup"
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-white px-7 py-3 text-base font-medium text-primary shadow-lg transition-all duration-150 hover:bg-white/90 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-primary"
              >
                Create Free Account
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
