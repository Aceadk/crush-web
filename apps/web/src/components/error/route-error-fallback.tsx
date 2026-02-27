'use client';

import { useEffect } from 'react';
import { AlertTriangle, Home, RefreshCw } from 'lucide-react';
import { Button } from '@crush/ui';
import { handleError } from '@/lib/sentry';

interface RouteErrorFallbackProps {
  error: Error & { digest?: string };
  reset: () => void;
  title?: string;
  description?: string;
  homeHref?: string;
  homeLabel?: string;
  scope?: string;
}

export function RouteErrorFallback({
  error,
  reset,
  title = 'Something went wrong',
  description = "We're sorry, but something unexpected happened. Please try again.",
  homeHref = '/',
  homeLabel = 'Go Home',
  scope = 'route',
}: RouteErrorFallbackProps) {
  useEffect(() => {
    console.error(`[${scope}] route error`, error);
    handleError(error);
  }, [error, scope]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-destructive/10">
          <AlertTriangle className="h-10 w-10 text-destructive" />
        </div>

        <h1 className="mb-2 text-2xl font-bold text-foreground">{title}</h1>
        <p className="mb-6 text-muted-foreground">{description}</p>

        {error.digest && (
          <p className="mb-6 text-xs text-muted-foreground">
            Error ID:{' '}
            <code className="rounded bg-muted px-1 py-0.5">{error.digest}</code>
          </p>
        )}

        <div className="flex flex-col justify-center gap-3 sm:flex-row">
          <Button onClick={reset}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Try Again
          </Button>
          <Button variant="outline" onClick={() => window.location.assign(homeHref)}>
            <Home className="mr-2 h-4 w-4" />
            {homeLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
