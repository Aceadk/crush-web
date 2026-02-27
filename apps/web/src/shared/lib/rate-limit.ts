/**
 * Rate limiter for API routes (CR-AUD-026).
 *
 * Uses Upstash Redis when UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN
 * are configured. Falls back to in-memory sliding window counter otherwise.
 *
 * Redis mode: Persists across serverless cold starts and is shared across
 * all Vercel instances. In-memory mode: Per-instance only (dev/fallback).
 */

// ---------------------------------------------------------------------------
// In-memory fallback store
// ---------------------------------------------------------------------------

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const memoryStore = new Map<string, RateLimitEntry>();

// Cleanup stale entries every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of memoryStore) {
      if (now > entry.resetAt) {
        memoryStore.delete(key);
      }
    }
  }, 5 * 60 * 1000);
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Upstash Redis helpers (lazy-loaded to avoid import errors when not configured)
// ---------------------------------------------------------------------------

const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
const useRedis = Boolean(UPSTASH_URL && UPSTASH_TOKEN);

/**
 * Minimal Upstash Redis REST client — avoids adding a package dependency.
 * Uses the Upstash REST API directly via fetch.
 */
async function redisCommand(
  ...args: (string | number)[]
): Promise<{ result: unknown }> {
  const res = await fetch(`${UPSTASH_URL}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${UPSTASH_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(args),
  });

  if (!res.ok) {
    throw new Error(`Upstash Redis error: ${res.status} ${res.statusText}`);
  }

  return res.json() as Promise<{ result: unknown }>;
}

/**
 * Redis-backed sliding window rate limit using INCR + EXPIRE.
 */
async function checkRedisRateLimit(
  key: string,
  options: RateLimitOptions
): Promise<RateLimitResult> {
  const redisKey = `ratelimit:${key}`;
  const now = Date.now();
  const resetAt = now + options.windowSeconds * 1000;

  try {
    // INCR the counter (creates key with value 1 if it doesn't exist)
    const incrResult = await redisCommand('INCR', redisKey);
    const count = Number(incrResult.result);

    // Set TTL on first request in window (count === 1 means key was just created)
    if (count === 1) {
      await redisCommand('EXPIRE', redisKey, options.windowSeconds);
    }

    // Get TTL for accurate resetAt
    const ttlResult = await redisCommand('TTL', redisKey);
    const ttl = Number(ttlResult.result);
    const actualResetAt = ttl > 0 ? now + ttl * 1000 : resetAt;

    if (count <= options.limit) {
      return {
        allowed: true,
        remaining: options.limit - count,
        resetAt: actualResetAt,
      };
    }

    return {
      allowed: false,
      remaining: 0,
      resetAt: actualResetAt,
    };
  } catch (error) {
    // If Redis fails, fall back to in-memory to avoid blocking requests
    if (process.env.NODE_ENV === 'development') {
      console.error('[RateLimit] Redis error, falling back to in-memory:', error);
    }
    return checkMemoryRateLimit(key, options);
  }
}

// ---------------------------------------------------------------------------
// In-memory rate limit (fallback)
// ---------------------------------------------------------------------------

function checkMemoryRateLimit(
  key: string,
  options: RateLimitOptions
): RateLimitResult {
  const now = Date.now();
  const windowMs = options.windowSeconds * 1000;

  const entry = memoryStore.get(key);

  // No entry or window expired — allow and start fresh
  if (!entry || now > entry.resetAt) {
    const resetAt = now + windowMs;
    memoryStore.set(key, { count: 1, resetAt });
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

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Check rate limit for a given key.
 * Uses Redis when configured, otherwise falls back to in-memory.
 */
export async function checkRateLimit(
  key: string,
  options: RateLimitOptions
): Promise<RateLimitResult> {
  if (useRedis) {
    return checkRedisRateLimit(key, options);
  }
  return checkMemoryRateLimit(key, options);
}

/**
 * Synchronous in-memory rate limit check (for backwards compatibility).
 * Always uses in-memory store regardless of Redis configuration.
 */
export function checkRateLimitSync(
  key: string,
  options: RateLimitOptions
): RateLimitResult {
  return checkMemoryRateLimit(key, options);
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
