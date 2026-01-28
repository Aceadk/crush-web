'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Heart, Flame, Clock, Infinity, Crown } from 'lucide-react';
import { useStreakStore, useAuthStore, LikeLimitInfo, StreakInfo } from '@crush/core';

interface LikeLimitIndicatorProps {
  variant?: 'compact' | 'full';
  className?: string;
}

export function LikeLimitIndicator({ variant = 'compact', className = '' }: LikeLimitIndicatorProps) {
  const { user, profile } = useAuthStore();
  const { limitInfo, streakInfo, loadStreakData } = useStreakStore();
  const [timeUntilReset, setTimeUntilReset] = useState<string>('');

  const isPremium = profile?.isPremium || false;

  // Load streak data
  useEffect(() => {
    if (user?.uid) {
      loadStreakData(user.uid, isPremium);
    }
  }, [user?.uid, isPremium, loadStreakData]);

  // Update countdown timer
  useEffect(() => {
    if (!limitInfo || isPremium) return;

    const updateTimer = () => {
      const now = Date.now();
      const resetAt = limitInfo.resetAt.getTime();
      const diff = Math.max(0, resetAt - now);

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

      setTimeUntilReset(`${hours}h ${minutes}m`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [limitInfo, isPremium]);

  if (!limitInfo) return null;

  // Premium users see unlimited indicator
  if (isPremium) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <Crown className="w-4 h-4 text-warning" />
        <div className="flex items-center gap-1 text-sm">
          <Infinity className="w-4 h-4 text-primary" />
          <span className="text-muted-foreground">Unlimited likes</span>
        </div>
      </div>
    );
  }

  // Calculate percentage for progress
  const percentage = Math.round((limitInfo.remaining / limitInfo.totalAllowed) * 100);
  const isLow = percentage <= 20;
  const isEmpty = limitInfo.remaining === 0;

  if (variant === 'compact') {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        {/* Streak indicator */}
        {streakInfo && streakInfo.currentStreak > 0 && (
          <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-orange-500/10">
            <Flame className="w-3.5 h-3.5 text-orange-500" />
            <span className="text-xs font-medium text-orange-500">{streakInfo.currentStreak}</span>
          </div>
        )}

        {/* Likes remaining */}
        <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full ${isEmpty ? 'bg-destructive/10' : isLow ? 'bg-warning/10' : 'bg-primary/10'}`}>
          <Heart className={`w-3.5 h-3.5 ${isEmpty ? 'text-destructive' : isLow ? 'text-warning' : 'text-primary'}`} />
          <span className={`text-xs font-medium ${isEmpty ? 'text-destructive' : isLow ? 'text-warning' : 'text-primary'}`}>
            {limitInfo.remaining}
          </span>
        </div>
      </div>
    );
  }

  // Full variant
  return (
    <div className={`rounded-xl border border-border bg-card p-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Heart className="w-5 h-5 text-primary" />
          <span className="font-semibold">Daily Likes</span>
        </div>
        {streakInfo && streakInfo.currentStreak > 0 && (
          <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-orange-500/10">
            <Flame className="w-4 h-4 text-orange-500" />
            <span className="text-sm font-medium text-orange-500">{streakInfo.currentStreak} day streak</span>
          </div>
        )}
      </div>

      {/* Progress bar */}
      <div className="relative h-3 bg-muted rounded-full overflow-hidden mb-2">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className={`absolute inset-y-0 left-0 rounded-full ${
            isEmpty ? 'bg-destructive' : isLow ? 'bg-warning' : 'bg-primary'
          }`}
        />
      </div>

      {/* Stats */}
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-4">
          <span className={isEmpty ? 'text-destructive' : isLow ? 'text-warning' : 'text-foreground'}>
            <span className="font-semibold">{limitInfo.remaining}</span>
            <span className="text-muted-foreground">/{limitInfo.totalAllowed}</span>
          </span>

          {limitInfo.streakBonus > 0 && (
            <span className="text-xs text-orange-500">
              +{limitInfo.streakBonus} streak bonus
            </span>
          )}
        </div>

        {isEmpty && (
          <div className="flex items-center gap-1 text-muted-foreground">
            <Clock className="w-3.5 h-3.5" />
            <span className="text-xs">Resets in {timeUntilReset}</span>
          </div>
        )}
      </div>

      {/* Empty state */}
      {isEmpty && (
        <div className="mt-3 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
          <p className="text-sm text-destructive font-medium">Daily limit reached</p>
          <p className="text-xs text-muted-foreground mt-1">
            Upgrade to Crush+ for unlimited likes, or come back in {timeUntilReset}.
          </p>
        </div>
      )}

      {/* Low likes warning */}
      {!isEmpty && isLow && (
        <div className="mt-3 p-3 rounded-lg bg-warning/10 border border-warning/20">
          <p className="text-sm text-warning font-medium">Running low on likes</p>
          <p className="text-xs text-muted-foreground mt-1">
            Keep your streak going to earn more daily likes!
          </p>
        </div>
      )}
    </div>
  );
}
