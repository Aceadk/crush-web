/**
 * Simple in-memory rate limiter for API routes.
 * Uses a sliding window counter per key.
 *
 * Note: This is per-instance. For multi-instance deployments (e.g. Vercel
 * serverless), consider Upstash Redis rate limiting for global state.
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// Cleanup stale entries every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store) {
      if (now > entry.resetAt) {
        store.delete(key);
      }
    }
  }, 5 * 60 * 1000);
}

interface RateLimitOptions {
  /** Maximum requests allowed in the window */
  limit: number;
  /** Window duration in seconds */
  windowSeconds: number;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

export function checkRateLimit(
  key: string,
  options: RateLimitOptions
): RateLimitResult {
  const now = Date.now();
  const windowMs = options.windowSeconds * 1000;

  const entry = store.get(key);

  // No entry or window expired — allow and start fresh
  if (!entry || now > entry.resetAt) {
    const resetAt = now + windowMs;
    store.set(key, { count: 1, resetAt });
    return { allowed: true, remaining: options.limit - 1, resetAt };
  }

  // Within window — check count
  if (entry.count < options.limit) {
    entry.count++;
    return {
      allowed: true,
      remaining: options.limit - entry.count,
      resetAt: entry.resetAt,
    };
  }

  // Rate limit exceeded
  return {
    allowed: false,
    remaining: 0,
    resetAt: entry.resetAt,
  };
}

/**
 * Extract a rate limit key from a request.
 * Uses IP address + optional identifier.
 */
export function getRateLimitKey(
  request: Request,
  identifier?: string
): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded?.split(',')[0]?.trim() || 'unknown';
  return identifier ? `${ip}:${identifier}` : ip;
}
