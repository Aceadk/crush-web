'use client';

import { useEffect, useRef } from 'react';

/**
 * Cursor-follow glow: a soft brand-pink radial light that trails the pointer
 * between the particle scene and the content, making the page feel lit by the
 * visitor's attention. Fine pointers only; reduced-motion users get nothing.
 * Sits at z-[5]: above the fixed scene (z-0), below content (z-10).
 */
export function CursorGlow() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (!window.matchMedia('(pointer: fine)').matches) return;

    let raf = 0;
    let targetX = -9999;
    let targetY = -9999;
    let x = targetX;
    let y = targetY;
    let visible = false;

    const tick = () => {
      x += (targetX - x) * 0.12;
      y += (targetY - y) * 0.12;
      el.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`;
      raf = requestAnimationFrame(tick);
    };

    const onMove = (event: PointerEvent) => {
      targetX = event.clientX;
      targetY = event.clientY;
      if (!visible) {
        visible = true;
        x = targetX;
        y = targetY;
        el.style.opacity = '1';
        raf = requestAnimationFrame(tick);
      }
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    return () => {
      window.removeEventListener('pointermove', onMove);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div
      ref={ref}
      aria-hidden="true"
      className="pointer-events-none fixed left-0 top-0 z-[5] h-[520px] w-[520px] rounded-full opacity-0 transition-opacity duration-700 mix-blend-screen"
      style={{
        background:
          'radial-gradient(circle, rgba(255,63,127,0.085), rgba(124,77,255,0.04) 45%, transparent 70%)',
      }}
    />
  );
}
