/**
 * Unit tests for rate-limit utility (in-memory mode).
 * CR-AUD-040
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

// Clear module cache between tests to reset memoryStore
let checkRateLimit: typeof import('../rate-limit').checkRateLimit;
let checkRateLimitSync: typeof import('../rate-limit').checkRateLimitSync;
let getRateLimitKey: typeof import('../rate-limit').getRateLimitKey;

beforeEach(async () => {
  vi.resetModules();
  const mod = await import('../rate-limit');
  checkRateLimit = mod.checkRateLimit;
  checkRateLimitSync = mod.checkRateLimitSync;
  getRateLimitKey = mod.getRateLimitKey;
});

describe('checkRateLimitSync', () => {
  it('allows first request', () => {
    const result = checkRateLimitSync('test-key-1', { limit: 5, windowSeconds: 60 });
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(4);
    expect(result.resetAt).toBeGreaterThan(Date.now());
  });

  it('decrements remaining on each call', () => {
    const opts = { limit: 3, windowSeconds: 60 };
    const r1 = checkRateLimitSync('test-key-2', opts);
    const r2 = checkRateLimitSync('test-key-2', opts);
    const r3 = checkRateLimitSync('test-key-2', opts);

    expect(r1.remaining).toBe(2);
    expect(r2.remaining).toBe(1);
    expect(r3.remaining).toBe(0);
    expect(r3.allowed).toBe(true);
  });

  it('blocks after limit is exceeded', () => {
    const opts = { limit: 2, windowSeconds: 60 };
    checkRateLimitSync('test-key-3', opts);
    checkRateLimitSync('test-key-3', opts);
    const result = checkRateLimitSync('test-key-3', opts);

    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it('resets after window expires', () => {
    const opts = { limit: 1, windowSeconds: 1 };
    checkRateLimitSync('test-key-4', opts);

    // Simulate window expiry
    vi.useFakeTimers();
    vi.advanceTimersByTime(1100);

    const result = checkRateLimitSync('test-key-4', opts);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(0);
    vi.useRealTimers();
  });

  it('tracks different keys independently', () => {
    const opts = { limit: 1, windowSeconds: 60 };
    checkRateLimitSync('key-a', opts);
    const resultA = checkRateLimitSync('key-a', opts);
    const resultB = checkRateLimitSync('key-b', opts);

    expect(resultA.allowed).toBe(false);
    expect(resultB.allowed).toBe(true);
  });
});

describe('checkRateLimit (async, in-memory fallback)', () => {
  it('works the same as sync in non-Redis mode', async () => {
    const result = await checkRateLimit('async-key-1', { limit: 5, windowSeconds: 60 });
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(4);
  });

  it('blocks after limit exceeded', async () => {
    const opts = { limit: 1, windowSeconds: 60 };
    await checkRateLimit('async-key-2', opts);
    const result = await checkRateLimit('async-key-2', opts);
    expect(result.allowed).toBe(false);
  });
});

describe('getRateLimitKey', () => {
  it('extracts IP from x-forwarded-for header', () => {
    const request = new Request('https://example.com', {
      headers: { 'x-forwarded-for': '1.2.3.4, 5.6.7.8' },
    });
    expect(getRateLimitKey(request)).toBe('1.2.3.4');
  });

  it('appends identifier when provided', () => {
    const request = new Request('https://example.com', {
      headers: { 'x-forwarded-for': '10.0.0.1' },
    });
    expect(getRateLimitKey(request, 'login')).toBe('10.0.0.1:login');
  });

  it('falls back to "unknown" when no IP header', () => {
    const request = new Request('https://example.com');
    expect(getRateLimitKey(request)).toBe('unknown');
  });
});
