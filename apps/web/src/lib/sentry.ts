import * as Sentry from '@sentry/nextjs';

/**
 * Sentry monitoring wrapper.
 *
 * Environment variables:
 * - NEXT_PUBLIC_SENTRY_DSN (required to enable client capture)
 * - NEXT_PUBLIC_SENTRY_ENVIRONMENT (optional, defaults to NODE_ENV/VERCEL_ENV)
 * - NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE (optional, defaults to 0.1 in production)
 * - NEXT_PUBLIC_SENTRY_REPLAY_SESSION_SAMPLE_RATE (optional, defaults to 0.05)
 * - NEXT_PUBLIC_SENTRY_REPLAY_ON_ERROR_SAMPLE_RATE (optional, defaults to 1)
 */

interface ErrorContext {
  userId?: string;
  email?: string;
  isPremium?: boolean;
  page?: string;
  componentStack?: string;
  extra?: Record<string, unknown>;
}

interface BreadcrumbData {
  category: string;
  message: string;
  level?: 'debug' | 'info' | 'warning' | 'error';
  data?: Record<string, unknown>;
}

function parseSampleRate(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  if (parsed < 0 || parsed > 1) return fallback;
  return parsed;
}

class MonitoringService {
  private initialized = false;

  private enabled = false;

  private readonly dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

  private readonly environment =
    process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT ||
    process.env.NEXT_PUBLIC_APP_ENV ||
    process.env.VERCEL_ENV ||
    process.env.NODE_ENV ||
    'development';

  private ensureInit() {
    if (!this.initialized) {
      this.init();
    }
  }

  /**
   * Initialize Sentry once.
   */
  init() {
    if (this.initialized) {
      return;
    }

    this.initialized = true;

    if (!this.dsn) {
      this.enabled = false;
      return;
    }

    const isProduction = process.env.NODE_ENV === 'production';

    Sentry.init({
      dsn: this.dsn,
      environment: this.environment,
      enabled: true,
      tracesSampleRate: parseSampleRate(
        process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE,
        isProduction ? 0.1 : 1
      ),
      replaysSessionSampleRate: parseSampleRate(
        process.env.NEXT_PUBLIC_SENTRY_REPLAY_SESSION_SAMPLE_RATE,
        isProduction ? 0.05 : 0
      ),
      replaysOnErrorSampleRate: parseSampleRate(
        process.env.NEXT_PUBLIC_SENTRY_REPLAY_ON_ERROR_SAMPLE_RATE,
        1
      ),
      sendDefaultPii: false,
      beforeSend(event) {
        // Keep this hook explicit for future redaction if additional PII fields are added.
        return event;
      },
    });

    this.enabled = true;
  }

  /**
   * Capture an exception with optional request/user context.
   */
  captureException(error: Error, context?: ErrorContext) {
    this.ensureInit();
    if (!this.enabled) {
      return;
    }

    Sentry.withScope((scope) => {
      if (context?.userId || context?.email) {
        scope.setUser({
          id: context?.userId,
          email: context?.email,
        });
      }

      if (typeof context?.isPremium === 'boolean') {
        scope.setTag('isPremium', String(context.isPremium));
      }

      if (context?.page) {
        scope.setTag('page', context.page);
      }

      if (context?.componentStack) {
        scope.setContext('react', { componentStack: context.componentStack });
      }

      if (context?.extra) {
        scope.setContext('extra', context.extra);
      }

      Sentry.captureException(error);
    });
  }

  /**
   * Capture informational/warning/error message.
   */
  captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info') {
    this.ensureInit();
    if (!this.enabled) {
      return;
    }

    Sentry.captureMessage(message, level);
  }

  /**
   * Set monitoring user context after auth state changes.
   */
  setUser(user: { id: string; email?: string; isPremium?: boolean } | null) {
    this.ensureInit();
    if (!this.enabled) {
      return;
    }

    if (user) {
      Sentry.setUser({ id: user.id, email: user.email });
      if (typeof user.isPremium === 'boolean') {
        Sentry.setTag('isPremium', String(user.isPremium));
      }
      return;
    }

    Sentry.setUser(null);
  }

  /**
   * Add breadcrumb to improve issue triage.
   */
  addBreadcrumb(breadcrumb: BreadcrumbData) {
    this.ensureInit();
    if (!this.enabled) {
      return;
    }

    Sentry.addBreadcrumb({
      category: breadcrumb.category,
      message: breadcrumb.message,
      level: breadcrumb.level,
      data: breadcrumb.data,
    });
  }

  /**
   * Set a Sentry tag.
   */
  setTag(key: string, value: string) {
    this.ensureInit();
    if (!this.enabled) {
      return;
    }

    Sentry.setTag(key, value);
  }

  /**
   * Set additional context payload.
   */
  setExtra(key: string, value: unknown) {
    this.ensureInit();
    if (!this.enabled) {
      return;
    }

    Sentry.setContext(key, { value });
  }

  /**
   * Start a performance span.
   */
  startTransaction(name: string, op: string) {
    this.ensureInit();
    if (!this.enabled) {
      return {
        finish: () => {},
        setStatus: (_status: string) => {},
      };
    }

    const span = Sentry.startInactiveSpan({ name, op });

    return {
      finish: () => {
        span?.end();
      },
      setStatus: (status: string) => {
        span?.setStatus(status as unknown as Parameters<NonNullable<typeof span>['setStatus']>[0]);
      },
    };
  }

  /**
   * Wrap function execution and report uncaught exceptions.
   */
  wrapWithErrorBoundary<T extends (...args: unknown[]) => unknown>(
    fn: T,
    context?: { op: string; name: string }
  ): T {
    return ((...args: Parameters<T>) => {
      try {
        const result = fn(...args);

        if (result instanceof Promise) {
          return result.catch((error: Error) => {
            this.captureException(error, { extra: context });
            throw error;
          });
        }

        return result;
      } catch (error) {
        this.captureException(error as Error, { extra: context });
        throw error;
      }
    }) as T;
  }
}

// Singleton instance
export const monitoring = new MonitoringService();

// React hook for easy usage
export function useMonitoring() {
  return {
    captureException: monitoring.captureException.bind(monitoring),
    captureMessage: monitoring.captureMessage.bind(monitoring),
    addBreadcrumb: monitoring.addBreadcrumb.bind(monitoring),
    setUser: monitoring.setUser.bind(monitoring),
    setTag: monitoring.setTag.bind(monitoring),
    startTransaction: monitoring.startTransaction.bind(monitoring),
  };
}

// Error handler for use in error boundaries
export function handleError(error: Error, errorInfo?: { componentStack?: string }) {
  monitoring.captureException(error, {
    componentStack: errorInfo?.componentStack,
    page: typeof window !== 'undefined' ? window.location.pathname : undefined,
  });
}
