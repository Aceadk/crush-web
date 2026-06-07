/**
 * Locale-aware formatting (Phase 8 Step 18) — dates, numbers, currency, and
 * relative time via the platform `Intl` APIs. Pure and unit-testable; bound to
 * a locale by `createFormatters` and surfaced through `useFormatters`.
 */

import type { Locale } from './locales';

export interface Formatters {
  /** e.g. "Jun 7, 2026" (medium date by default). */
  date: (value: Date | number | string, options?: Intl.DateTimeFormatOptions) => string;
  /** e.g. "Jun 7, 2026, 3:20 PM". */
  dateTime: (value: Date | number | string, options?: Intl.DateTimeFormatOptions) => string;
  /** e.g. "1,234.5". */
  number: (value: number, options?: Intl.NumberFormatOptions) => string;
  /** e.g. "$9.99" — currency is an ISO 4217 code (default USD). */
  currency: (value: number, currency?: string, options?: Intl.NumberFormatOptions) => string;
  /** e.g. "2 hours ago" / "in 3 days" — auto-picks the largest sensible unit. */
  relativeTime: (value: Date | number | string, now?: Date | number) => string;
}

function toDate(value: Date | number | string): Date {
  return value instanceof Date ? value : new Date(value);
}

const RELATIVE_UNITS: Array<[Intl.RelativeTimeFormatUnit, number]> = [
  ['year', 60 * 60 * 24 * 365],
  ['month', 60 * 60 * 24 * 30],
  ['week', 60 * 60 * 24 * 7],
  ['day', 60 * 60 * 24],
  ['hour', 60 * 60],
  ['minute', 60],
  ['second', 1],
];

export function createFormatters(locale: Locale): Formatters {
  const dateFmt = (options?: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat(locale, options);
  const numberFmt = (options?: Intl.NumberFormatOptions) =>
    new Intl.NumberFormat(locale, options);
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });

  return {
    date: (value, options) =>
      dateFmt(options ?? { dateStyle: 'medium' }).format(toDate(value)),
    dateTime: (value, options) =>
      dateFmt(options ?? { dateStyle: 'medium', timeStyle: 'short' }).format(
        toDate(value)
      ),
    number: (value, options) => numberFmt(options).format(value),
    currency: (value, currency = 'USD', options) =>
      numberFmt({ style: 'currency', currency, ...options }).format(value),
    relativeTime: (value, now) => {
      const target = toDate(value).getTime();
      const base = now ? toDate(now).getTime() : Date.now();
      const diffSeconds = Math.round((target - base) / 1000);
      const abs = Math.abs(diffSeconds);
      for (const [unit, secondsInUnit] of RELATIVE_UNITS) {
        if (abs >= secondsInUnit || unit === 'second') {
          const amount = Math.round(diffSeconds / secondsInUnit);
          return rtf.format(amount, unit);
        }
      }
      return rtf.format(0, 'second');
    },
  };
}
