/**
 * Promo Code Service
 *
 * Validation and redemption are SERVER-OWNED: they run through the
 * validatePromoCode / redeemPromoCode Cloud Functions callables. Promo
 * redemption can grant premium, and the Firestore rules reject client writes to
 * promoCodes / promoCodeRedemptions and to the entitlement fields — so a client
 * cannot self-grant premium via a promo code.
 *
 * The read/history helpers below degrade gracefully (return empty / no-op) where
 * the rules do not permit direct client access.
 */

import { errorText } from '../utils/errors';
import {
  collection,
  doc,
  getDocs,
  query,
  where,
  updateDoc,
  increment,
} from 'firebase/firestore';
import { getFirebaseDb } from '../firebase/config';
import { callables } from '../api/callables';
import {
  PromoCodeRedemption,
  PromoCodeValidationResult,
  ApplyPromoResult,
} from '../types/promo';

class PromoCodeService {
  private get db() {
    return getFirebaseDb();
  }

  /**
   * Validate a promo code without redeeming it (server-owned, read-only).
   */
  async validatePromoCode(
    code: string,
    _userId?: string,
    planId?: string
  ): Promise<PromoCodeValidationResult> {
    try {
      const result = await callables.validatePromoCode({ code, planId });
      if (!result.isValid) {
        return { isValid: false, error: result.error ?? 'Invalid promo code' };
      }
      return {
        isValid: true,
        discountPercent: result.discountPercent,
        isFreeAccess: result.isFreeAccess,
      };
    } catch (error) {
      const message =
        errorText(error, 'Failed to validate promo code.');
      return { isValid: false, error: message };
    }
  }

  /**
   * Apply a promo code via the server-owned redeemPromoCode callable. A
   * free-access (100%) code grants premium server-side; partial discounts return
   * the discount for a discounted checkout.
   */
  async applyPromoCode(
    code: string,
    _userId: string,
    planId: string
  ): Promise<ApplyPromoResult> {
    try {
      const result = await callables.redeemPromoCode({ code, planId });
      return {
        success: true,
        isFreeAccess: result.isFreeAccess,
        discountPercent: result.discountPercent,
        redirectToPayment: !result.isFreeAccess,
      };
    } catch (error) {
      const message =
        errorText(error, 'Failed to apply promo code.');
      return { success: false, error: message };
    }
  }

  /**
   * Get the user's promo redemption history. Returns [] where direct reads are
   * not permitted by the rules.
   */
  async getUserRedemptions(userId: string): Promise<PromoCodeRedemption[]> {
    try {
      if (!this.db) {
        return [];
      }

      const redemptionsRef = collection(this.db, 'promoCodeRedemptions');
      const q = query(redemptionsRef, where('userId', '==', userId));
      const snapshot = await getDocs(q);

      return snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as PromoCodeRedemption[];
    } catch (error) {
      console.error('Error fetching user redemptions:', error);
      return [];
    }
  }

  /**
   * Get a pending promo code for a user (for applying a discount at checkout).
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

      const docs = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as PromoCodeRedemption[];

      return docs.sort(
        (a, b) =>
          new Date(b.redeemedAt).getTime() - new Date(a.redeemedAt).getTime()
      )[0];
    } catch (error) {
      console.error('Error fetching pending promo code:', error);
      return null;
    }
  }

  /**
   * Mark a pending redemption as applied (when checkout starts).
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
   * Complete a redemption (after successful payment).
   */
  async completeRedemption(
    redemptionId: string,
    promoCodeId: string
  ): Promise<void> {
    try {
      if (!this.db) return;

      const redemptionRef = doc(this.db, 'promoCodeRedemptions', redemptionId);
      await updateDoc(redemptionRef, {
        status: 'completed',
      });

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
