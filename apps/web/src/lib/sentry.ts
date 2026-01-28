/**
 * Sentry Monitoring Configuration
 *
 * To enable Sentry, set the following environment variables:
 * - NEXT_PUBLIC_SENTRY_DSN: Your Sentry DSN
 * - SENTRY_AUTH_TOKEN: Auth token for source map uploads (build time)
 * - SENTRY_ORG: Your Sentry organization slug
 * - SENTRY_PROJECT: Your Sentry project slug
 *
 * For full Sentry integration, run:
 * npx @sentry/wizard@latest -i nextjs
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

class MonitoringService {
  private initialized = false;
  private dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

  /**
   * Initialize Sentry
   * This should be called in instrumentation.ts or _app.tsx
   */
  async init() {
    if (this.initialized || !this.dsn) {
      if (!this.dsn) {
        console.log('[Monitoring] Sentry DSN not configured, running in mock mode');
      }
      return;
    }

    // In a real implementation, you would initialize Sentry here:
    // import * as Sentry from '@sentry/nextjs';
    // Sentry.init({
    //   dsn: this.dsn,
    //   environment: process.env.NODE_ENV,
    //   tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    //   replaysSessionSampleRate: 0.1,
    //   replaysOnErrorSampleRate: 1.0,
    //   integrations: [
    //     new Sentry.Replay(),
    //   ],
    // });

    this.initialized = true;
    console.log('[Monitoring] Sentry initialized');
  }

  /**
   * Capture an exception
   */
  captureException(error: Error, context?: ErrorContext) {
    console.error('[Monitoring] Exception captured:', error.message);

    if (context) {
      console.error('[Monitoring] Context:', context);
    }

    // In a real implementation:
    // Sentry.captureException(error, {
    //   user: context?.userId ? { id: context.userId, email: context.email } : undefined,
    //   extra: context?.extra,
    //   tags: {
    //     page: context?.page,
    //     isPremium: String(context?.isPremium),
    //   },
    // });
  }

  /**
   * Capture a message
   */
  captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info') {
    console.log(`[Monitoring] Message (${level}):`, message);

    // In a real implementation:
    // Sentry.captureMessage(message, level);
  }

  /**
   * Set user context
   */
  setUser(user: { id: string; email?: string; isPremium?: boolean } | null) {
    console.log('[Monitoring] User set:', user?.id || 'anonymous');

    // In a real implementation:
    // if (user) {
    //   Sentry.setUser({
    //     id: user.id,
    //     email: user.email,
    //   });
    //   Sentry.setTag('isPremium', String(user.isPremium));
    // } else {
    //   Sentry.setUser(null);
    // }
  }

  /**
   * Add a breadcrumb
   */
  addBreadcrumb(breadcrumb: BreadcrumbData) {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Monitoring] Breadcrumb (${breadcrumb.category}):`, breadcrumb.message);
    }

    // In a real implementation:
    // Sentry.addBreadcrumb({
    //   category: breadcrumb.category,
    //   message: breadcrumb.message,
    //   level: breadcrumb.level,
    //   data: breadcrumb.data,
    // });
  }

  /**
   * Set a tag
   */
  setTag(key: string, value: string) {
    console.log(`[Monitoring] Tag set: ${key}=${value}`);

    // In a real implementation:
    // Sentry.setTag(key, value);
  }

  /**
   * Set extra context
   */
  setExtra(key: string, value: unknown) {
    console.log(`[Monitoring] Extra set: ${key}`, value);

    // In a real implementation:
    // Sentry.setExtra(key, value);
  }

  /**
   * Start a transaction for performance monitoring
   */
  startTransaction(name: string, op: string) {
    console.log(`[Monitoring] Transaction started: ${name} (${op})`);

    // In a real implementation:
    // return Sentry.startTransaction({ name, op });

    // Mock transaction
    return {
      finish: () => {
        console.log(`[Monitoring] Transaction finished: ${name}`);
      },
      setStatus: (status: string) => {
        console.log(`[Monitoring] Transaction status: ${status}`);
      },
    };
  }

  /**
   * Wrap a function with error boundary
   */
  wrapWithErrorBoundary<T extends (...args: unknown[]) => unknown>(
    fn: T,
    context?: { op: string; name: string }
  ): T {
    return ((...args: Parameters<T>) => {
      try {
        const result = fn(...args);

        // Handle async functions
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
