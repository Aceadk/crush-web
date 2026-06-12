/**
 * Message catalog registry.
 *
 * `en` is the source of truth. Additional locales are added here as their
 * catalogs ship; until then `getMessages` falls back to English so the UI is
 * always fully populated.
 */

import type { Locale } from '../locales';
import { en, type Messages } from './en';
import { es } from './es';
import { ar } from './ar';

/**
 * Registry of shipped catalogs. Partial<Messages> is allowed for non-English
 * catalogs during incremental translation; missing keys fall back to English
 * at lookup time (see translate.ts).
 */
const CATALOGS: Partial<Record<Locale, Messages>> = {
  en,
  es, // Spanish (LTR)
  ar, // Arabic (RTL) — also exercises directional layout
  // ← add more locale catalogs here as they are translated
};

/** Returns the catalog for a locale, or the English catalog as a fallback. */
export function getMessages(locale: Locale): Messages {
  return CATALOGS[locale] ?? en;
}

/** Whether a fully-shipped catalog exists for this locale (vs. en fallback). */
export function hasCatalog(locale: Locale): boolean {
  return Boolean(CATALOGS[locale]);
}

export { en };
export type { Messages };
