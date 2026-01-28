'use client';

import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Flame, Star, Trophy, Target, TrendingUp, Sparkles } from 'lucide-react';
import { useStreakStore, useAuthStore, STREAK_MILESTONES, getCurrentMilestone, getNextMilestone } from '@crush/core';

interface StreakInfoCardProps {
  className?: string;
}

export function StreakInfoCard({ className = '' }: StreakInfoCardProps) {
  const { user, profile } = useAuthStore();
  const { streakInfo, loadStreakData } = useStreakStore();

  const isPremium = profile?.isPremium || false;

  useEffect(() => {
    if (user?.uid) {
      loadStreakData(user.uid, isPremium);
    }
  }, [user?.uid, isPremium, loadStreakData]);

  if (!streakInfo) return null;

  const currentMilestone = getCurrentMilestone(streakInfo.currentStreak);
  const nextMilestone = getNextMilestone(streakInfo.currentStreak);
  const progressToNext = nextMilestone
    ? ((streakInfo.currentStreak - (currentMilestone?.days || 0)) /
        (nextMilestone.days - (currentMilestone?.days || 0))) *
      100
    : 100;

  return (
    <div className={`rounded-xl border border-border bg-card overflow-hidden ${className}`}>
      {/* Header with gradient */}
      <div className="relative p-6 bg-gradient-to-br from-orange-500/20 via-red-500/10 to-transparent">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <motion.div
                animate={{
                  scale: [1, 1.1, 1],
                  rotate: [0, -5, 5, 0],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              >
                <Flame className="w-8 h-8 text-orange-500" />
              </motion.div>
              <h3 className="text-lg font-semibold">Your Streak</h3>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold text-gradient">{streakInfo.currentStreak}</span>
              <span className="text-muted-foreground">
                {streakInfo.currentStreak === 1 ? 'day' : 'days'}
              </span>
            </div>
          </div>

          {/* Record badge */}
          {streakInfo.longestStreak > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-card border border-border">
              <Trophy className="w-4 h-4 text-warning" />
              <span className="text-sm">
                Best: <span className="font-semibold">{streakInfo.longestStreak}</span>
              </span>
            </div>
          )}
        </div>

        {/* Streak status */}
        <div className="mt-4">
          {streakInfo.maintainedToday ? (
            <div className="flex items-center gap-2 text-sm text-success">
              <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
              <span>Streak maintained today</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm text-warning">
              <div className="w-2 h-2 rounded-full bg-warning animate-pulse" />
              <span>Swipe today to maintain your streak!</span>
            </div>
          )}
        </div>
      </div>

      {/* Progress to next milestone */}
      {nextMilestone && (
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">Next Milestone</span>
            </div>
            <span className="text-sm text-muted-foreground">
              {nextMilestone.days - streakInfo.currentStreak} days away
            </span>
          </div>

          <div className="relative h-2 bg-muted rounded-full overflow-hidden mb-2">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progressToNext}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-orange-500 to-red-500 rounded-full"
            />
          </div>

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{currentMilestone?.days || 0} days</span>
            <div className="flex items-center gap-1 text-primary">
              <Sparkles className="w-3 h-3" />
              <span>+{nextMilestone.bonusLikes} bonus likes</span>
            </div>
            <span>{nextMilestone.days} days</span>
          </div>
        </div>
      )}

      {/* Current bonus */}
      {streakInfo.bonusLikes > 0 && (
        <div className="p-4 border-b border-border bg-primary/5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">Current Bonus</span>
            </div>
            <span className="text-sm font-semibold text-primary">
              +{streakInfo.bonusLikes} daily likes
            </span>
          </div>
        </div>
      )}

      {/* Milestones */}
      <div className="p-4">
        <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
          <Star className="w-4 h-4 text-muted-foreground" />
          Streak Rewards
        </h4>
        <div className="space-y-2">
          {STREAK_MILESTONES.slice(0, 5).map((milestone) => {
            const isAchieved = streakInfo.currentStreak >= milestone.days;
            const isCurrent =
              currentMilestone && milestone.days === currentMilestone.days;

            return (
              <div
                key={milestone.days}
                className={`flex items-center justify-between p-2 rounded-lg transition-colors ${
                  isAchieved
                    ? 'bg-primary/10'
                    : isCurrent
                    ? 'bg-muted border border-primary'
                    : 'bg-muted/50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center ${
                      isAchieved ? 'bg-primary text-primary-foreground' : 'bg-muted-foreground/20'
                    }`}
                  >
                    {isAchieved ? (
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <span className="text-xs">{milestone.days}</span>
                    )}
                  </div>
                  <span className={`text-sm ${isAchieved ? 'font-medium' : 'text-muted-foreground'}`}>
                    {milestone.days} day streak
                  </span>
                </div>
                <span className={`text-xs ${isAchieved ? 'text-primary font-medium' : 'text-muted-foreground'}`}>
                  +{milestone.bonusLikes} likes
                </span>
              </div>
            );
          })}
        </div>

        {STREAK_MILESTONES.length > 5 && (
          <p className="text-xs text-muted-foreground text-center mt-3">
            And {STREAK_MILESTONES.length - 5} more milestones to unlock!
          </p>
        )}
      </div>
    </div>
  );
}
