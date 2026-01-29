/**
 * Promo Code types for premium subscriptions
 */

export interface PromoCode {
  id: string;
  code: string; // The actual promo code (e.g., "CRUSH100", "LAUNCH50")
  discountPercent: number; // 0-100
  discountType: 'percentage' | 'fixed';
  fixedAmount?: number; // For fixed discounts
  maxUses?: number; // Max total uses (null = unlimited)
  usedCount: number; // Current usage count
  maxUsesPerUser: number; // Usually 1
  validFrom: string; // ISO date
  validUntil: string; // ISO date
  isActive: boolean;
  applicablePlans?: ('monthly' | 'quarterly' | 'yearly')[]; // null = all plans
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PromoCodeRedemption {
  id: string;
  userId: string;
  promoCodeId: string;
  promoCode: string; // The actual code string
  discountPercent: number;
  discountAmount?: number; // Final discount amount in cents
  originalAmount?: number; // Original price in cents
  finalAmount?: number; // Final price after discount
  planId: string;
  redeemedAt: string;
  status: 'pending' | 'applied' | 'completed' | 'expired';
}

export interface PromoCodeValidationResult {
  isValid: boolean;
  promoCode?: PromoCode;
  error?: string;
  discountPercent?: number;
  isFreeAccess?: boolean; // true if 100% discount
}

export interface ApplyPromoResult {
  success: boolean;
  error?: string;
  isFreeAccess?: boolean;
  discountPercent?: number;
  redirectToPayment?: boolean;
  checkoutUrl?: string;
}
