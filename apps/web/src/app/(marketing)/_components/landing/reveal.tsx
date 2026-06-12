'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@crush/ui';

interface RevealProps {
  children: React.ReactNode;
  className?: string;
  /** Stagger delay in milliseconds. */
  delay?: number;
  /** Reveal direction. */
  direction?: 'up' | 'left' | 'right' | 'none';
}

const HIDDEN_BY_DIRECTION: Record<NonNullable<RevealProps['direction']>, string> = {
  up: 'opacity-0 translate-y-7',
  left: 'opacity-0 -translate-x-7',
  right: 'opacity-0 translate-x-7',
  none: 'opacity-0',
};

/**
 * Scroll-reveal wrapper for the marketing landing page.
 *
 * Content is VISIBLE by default (SSR markup, no-JS, and blocked-JS safe —
 * the production CSP can prevent hydration on static pages, so nothing may
 * depend on JavaScript to become visible). After mount, elements still below
 * the viewport are hidden and revealed with a transition once scrolled into
 * view. Reduced-motion users keep the static, always-visible page.
 */
export function Reveal({ children, className, delay = 0, direction = 'up' }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<'visible' | 'hidden' | 'revealed'>('visible');

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    // Only animate elements that are still below the viewport; anything
    // already on screen stays visible (no flash, no layout surprise).
    if (node.getBoundingClientRect().top < window.innerHeight * 0.9) return;

    setState('hidden');
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setState('revealed');
          observer.disconnect();
        }
      },
      { rootMargin: '0px 0px -10% 0px', threshold: 0.1 }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      style={delay && state === 'revealed' ? { transitionDelay: `${delay}ms` } : undefined}
      className={cn(
        'transition-all duration-700 ease-out',
        state === 'hidden' && HIDDEN_BY_DIRECTION[direction],
        state === 'revealed' && 'opacity-100 translate-x-0 translate-y-0',
        className
      )}
    >
      {children}
    </div>
  );
}
