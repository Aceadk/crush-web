/**
 * Streak Store - Manages streak state and like limits
 */

import { create } from 'zustand';
import { streakService } from '../services/streak';
import {
  StreakData,
  LikeLimitInfo,
  StreakInfo,
  StreakMilestone,
  getCurrentMilestone,
  getNextMilestone,
} from '../types/streak';

interface StreakState {
  // State
  streakData: StreakData | null;
  limitInfo: LikeLimitInfo | null;
  streakInfo: StreakInfo | null;
  loading: boolean;
  error: string | null;

  // Celebration state
  showCelebration: boolean;
  celebrationData: {
    type: 'streak_increment' | 'new_record' | 'milestone';
    streakDays: number;
    milestone?: StreakMilestone;
    isNewRecord: boolean;
  } | null;

  // Actions
  loadStreakData: (userId: string, isPremium: boolean) => Promise<void>;
  recordActivity: (userId: string) => Promise<void>;
  useLike: (userId: string, isPremium: boolean) => Promise<{ success: boolean; error?: string }>;
  refreshLimitInfo: (userId: string, isPremium: boolean) => Promise<void>;
  hideCelebration: () => void;
  clearError: () => void;
}

export const useStreakStore = create<StreakState>()((set, get) => ({
  // Initial state
  streakData: null,
  limitInfo: null,
  streakInfo: null,
  loading: false,
  error: null,
  showCelebration: false,
  celebrationData: null,

  // Load all streak data
  loadStreakData: async (userId, isPremium) => {
    set({ loading: true, error: null });
    try {
      const [streakData, limitInfo, streakInfo] = await Promise.all([
        streakService.getStreakData(userId),
        streakService.getLikeLimitInfo(userId, isPremium),
        streakService.getStreakInfo(userId),
      ]);

      set({
        streakData,
        limitInfo,
        streakInfo,
        loading: false,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load streak data';
      set({ error: message, loading: false });
    }
  },

  // Record daily activity and update streak
  recordActivity: async (userId) => {
    try {
      const result = await streakService.recordActivity(userId);

      // Update state
      set({ streakData: result.streakData });

      // Determine if we should show celebration
      if (result.streakIncremented || result.isNewRecord) {
        const currentMilestone = getCurrentMilestone(result.streakData.currentStreak);
        const previousMilestone = getCurrentMilestone(result.streakData.currentStreak - 1);

        // Check if we hit a new milestone
        const hitNewMilestone =
          currentMilestone &&
          (!previousMilestone || currentMilestone.days > previousMilestone.days);

        let celebrationType: 'streak_increment' | 'new_record' | 'milestone' = 'streak_increment';
        if (result.isNewRecord) {
          celebrationType = 'new_record';
        } else if (hitNewMilestone) {
          celebrationType = 'milestone';
        }

        set({
          showCelebration: true,
          celebrationData: {
            type: celebrationType,
            streakDays: result.streakData.currentStreak,
            milestone: hitNewMilestone ? currentMilestone : undefined,
            isNewRecord: result.isNewRecord,
          },
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to record activity';
      set({ error: message });
    }
  },

  // Use a like
  useLike: async (userId, isPremium) => {
    try {
      const result = await streakService.useLike(userId, isPremium);

      // Update limit info
      set({ limitInfo: result.limitInfo });

      if (!result.success) {
        return { success: false, error: result.error };
      }

      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to use like';
      set({ error: message });
      return { success: false, error: message };
    }
  },

  // Refresh limit info
  refreshLimitInfo: async (userId, isPremium) => {
    try {
      const limitInfo = await streakService.getLikeLimitInfo(userId, isPremium);
      set({ limitInfo });
    } catch (error) {
      console.error('Failed to refresh limit info:', error);
    }
  },

  // Hide celebration
  hideCelebration: () => {
    set({ showCelebration: false, celebrationData: null });
  },

  // Clear error
  clearError: () => {
    set({ error: null });
  },
}));
