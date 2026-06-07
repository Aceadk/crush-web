/**
 * Locale persistence (Phase 8 Step 18).
 *
 * Mirrors the theme cookie strategy (`crush-theme`) so locale survives reloads
 * and is available to a pre-hydration init script. Deliberately client-first
 * (cookie + a no-flash script) so it does NOT deopt static marketing pages to
 * dynamic rendering — the server renders the default locale and the init script
 * corrects `lang`/`dir` before paint.
 */

import { DEFAULT_LOCALE, isKnownLocale, type Locale } from './locales';

export const LOCALE_COOKIE = 'crush-locale';
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

/** Read the persisted locale from the browser cookie (client only). */
export function readLocaleCookie(): Locale | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(
    new RegExp(`(?:^|; )${LOCALE_COOKIE}=([^;]+)`)
  );
  if (!match) return null;
  const raw = decodeURIComponent(match[1]);
  return isKnownLocale(raw) ? raw : null;
}

/** Persist the locale to a cookie + localStorage (client only). */
export function writeLocaleCookie(locale: Locale): void {
  if (typeof document === 'undefined') return;
  document.cookie = `${LOCALE_COOKIE}=${locale};max-age=${ONE_YEAR_SECONDS};path=/;SameSite=Lax`;
  try {
    localStorage.setItem(LOCALE_COOKIE, locale);
  } catch {
    /* storage may be unavailable (private mode) — cookie is the source of truth */
  }
}

/**
 * Pre-hydration script: sets `<html lang>` + `<html dir>` from the persisted
 * locale (or navigator language) before React hydrates, so RTL/locale paint is
 * correct on first frame. Injected in <head>, same approach as themeInitScript.
 */
export const localeInitScript = `
(function() {
  var KNOWN = ${JSON.stringify(
    // keep in sync with locales.ts KNOWN_LOCALES
    [
      'en', 'ar', 'bn', 'de', 'es', 'fr', 'hi', 'id', 'ja', 'ko', 'ne',
      'pt', 'ru', 'ta', 'te', 'tr', 'ur', 'vi', 'yo', 'yue', 'zh',
    ]
  )};
  var RTL = ['ar', 'ur'];
  function base(v) { return (v || '').trim().toLowerCase().split('-')[0]; }
  function fromCookie() {
    var m = document.cookie.match(/(?:^|; )${LOCALE_COOKIE}=([^;]+)/);
    return m ? decodeURIComponent(m[1]) : null;
  }
  var raw = fromCookie() || (navigator.language || '${DEFAULT_LOCALE}');
  var loc = base(raw);
  if (KNOWN.indexOf(loc) === -1) loc = '${DEFAULT_LOCALE}';
  var el = document.documentElement;
  el.setAttribute('lang', loc);
  el.setAttribute('dir', RTL.indexOf(loc) !== -1 ? 'rtl' : 'ltr');
})();
`;
