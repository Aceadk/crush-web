/**
 * Promo server-ownership test (Phase 4 Step 6).
 *
 * Verifies validate/apply route through the backend callables (which own
 * validation + the premium grant) instead of direct Firestore reads/writes the
 * rules reject — so a client cannot self-grant premium via a promo code.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const { callableMock } = vi.hoisted(() => ({
  callableMock: {
    validatePromoCode: vi.fn(),
    redeemPromoCode: vi.fn(),
  },
}));

vi.mock('@crush/core/api/callables', () => ({ callables: callableMock }));
vi.mock('@crush/core/firebase/config', () => ({ getFirebaseDb: () => ({}) }));
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  doc: vi.fn(),
  getDocs: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  updateDoc: vi.fn(),
  increment: vi.fn(),
}));

import { promoCodeService } from '@crush/core/services/promo';

describe('promoCodeService — server-owned validation/redemption', () => {
  beforeEach(() => vi.clearAllMocks());

  it('validatePromoCode routes to the callable and maps a valid result', async () => {
    callableMock.validatePromoCode.mockResolvedValue({
      ok: true,
      isValid: true,
      discountPercent: 100,
      isFreeAccess: true,
    });
    const result = await promoCodeService.validatePromoCode('CRUSH100', 'viewer', 'monthly');
    expect(callableMock.validatePromoCode).toHaveBeenCalledWith({
      code: 'CRUSH100',
      planId: 'monthly',
    });
    expect(result).toMatchObject({ isValid: true, discountPercent: 100, isFreeAccess: true });
  });

  it('validatePromoCode maps an invalid result with the error', async () => {
    callableMock.validatePromoCode.mockResolvedValue({
      ok: true,
      isValid: false,
      error: 'This promo code has expired.',
    });
    const result = await promoCodeService.validatePromoCode('OLD', 'viewer');
    expect(result).toEqual({ isValid: false, error: 'This promo code has expired.' });
  });

  it('applyPromoCode redeems a free-access code (no checkout redirect)', async () => {
    callableMock.redeemPromoCode.mockResolvedValue({
      ok: true,
      isFreeAccess: true,
      discountPercent: 100,
    });
    const result = await promoCodeService.applyPromoCode('CRUSH100', 'viewer', 'yearly');
    expect(callableMock.redeemPromoCode).toHaveBeenCalledWith({
      code: 'CRUSH100',
      planId: 'yearly',
    });
    expect(result).toMatchObject({
      success: true,
      isFreeAccess: true,
      redirectToPayment: false,
    });
  });

  it('applyPromoCode for a partial discount redirects to payment', async () => {
    callableMock.redeemPromoCode.mockResolvedValue({
      ok: true,
      isFreeAccess: false,
      discountPercent: 50,
    });
    const result = await promoCodeService.applyPromoCode('HALF', 'viewer', 'monthly');
    expect(result).toMatchObject({
      success: true,
      isFreeAccess: false,
      discountPercent: 50,
      redirectToPayment: true,
    });
  });

  it('applyPromoCode surfaces backend errors (e.g. already used)', async () => {
    callableMock.redeemPromoCode.mockRejectedValue(
      new Error('You have already used this promo code.')
    );
    const result = await promoCodeService.applyPromoCode('CRUSH100', 'viewer', 'monthly');
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/already used/i);
  });
});
