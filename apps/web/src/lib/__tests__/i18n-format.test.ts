/**
 * Locale-aware formatter tests (Phase 8 Step 18) — dates, numbers, currency,
 * and relative time via Intl, bound per locale.
 */

import { describe, it, expect } from 'vitest';
import { createFormatters } from '@/i18n/format';

describe('createFormatters — currency', () => {
  it('formats currency per locale', () => {
    const en = createFormatters('en');
    // en-US groups with commas and prefixes the symbol.
    expect(en.currency(9.99)).toBe('$9.99');
    expect(en.currency(1234.5, 'USD')).toBe('$1,234.50');
  });

  it('honors a different currency code', () => {
    const en = createFormatters('en');
    const eur = en.currency(10, 'EUR');
    expect(eur).toContain('10');
    expect(eur).toContain('€');
  });
});

describe('createFormatters — number', () => {
  it('groups thousands per locale', () => {
    expect(createFormatters('en').number(1234567.89)).toBe('1,234,567.89');
    // German uses a different grouping/decimal separator.
    expect(createFormatters('de').number(1234.5)).toBe('1.234,5');
  });
});

describe('createFormatters — date', () => {
  it('formats a date with an explicit medium style', () => {
    const d = new Date('2026-06-07T12:00:00Z');
    const out = createFormatters('en').date(d, {
      dateStyle: 'medium',
      timeZone: 'UTC',
    });
    expect(out).toContain('2026');
    expect(out).toMatch(/Jun/);
  });

  it('uses medium style by default (no options)', () => {
    const out = createFormatters('en').date(new Date('2026-06-07T12:00:00Z'));
    expect(out).toContain('2026');
  });

  it('accepts epoch + ISO string inputs', () => {
    const iso = '2026-01-15T00:00:00Z';
    const f = createFormatters('en');
    expect(f.date(iso, { timeZone: 'UTC', year: 'numeric' })).toBe('2026');
    expect(f.date(Date.parse(iso), { timeZone: 'UTC', year: 'numeric' })).toBe(
      '2026'
    );
  });
});

describe('createFormatters — relativeTime', () => {
  const now = new Date('2026-06-07T12:00:00Z');
  const f = createFormatters('en');

  it('picks the largest sensible unit, past and future', () => {
    expect(f.relativeTime(new Date('2026-06-07T11:58:00Z'), now)).toBe(
      '2 minutes ago'
    );
    expect(f.relativeTime(new Date('2026-06-07T10:00:00Z'), now)).toBe(
      '2 hours ago'
    );
    expect(f.relativeTime(new Date('2026-06-04T12:00:00Z'), now)).toBe(
      '3 days ago'
    );
    expect(f.relativeTime(new Date('2026-06-10T12:00:00Z'), now)).toBe(
      'in 3 days'
    );
  });

  it('uses "auto" numeric phrasing for tomorrow/yesterday', () => {
    expect(f.relativeTime(new Date('2026-06-06T12:00:00Z'), now)).toBe(
      'yesterday'
    );
    expect(f.relativeTime(new Date('2026-06-08T12:00:00Z'), now)).toBe(
      'tomorrow'
    );
  });
});
