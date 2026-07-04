'use client';

import { useEffect, useRef } from 'react';

/**
 * Magnetic hover wrapper: the child leans toward the cursor while it is over
 * the wrapper and springs back on leave. Fine pointers only; reduced-motion
 * users get a plain wrapper. Purely presentational — wraps links/buttons
 * without touching their semantics or handlers.
 */
export function Magnetic({
  children,
  strength = 0.32,
  className,
}: {
  children: React.ReactNode;
  /** Fraction of the cursor offset the child follows (0–1). */
  strength?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (!window.matchMedia('(pointer: fine)').matches) return;

    const onMove = (event: PointerEvent) => {
      const rect = el.getBoundingClientRect();
      const dx = event.clientX - (rect.left + rect.width / 2);
      const dy = event.clientY - (rect.top + rect.height / 2);
      el.style.transition = 'transform 0.08s linear';
      el.style.transform = `translate3d(${dx * strength}px, ${dy * strength}px, 0)`;
    };
    const onLeave = () => {
      el.style.transition = 'transform 0.45s cubic-bezier(0.21, 0.47, 0.32, 0.98)';
      el.style.transform = 'translate3d(0, 0, 0)';
    };

    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerleave', onLeave);
    return () => {
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerleave', onLeave);
      el.style.transform = '';
      el.style.transition = '';
    };
  }, [strength]);

  return (
    <div ref={ref} className={className ? `inline-block ${className}` : 'inline-block'}>
      {children}
    </div>
  );
}
