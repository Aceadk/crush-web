'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@crush/core';
import { useAnalytics } from '@/lib/analytics';

interface UserAnalyticsProviderProps {
  children: React.ReactNode;
}

export function UserAnalyticsProvider({ children }: UserAnalyticsProviderProps) {
  const { user, profile } = useAuthStore();
  const { identify, reset } = useAnalytics();

  useEffect(() => {
    if (user && profile) {
      identify(user.uid, {
        userId: user.uid,
        email: profile.email,
        isPremium: profile.subscriptionTier !== 'free',
        subscriptionTier: profile.subscriptionTier,
        billingPeriod: profile.billingPeriod,
        profileComplete: profile.profileComplete,
        signupDate: profile.createdAt,
        age: profile.age,
        gender: profile.gender,
      });
      return;
    }

    if (!user) {
      reset();
    }
  }, [user, profile, identify, reset]);

  return <>{children}</>;
}
