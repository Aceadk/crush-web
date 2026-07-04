'use client';

import { useEffect, useRef } from 'react';
import { Heart } from 'lucide-react';
import { gsap, ScrollTrigger } from '../motion/gsap';
import { SectionLabel } from '../motion/section-label';

/**
 * Act 3 — "The Match". Tall scroll runway whose sticky centre frames the
 * orbs' collision (the ScrollDirector drives sceneState.progress to 1 exactly
 * when this section centres). As the bloom peaks, a glowing heart and the
 * Crush wordmark resolve out of the light.
 *
 * Content is fully visible without JavaScript; when motion is allowed, GSAP
 * hides it on mount and scrubs it back in around the collision.
 */
export function MatchMoment() {
  const root = useRef<HTMLElement>(null);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const section = root.current;
    if (!section) return;

    const ctx = gsap.context(() => {
      const reveal = section.querySelectorAll('[data-match-reveal]');
      gsap.fromTo(
        reveal,
        { opacity: 0, scale: 0.85, y: 40, filter: 'blur(12px)' },
        {
          opacity: 1,
          scale: 1,
          y: 0,
          filter: 'blur(0px)',
          stagger: 0.12,
          ease: 'none',
          scrollTrigger: {
            trigger: section,
            start: 'top 45%',
            end: 'center center',
            scrub: 0.4,
          },
        }
      );
      // The flash of light at the collision peak.
      gsap.fromTo(
        section.querySelector('[data-match-bloom]'),
        { opacity: 0 },
        {
          opacity: 1,
          ease: 'none',
          scrollTrigger: {
            trigger: section,
            start: 'top 30%',
            end: 'center center',
            scrub: 0.3,
          },
        }
      );
    }, section);

    return () => {
      ctx.revert();
      ScrollTrigger.refresh();
    };
  }, []);

  return (
    <section ref={root} id="the-match" aria-label="The match" className="relative min-h-[130vh]">
      <div className="sticky top-0 flex h-[100svh] flex-col items-center justify-center overflow-hidden px-4 text-center">
        {/* Collision bloom halo behind the wordmark. */}
        <div
          data-match-bloom
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-1/2 h-[70vmin] w-[70vmin] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(255,214,229,0.32),rgba(255,63,127,0.18)_38%,rgba(124,77,255,0.08)_62%,transparent_75%)] blur-xl"
        />

        <div data-match-reveal>
          <SectionLabel index="03" className="mb-8">
            The match
          </SectionLabel>
        </div>

        <div data-match-reveal className="relative mb-6">
          <Heart
            aria-hidden="true"
            className="h-16 w-16 fill-[#ff3f7f] text-[#ff3f7f] drop-shadow-[0_0_40px_rgba(255,63,127,0.9)] motion-safe:animate-[crush-heartbeat_1.4s_ease-in-out_infinite]"
          />
        </div>

        <h2
          data-match-reveal
          className="mb-5 font-display text-[clamp(2.75rem,9vw,7.5rem)] font-semibold leading-[0.95] tracking-[-0.04em] text-white"
        >
          It&rsquo;s a{' '}
          <span className="bg-gradient-to-r from-[#ff3f7f] to-[#7c4dff] bg-clip-text text-transparent">
            match
          </span>
          .
        </h2>

        <p data-match-reveal className="max-w-md text-balance text-base text-white/60 sm:text-lg">
          When two orbits finally align. That spark has a name — Crush.
        </p>
      </div>
    </section>
  );
}
