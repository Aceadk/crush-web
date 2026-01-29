/**
 * Promo Code Store
 * Manages promo code state and interactions
 */

import { create } from 'zustand';
import { promoCodeService } from '../services/promo';
import { PromoCodeValidationResult, ApplyPromoResult } from '../types/promo';

interface PromoCodeState {
  // State
  promoCode: string;
  validationResult: PromoCodeValidationResult | null;
  applyResult: ApplyPromoResult | null;
  isValidating: boolean;
  isApplying: boolean;
  error: string | null;

  // Actions
  setPromoCode: (code: string) => void;
  validatePromoCode: (code: string, userId: string, planId?: string) => Promise<PromoCodeValidationResult>;
  applyPromoCode: (code: string, userId: string, planId: string) => Promise<ApplyPromoResult>;
  clearPromoCode: () => void;
  clearError: () => void;
}

export const usePromoCodeStore = create<PromoCodeState>((set, get) => ({
  // Initial state
  promoCode: '',
  validationResult: null,
  applyResult: null,
  isValidating: false,
  isApplying: false,
  error: null,

  // Set promo code
  setPromoCode: (code: string) => {
    set({
      promoCode: code.toUpperCase(),
      validationResult: null,
      error: null,
    });
  },

  // Validate promo code
  validatePromoCode: async (code: string, userId: string, planId?: string) => {
    set({ isValidating: true, error: null });

    try {
      const result = await promoCodeService.validatePromoCode(code, userId, planId);
      set({
        validationResult: result,
        isValidating: false,
        error: result.isValid ? null : result.error || null,
      });
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to validate promo code';
      set({
        isValidating: false,
        error: errorMessage,
        validationResult: { isValid: false, error: errorMessage },
      });
      return { isValid: false, error: errorMessage };
    }
  },

  // Apply promo code
  applyPromoCode: async (code: string, userId: string, planId: string) => {
    set({ isApplying: true, error: null });

    try {
      const result = await promoCodeService.applyPromoCode(code, userId, planId);
      set({
        applyResult: result,
        isApplying: false,
        error: result.success ? null : result.error || null,
      });
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to apply promo code';
      set({
        isApplying: false,
        error: errorMessage,
        applyResult: { success: false, error: errorMessage },
      });
      return { success: false, error: errorMessage };
    }
  },

  // Clear promo code state
  clearPromoCode: () => {
    set({
      promoCode: '',
      validationResult: null,
      applyResult: null,
      error: null,
    });
  },

  // Clear error
  clearError: () => {
    set({ error: null });
  },
}));
