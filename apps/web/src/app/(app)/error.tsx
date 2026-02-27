'use client';

import { RouteErrorFallback } from '@/components/error';

export default function AppRouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteErrorFallback
      error={error}
      reset={reset}
      scope="app"
      title="App section temporarily unavailable"
      description="We ran into an issue while loading this page. Please try again."
      homeHref="/discover"
      homeLabel="Go to Discover"
    />
  );
}
