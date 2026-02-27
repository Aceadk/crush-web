'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { analytics, useAnalytics } from '@/lib/analytics';

interface PageAnalyticsProviderProps {
  children: React.ReactNode;
}

export function PageAnalyticsProvider({ children }: PageAnalyticsProviderProps) {
  const pathname = usePathname();
  const { pageView } = useAnalytics();

  useEffect(() => {
    analytics.init();
  }, []);

  useEffect(() => {
    const currentSearch = typeof window !== 'undefined' ? window.location.search : '';
    const url = `${pathname}${currentSearch}`;
    const title = typeof document !== 'undefined' ? document.title : undefined;
    pageView(url, title);
  }, [pathname, pageView]);

  return <>{children}</>;
}
