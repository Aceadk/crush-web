'use client';

import { RouteErrorFallback } from '@/components/error';

export default function MarketingRouteError({
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
      scope="marketing"
      title="This page could not be loaded"
      description="Please try again or return to the homepage."
      homeHref="/"
      homeLabel="Go Home"
    />
  );
}
