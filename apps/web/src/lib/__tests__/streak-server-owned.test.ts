/**
 * Streak server-ownership test (Phase 5 / streak decision).
 *
 * Verifies streak status + like limits are read from the backend getStreakStatus
 * callable (no hardcoded limit numbers), activity recording goes through
 * recordStreakActivity, and useLike is a non-blocking display gate (the backend
 * swipe is the authoritative consume).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const { callableMock } = vi.hoisted(() => ({
  callableMock: {
    getStreakStatus: vi.fn(),
    recordStreakActivity: vi.fn(),
  },
}));

vi.mock('@crush/core/api/callables', () => ({ callables: callableMock }));

import { streakService } from '@crush/core/services/streak';

const STATUS = {
  ok: true,
  isPremium: false,
  currentStreak: 5,
  longestStreak: 9,
  baseLikes: 30,
  streakBonus: 8,
  totalAllowed: 38,
  used: 10,
  remaining: 28,
  nextMilestoneDays: 7,
  nextMilestoneBonus: 10,
  maintainedToday: true,
  lastActivityDate: '2026-06-07T00:00:00.000Z',
  streakStartDate: '2026-06-03T00:00:00.000Z',
};

describe('streakService — server-owned', () => {
  beforeEach(() => vi.clearAllMocks());

  it('getLikeLimitInfo derives from the backend (base + bonus), not hardcoded', async () => {
    callableMock.getStreakStatus.mockResolvedValue(STATUS);
    const info = await streakService.getLikeLimitInfo('u', false);
    expect(callableMock.getStreakStatus).toHaveBeenCalled();
    expect(info).toMatchObject({
      totalAllowed: 38,
      baseLikes: 30,
      streakBonus: 8,
      remaining: 28,
      used: 10,
      isPremium: false,
    });
    expect(info.resetAt).toBeInstanceOf(Date);
  });

  it('maps unlimited (-1) to Infinity for premium', async () => {
    callableMock.getStreakStatus.mockResolvedValue({
      ...STATUS,
      isPremium: true,
      totalAllowed: -1,
      remaining: -1,
    });
    const info = await streakService.getLikeLimitInfo('u', true);
    expect(info.totalAllowed).toBe(Infinity);
    expect(info.remaining).toBe(Infinity);
  });

  it('getStreakInfo maps current/longest/next-milestone', async () => {
    callableMock.getStreakStatus.mockResolvedValue(STATUS);
    const info = await streakService.getStreakInfo('u');
    expect(info).toMatchObject({
      currentStreak: 5,
      longestStreak: 9,
      bonusLikes: 8,
      nextMilestone: 7,
      nextMilestoneBonus: 10,
      maintainedToday: true,
    });
  });

  it('recordActivity routes to recordStreakActivity and surfaces increment/record', async () => {
    callableMock.recordStreakActivity.mockResolvedValue({
      ok: true,
      currentStreak: 6,
      longestStreak: 9,
      streakBonus: 8,
      incremented: true,
      isNewRecord: false,
    });
    callableMock.getStreakStatus.mockResolvedValue(STATUS);
    const result = await streakService.recordActivity('u');
    expect(callableMock.recordStreakActivity).toHaveBeenCalled();
    expect(result.streakIncremented).toBe(true);
    expect(result.isNewRecord).toBe(false);
    expect(result.streakData.currentStreak).toBe(6);
  });

  it('useLike is a non-blocking gate returning current limit info', async () => {
    callableMock.getStreakStatus.mockResolvedValue(STATUS);
    const result = await streakService.useLike('u', false);
    expect(result.success).toBe(true);
    expect(result.limitInfo.remaining).toBe(28);
  });
});
