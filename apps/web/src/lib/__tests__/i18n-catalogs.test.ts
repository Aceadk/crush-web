/**
 * Catalog completeness + auth-error key parity (Phase 8 Step 18).
 *
 * The `Messages` type enforces top-level key parity at compile time; this test
 * additionally guards DEEP key parity (nested/plural keys) at runtime and that
 * shipped catalogs have no empty strings, so a translated catalog can never
 * silently drop or blank a key.
 */

import { describe, it, expect } from 'vitest';
import { en } from '@/i18n/messages/en';
import { es } from '@/i18n/messages/es';
import { ar } from '@/i18n/messages/ar';
import { getAuthErrorKey } from '@crush/core';

type AnyRecord = Record<string, unknown>;

function flatten(obj: AnyRecord, prefix = ''): string[] {
  return Object.entries(obj).flatMap(([k, v]) => {
    const key = prefix ? `${prefix}.${k}` : k;
    return v && typeof v === 'object'
      ? flatten(v as AnyRecord, key)
      : [key];
  });
}

const enKeys = flatten(en).sort();

describe.each([
  ['es', es],
  ['ar', ar],
])('catalog %s', (name, catalog) => {
  const keys = flatten(catalog as unknown as AnyRecord).sort();

  it('has exactly the same key set as English', () => {
    const missing = enKeys.filter((k) => !keys.includes(k));
    const extra = keys.filter((k) => !enKeys.includes(k));
    expect(missing, `${name} missing: ${missing.join(', ')}`).toEqual([]);
    expect(extra, `${name} extra: ${extra.join(', ')}`).toEqual([]);
  });

  it('has no empty values', () => {
    const walk = (obj: AnyRecord, prefix = ''): string[] =>
      Object.entries(obj).flatMap(([k, v]) => {
        const key = prefix ? `${prefix}.${k}` : k;
        if (v && typeof v === 'object') return walk(v as AnyRecord, key);
        return typeof v === 'string' && v.trim() === '' ? [key] : [];
      });
    const blank = walk(catalog as unknown as AnyRecord);
    expect(blank, `${name} blank values: ${blank.join(', ')}`).toEqual([]);
  });

  it('introduces no placeholder tokens absent from English', () => {
    // A translation may legitimately OMIT a placeholder (e.g. Arabic singular
    // plural forms drop {count}), but must never reference a token English does
    // not supply — that would render the literal "{foo}" to users.
    const placeholders = (s: string) =>
      new Set((s.match(/\{(\w+)\}/g) ?? []));
    const get = (obj: AnyRecord, path: string): string | undefined =>
      path.split('.').reduce<unknown>((a, p) => (a as AnyRecord)?.[p], obj) as
        | string
        | undefined;
    const offenders = enKeys.filter((k) => {
      const enV = get(en as unknown as AnyRecord, k);
      const trV = get(catalog as unknown as AnyRecord, k);
      if (typeof enV !== 'string' || typeof trV !== 'string') return false;
      const enSet = placeholders(enV);
      return [...placeholders(trV)].some((tok) => !enSet.has(tok));
    });
    expect(
      offenders,
      `${name} has unknown placeholders: ${offenders.join(', ')}`
    ).toEqual([]);
  });
});

describe('getAuthErrorKey ↔ authErrors catalog', () => {
  it('returns a key that resolves in every shipped catalog', () => {
    const key = getAuthErrorKey({ code: 'auth/wrong-password' });
    expect(key).toBe('authErrors.wrong-password');
    const sub = key!.split('.')[1];
    expect((en.authErrors as Record<string, string>)[sub]).toBeTruthy();
    expect((es.authErrors as Record<string, string>)[sub]).toBeTruthy();
    expect((ar.authErrors as Record<string, string>)[sub]).toBeTruthy();
  });

  it('normalizes functions/* and bare codes', () => {
    expect(getAuthErrorKey({ code: 'functions/permission-denied' })).toBe(
      'authErrors.permission-denied'
    );
    expect(getAuthErrorKey({ code: 'unauthenticated' })).toBe(
      'authErrors.unauthenticated'
    );
  });

  it('returns null for unmapped/missing codes', () => {
    expect(getAuthErrorKey({ code: 'auth/some-new-code' })).toBeNull();
    expect(getAuthErrorKey(new Error('no code'))).toBeNull();
    expect(getAuthErrorKey(null)).toBeNull();
  });
});
