'use client';

import { useTheme } from './theme-provider';
import { cn } from '@crush/ui';
import { Monitor, Moon, Sun } from 'lucide-react';
import { type Theme } from '@/shared/lib/theme';

interface ThemeSwitcherProps {
  className?: string;
  variant?: 'segmented' | 'dropdown' | 'icon';
}

const themes: { value: Theme; label: string; icon: typeof Sun }[] = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
];

/**
 * Geist-style segmented theme switcher
 */
export function ThemeSwitcher({ className, variant = 'segmented' }: ThemeSwitcherProps) {
  const { theme, setTheme, resolvedTheme } = useTheme();

  if (variant === 'icon') {
    return (
      <button
        onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
        className={cn(
          'relative flex h-8 w-8 items-center justify-center rounded-md',
          'text-muted-foreground hover:text-foreground hover:bg-muted',
          'transition-colors duration-150',
          className
        )}
        aria-label={`Switch to ${resolvedTheme === 'dark' ? 'light' : 'dark'} mode`}
      >
        <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
        <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      </button>
    );
  }

  return (
    <div
      className={cn(
        'inline-flex items-center rounded-lg bg-muted p-0.5',
        className
      )}
      role="radiogroup"
      aria-label="Theme selection"
    >
      {themes.map(({ value, label, icon: Icon }) => (
        <button
          key={value}
          role="radio"
          aria-checked={theme === value}
          onClick={() => setTheme(value)}
          className={cn(
            'relative flex items-center justify-center gap-1.5 rounded-md px-2.5 py-1.5',
            'text-xs font-medium transition-all duration-150',
            theme === value
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <Icon className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">{label}</span>
        </button>
      ))}
    </div>
  );
}

/**
 * Compact icon-only theme toggle (for tight spaces)
 */
export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();

  return (
    <button
      onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
      className={cn(
        'relative flex h-9 w-9 items-center justify-center rounded-lg',
        'border border-border bg-background',
        'text-muted-foreground hover:text-foreground hover:bg-muted',
        'transition-colors duration-150',
        className
      )}
      aria-label={`Switch to ${resolvedTheme === 'dark' ? 'light' : 'dark'} mode`}
    >
      <Sun className="h-4 w-4 rotate-0 scale-100 transition-transform duration-300 dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-transform duration-300 dark:rotate-0 dark:scale-100" />
    </button>
  );
}
