'use client';

import { RouteErrorFallback } from '@/components/error';

export default function OnboardingRouteError({
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
      scope="onboarding"
      title="Onboarding error"
      description="We could not load this onboarding step. Please try again."
      homeHref="/onboarding"
      homeLabel="Back to Onboarding"
    />
  );
}
