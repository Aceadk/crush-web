/**
 * Streak Service - Manages user streaks and like limits
 */

import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { getFirebaseDb } from '../firebase/config';
import {
  StreakData,
  LikeLimitInfo,
  StreakInfo,
  DEFAULT_STREAK_DATA,
  BASE_DAILY_LIKES,
  MAX_DAILY_LIKES,
  LIKES_RESET_HOURS,
  calculateStreakBonus,
  calculateTotalAllowedLikes,
  getCurrentMilestone,
  getNextMilestone,
} from '../types/streak';

class StreakService {
  private collection = 'user_streaks';

  /**
   * Get or create streak data for a user
   */
  async getStreakData(userId: string): Promise<StreakData> {
    try {
      const docRef = doc(getFirebaseDb(), this.collection, userId);
      const snapshot = await getDoc(docRef);

      if (!snapshot.exists()) {
        // Create initial streak data
        const initialData: StreakData = {
          ...DEFAULT_STREAK_DATA,
          userId,
        };
        await setDoc(docRef, initialData);
        return initialData;
      }

      return { ...snapshot.data(), userId } as StreakData;
    } catch (error) {
      console.error('Error getting streak data:', error);
      throw error;
    }
  }

  /**
   * Check if likes should be reset (new day)
   */
  private shouldResetLikes(streakData: StreakData): boolean {
    const resetAt = new Date(streakData.likesResetAt);
    return new Date() >= resetAt;
  }

  /**
   * Check if streak should be updated
   */
  private checkStreakStatus(streakData: StreakData): {
    shouldIncrement: boolean;
    shouldReset: boolean;
    isNewDay: boolean;
  } {
    const lastActivity = new Date(streakData.lastActivityDate);
    const now = new Date();

    // Get dates without time
    const lastActivityDate = new Date(lastActivity.getFullYear(), lastActivity.getMonth(), lastActivity.getDate());
    const todayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterdayDate = new Date(todayDate);
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);

    const daysDiff = Math.floor((todayDate.getTime() - lastActivityDate.getTime()) / (1000 * 60 * 60 * 24));

    return {
      shouldIncrement: daysDiff === 1, // Exactly 1 day since last activity
      shouldReset: daysDiff > 1, // More than 1 day - streak broken
      isNewDay: daysDiff >= 1, // It's a new day
    };
  }

  /**
   * Record daily activity and update streak
   */
  async recordActivity(userId: string): Promise<{
    streakData: StreakData;
    streakIncremented: boolean;
    isNewRecord: boolean;
    streakBroken: boolean;
  }> {
    try {
      const streakData = await this.getStreakData(userId);
      const { shouldIncrement, shouldReset, isNewDay } = this.checkStreakStatus(streakData);

      const now = new Date();
      let newStreak = streakData.currentStreak;
      let longestStreak = streakData.longestStreak;
      let streakStartDate = streakData.streakStartDate;
      let streakIncremented = false;
      let isNewRecord = false;
      let streakBroken = false;

      if (shouldReset) {
        // Streak broken - start fresh
        newStreak = 1;
        streakStartDate = now.toISOString();
        streakBroken = true;
      } else if (shouldIncrement) {
        // Continue streak
        newStreak = streakData.currentStreak + 1;
        streakIncremented = true;

        if (newStreak > longestStreak) {
          longestStreak = newStreak;
          isNewRecord = true;
        }
      } else if (!isNewDay) {
        // Same day - just update last activity
        // No streak change needed
      } else {
        // First activity ever or first of new streak
        newStreak = 1;
        streakStartDate = now.toISOString();
      }

      // Reset likes if needed
      let likesToday = streakData.likesToday;
      let likesResetAt = streakData.likesResetAt;

      if (this.shouldResetLikes(streakData)) {
        likesToday = 0;
        likesResetAt = new Date(now.getTime() + LIKES_RESET_HOURS * 60 * 60 * 1000).toISOString();
      }

      const updatedData: StreakData = {
        ...streakData,
        currentStreak: newStreak,
        longestStreak,
        lastActivityDate: now.toISOString(),
        streakStartDate,
        likesToday,
        likesResetAt,
        updatedAt: now.toISOString(),
      };

      // Update Firestore
      const docRef = doc(getFirebaseDb(), this.collection, userId);
      await updateDoc(docRef, {
        ...updatedData,
        updatedAt: serverTimestamp(),
      });

      return {
        streakData: updatedData,
        streakIncremented,
        isNewRecord,
        streakBroken,
      };
    } catch (error) {
      console.error('Error recording activity:', error);
      throw error;
    }
  }

  /**
   * Use a like and update count
   */
  async useLike(userId: string, isPremium: boolean): Promise<{
    success: boolean;
    limitInfo: LikeLimitInfo;
    error?: string;
  }> {
    try {
      const streakData = await this.getStreakData(userId);
      const now = new Date();

      // Reset likes if needed
      let likesToday = streakData.likesToday;
      let likesResetAt = streakData.likesResetAt;

      if (this.shouldResetLikes(streakData)) {
        likesToday = 0;
        likesResetAt = new Date(now.getTime() + LIKES_RESET_HOURS * 60 * 60 * 1000).toISOString();
      }

      // Calculate limits
      const totalAllowed = calculateTotalAllowedLikes(streakData.currentStreak, isPremium);
      const remaining = isPremium ? Infinity : totalAllowed - likesToday;

      if (!isPremium && remaining <= 0) {
        return {
          success: false,
          limitInfo: this.buildLimitInfo(streakData, isPremium, likesToday, likesResetAt),
          error: 'Daily like limit reached',
        };
      }

      // Increment likes used
      likesToday++;

      // Update Firestore
      const docRef = doc(getFirebaseDb(), this.collection, userId);
      await updateDoc(docRef, {
        likesToday,
        likesResetAt,
        lastActivityDate: now.toISOString(),
        updatedAt: serverTimestamp(),
      });

      return {
        success: true,
        limitInfo: this.buildLimitInfo(
          { ...streakData, likesResetAt },
          isPremium,
          likesToday,
          likesResetAt
        ),
      };
    } catch (error) {
      console.error('Error using like:', error);
      throw error;
    }
  }

  /**
   * Get current like limit info
   */
  async getLikeLimitInfo(userId: string, isPremium: boolean): Promise<LikeLimitInfo> {
    const streakData = await this.getStreakData(userId);

    // Reset likes if needed
    let likesToday = streakData.likesToday;
    let likesResetAt = streakData.likesResetAt;

    if (this.shouldResetLikes(streakData)) {
      likesToday = 0;
      likesResetAt = new Date(Date.now() + LIKES_RESET_HOURS * 60 * 60 * 1000).toISOString();
    }

    return this.buildLimitInfo(streakData, isPremium, likesToday, likesResetAt);
  }

  /**
   * Get streak info
   */
  async getStreakInfo(userId: string): Promise<StreakInfo> {
    const streakData = await this.getStreakData(userId);
    const { shouldReset, isNewDay } = this.checkStreakStatus(streakData);

    const currentStreak = shouldReset ? 0 : streakData.currentStreak;
    const bonus = calculateStreakBonus(currentStreak);
    const nextMilestone = getNextMilestone(currentStreak);

    // Check if activity was recorded today
    const lastActivity = new Date(streakData.lastActivityDate);
    const today = new Date();
    const maintainedToday =
      lastActivity.toDateString() === today.toDateString();

    return {
      currentStreak,
      longestStreak: streakData.longestStreak,
      daysUntilBreak: maintainedToday ? 1 : 0,
      bonusLikes: bonus,
      nextMilestone: nextMilestone?.days || 0,
      nextMilestoneBonus: nextMilestone?.bonusLikes || 0,
      maintainedToday,
      isNewRecord: false, // This is set during recordActivity
    };
  }

  /**
   * Build like limit info object
   */
  private buildLimitInfo(
    streakData: StreakData,
    isPremium: boolean,
    likesToday: number,
    likesResetAt: string
  ): LikeLimitInfo {
    const bonus = calculateStreakBonus(streakData.currentStreak);
    const baseLikes = BASE_DAILY_LIKES;
    const totalAllowed = isPremium ? Infinity : Math.min(baseLikes + bonus, MAX_DAILY_LIKES);
    const remaining = isPremium ? Infinity : Math.max(0, totalAllowed - likesToday);
    const resetAt = new Date(likesResetAt);
    const timeUntilReset = Math.max(0, resetAt.getTime() - Date.now());

    return {
      totalAllowed,
      baseLikes,
      streakBonus: bonus,
      remaining,
      used: likesToday,
      isPremium,
      timeUntilReset,
      resetAt,
    };
  }
}

export const streakService = new StreakService();
