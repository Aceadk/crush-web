'use client';

import { useEffect } from 'react';
import { gsap, ScrollTrigger } from './gsap';
import { sceneState } from '../three/scene-state';

/**
 * Maps document scroll to the scene's narrative progress (0 → 1):
 * the two orbs stay apart through the hero, get gravitationally pulled
 * together across Act 2 (features/journey/stories) and collide when the
 * "match moment" section centres in the viewport. Renders nothing — it only
 * writes sceneState.progress, which the render loop consumes.
 *
 * No-op for reduced-motion users (the WebGL scene isn't mounted then, and
 * the CSS fallback has no narrative to drive).
 */
export function ScrollDirector() {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const act2 = document.getElementById('act-2');
    const match = document.getElementById('the-match');
    if (!act2 || !match) return;

    const trigger = ScrollTrigger.create({
      trigger: act2,
      start: 'top 85%',
      endTrigger: match,
      end: 'center center',
      onUpdate: (self) => {
        sceneState.progress = self.progress;
      },
      // Snap nothing, pin nothing — the orbs interpolate their own easing.
    });

    // After the collision the merged light recedes so stories/pricing/CTA
    // read over a soft afterglow instead of a bright core.
    const stage = document.getElementById('magnetic-stage');
    let dim: gsap.core.Tween | undefined;
    if (stage) {
      dim = gsap.fromTo(
        stage,
        { opacity: 1 },
        {
          opacity: 0.3,
          ease: 'none',
          scrollTrigger: {
            trigger: match,
            start: 'center center',
            end: 'bottom top',
            scrub: 0.4,
          },
        }
      );
    }

    return () => {
      trigger.kill();
      dim?.scrollTrigger?.kill();
      dim?.kill();
      if (stage) gsap.set(stage, { opacity: 1 });
      sceneState.progress = 0;
    };
  }, []);

  return null;
}
