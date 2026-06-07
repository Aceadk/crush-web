/**
 * Streak Service — SERVER-OWNED.
 *
 * Streaks and the daily like allowance are authoritative on the backend:
 * `user_streaks/{uid}` is written only by Cloud Functions (recorded during
 * swipes and via the recordStreakActivity callable), and the like limit is
 * enforced by the backend (base + streak bonus). The web reads status via the
 * getStreakStatus callable and no longer hardcodes limit numbers — the displayed
 * allowance always matches what the backend enforces.
 *
 * See my_first_project/docs/contracts/streak_decision_2026-06-07.md.
 */

import { callables } from '../api/callables';
import { StreakData, LikeLimitInfo, StreakInfo } from '../types/streak';

function nextUtcResetMs(now = Date.now()): number {
  const d = new Date(now);
  const reset = Date.UTC(
    d.getUTCFullYear(),
    d.getUTCMonth(),
    d.getUTCDate() + 1,
    0,
    0,
    0,
    0
  );
  return reset;
}

class StreakService {
  /**
   * Full streak status from the backend (single fetch, used to derive the
   * specific view models below).
   */
  private async status() {
    return callables.getStreakStatus();
  }

  async getStreakData(userId: string): Promise<StreakData> {
    const s = await this.status();
    const resetAtMs = nextUtcResetMs();
    return {
      userId,
      currentStreak: s.currentStreak,
      longestStreak: s.longestStreak,
      lastActivityDate: s.lastActivityDate ?? new Date().toISOString(),
      streakStartDate: s.streakStartDate ?? new Date().toISOString(),
      likesToday: s.used,
      likesResetAt: new Date(resetAtMs).toISOString(),
      createdAt: s.streakStartDate ?? new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  async getLikeLimitInfo(
    _userId: string,
    _isPremium?: boolean
  ): Promise<LikeLimitInfo> {
    const s = await this.status();
    const resetAtMs = nextUtcResetMs();
    return {
      totalAllowed: s.totalAllowed === -1 ? Infinity : s.totalAllowed,
      baseLikes: s.baseLikes,
      streakBonus: s.streakBonus,
      remaining: s.remaining === -1 ? Infinity : s.remaining,
      used: s.used,
      isPremium: s.isPremium,
      timeUntilReset: Math.max(0, resetAtMs - Date.now()),
      resetAt: new Date(resetAtMs),
    };
  }

  async getStreakInfo(_userId: string): Promise<StreakInfo> {
    const s = await this.status();
    return {
      currentStreak: s.currentStreak,
      longestStreak: s.longestStreak,
      daysUntilBreak: s.maintainedToday ? 1 : 0,
      bonusLikes: s.streakBonus,
      nextMilestone: s.nextMilestoneDays ?? 0,
      nextMilestoneBonus: s.nextMilestoneBonus ?? 0,
      maintainedToday: s.maintainedToday,
      isNewRecord: false,
    };
  }

  /**
   * Record a day of activity (e.g. on app open) via the server-owned callable.
   */
  async recordActivity(userId: string): Promise<{
    streakData: StreakData;
    streakIncremented: boolean;
    isNewRecord: boolean;
  }> {
    const result = await callables.recordStreakActivity();
    const streakData = await this.getStreakData(userId);
    streakData.currentStreak = result.currentStreak;
    streakData.longestStreak = result.longestStreak;
    return {
      streakData,
      streakIncremented: result.incremented,
      isNewRecord: result.isNewRecord,
    };
  }

  /**
   * Like consumption + limit enforcement is owned by the backend swipe
   * (swipeRight / enforceDailyLikeLimit). This is a no-op gate that returns the
   * current limit info for display; it never blocks (the server is authoritative).
   */
  async useLike(
    userId: string,
    isPremium: boolean
  ): Promise<{ success: boolean; error?: string; limitInfo: LikeLimitInfo }> {
    const limitInfo = await this.getLikeLimitInfo(userId, isPremium);
    return { success: true, limitInfo };
  }
}

export const streakService = new StreakService();
