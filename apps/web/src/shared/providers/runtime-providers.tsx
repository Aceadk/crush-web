'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState, type ReactNode } from 'react';
import { Toaster } from 'sonner';
import { UserAnalyticsProvider } from '@/components/analytics';
import { AuthInitializer } from './auth-initializer';

interface RuntimeProvidersProps {
  children: ReactNode;
}

export function RuntimeProviders({ children }: RuntimeProvidersProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            gcTime: 5 * 60 * 1000,
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <AuthInitializer>
        <UserAnalyticsProvider>{children}</UserAnalyticsProvider>
      </AuthInitializer>
      <Toaster
        position="top-center"
        toastOptions={{
          className: 'bg-card text-card-foreground border border-border shadow-lg',
        }}
      />
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools initialIsOpen={false} />
      )}
    </QueryClientProvider>
  );
}
