'use client';

/**
 * React i18n context + hook.
 *
 * Provides the active locale and a bound translator to client components.
 * Defaults to English; pass a `locale` to switch (e.g. resolved from a cookie or
 * the Accept-Language header at the layout level). No routing is involved.
 */

import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from 'react';
import { DEFAULT_LOCALE, isRtlLocale, type Locale } from './locales';
import { getMessages } from './messages';
import { createTranslator, type Translator, type TranslateVars } from './translate';

interface I18nContextValue extends Translator {
  locale: Locale;
  isRtl: boolean;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export interface I18nProviderProps {
  locale?: Locale;
  children: ReactNode;
}

export function I18nProvider({
  locale = DEFAULT_LOCALE,
  children,
}: I18nProviderProps) {
  const value = useMemo<I18nContextValue>(() => {
    const translator = createTranslator(getMessages(locale));
    return {
      locale,
      isRtl: isRtlLocale(locale),
      t: translator.t,
      tPlural: translator.tPlural,
    };
  }, [locale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

/**
 * Access the active translator. Falls back to an English translator if used
 * outside a provider, so components never crash for a missing provider during
 * incremental adoption.
 */
export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (ctx) return ctx;
  const translator = createTranslator(getMessages(DEFAULT_LOCALE));
  return {
    locale: DEFAULT_LOCALE,
    isRtl: false,
    t: translator.t,
    tPlural: translator.tPlural,
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
