'use client';

import { cn } from '@crush/ui';

interface VisuallyHiddenProps {
  children: React.ReactNode;
  as?: 'span' | 'div' | 'p' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
  className?: string;
}

/**
 * Visually hidden content for screen readers
 * Content is accessible but not visible
 */
export function VisuallyHidden({
  children,
  as: Component = 'span',
  className,
}: VisuallyHiddenProps) {
  return (
    <Component className={cn('sr-only', className)}>
      {children}
    </Component>
  );
}

/**
 * Live region for dynamic announcements
 */
interface LiveRegionProps {
  children: React.ReactNode;
  mode?: 'polite' | 'assertive';
  atomic?: boolean;
  relevant?: 'additions' | 'removals' | 'text' | 'all' | 'additions text';
}

export function LiveRegion({
  children,
  mode = 'polite',
  atomic = true,
  relevant = 'additions',
}: LiveRegionProps) {
  return (
    <div
      role="status"
      aria-live={mode}
      aria-atomic={atomic}
      aria-relevant={relevant}
      className="sr-only"
    >
      {children}
    </div>
  );
}

/**
 * Loading announcement for screen readers
 */
export function LoadingAnnouncement({ isLoading }: { isLoading: boolean }) {
  return (
    <LiveRegion mode="polite">
      {isLoading ? 'Loading content...' : 'Content loaded'}
    </LiveRegion>
  );
}
