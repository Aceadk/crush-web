'use client';

/**
 * React i18n context + hook (Phase 8 Step 18: globally mounted).
 *
 * Resolves the active locale client-first from the `crush-locale` cookie (set by
 * the pre-hydration init script and the LocaleSwitcher), falling back to the
 * browser language and then English. Exposes `setLocale` for instant switching
 * (updates cookie + state + `<html lang/dir>` with no full reload) and bound
 * Intl formatters via `useFormatters`.
 *
 * An explicit `locale` prop still overrides resolution (used by tests / SSR).
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { DEFAULT_LOCALE, isRtlLocale, resolveLocale, type Locale } from './locales';
import { getMessages } from './messages';
import { createTranslator, type Translator, type TranslateVars } from './translate';
import { readLocaleCookie, writeLocaleCookie } from './locale-cookie';
import { createFormatters, type Formatters } from './format';

interface I18nContextValue extends Translator {
  locale: Locale;
  isRtl: boolean;
  setLocale: (locale: Locale) => void;
  format: Formatters;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export interface I18nProviderProps {
  /** Explicit override (tests/SSR). When omitted, resolves from cookie/browser. */
  locale?: Locale;
  children: ReactNode;
}

function applyHtmlLangDir(locale: Locale) {
  if (typeof document === 'undefined') return;
  const el = document.documentElement;
  el.setAttribute('lang', locale);
  el.setAttribute('dir', isRtlLocale(locale) ? 'rtl' : 'ltr');
}

export function I18nProvider({ locale: localeProp, children }: I18nProviderProps) {
  // SSR + first client render use the default (or prop) so markup matches; an
  // effect then adopts the persisted cookie locale. `suppressHydrationWarning`
  // on <html> (layout) covers the lang/dir attribute correction.
  const [locale, setLocaleState] = useState<Locale>(localeProp ?? DEFAULT_LOCALE);

  useEffect(() => {
    if (localeProp) return; // explicit override wins
    const fromCookie =
      readLocaleCookie() ??
      (typeof navigator !== 'undefined' ? resolveLocale(navigator.language) : null);
    if (fromCookie && fromCookie !== locale) {
      setLocaleState(fromCookie);
      applyHtmlLangDir(fromCookie);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localeProp]);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    writeLocaleCookie(next);
    applyHtmlLangDir(next);
  }, []);

  const value = useMemo<I18nContextValue>(() => {
    const translator = createTranslator(getMessages(locale));
    return {
      locale,
      isRtl: isRtlLocale(locale),
      setLocale,
      t: translator.t,
      tPlural: translator.tPlural,
      format: createFormatters(locale),
    };
  }, [locale, setLocale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

/**
 * Access the active i18n context. Falls back to an English context if used
 * outside a provider, so components never crash during incremental adoption.
 */
export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (ctx) return ctx;
  const translator = createTranslator(getMessages(DEFAULT_LOCALE));
  return {
    locale: DEFAULT_LOCALE,
    isRtl: false,
    setLocale: () => {},
    t: translator.t,
    tPlural: translator.tPlural,
    format: createFormatters(DEFAULT_LOCALE),
  };
}

/**
 * Convenience hook returning just the translate functions, optionally scoped to
 * a namespace so call sites can write `t('signIn')` instead of `t('auth.signIn')`.
 */
export function useTranslations(namespace?: string): Translator {
  const { t, tPlural } = useI18n();
  return useMemo<Translator>(() => {
    if (!namespace) return { t, tPlural };
    const prefix = `${namespace}.`;
    return {
      t: (key: string, vars?: TranslateVars) => t(prefix + key, vars),
      tPlural: (key: string, count: number, vars?: TranslateVars) =>
        tPlural(prefix + key, count, vars),
    };
  }, [t, tPlural, namespace]);
}

/** Bound, locale-aware Intl formatters (dates, numbers, currency, relative). */
export function useFormatters(): Formatters {
  return useI18n().format;
}
