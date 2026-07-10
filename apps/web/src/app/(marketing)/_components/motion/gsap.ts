'use client';

/**
 * Single GSAP entry for the marketing experience — registers ScrollTrigger
 * exactly once. Import gsap/ScrollTrigger from here, never from the package
 * directly, so plugin registration can't be forgotten or duplicated.
 */
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

export { gsap, ScrollTrigger };
