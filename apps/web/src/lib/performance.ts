/**
 * Performance Utilities
 * Helpers for optimizing app performance
 */

import { useEffect, useState, useCallback, useRef } from 'react';

// ============================================================
// Intersection Observer Hook (Lazy Loading)
// ============================================================

interface UseIntersectionOptions {
  root?: Element | null;
  rootMargin?: string;
  threshold?: number | number[];
  triggerOnce?: boolean;
}

export function useIntersection(
  options: UseIntersectionOptions = {}
): [React.RefObject<HTMLElement>, boolean] {
  const { root = null, rootMargin = '0px', threshold = 0, triggerOnce = true } = options;
  const ref = useRef<HTMLElement>(null);
  const [isIntersecting, setIsIntersecting] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        const intersecting = entry.isIntersecting;
        setIsIntersecting(intersecting);

        if (intersecting && triggerOnce) {
          observer.unobserve(element);
        }
      },
      { root, rootMargin, threshold }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [root, rootMargin, threshold, triggerOnce]);

  return [ref as React.RefObject<HTMLElement>, isIntersecting];
}

// ============================================================
// Debounce Hook
// ============================================================

export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}

// ============================================================
// Throttle Hook
// ============================================================

export function useThrottle<T>(value: T, limit: number): T {
  const [throttledValue, setThrottledValue] = useState<T>(value);
  const lastRan = useRef(Date.now());

  useEffect(() => {
    const handler = setTimeout(() => {
      if (Date.now() - lastRan.current >= limit) {
        setThrottledValue(value);
        lastRan.current = Date.now();
      }
    }, limit - (Date.now() - lastRan.current));

    return () => {
      clearTimeout(handler);
    };
  }, [value, limit]);

  return throttledValue;
}

// ============================================================
// Preload Resources
// ============================================================

export function preloadImage(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = reject;
    img.src = src;
  });
}

export function preloadImages(srcs: string[]): Promise<void[]> {
  return Promise.all(srcs.map(preloadImage));
}

export function prefetchRoute(url: string): void {
  if (typeof window !== 'undefined') {
    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.href = url;
    document.head.appendChild(link);
  }
}

// ============================================================
// Performance Monitoring
// ============================================================

interface PerformanceMetrics {
  fcp?: number; // First Contentful Paint
  lcp?: number; // Largest Contentful Paint
  fid?: number; // First Input Delay
  cls?: number; // Cumulative Layout Shift
  ttfb?: number; // Time to First Byte
}

export function getWebVitals(): Promise<PerformanceMetrics> {
  return new Promise((resolve) => {
    const metrics: PerformanceMetrics = {};

    if (typeof window === 'undefined' || !window.performance) {
      resolve(metrics);
      return;
    }

    // Get navigation timing
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    if (navigation) {
      metrics.ttfb = navigation.responseStart - navigation.requestStart;
    }

    // Get paint timing
    const paintEntries = performance.getEntriesByType('paint');
    const fcp = paintEntries.find((entry) => entry.name === 'first-contentful-paint');
    if (fcp) {
      metrics.fcp = fcp.startTime;
    }

    // For LCP, FID, CLS we'd need web-vitals library
    // This is a simplified version
    resolve(metrics);
  });
}

export function reportWebVitals(metric: { name: string; value: number; id: string }): void {
  // Send to analytics
  console.log('[Performance]', metric.name, metric.value);

  // In production, send to analytics service
  // analytics.track({ name: 'web_vital', properties: metric });
}

// ============================================================
// Memory Management
// ============================================================

export function useCleanup(cleanup: () => void): void {
  useEffect(() => {
    return cleanup;
  }, [cleanup]);
}

// ============================================================
// Virtual List Helper (for long lists)
// ============================================================

interface VirtualListConfig {
  itemCount: number;
  itemHeight: number;
  containerHeight: number;
  overscan?: number;
}

export function useVirtualList({ itemCount, itemHeight, containerHeight, overscan = 3 }: VirtualListConfig) {
  const [scrollTop, setScrollTop] = useState(0);

  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endIndex = Math.min(
    itemCount - 1,
    Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
  );

  const visibleItems = Array.from({ length: endIndex - startIndex + 1 }, (_, i) => startIndex + i);
  const totalHeight = itemCount * itemHeight;
  const offsetTop = startIndex * itemHeight;

  const handleScroll = useCallback((e: React.UIEvent<HTMLElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  return {
    visibleItems,
    totalHeight,
    offsetTop,
    handleScroll,
  };
}

// ============================================================
// Request Idle Callback
// ============================================================

export function requestIdleCallback(callback: () => void, timeout = 1000): void {
  if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
    (window as Window & { requestIdleCallback: (cb: () => void, opts?: { timeout: number }) => void })
      .requestIdleCallback(callback, { timeout });
  } else {
    setTimeout(callback, 1);
  }
}

// ============================================================
// Defer Non-Critical Work
// ============================================================

export function deferWork(work: () => void): void {
  if (typeof window !== 'undefined') {
    if ('scheduler' in window && 'postTask' in (window as unknown as { scheduler: { postTask: (fn: () => void, opts: { priority: string }) => void } }).scheduler) {
      (window as unknown as { scheduler: { postTask: (fn: () => void, opts: { priority: string }) => void } })
        .scheduler.postTask(work, { priority: 'background' });
    } else {
      requestIdleCallback(work);
    }
  }
}
