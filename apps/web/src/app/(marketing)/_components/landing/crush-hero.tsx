'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { ArrowRight, ChevronDown, Sparkles } from 'lucide-react';
import { FloatingMatchScene } from './floating-match-scene';

/**
 * Cinematic full-viewport hero: layered gradient mesh with subtle scroll
 * parallax, an animated gradient headline, and the floating match scene.
 *
 * Entrance animations are pure CSS (`animate-hero-in`) so they run even when
 * JavaScript is unavailable; parallax is a tiny rAF-throttled enhancement
 * that is skipped entirely for reduced-motion users.
 */
export function CrushHero() {
  const orbARef = useRef<HTMLDivElement>(null);
  const orbBRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let frame = 0;
    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const y = window.scrollY;
        if (y > window.innerHeight * 1.5) return; // hero is off screen
        if (orbARef.current) orbARef.current.style.transform = `translate3d(0, ${y * 0.22}px, 0)`;
        if (orbBRef.current) orbBRef.current.style.transform = `translate3d(0, ${y * -0.16}px, 0)`;
        if (sceneRef.current) sceneRef.current.style.transform = `translate3d(0, ${y * 0.08}px, 0)`;
      });
    };

    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <section className="relative flex min-h-[100svh] flex-col overflow-hidden pt-14">
      {/* Layered gradient mesh background */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(55%_45%_at_75%_8%,hsl(var(--primary)/0.12),transparent_65%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(45%_40%_at_15%_85%,hsl(var(--secondary)/0.10),transparent_65%)]" />
        <div
          ref={orbARef}
          className="absolute -top-32 right-[8%] h-[28rem] w-[28rem] rounded-full bg-primary/15 blur-3xl motion-safe:animate-pulse-glow"
        />
        <div
          ref={orbBRef}
          className="absolute bottom-[-10rem] left-[-6rem] h-[24rem] w-[24rem] rounded-full bg-secondary/15 blur-3xl motion-safe:animate-pulse-glow [animation-delay:2s]"
        />
      </div>

      <div className="relative mx-auto flex w-full max-w-7xl flex-1 items-center px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid w-full items-center gap-12 lg:grid-cols-2 lg:gap-8">
          {/* Copy */}
          <div className="text-center lg:text-left">
            <div className="motion-safe:animate-hero-in">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-accent/80 px-3.5 py-1.5 text-xs font-medium text-accent-foreground backdrop-blur">
                <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Over 1 million matches made</span>
              </div>
            </div>

            <h1 className="mb-5 text-4xl font-semibold tracking-tight xs:text-5xl md:text-6xl xl:text-7xl motion-safe:animate-hero-in motion-safe:[animation-delay:120ms]">
              Find your{' '}
              <span className="bg-gradient-to-r from-primary via-secondary to-primary bg-[length:200%_auto] bg-clip-text text-transparent motion-safe:animate-gradient-pan">
                perfect match
              </span>
            </h1>

            <p className="mx-auto mb-8 max-w-xl text-base text-muted-foreground sm:text-lg lg:mx-0 motion-safe:animate-hero-in motion-safe:[animation-delay:240ms]">
              Crush is the dating app that focuses on meaningful connections.
              Swipe, match, and chat with people who share your interests and values.
            </p>

            <div className="flex flex-col justify-center gap-3 sm:flex-row lg:justify-start motion-safe:animate-hero-in motion-safe:[animation-delay:360ms]">
              <Link
                href="/auth/signup"
                className="btn-primary px-7 py-3 text-base shadow-[0_8px_40px_-12px_hsl(var(--primary)/0.6)] transition-shadow hover:shadow-[0_8px_48px_-8px_hsl(var(--primary)/0.7)]"
              >
                Start Matching
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link href="/features" className="btn-outline glass px-7 py-3 text-base">
                Learn More
              </Link>
            </div>
          </div>

          {/* Floating match scene */}
          <div className="motion-safe:animate-hero-in motion-safe:[animation-delay:300ms]">
            <div ref={sceneRef}>
              <FloatingMatchScene />
            </div>
          </div>
        </div>
      </div>

      {/* Scroll hint */}
      <div className="relative pb-6 text-center motion-safe:animate-hero-in motion-safe:[animation-delay:600ms]">
        <a
          href="#why-crush"
          className="inline-flex flex-col items-center gap-1 text-muted-foreground transition-colors hover:text-foreground"
        >
          <span className="text-[11px] font-medium uppercase tracking-[0.2em]">Scroll</span>
          <ChevronDown className="h-4 w-4 motion-safe:animate-scroll-hint" aria-hidden="true" />
          <span className="sr-only">Scroll down to learn why people choose Crush</span>
        </a>
      </div>
    </section>
  );
}
