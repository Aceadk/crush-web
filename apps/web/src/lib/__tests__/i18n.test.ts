/**
 * i18n foundation tests (P2 #11).
 *
 * Covers the pure translation engine: nested key lookup, interpolation,
 * pluralization, English fallback, and locale resolution.
 */

import { describe, expect, it } from 'vitest';
import {
  translate,
  translatePlural,
  createTranslator,
} from '@/i18n/translate';
import { getMessages, hasCatalog } from '@/i18n/messages';
import {
  resolveLocale,
  isKnownLocale,
  isRtlLocale,
  DEFAULT_LOCALE,
} from '@/i18n/locales';
import { en } from '@/i18n/messages/en';

describe('translate — key lookup', () => {
  it('resolves nested dot-notation keys', () => {
    expect(translate(en, 'auth.signIn')).toBe('Sign in');
    expect(translate(en, 'nav.discover')).toBe('Discover');
    expect(translate(en, 'common.appName')).toBe('Crush');
  });

  it('returns the key itself when missing entirely', () => {
    expect(translate(en, 'does.not.exist')).toBe('does.not.exist');
  });

  it('interpolates {placeholder} vars', () => {
    expect(translate(en, 'discovery.distanceAway', { distance: 5 })).toBe(
      '5 km away'
    );
    expect(translate(en, 'discovery.matchBody', { name: 'Sam' })).toBe(
      'You and Sam liked each other.'
    );
  });

  it('leaves unmatched placeholders intact', () => {
    expect(translate(en, 'discovery.matchBody')).toBe(
      'You and {name} liked each other.'
    );
  });
});

describe('translatePlural', () => {
  it('selects the one/other variant by count and injects count', () => {
    expect(translatePlural(en, 'time.minutesAgo', 1)).toBe('1 minute ago');
    expect(translatePlural(en, 'time.minutesAgo', 5)).toBe('5 minutes ago');
    expect(translatePlural(en, 'time.hoursAgo', 1)).toBe('1 hour ago');
    expect(translatePlural(en, 'time.daysAgo', 3)).toBe('3 days ago');
  });

  it('merges extra vars alongside count', () => {
    // base key has no plural variants → falls back to translate(base)
    expect(translatePlural(en, 'common.appName', 2)).toBe('Crush');
  });
});

describe('English fallback for partial catalogs', () => {
  it('falls back to en when the active catalog lacks a key', () => {
    // Simulate a partial Spanish catalog with only one key translated.
    const partial = {
      ...en,
      auth: { ...en.auth, signIn: 'Iniciar sesión' },
    };
    // Translated key uses the override…
    expect(translate(partial, 'auth.signIn')).toBe('Iniciar sesión');
    // …and an untouched key still resolves (here still English).
    expect(translate(partial, 'nav.discover')).toBe('Discover');
  });
});

describe('createTranslator', () => {
  it('binds a catalog into t / tPlural', () => {
    const { t, tPlural } = createTranslator(en);
    expect(t('auth.or')).toBe('or');
    expect(tPlural('time.minutesAgo', 1)).toBe('1 minute ago');
  });
});

describe('catalog registry', () => {
  it('returns the en catalog and reports availability', () => {
    expect(getMessages('en')).toBe(en);
    expect(hasCatalog('en')).toBe(true);
  });

  it('returns shipped non-English catalogs', () => {
    // es + ar are shipped (Phase 8 Step 18).
    expect(hasCatalog('es')).toBe(true);
    expect(hasCatalog('ar')).toBe(true);
    expect(getMessages('es')).not.toBe(en);
    expect(getMessages('ar')).not.toBe(en);
  });

  it('falls back to en for known-but-unshipped locales', () => {
    // A locale on the roadmap whose catalog has not shipped yet.
    expect(getMessages('fr')).toBe(en);
    expect(hasCatalog('fr')).toBe(false);
  });
});

describe('locale resolution', () => {
  it('resolves region tags to the base locale', () => {
    expect(resolveLocale('en-US')).toBe('en');
    expect(resolveLocale('es-419')).toBe('es');
    expect(resolveLocale('AR')).toBe('ar');
  });

  it('falls back to default for unknown/empty', () => {
    expect(resolveLocale('zz')).toBe(DEFAULT_LOCALE);
    expect(resolveLocale('')).toBe(DEFAULT_LOCALE);
    expect(resolveLocale(null)).toBe(DEFAULT_LOCALE);
  });

  it('recognizes known locales and RTL', () => {
    expect(isKnownLocale('fr')).toBe(true);
    expect(isKnownLocale('zz')).toBe(false);
    expect(isRtlLocale('ar')).toBe(true);
    expect(isRtlLocale('ur')).toBe(true);
    expect(isRtlLocale('en')).toBe(false);
  });
});
