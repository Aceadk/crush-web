/**
 * Theme Configuration
 * Geist-style theme system with no-flash strategy
 */

export type Theme = 'light' | 'dark' | 'system';

export const THEME_STORAGE_KEY = 'crush-theme';
export const THEME_ATTRIBUTE = 'class';

/**
 * Get the system theme preference
 */
export function getSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'dark';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/**
 * Get the stored theme preference
 */
export function getStoredTheme(): Theme | null {
  if (typeof window === 'undefined') return null;

  // Try cookie first (for SSR)
  const cookieMatch = document.cookie.match(new RegExp(`${THEME_STORAGE_KEY}=([^;]+)`));
  if (cookieMatch) {
    const theme = cookieMatch[1] as Theme;
    if (['light', 'dark', 'system'].includes(theme)) {
      return theme;
    }
  }

  // Fallback to localStorage
  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  if (stored && ['light', 'dark', 'system'].includes(stored)) {
    return stored as Theme;
  }

  return null;
}

/**
 * Store the theme preference
 */
export function storeTheme(theme: Theme): void {
  if (typeof window === 'undefined') return;

  // Store in cookie (for SSR, expires in 1 year)
  const expires = new Date();
  expires.setFullYear(expires.getFullYear() + 1);
  document.cookie = `${THEME_STORAGE_KEY}=${theme};expires=${expires.toUTCString()};path=/;SameSite=Lax`;

  // Also store in localStorage as backup
  localStorage.setItem(THEME_STORAGE_KEY, theme);
}

/**
 * Apply theme to document
 */
export function applyTheme(theme: Theme): void {
  if (typeof window === 'undefined') return;

  const root = document.documentElement;
  const resolvedTheme = theme === 'system' ? getSystemTheme() : theme;

  root.classList.remove('light', 'dark');
  root.classList.add(resolvedTheme);

  // Update color-scheme for native elements
  root.style.colorScheme = resolvedTheme;
}

/**
 * Initialize theme (call early to prevent flash)
 */
export function initializeTheme(): void {
  const stored = getStoredTheme();
  const theme = stored || 'system';
  applyTheme(theme);
}

/**
 * Script to inject in <head> for no-flash theme initialization
 * This runs before React hydrates
 */
export const themeInitScript = `
(function() {
  const THEME_KEY = '${THEME_STORAGE_KEY}';

  function getTheme() {
    // Try cookie
    const match = document.cookie.match(new RegExp(THEME_KEY + '=([^;]+)'));
    if (match) return match[1];
    // Try localStorage
    try { return localStorage.getItem(THEME_KEY); } catch (e) {}
    return null;
  }

  function getSystemTheme() {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  const stored = getTheme();
  const theme = stored || 'system';
  const resolved = theme === 'system' ? getSystemTheme() : theme;

  document.documentElement.classList.add(resolved);
  document.documentElement.style.colorScheme = resolved;
})();
`;
