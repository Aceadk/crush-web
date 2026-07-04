import Link from 'next/link';
import { ArrowRight, ChevronDown } from 'lucide-react';
import { SectionLabel } from '../motion/section-label';

/**
 * Act 1 — "Alone". Full-viewport cinematic hero over the Magnetic Attraction
 * particle scene (page-fixed, mounted by the landing page): two luminous orbs
 * drifting apart in deep space, reacting to the cursor. Oversized display
 * type, one punchy line, scroll indicator.
 *
 * Server component: all copy is static SSR markup (visible with JS disabled —
 * the WebGL scene and entrance animations are progressive enhancement, and
 * entrance uses CSS `motion-safe` keyframes only).
 */
export function CrushHero() {
  return (
    <section className="relative flex min-h-[100svh] flex-col overflow-hidden text-white">
      {/* Readability vignette between scene and type. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_50%_at_50%_46%,rgba(13,14,18,0.55),transparent_75%)]"
      />

      <div className="relative mx-auto flex w-full max-w-6xl flex-1 flex-col items-center justify-center px-4 py-24 text-center sm:px-6">
        <div className="motion-safe:animate-hero-in">
          <SectionLabel index="01" className="mb-8">
            Two strangers
          </SectionLabel>
        </div>

        <h1 className="mb-7 font-display text-[clamp(3rem,10.5vw,8.25rem)] font-semibold leading-[0.94] tracking-[-0.045em] motion-safe:animate-hero-in motion-safe:[animation-delay:120ms]">
          Find your
          <br />
          <span className="bg-gradient-to-r from-[#ff3f7f] via-[#ff7aa6] to-[#7c4dff] bg-[length:200%_auto] bg-clip-text text-transparent motion-safe:animate-gradient-pan">
            perfect match
          </span>
        </h1>

        <p className="mb-10 max-w-md text-balance text-base text-white/60 sm:text-lg motion-safe:animate-hero-in motion-safe:[animation-delay:240ms]">
          Two people. One pull. Crush is where gravity does the matchmaking.
        </p>

        <div className="flex flex-col items-center justify-center gap-3 sm:flex-row motion-safe:animate-hero-in motion-safe:[animation-delay:360ms]">
          <Link
            href="/auth/signup"
            className="group inline-flex items-center gap-2 rounded-full bg-[#ff3f7f] px-8 py-3.5 text-base font-medium text-white shadow-[0_10px_50px_-12px_rgba(255,63,127,0.9)] transition-all duration-300 hover:shadow-[0_14px_70px_-10px_rgba(255,63,127,1)] hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ff3f7f]"
          >
            Start Matching
            <ArrowRight
              className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5"
              aria-hidden="true"
            />
          </Link>
          <Link
            href="/auth/login"
            className="inline-flex items-center rounded-full border border-white/15 bg-white/[0.03] px-8 py-3.5 text-base font-medium text-white/80 backdrop-blur transition-colors hover:border-white/30 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/60"
          >
            Sign in
          </Link>
        </div>

        <p className="mt-10 font-mono text-[11px] uppercase tracking-[0.35em] text-white/30 motion-safe:animate-hero-in motion-safe:[animation-delay:480ms]">
          Over 1 million matches made
        </p>
      </div>

      {/* Scroll hint */}
      <div className="relative pb-8 text-center motion-safe:animate-hero-in motion-safe:[animation-delay:600ms]">
        <a
          href="#why-crush"
          className="inline-flex flex-col items-center gap-1.5 text-white/40 transition-colors hover:text-white"
        >
          <span className="font-mono text-[10px] uppercase tracking-[0.35em]">Scroll</span>
          <ChevronDown className="h-4 w-4 motion-safe:animate-scroll-hint" aria-hidden="true" />
          <span className="sr-only">Scroll down to learn why people choose Crush</span>
        </a>
      </div>
    </section>
  );
}
