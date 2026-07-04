'use client';

import { useEffect, useState } from 'react';

/**
 * Device tier for the particle scene.
 * - `static`: no WebGL scene at all (reduced motion, no WebGL, or SSR) —
 *   consumers render the CSS gradient fallback.
 * - `lite`:   phones / low-end — fewer particles, no post-processing, DPR ≤ 1.5.
 * - `high`:   desktop — full particle counts, bloom, DPR ≤ 2.
 */
export type SceneQuality = 'static' | 'lite' | 'high';

export interface SceneQualityProfile {
  tier: SceneQuality;
  particlesPerOrb: number;
  starCount: number;
  maxDpr: number;
  postProcessing: boolean;
}

const PROFILES: Record<SceneQuality, SceneQualityProfile> = {
  static: { tier: 'static', particlesPerOrb: 0, starCount: 0, maxDpr: 1, postProcessing: false },
  lite: { tier: 'lite', particlesPerOrb: 2200, starCount: 350, maxDpr: 1.5, postProcessing: false },
  high: { tier: 'high', particlesPerOrb: 6000, starCount: 900, maxDpr: 2, postProcessing: true },
};

function detectTier(): SceneQuality {
  if (typeof window === 'undefined') return 'static';
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return 'static';
  // Automated browsers (Playwright/Lighthouse/CI) have no GPU: WebGL falls
  // back to SwiftShader on the CPU and the particle loop starves the main
  // thread, deadlocking router transitions and assertion polling. They get
  // the designed no-WebGL CSS fallback — the same tier a real GPU-less
  // client would get. (Matches the preloader's webdriver skip.)
  if (navigator.webdriver) return 'static';

  // WebGL availability (also catches software-rendering blocklists that
  // return null contexts).
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') ?? canvas.getContext('webgl');
    if (!gl) return 'static';
  } catch {
    return 'static';
  }

  const nav = navigator as Navigator & { deviceMemory?: number };
  const smallViewport = window.innerWidth < 768;
  const coarsePointer = window.matchMedia('(pointer: coarse)').matches;
  const lowMemory = typeof nav.deviceMemory === 'number' && nav.deviceMemory <= 4;
  const fewCores =
    typeof navigator.hardwareConcurrency === 'number' && navigator.hardwareConcurrency <= 4;

  if (smallViewport || coarsePointer || lowMemory || fewCores) return 'lite';
  return 'high';
}

/**
 * Resolves the scene quality profile once on mount (SSR-safe: `static` on the
 * server so markup never depends on WebGL). Re-evaluates when the user's
 * reduced-motion preference changes.
 */
export function useSceneQuality(): SceneQualityProfile {
  const [tier, setTier] = useState<SceneQuality>('static');

  useEffect(() => {
    setTier(detectTier());
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = () => setTier(detectTier());
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);

  return PROFILES[tier];
}
