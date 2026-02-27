'use client';

import { RouteErrorFallback } from '@/components/error';

export default function AuthRouteError({
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
      scope="auth"
      title="Authentication page error"
      description="We could not load this authentication screen. Please try again."
      homeHref="/auth/login"
      homeLabel="Back to Login"
    />
  );
}
