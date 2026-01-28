'use client';

import { useState, useEffect } from 'react';

/**
 * Hook to detect media query matches
 * Returns undefined during SSR/hydration to prevent mismatch
 */
export function useMediaQuery(query: string): boolean {
  // Start with a function that checks if we're on client and can get the initial value
  const getInitialValue = () => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia(query).matches;
  };

  const [matches, setMatches] = useState(getInitialValue);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const media = window.matchMedia(query);

    // Set initial value on mount
    setMatches(media.matches);

    // Create listener
    const listener = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    // Add listener
    media.addEventListener('change', listener);

    // Cleanup
    return () => {
      media.removeEventListener('change', listener);
    };
  }, [query]);

  // Return false during SSR to have a consistent initial render
  if (!mounted) return false;

  return matches;
}

/**
 * Predefined breakpoint hooks
 */
export function useIsMobile() {
  return useMediaQuery('(max-width: 767px)');
}

export function useIsTablet() {
  return useMediaQuery('(min-width: 768px) and (max-width: 1023px)');
}

export function useIsDesktop() {
  return useMediaQuery('(min-width: 1024px)');
}

export function useIsDarkMode() {
  return useMediaQuery('(prefers-color-scheme: dark)');
}
