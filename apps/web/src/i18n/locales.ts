/**
 * Locale definitions for the web app (P2 #11 — I18N foundation).
 *
 * This is a lightweight, non-routing i18n foundation: dictionary lookup with a
 * React context + hook, defaulting to English. It deliberately does NOT add
 * App Router locale routing/middleware yet — strings are externalized first;
 * routed locale selection can layer on later (or migrate to next-intl) without
 * changing call sites.
 */

/** The default (and currently only fully-translated) locale. */
export const DEFAULT_LOCALE = 'en' as const;

/**
 * Locales the product targets — mirrors the mobile app's ARB locales so web
 * translation can catch up incrementally. A locale appears here as a roadmap
 * entry even before its catalog ships (it falls back to English until then).
 */
export const KNOWN_LOCALES = [
  'en', 'ar', 'bn', 'de', 'es', 'fr', 'hi', 'id', 'ja', 'ko', 'ne',
  'pt', 'ru', 'ta', 'te', 'tr', 'ur', 'vi', 'yo', 'yue', 'zh',
] as const;

export type Locale = (typeof KNOWN_LOCALES)[number];

/** Right-to-left locales (for `dir` attribute / directional layout). */
export const RTL_LOCALES: ReadonlySet<Locale> = new Set<Locale>(['ar', 'ur']);

export function isRtlLocale(locale: Locale): boolean {
  return RTL_LOCALES.has(locale);
}

export function isKnownLocale(value: string): value is Locale {
  return (KNOWN_LOCALES as readonly string[]).includes(value);
}

/**
 * Resolve a raw locale string (e.g. from `navigator.language` "en-US" or an
 * Accept-Language header) to a supported Locale, falling back to the default.
 */
export function resolveLocale(raw: string | null | undefined): Locale {
  if (!raw) return DEFAULT_LOCALE;
  const base = raw.trim().toLowerCase().split('-')[0];
  return isKnownLocale(base) ? base : DEFAULT_LOCALE;
}
