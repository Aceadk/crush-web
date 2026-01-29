/**
 * Promo Code Service
 * Handles validation, redemption, and premium activation via promo codes
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  addDoc,
  updateDoc,
  increment,
  Timestamp,
} from 'firebase/firestore';
import { getFirebaseDb } from '../firebase/config';
import {
  PromoCode,
  PromoCodeRedemption,
  PromoCodeValidationResult,
  ApplyPromoResult,
} from '../types/promo';

class PromoCodeService {
  private get db() {
    return getFirebaseDb();
  }

  /**
   * Validate a promo code without redeeming it
   */
  async validatePromoCode(
    code: string,
    userId: string,
    planId?: string
  ): Promise<PromoCodeValidationResult> {
    try {
      if (!this.db) {
        throw new Error('Database not initialized');
      }

      // Normalize code (uppercase, trim)
      const normalizedCode = code.trim().toUpperCase();

      // Find promo code by code string
      const promoCodesRef = collection(this.db, 'promoCodes');
      const q = query(promoCodesRef, where('code', '==', normalizedCode));
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        return {
          isValid: false,
          error: 'Invalid promo code',
        };
      }

      const promoDoc = snapshot.docs[0];
      const promoCode = { id: promoDoc.id, ...promoDoc.data() } as PromoCode;

      // Check if code is active
      if (!promoCode.isActive) {
        return {
          isValid: false,
          error: 'This promo code is no longer active',
        };
      }

      // Check validity dates
      const now = new Date();
      const validFrom = new Date(promoCode.validFrom);
      const validUntil = new Date(promoCode.validUntil);

      if (now < validFrom) {
        return {
          isValid: false,
          error: 'This promo code is not yet active',
        };
      }

      if (now > validUntil) {
        return {
          isValid: false,
          error: 'This promo code has expired',
        };
      }

      // Check max uses
      if (promoCode.maxUses && promoCode.usedCount >= promoCode.maxUses) {
        return {
          isValid: false,
          error: 'This promo code has reached its maximum uses',
        };
      }

      // Check if applicable to selected plan
      if (planId && promoCode.applicablePlans && promoCode.applicablePlans.length > 0) {
        if (!promoCode.applicablePlans.includes(planId as 'monthly' | 'quarterly' | 'yearly')) {
          return {
            isValid: false,
            error: 'This promo code is not valid for the selected plan',
          };
        }
      }

      // Check if user has already used this code
      const redemptionsRef = collection(this.db, 'promoCodeRedemptions');
      const userRedemptionQuery = query(
        redemptionsRef,
        where('userId', '==', userId),
        where('promoCodeId', '==', promoCode.id)
      );
      const userRedemptions = await getDocs(userRedemptionQuery);

      if (userRedemptions.size >= promoCode.maxUsesPerUser) {
        return {
          isValid: false,
          error: 'You have already used this promo code',
        };
      }

      // Code is valid
      return {
        isValid: true,
        promoCode,
        discountPercent: promoCode.discountPercent,
        isFreeAccess: promoCode.discountPercent === 100,
      };
    } catch (error) {
      console.error('Error validating promo code:', error);
      return {
        isValid: false,
        error: 'Failed to validate promo code. Please try again.',
      };
    }
  }

  /**
   * Apply a promo code - either activate premium instantly (100% discount)
   * or prepare for discounted checkout
   */
  async applyPromoCode(
    code: string,
    userId: string,
    planId: string
  ): Promise<ApplyPromoResult> {
    try {
      // First validate the code
      const validation = await this.validatePromoCode(code, userId, planId);

      if (!validation.isValid || !validation.promoCode) {
        return {
          success: false,
          error: validation.error || 'Invalid promo code',
        };
      }

      const promoCode = validation.promoCode;

      // If 100% discount, activate premium immediately
      if (promoCode.discountPercent === 100) {
        const activated = await this.activateFreePremuim(
          userId,
          promoCode,
          planId
        );

        if (activated) {
          return {
            success: true,
            isFreeAccess: true,
            discountPercent: 100,
            redirectToPayment: false,
          };
        } else {
          return {
            success: false,
            error: 'Failed to activate premium. Please try again.',
          };
        }
      }

      // For partial discounts, create a redemption record and redirect to payment
      // The checkout session will be created with the discount
      await this.createRedemptionRecord(userId, promoCode, planId, 'pending');

      return {
        success: true,
        isFreeAccess: false,
        discountPercent: promoCode.discountPercent,
        redirectToPayment: true,
      };
    } catch (error) {
      console.error('Error applying promo code:', error);
      return {
        success: false,
        error: 'Failed to apply promo code. Please try again.',
      };
    }
  }

  /**
   * Activate premium for free (100% discount promo code)
   */
  private async activateFreePremuim(
    userId: string,
    promoCode: PromoCode,
    planId: string
  ): Promise<boolean> {
    try {
      if (!this.db) {
        throw new Error('Database not initialized');
      }

      // Calculate premium duration based on plan
      const durationMonths = planId === 'yearly' ? 12 : planId === 'quarterly' ? 3 : 1;
      const premiumExpiresAt = new Date();
      premiumExpiresAt.setMonth(premiumExpiresAt.getMonth() + durationMonths);

      // Update user profile with premium status
      const userRef = doc(this.db, 'users', userId);
      await updateDoc(userRef, {
        isPremium: true,
        premiumPlan: planId,
        premiumExpiresAt: premiumExpiresAt.toISOString(),
        premiumAutoRenew: false, // No auto-renew for free promo codes
        premiumSource: 'promo_code',
        premiumPromoCode: promoCode.code,
        updatedAt: new Date().toISOString(),
      });

      // Create redemption record
      await this.createRedemptionRecord(userId, promoCode, planId, 'completed');

      // Increment usage count on promo code
      const promoCodeRef = doc(this.db, 'promoCodes', promoCode.id);
      await updateDoc(promoCodeRef, {
        usedCount: increment(1),
        updatedAt: new Date().toISOString(),
      });

      return true;
    } catch (error) {
      console.error('Error activating free premium:', error);
      return false;
    }
  }

  /**
   * Create a promo code redemption record
   */
  private async createRedemptionRecord(
    userId: string,
    promoCode: PromoCode,
    planId: string,
    status: PromoCodeRedemption['status']
  ): Promise<string | null> {
    try {
      if (!this.db) {
        throw new Error('Database not initialized');
      }

      const redemptionsRef = collection(this.db, 'promoCodeRedemptions');
      const redemption: Omit<PromoCodeRedemption, 'id'> = {
        userId,
        promoCodeId: promoCode.id,
        promoCode: promoCode.code,
        discountPercent: promoCode.discountPercent,
        planId,
        redeemedAt: new Date().toISOString(),
        status,
      };

      const docRef = await addDoc(redemptionsRef, redemption);
      return docRef.id;
    } catch (error) {
      console.error('Error creating redemption record:', error);
      return null;
    }
  }

  /**
   * Get user's promo code redemption history
   */
  async getUserRedemptions(userId: string): Promise<PromoCodeRedemption[]> {
    try {
      if (!this.db) {
        return [];
      }

      const redemptionsRef = collection(this.db, 'promoCodeRedemptions');
      const q = query(redemptionsRef, where('userId', '==', userId));
      const snapshot = await getDocs(q);

      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as PromoCodeRedemption[];
    } catch (error) {
      console.error('Error fetching user redemptions:', error);
      return [];
    }
  }

  /**
   * Get pending promo code for a user (for applying discount at checkout)
   */
  async getPendingPromoCode(userId: string): Promise<PromoCodeRedemption | null> {
    try {
      if (!this.db) {
        return null;
      }

      const redemptionsRef = collection(this.db, 'promoCodeRedemptions');
      const q = query(
        redemptionsRef,
        where('userId', '==', userId),
        where('status', '==', 'pending')
      );
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        return null;
      }

      // Return the most recent pending redemption
      const docs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as PromoCodeRedemption[];

      return docs.sort((a, b) =>
        new Date(b.redeemedAt).getTime() - new Date(a.redeemedAt).getTime()
      )[0];
    } catch (error) {
      console.error('Error fetching pending promo code:', error);
      return null;
    }
  }

  /**
   * Mark a pending redemption as applied (when checkout starts)
   */
  async markRedemptionApplied(redemptionId: string): Promise<void> {
    try {
      if (!this.db) return;

      const redemptionRef = doc(this.db, 'promoCodeRedemptions', redemptionId);
      await updateDoc(redemptionRef, {
        status: 'applied',
      });
    } catch (error) {
      console.error('Error marking redemption as applied:', error);
    }
  }

  /**
   * Complete a redemption (after successful payment)
   */
  async completeRedemption(
    redemptionId: string,
    promoCodeId: string
  ): Promise<void> {
    try {
      if (!this.db) return;

      // Update redemption status
      const redemptionRef = doc(this.db, 'promoCodeRedemptions', redemptionId);
      await updateDoc(redemptionRef, {
        status: 'completed',
      });

      // Increment usage count
      const promoCodeRef = doc(this.db, 'promoCodes', promoCodeId);
      await updateDoc(promoCodeRef, {
        usedCount: increment(1),
        updatedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error completing redemption:', error);
    }
  }
}

export const promoCodeService = new PromoCodeService();
