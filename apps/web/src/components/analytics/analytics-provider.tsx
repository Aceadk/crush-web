'use client';

import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { analytics, useAnalytics } from '@/lib/analytics';
import { useAuthStore } from '@crush/core';

interface AnalyticsProviderProps {
  children: React.ReactNode;
}

export function AnalyticsProvider({ children }: AnalyticsProviderProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user, profile } = useAuthStore();
  const { identify, pageView, reset } = useAnalytics();

  // Initialize analytics on mount
  useEffect(() => {
    analytics.init();
  }, []);

  // Track page views
  useEffect(() => {
    // Construct the full URL
    const url = pathname + (searchParams.toString() ? `?${searchParams.toString()}` : '');
    pageView(url, document.title);
  }, [pathname, searchParams, pageView]);

  // Identify user when logged in
  useEffect(() => {
    if (user && profile) {
      identify(user.uid, {
        userId: user.uid,
        email: profile.email,
        isPremium: profile.isPremium,
        premiumPlan: profile.premiumPlan,
        profileComplete: profile.profileComplete,
        signupDate: profile.createdAt,
        age: profile.age,
        gender: profile.gender,
      });
    } else if (!user) {
      reset();
    }
  }, [user, profile, identify, reset]);

  return <>{children}</>;
}
