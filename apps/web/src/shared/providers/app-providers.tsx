'use client';

import type { ReactNode } from 'react';
import { ThemeProvider } from '@/shared/components/theme';
import { CookieConsent } from '@/shared/components/cookie-consent';
import { PageAnalyticsProvider } from '@/components/analytics';

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <ThemeProvider defaultTheme="system">
      <PageAnalyticsProvider>{children}</PageAnalyticsProvider>
      <CookieConsent />
    </ThemeProvider>
  );
}
