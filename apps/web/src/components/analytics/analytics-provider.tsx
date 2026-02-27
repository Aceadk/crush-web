'use client';

import { PageAnalyticsProvider } from './page-analytics-provider';
import { UserAnalyticsProvider } from './user-analytics-provider';

interface AnalyticsProviderProps {
  children: React.ReactNode;
}

export function AnalyticsProvider({ children }: AnalyticsProviderProps) {
  return (
    <PageAnalyticsProvider>
      <UserAnalyticsProvider>{children}</UserAnalyticsProvider>
    </PageAnalyticsProvider>
  );
}
