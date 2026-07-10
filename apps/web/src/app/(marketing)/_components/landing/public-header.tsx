'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Heart, Menu, X } from 'lucide-react';
import { cn } from '@crush/ui';
import { ThemeToggle } from '@/shared/components/theme';

const NAV_LINKS = [
  { href: '/features', label: 'Features' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/about', label: 'About' },
  { href: '/safety', label: 'Safety' },
] as const;

/**
 * Fixed glass public header with desktop nav and a keyboard-accessible
 * mobile menu (the public pages previously had no mobile navigation).
 */
export function PublicHeader() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  // The landing page is a fixed dark cinematic canvas regardless of the app
  // theme, so the header wears a dark-glass variant there (and hides the
  // theme toggle, which has no visible effect on that route).
  const onLanding = pathname === '/';

  const closeMenu = useCallback(() => setMenuOpen(false), []);

  // Close the mobile menu on Escape and return focus to the toggle button.
  useEffect(() => {
    if (!menuOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenuOpen(false);
        menuButtonRef.current?.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [menuOpen]);

  return (
    <header className="fixed top-0 left-0 right-0 z-50">
      <nav
        aria-label="Main"
        className={cn(
          onLanding
            ? 'border-b border-white/10 bg-[#0d0e12]/70 backdrop-blur-xl'
            : 'glass border-b border-border/50'
        )}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            <Link href="/" className="flex items-center gap-2" onClick={closeMenu}>
              <Heart className="w-6 h-6 text-primary fill-primary" aria-hidden="true" />
              <span className="text-lg font-semibold text-gradient">Crush</span>
            </Link>

            <div className="hidden md:flex items-center gap-6">
              {NAV_LINKS.map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    'text-sm transition-colors',
                    pathname === href
                      ? 'text-foreground font-medium'
                      : onLanding
                        ? 'text-white/55 hover:text-white'
                        : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {label}
                </Link>
              ))}
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              {!onLanding && <ThemeToggle />}
              <Link
                href="/auth/login"
                className={cn(
                  'hidden sm:inline-flex text-sm font-medium transition-colors',
                  onLanding
                    ? 'text-white/60 hover:text-white'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                Log in
              </Link>
              <Link href="/auth/signup" className="btn-primary text-sm">
                Get Started
              </Link>
              <button
                ref={menuButtonRef}
                type="button"
                className={cn(
                  'md:hidden inline-flex h-9 w-9 items-center justify-center rounded-lg border transition-colors',
                  onLanding
                    ? 'border-white/15 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white'
                    : 'border-border bg-background text-muted-foreground hover:text-foreground hover:bg-muted'
                )}
                aria-label={menuOpen ? 'Close menu' : 'Open menu'}
                aria-expanded={menuOpen}
                aria-controls="public-mobile-nav"
                onClick={() => setMenuOpen((open) => !open)}
              >
                {menuOpen ? (
                  <X className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <Menu className="h-4 w-4" aria-hidden="true" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile navigation panel */}
        <div
          id="public-mobile-nav"
          hidden={!menuOpen}
          className={cn(
            'md:hidden border-t backdrop-blur-xl',
            onLanding ? 'border-white/10 bg-[#0d0e12]/95' : 'border-border/50 bg-background/95'
          )}
        >
          <div className="px-4 py-3 space-y-1">
            {NAV_LINKS.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                onClick={closeMenu}
                className={cn(
                  'block rounded-lg px-3 py-2.5 text-sm transition-colors',
                  pathname === href
                    ? 'bg-accent text-accent-foreground font-medium'
                    : onLanding
                      ? 'text-white/60 hover:bg-white/5 hover:text-white'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                )}
              >
                {label}
              </Link>
            ))}
            <Link
              href="/#download"
              onClick={closeMenu}
              className={cn(
                'block rounded-lg px-3 py-2.5 text-sm transition-colors',
                onLanding
                  ? 'text-white/60 hover:bg-white/5 hover:text-white'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              )}
            >
              Download
            </Link>
            <div className={cn('pt-2 mt-2 border-t', onLanding ? 'border-white/10' : 'border-border/50')}>
              <Link
                href="/auth/login"
                onClick={closeMenu}
                className={cn(
                  'block rounded-lg px-3 py-2.5 text-sm transition-colors',
                  onLanding
                    ? 'text-white/60 hover:bg-white/5 hover:text-white'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                )}
              >
                Log in
              </Link>
            </div>
          </div>
        </div>
      </nav>
    </header>
  );
}
