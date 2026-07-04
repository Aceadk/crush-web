'use client';

import { useEffect } from 'react';
import Lenis from 'lenis';
import { gsap, ScrollTrigger } from './gsap';

/**
 * Buttery smooth scrolling for the landing page, wired into GSAP's ticker so
 * ScrollTrigger and Lenis share one clock (the canonical integration from the
 * Lenis docs). Renders nothing.
 *
 * Skipped entirely for reduced-motion users and coarse-pointer devices —
 * native touch scrolling on phones already feels right, and synthetic smooth
 * scrolling there fights the platform.
 */
export function LenisProvider() {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (window.matchMedia('(pointer: coarse)').matches) return;

    const lenis = new Lenis({
      lerp: 0.1,
      wheelMultiplier: 1,
      // Smooth-scroll in-page anchors (e.g. the hero's #why-crush hint).
      anchors: true,
    });

    lenis.on('scroll', ScrollTrigger.update);
    const tick = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);

    return () => {
      gsap.ticker.remove(tick);
      gsap.ticker.lagSmoothing(500, 33); // GSAP defaults
      lenis.destroy();
    };
  }, []);

  return null;
}
