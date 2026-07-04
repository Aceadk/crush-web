'use client';

import { useEffect, useRef, useState } from 'react';
import { Heart } from 'lucide-react';
import { SCENE_READY_EVENT, sceneState } from '../three/scene-state';

const SESSION_KEY = 'crush-preloader-seen';
/** Minimum time on screen so the count reads as a moment, not a flicker. */
const MIN_DURATION_MS = 1400;
/** Give up waiting for the scene after this and reveal anyway. */
const MAX_WAIT_MS = 3200;

function shouldSkip(): boolean {
  if (typeof window === 'undefined') return true;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return true;
  // Automated browsers (Playwright/Lighthouse) skip straight to content.
  if (navigator.webdriver) return true;
  try {
    return sessionStorage.getItem(SESSION_KEY) === '1';
  } catch {
    return false;
  }
}

/**
 * Branded preloader: pulsing heart + percentage counter on the base dark,
 * shown once per session on the landing page. The counter eases to ~90% on a
 * clock and completes when the WebGL scene reports ready (or a timeout), then
 * the overlay wipes away in a circular mask so the hero reveal is a moment.
 *
 * Rendered as a client-only overlay ON TOP of server-rendered content — with
 * JavaScript disabled it simply never appears, so the no-JS guarantee of the
 * marketing pages holds.
 */
export function Preloader() {
  // null = undecided (render nothing yet, avoids SSR flash), false = skipped.
  const [active, setActive] = useState<boolean | null>(null);
  const [count, setCount] = useState(0);
  const [leaving, setLeaving] = useState(false);
  const startRef = useRef(0);

  useEffect(() => {
    if (shouldSkip()) {
      setActive(false);
      return;
    }
    setActive(true);
    startRef.current = performance.now();
    try {
      sessionStorage.setItem(SESSION_KEY, '1');
    } catch {
      /* private mode — show it again next time, harmless */
    }
  }, []);

  useEffect(() => {
    if (!active) return;

    document.documentElement.style.overflow = 'hidden';

    let raf = 0;
    let done = false;

    const finish = () => {
      if (done) return;
      done = true;
      setCount(100);
      setLeaving(true);
      // Matches the mask-wipe transition duration below.
      setTimeout(() => setActive(false), 900);
    };

    const tick = (now: number) => {
      const elapsed = now - startRef.current;
      const sceneReady = sceneState.ready;
      // Ease toward 90 on the clock; the last 10% belongs to scene readiness.
      const clockTarget = Math.min(90, (elapsed / MIN_DURATION_MS) * 90);
      setCount((prev) => Math.max(prev, Math.round(clockTarget)));

      if ((sceneReady && elapsed >= MIN_DURATION_MS) || elapsed >= MAX_WAIT_MS) {
        finish();
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    const onReady = () => {
      // Let the clock-driven tick decide; this just wakes a hidden tab case.
    };
    window.addEventListener(SCENE_READY_EVENT, onReady);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener(SCENE_READY_EVENT, onReady);
      document.documentElement.style.overflow = '';
    };
  }, [active]);

  if (!active) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Loading Crush"
      className="fixed inset-0 z-[90] flex items-center justify-center bg-[#0d0e12] transition-[clip-path,opacity] duration-[900ms] ease-[cubic-bezier(0.83,0,0.17,1)]"
      style={{
        clipPath: leaving ? 'circle(0% at 50% 50%)' : 'circle(140% at 50% 50%)',
        opacity: leaving ? 0.9 : 1,
      }}
    >
      <div className="flex flex-col items-center gap-6">
        <Heart
          aria-hidden="true"
          className="h-10 w-10 fill-[#ff3f7f] text-[#ff3f7f] animate-[crush-heartbeat_1.1s_ease-in-out_infinite]"
        />
        <p className="font-mono text-xs uppercase tracking-[0.45em] text-white/50">
          Crush
        </p>
        <p className="font-mono text-sm tabular-nums text-white/80">{count}%</p>
      </div>
    </div>
  );
}
