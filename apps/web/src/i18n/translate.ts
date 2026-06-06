/**
 * Pure translation engine — no React, fully unit-testable.
 *
 * - Dot-notation key lookup into a nested catalog ('auth.signIn').
 * - `{placeholder}` interpolation (matches mobile ARB convention).
 * - Falls back to the English catalog for missing keys, then to the key itself.
 * - Simple pluralization via `_one` / `_other` key suffixes.
 */

import { en, type Messages } from './messages/en';

export type TranslateVars = Record<string, string | number>;

function resolvePath(source: unknown, key: string): unknown {
  return key
    .split('.')
    .reduce<unknown>((acc, part) => {
      if (acc && typeof acc === 'object' && part in (acc as object)) {
        return (acc as Record<string, unknown>)[part];
      }
      return undefined;
    }, source);
}

function interpolate(template: string, vars?: TranslateVars): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) => {
    const value = vars[name];
    return value === undefined ? match : String(value);
  });
}

/**
 * Resolve a key against a catalog, falling back to English then to the key.
 */
export function translate(
  messages: Messages,
  key: string,
  vars?: TranslateVars
): string {
  const raw = resolvePath(messages, key) ?? resolvePath(en, key);
  if (typeof raw !== 'string') {
    // Missing in both the active and English catalogs — surface the key so the
    // gap is visible rather than rendering blank.
    return key;
  }
  return interpolate(raw, vars);
}

/**
 * English plural rule (one vs other) — sufficient for en and a sensible default
 * for locales without bespoke rules. Looks up `{key}_one` / `{key}_other`.
 */
export function translatePlural(
  messages: Messages,
  key: string,
  count: number,
  vars?: TranslateVars
): string {
  const suffix = count === 1 ? 'one' : 'other';
  const mergedVars = { count, ...vars };
  const pluralKey = `${key}_${suffix}`;
  const resolved = resolvePath(messages, pluralKey) ?? resolvePath(en, pluralKey);
  if (typeof resolved === 'string') {
    return interpolate(resolved, mergedVars);
  }
  // Fall back to the base key if no plural variants exist.
  return translate(messages, key, mergedVars);
}

/** A bound translator for a specific catalog. */
export interface Translator {
  t: (key: string, vars?: TranslateVars) => string;
  tPlural: (key: string, count: number, vars?: TranslateVars) => string;
}

export function createTranslator(messages: Messages): Translator {
  return {
    t: (key, vars) => translate(messages, key, vars),
    tPlural: (key, count, vars) => translatePlural(messages, key, count, vars),
  };
}
