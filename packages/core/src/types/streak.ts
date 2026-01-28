/**
 * Streak and Like Limits Types
 */

export interface StreakData {
  userId: string;
  // Current streak count (consecutive days of app activity)
  currentStreak: number;
  // Longest streak ever achieved
  longestStreak: number;
  // Last activity date (ISO string)
  lastActivityDate: string;
  // When the streak started (ISO string)
  streakStartDate: string;
  // Total likes used today
  likesToday: number;
  // Timestamp when likes reset (ISO string)
  likesResetAt: string;
  // Created/Updated timestamps
  createdAt: string;
  updatedAt: string;
}

export interface LikeLimitInfo {
  // Total likes allowed today (base + streak bonus)
  totalAllowed: number;
  // Base likes (50 for free users)
  baseLikes: number;
  // Bonus from streak
  streakBonus: number;
  // Likes remaining today
  remaining: number;
  // Likes used today
  used: number;
  // Is user premium (unlimited likes)
  isPremium: boolean;
  // Time until likes reset (ms)
  timeUntilReset: number;
  // Reset time as Date
  resetAt: Date;
}

export interface StreakInfo {
  // Current streak days
  currentStreak: number;
  // Longest streak
  longestStreak: number;
  // Days until streak breaks (0 = need activity today)
  daysUntilBreak: number;
  // Streak bonus likes earned
  bonusLikes: number;
  // Next milestone (streak day for next bonus increase)
  nextMilestone: number;
  // Bonus at next milestone
  nextMilestoneBonus: number;
  // Whether streak was maintained today
  maintainedToday: boolean;
  // Is this a new streak record?
  isNewRecord: boolean;
}

export interface StreakMilestone {
  days: number;
  bonusLikes: number;
  message: string;
  icon: 'fire' | 'star' | 'rocket' | 'crown' | 'diamond';
}

// Streak milestones configuration
export const STREAK_MILESTONES: StreakMilestone[] = [
  { days: 2, bonusLikes: 2, message: '2-Day Streak!', icon: 'fire' },
  { days: 3, bonusLikes: 4, message: '3-Day Streak!', icon: 'fire' },
  { days: 4, bonusLikes: 6, message: '4-Day Streak!', icon: 'star' },
  { days: 5, bonusLikes: 8, message: '5-Day Streak!', icon: 'star' },
  { days: 7, bonusLikes: 10, message: 'Week Streak!', icon: 'rocket' },
  { days: 10, bonusLikes: 12, message: '10-Day Streak!', icon: 'rocket' },
  { days: 14, bonusLikes: 14, message: '2-Week Streak!', icon: 'crown' },
  { days: 21, bonusLikes: 16, message: '3-Week Streak!', icon: 'crown' },
  { days: 30, bonusLikes: 19, message: 'Month Streak!', icon: 'diamond' },
];

// Constants
export const BASE_DAILY_LIKES = 50;
export const MAX_DAILY_LIKES = 69; // Maximum likes for free users regardless of streak
export const LIKES_RESET_HOURS = 24;

/**
 * Calculate bonus likes based on streak
 */
export function calculateStreakBonus(streakDays: number): number {
  if (streakDays < 2) return 0;

  // Find the highest milestone achieved
  let bonus = 0;
  for (const milestone of STREAK_MILESTONES) {
    if (streakDays >= milestone.days) {
      bonus = milestone.bonusLikes;
    } else {
      break;
    }
  }

  return bonus;
}

/**
 * Calculate total allowed likes
 */
export function calculateTotalAllowedLikes(streakDays: number, isPremium: boolean): number {
  if (isPremium) return Infinity;

  const baseLikes = BASE_DAILY_LIKES;
  const bonus = calculateStreakBonus(streakDays);
  const total = baseLikes + bonus;

  return Math.min(total, MAX_DAILY_LIKES);
}

/**
 * Get current milestone info
 */
export function getCurrentMilestone(streakDays: number): StreakMilestone | null {
  let current: StreakMilestone | null = null;
  for (const milestone of STREAK_MILESTONES) {
    if (streakDays >= milestone.days) {
      current = milestone;
    } else {
      break;
    }
  }
  return current;
}

/**
 * Get next milestone info
 */
export function getNextMilestone(streakDays: number): StreakMilestone | null {
  for (const milestone of STREAK_MILESTONES) {
    if (streakDays < milestone.days) {
      return milestone;
    }
  }
  return null;
}

export const DEFAULT_STREAK_DATA: Omit<StreakData, 'userId'> = {
  currentStreak: 0,
  longestStreak: 0,
  lastActivityDate: new Date().toISOString(),
  streakStartDate: new Date().toISOString(),
  likesToday: 0,
  likesResetAt: new Date(Date.now() + LIKES_RESET_HOURS * 60 * 60 * 1000).toISOString(),
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};
