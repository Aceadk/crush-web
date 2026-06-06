/**
 * Web i18n foundation (P2 #11).
 *
 * Usage in a client component:
 *   import { useTranslations } from '@/i18n';
 *   const t = useTranslations('auth');
 *   <button>{t.t('signIn')}</button>
 *
 * Wrap the app (or a subtree) once:
 *   import { I18nProvider } from '@/i18n';
 *   <I18nProvider locale={locale}>{children}</I18nProvider>
 */

export {
  DEFAULT_LOCALE,
  KNOWN_LOCALES,
  RTL_LOCALES,
  isRtlLocale,
  isKnownLocale,
  resolveLocale,
  type Locale,
} from './locales';

export { getMessages, hasCatalog, en, type Messages } from './messages';

export {
  translate,
  translatePlural,
  createTranslator,
  type Translator,
  type TranslateVars,
} from './translate';

export {
  I18nProvider,
  useI18n,
  useTranslations,
  type I18nProviderProps,
} from './I18nProvider';
