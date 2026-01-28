/**
 * Accessibility Utilities
 * Helpers for improving app accessibility
 */

import { useEffect, useRef, useCallback } from 'react';

// ============================================================
// Focus Management
// ============================================================

/**
 * Trap focus within an element (for modals, dialogs)
 */
export function useFocusTrap(isActive: boolean = true) {
  const containerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!isActive || !containerRef.current) return;

    const container = containerRef.current;
    const focusableElements = container.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    // Focus first element
    firstElement?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        // Shift + Tab
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        // Tab
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    container.addEventListener('keydown', handleKeyDown);
    return () => container.removeEventListener('keydown', handleKeyDown);
  }, [isActive]);

  return containerRef;
}

/**
 * Restore focus to previous element when component unmounts
 */
export function useRestoreFocus() {
  const previousElement = useRef<HTMLElement | null>(null);

  useEffect(() => {
    previousElement.current = document.activeElement as HTMLElement;

    return () => {
      previousElement.current?.focus();
    };
  }, []);
}

/**
 * Focus first focusable element in container
 */
export function focusFirstElement(container: HTMLElement | null) {
  if (!container) return;

  const focusable = container.querySelector<HTMLElement>(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );
  focusable?.focus();
}

// ============================================================
// Keyboard Navigation
// ============================================================

type ArrowDirection = 'up' | 'down' | 'left' | 'right';

interface UseArrowNavigationOptions {
  onArrow?: (direction: ArrowDirection) => void;
  onEnter?: () => void;
  onEscape?: () => void;
  loop?: boolean;
}

export function useArrowNavigation(
  items: HTMLElement[],
  options: UseArrowNavigationOptions = {}
) {
  const { onArrow, onEnter, onEscape, loop = true } = options;
  const currentIndex = useRef(0);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const { key } = e;
      let newIndex = currentIndex.current;

      switch (key) {
        case 'ArrowUp':
        case 'ArrowLeft':
          e.preventDefault();
          newIndex = currentIndex.current - 1;
          if (newIndex < 0) newIndex = loop ? items.length - 1 : 0;
          onArrow?.(key === 'ArrowUp' ? 'up' : 'left');
          break;

        case 'ArrowDown':
        case 'ArrowRight':
          e.preventDefault();
          newIndex = currentIndex.current + 1;
          if (newIndex >= items.length) newIndex = loop ? 0 : items.length - 1;
          onArrow?.(key === 'ArrowDown' ? 'down' : 'right');
          break;

        case 'Enter':
        case ' ':
          e.preventDefault();
          onEnter?.();
          break;

        case 'Escape':
          e.preventDefault();
          onEscape?.();
          break;

        case 'Home':
          e.preventDefault();
          newIndex = 0;
          break;

        case 'End':
          e.preventDefault();
          newIndex = items.length - 1;
          break;
      }

      if (newIndex !== currentIndex.current && items[newIndex]) {
        currentIndex.current = newIndex;
        items[newIndex].focus();
      }
    },
    [items, loop, onArrow, onEnter, onEscape]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return {
    setCurrentIndex: (index: number) => {
      currentIndex.current = index;
    },
  };
}

// ============================================================
// Screen Reader Announcements
// ============================================================

let announcer: HTMLElement | null = null;

function getAnnouncer(): HTMLElement {
  if (!announcer && typeof document !== 'undefined') {
    announcer = document.createElement('div');
    announcer.setAttribute('aria-live', 'polite');
    announcer.setAttribute('aria-atomic', 'true');
    announcer.setAttribute('role', 'status');
    announcer.style.cssText = `
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border: 0;
    `;
    document.body.appendChild(announcer);
  }
  return announcer!;
}

/**
 * Announce a message to screen readers
 */
export function announce(message: string, priority: 'polite' | 'assertive' = 'polite') {
  if (typeof document === 'undefined') return;

  const el = getAnnouncer();
  el.setAttribute('aria-live', priority);
  el.textContent = '';

  // Small delay to ensure the announcement is picked up
  setTimeout(() => {
    el.textContent = message;
  }, 50);
}

/**
 * Hook for screen reader announcements
 */
export function useAnnounce() {
  return useCallback((message: string, priority?: 'polite' | 'assertive') => {
    announce(message, priority);
  }, []);
}

// ============================================================
// Reduced Motion
// ============================================================

/**
 * Check if user prefers reduced motion
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Hook for reduced motion preference
 */
export function useReducedMotion(): boolean {
  const ref = useRef(prefersReducedMotion());

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handler = (e: MediaQueryListEvent) => {
      ref.current = e.matches;
    };

    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  return ref.current;
}

// ============================================================
// ARIA Helpers
// ============================================================

/**
 * Generate unique IDs for ARIA relationships
 */
let idCounter = 0;
export function generateId(prefix: string = 'aria'): string {
  return `${prefix}-${++idCounter}`;
}

/**
 * Create aria-describedby props
 */
export function describeElement(description: string, id?: string) {
  const descId = id || generateId('desc');
  return {
    describedById: descId,
    descriptionProps: {
      id: descId,
      children: description,
      className: 'sr-only',
    },
    elementProps: {
      'aria-describedby': descId,
    },
  };
}

// ============================================================
// Color Contrast
// ============================================================

/**
 * Calculate relative luminance
 */
function getLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/**
 * Calculate contrast ratio between two colors
 */
export function getContrastRatio(
  rgb1: [number, number, number],
  rgb2: [number, number, number]
): number {
  const l1 = getLuminance(...rgb1);
  const l2 = getLuminance(...rgb2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Check if contrast meets WCAG requirements
 */
export function meetsContrastRequirement(
  ratio: number,
  level: 'AA' | 'AAA' = 'AA',
  isLargeText: boolean = false
): boolean {
  if (level === 'AAA') {
    return isLargeText ? ratio >= 4.5 : ratio >= 7;
  }
  return isLargeText ? ratio >= 3 : ratio >= 4.5;
}
