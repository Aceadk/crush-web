'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { cn } from '@crush/ui';
import { sceneState } from './scene-state';
import { useSceneQuality } from './use-scene-quality';

// three + fiber load only when this actually mounts a canvas.
const MagneticCanvas = dynamic(() => import('./canvas-impl'), { ssr: false });

/**
 * Public entry for the "Magnetic Attraction" particle scene.
 *
 * Progressive enhancement, in order:
 * 1. SSR / no JS / reduced motion / no WebGL → a pure-CSS two-glow fallback
 *    that carries the same composition (always rendered underneath as the
 *    loading backdrop, too).
 * 2. Capable clients → the WebGL canvas fades in over the fallback after the
 *    main thread is idle. Context loss demotes back to the CSS fallback.
 *
 * The scene is purely decorative (aria-hidden, pointer-events: none); cursor
 * input comes from a window listener so content above stays interactive.
 */
export function MagneticScene({
  className,
  preset = 'landing',
}: {
  className?: string;
  /** `ambient` = subdued auth-page field: fewer particles, slower, dimmer. */
  preset?: 'landing' | 'ambient';
}) {
  const quality = useSceneQuality();
  const [mounted, setMounted] = useState(false);
  const [lost, setLost] = useState(false);

  // Defer WebGL init until the browser is idle so LCP text wins.
  useEffect(() => {
    if (quality.tier === 'static') return;
    let idleHandle: number | undefined;
    let timeoutHandle: ReturnType<typeof setTimeout> | undefined;
    const mount = () => setMounted(true);
    if ('requestIdleCallback' in window) {
      idleHandle = window.requestIdleCallback(mount, { timeout: 900 });
    } else {
      timeoutHandle = setTimeout(mount, 250);
    }
    return () => {
      if (idleHandle !== undefined) window.cancelIdleCallback(idleHandle);
      if (timeoutHandle !== undefined) clearTimeout(timeoutHandle);
    };
  }, [quality.tier]);

  // Fine-pointer tracking → shared scene state (NDC, +y up).
  useEffect(() => {
    if (quality.tier === 'static') return;
    if (!window.matchMedia('(pointer: fine)').matches) return;

    const onMove = (event: PointerEvent) => {
      sceneState.cursorX = (event.clientX / window.innerWidth) * 2 - 1;
      sceneState.cursorY = -((event.clientY / window.innerHeight) * 2 - 1);
      sceneState.cursorActive = true;
    };
    const onLeave = () => {
      sceneState.cursorActive = false;
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    document.documentElement.addEventListener('pointerleave', onLeave);
    return () => {
      window.removeEventListener('pointermove', onMove);
      document.documentElement.removeEventListener('pointerleave', onLeave);
      sceneState.cursorActive = false;
    };
  }, [quality.tier]);

  const showCanvas = quality.tier !== 'static' && mounted && !lost;

  return (
    <div aria-hidden="true" className={cn('pointer-events-none select-none', className)}>
      {/* CSS fallback + loading backdrop: same two-souls composition. */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute left-[14%] top-[32%] h-[36vmin] w-[36vmin] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(255,63,127,0.35),transparent_65%)] blur-2xl motion-safe:animate-pulse-glow" />
        <div className="absolute right-[14%] top-[58%] h-[32vmin] w-[32vmin] translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(124,77,255,0.30),transparent_65%)] blur-2xl motion-safe:animate-pulse-glow [animation-delay:1.6s]" />
      </div>

      {showCanvas ? (
        <div className="absolute inset-0 opacity-0 animate-[crush-scene-in_1.2s_ease-out_forwards]">
          <MagneticCanvas
            quality={quality}
            ambient={preset === 'ambient'}
            onContextLost={() => setLost(true)}
          />
        </div>
      ) : null}
    </div>
  );
}
