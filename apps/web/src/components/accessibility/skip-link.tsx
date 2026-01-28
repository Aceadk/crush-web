'use client';

import { cn } from '@crush/ui';

interface SkipLinkProps {
  href?: string;
  children?: React.ReactNode;
  className?: string;
}

/**
 * Skip link for keyboard users to bypass navigation
 * Should be the first focusable element on the page
 */
export function SkipLink({
  href = '#main-content',
  children = 'Skip to main content',
  className,
}: SkipLinkProps) {
  return (
    <a
      href={href}
      className={cn(
        // Hidden by default, visible on focus
        'sr-only focus:not-sr-only',
        'fixed top-4 left-4 z-[100]',
        'px-4 py-2 rounded-lg',
        'bg-primary text-primary-foreground',
        'font-medium text-sm',
        'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
        'transition-all duration-200',
        className
      )}
    >
      {children}
    </a>
  );
}

/**
 * Skip link target - wrap main content with this
 */
export function SkipLinkTarget({
  id = 'main-content',
  children,
  className,
}: {
  id?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <main
      id={id}
      tabIndex={-1}
      className={cn('outline-none', className)}
    >
      {children}
    </main>
  );
}
