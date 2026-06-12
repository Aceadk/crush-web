/**
 * Entitlement resolver tests (P1 #7 of the web-mobile alignment audit).
 *
 * Verifies the canonical entitlement view derives correctly from the backend
 * `plan` field, with backward-compatible fallback to legacy web fields.
 */

import { describe, expect, it } from 'vitest';
import {
  resolveEntitlement,
  resolvePlan,
  resolveTier,
  isPremiumUser,
} from '@crush/core/services/entitlement';

describe('resolvePlan — canonical source of truth', () => {
  it('reads the backend plan field first', () => {
    expect(resolvePlan({ plan: 'plus' })).toBe('plus');
    expect(resolvePlan({ plan: 'free' })).toBe('free');
  });

  it('treats premium/platinum plan strings as plus', () => {
    expect(resolvePlan({ plan: 'premium' })).toBe('plus');
    expect(resolvePlan({ plan: 'platinum' })).toBe('plus');
    expect(resolvePlan({ plan: 'PLUS' })).toBe('plus');
  });

  it('falls back to legacy subscriptionTier when plan is absent', () => {
    expect(resolvePlan({ subscriptionTier: 'plus' })).toBe('plus');
    expect(resolvePlan({ subscriptionTier: 'platinum' })).toBe('plus');
    expect(resolvePlan({ subscriptionTier: 'free' })).toBe('free');
  });

  it('falls back to legacy isPremium boolean', () => {
    expect(resolvePlan({ isPremium: true })).toBe('plus');
    expect(resolvePlan({ isPremium: false })).toBe('free');
  });

  it('prefers canonical plan over legacy fields when both present', () => {
    // Backend says free; stale legacy says premium → trust backend.
    expect(resolvePlan({ plan: 'free', isPremium: true, subscriptionTier: 'plus' })).toBe(
      'free'
    );
    // Backend says plus; stale legacy says free → trust backend.
    expect(resolvePlan({ plan: 'plus', isPremium: false, subscriptionTier: 'free' })).toBe(
      'plus'
    );
  });

  it('defaults to free for empty/null/unknown', () => {
    expect(resolvePlan(null)).toBe('free');
    expect(resolvePlan(undefined)).toBe('free');
    expect(resolvePlan({})).toBe('free');
    expect(resolvePlan({ plan: 'garbage' })).toBe('free');
  });
});

describe('resolveTier — display tier', () => {
  it('preserves the web-only platinum marketing tier', () => {
    expect(resolveTier({ plan: 'plus', subscriptionTier: 'platinum' })).toBe('platinum');
  });

  it('mirrors the canonical plan otherwise', () => {
    expect(resolveTier({ plan: 'plus' })).toBe('plus');
    expect(resolveTier({ plan: 'free' })).toBe('free');
    expect(resolveTier({ isPremium: true })).toBe('plus');
  });
});

describe('isPremiumUser', () => {
  it('true only when entitled', () => {
    expect(isPremiumUser({ plan: 'plus' })).toBe(true);
    expect(isPremiumUser({ plan: 'free' })).toBe(false);
    expect(isPremiumUser({ isPremium: true })).toBe(true);
    expect(isPremiumUser(null)).toBe(false);
  });
});

describe('resolveEntitlement — full view', () => {
  it('derives isPremium + tier from plan', () => {
    const e = resolveEntitlement({ plan: 'plus' });
    expect(e).toMatchObject({ plan: 'plus', isPremium: true, tier: 'plus' });
  });

  it('reads expiry from subscriptionExpiresAt (preferred)', () => {
    const iso = '2026-12-31T00:00:00.000Z';
    const e = resolveEntitlement({ plan: 'plus', subscriptionExpiresAt: iso });
    expect(e.expiresAt).toBe(iso);
  });

  it('reads expiry from a Firestore Timestamp-like value', () => {
    const seconds = Math.floor(Date.parse('2026-06-30T00:00:00.000Z') / 1000);
    const e = resolveEntitlement({ plan: 'plus', subscriptionExpiresAt: { seconds } });
    expect(e.expiresAt).toBe('2026-06-30T00:00:00.000Z');
  });

  it('falls back to premiumExpiresAt then lifecycle.currentPeriodEnd', () => {
    expect(
      resolveEntitlement({ plan: 'plus', premiumExpiresAt: '2027-01-01T00:00:00.000Z' })
        .expiresAt
    ).toBe('2027-01-01T00:00:00.000Z');
    expect(
      resolveEntitlement({
        plan: 'plus',
        subscriptionLifecycle: { currentPeriodEnd: '2027-02-02T00:00:00.000Z' },
      }).expiresAt
    ).toBe('2027-02-02T00:00:00.000Z');
  });

  it('surfaces lifecycle status and cancelAtPeriodEnd', () => {
    const e = resolveEntitlement({
      plan: 'plus',
      subscriptionLifecycle: { status: 'active', cancelAtPeriodEnd: true },
    });
    expect(e.status).toBe('active');
    expect(e.cancelAtPeriodEnd).toBe(true);
  });

  it('cancelled/expired backend plan resolves to free regardless of legacy flags', () => {
    const e = resolveEntitlement({ plan: 'free', isPremium: true });
    expect(e).toMatchObject({ plan: 'free', isPremium: false, tier: 'free' });
  });
});
