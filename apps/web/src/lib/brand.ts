/**
 * Canonical brand constants for crush-web.
 *
 * These mirror the mobile design tokens (my_first_project/docs/design_tokens.json
 * + lib/design_system/tokens/colors.dart) and the app icon, so web favicon /
 * PWA icons / OG image / manifest stay aligned with the native app and
 * Android adaptive icon (heart on a #0D0E12 dark background).
 *
 * P1 #9 of the web-mobile alignment audit.
 */

export const BRAND = {
  name: 'Crush',
  tagline: 'Find Your Perfect Match',
  /** Primary accent (mobile design token `primary`). */
  primary: '#FF3F7F',
  primaryDark: '#E0356F',
  /** Canonical dark background (mobile `backgroundDark`, splash, adaptive icon). */
  backgroundDark: '#0D0E12',
  /** On-dark foreground. */
  onDark: '#FFFFFF',
} as const;

/**
 * The heart mark path (24x24 viewBox), shared by all generated icons so the web
 * logo matches the native mark.
 */
export const HEART_PATH =
  'M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 ' +
  '3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 ' +
  '6.86-8.55 11.54L12 21.35z';
