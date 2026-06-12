'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import {
  type Theme,
  getStoredTheme,
  getSystemTheme,
  storeTheme,
  applyTheme,
} from '@/shared/lib/theme';

interface ThemeContextValue {
  theme: Theme;
  resolvedTheme: 'light' | 'dark';
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
  defaultTheme?: Theme;
}

export function ThemeProvider({
  children,
  defaultTheme = 'system',
}: ThemeProviderProps) {
  // Initial state must be deterministic and identical on the server and the
  // first client render — branching on `typeof window` here caused hydration
  // mismatches in consumers (e.g. ThemeToggle's aria-label). The stored
  // preference is synced in a mount effect below; the pre-hydration visual
  // theme is already handled by themeInitScript, which sets the html class
  // before first paint.
  const [theme, setThemeState] = useState<Theme>(defaultTheme);
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('dark');

  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme);
    storeTheme(newTheme);
    applyTheme(newTheme);
    setResolvedTheme(newTheme === 'system' ? getSystemTheme() : newTheme);
  }, []);

  // Listen for system theme changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleChange = () => {
      if (theme === 'system') {
        const newResolved = getSystemTheme();
        setResolvedTheme(newResolved);
        applyTheme('system');
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);

  // Re-apply whenever the theme changes
  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  // Sync the stored preference after mount. Runs after the apply-effect above
  // in the same effect flush, so the final applied theme within the first
  // flush is the stored one (no visible flash).
  useEffect(() => {
    const stored = getStoredTheme() || defaultTheme;
    setThemeState(stored);
    setResolvedTheme(stored === 'system' ? getSystemTheme() : stored);
    applyTheme(stored);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-only sync
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
