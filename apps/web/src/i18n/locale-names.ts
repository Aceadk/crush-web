/**
 * Native locale display names (Phase 8 Step 18) for the LocaleSwitcher.
 * Each label is written in its own language (endonym).
 */

import { KNOWN_LOCALES, type Locale } from './locales';

export const LOCALE_NAMES: Record<Locale, string> = {
  en: 'English',
  ar: 'العربية',
  bn: 'বাংলা',
  de: 'Deutsch',
  es: 'Español',
  fr: 'Français',
  hi: 'हिन्दी',
  id: 'Bahasa Indonesia',
  ja: '日本語',
  ko: '한국어',
  ne: 'नेपाली',
  pt: 'Português',
  ru: 'Русский',
  ta: 'தமிழ்',
  te: 'తెలుగు',
  tr: 'Türkçe',
  ur: 'اردو',
  vi: 'Tiếng Việt',
  yo: 'Yorùbá',
  yue: '粵語',
  zh: '中文',
};

export function localeName(locale: Locale): string {
  return LOCALE_NAMES[locale] ?? locale;
}

/** Locales ordered for the switcher (default first, then alphabetical by name). */
export const LOCALE_OPTIONS: ReadonlyArray<{ code: Locale; name: string }> = [
  ...KNOWN_LOCALES,
]
  .map((code) => ({ code, name: LOCALE_NAMES[code] }))
  .sort((a, b) =>
    a.code === 'en' ? -1 : b.code === 'en' ? 1 : a.name.localeCompare(b.name)
  );
