'use client';

import { RouteErrorFallback } from '@/components/error';

export default function Error({
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
      scope="global"
      title="Oops! Something went wrong"
      description="We're sorry, but something unexpected happened. Our team has been notified and we're working to fix it."
      homeHref="/"
      homeLabel="Go Home"
    />
  );
}
