// @vitest-environment node
/**
 * Contract tests for server-side session verification (CR security fix).
 *
 * Invariants:
 * 1. POST /api/auth/session never stores a client-supplied value in the auth
 *    cookie — it verifies the ID token and stores a server-minted Firebase
 *    session cookie, or rejects with 401.
 * 2. /api/stripe/create-checkout-session derives the acting user from the
 *    verified session cookie, never from request-body fields.
 * 3. /api/auth/activity rejects requests whose session cookie fails
 *    verification (presence alone is not authentication).
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('server-only', () => ({}));

const { verifyIdToken, createSessionCookie, verifySessionCookieMock } = vi.hoisted(() => ({
  verifyIdToken: vi.fn(),
  createSessionCookie: vi.fn(),
  verifySessionCookieMock: vi.fn(async (): Promise<unknown> => null),
}));

vi.mock('@/lib/firebase-admin', () => ({
  getAdminAuth: () => ({ verifyIdToken, createSessionCookie }),
}));

vi.mock('@/shared/lib/server-session', () => ({
  AUTH_COOKIE_NAME: 'auth-token',
  verifySessionCookie: verifySessionCookieMock,
}));

vi.mock('@/shared/lib/rate-limit', () => ({
  checkRateLimit: vi.fn(async () => ({ allowed: true, resetAt: Date.now() + 1000 })),
  getRateLimitKey: vi.fn(() => 'test-key'),
}));

const stripeSessionCreate = vi.fn(async () => ({
  id: 'cs_test_123',
  url: 'https://checkout.stripe.com/test',
}));
vi.mock('stripe', () => ({
  default: class StripeMock {
    checkout = { sessions: { create: stripeSessionCreate } };
  },
}));

const ORIGIN = 'http://localhost:3000';

function jsonRequest(
  url: string,
  body: unknown,
  options: { cookie?: string } = {}
): NextRequest {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    origin: ORIGIN,
  };
  if (options.cookie) {
    headers.cookie = options.cookie;
  }
  return new NextRequest(`${ORIGIN}${url}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.STRIPE_SECRET_KEY = 'sk_test_dummy';
});

describe('POST /api/auth/session', () => {
  it('rejects an unverifiable token with 401 and sets no auth cookie', async () => {
    verifyIdToken.mockRejectedValueOnce(new Error('invalid token'));
    const { POST } = await import('../auth/session/route');

    const response = await POST(jsonRequest('/api/auth/session', { token: 'forged-value' }));

    expect(response.status).toBe(401);
    expect(response.cookies.get('auth-token')).toBeUndefined();
    expect(createSessionCookie).not.toHaveBeenCalled();
  });

  it('stores the server-minted session cookie, not the raw client token', async () => {
    verifyIdToken.mockResolvedValueOnce({ uid: 'user-1' });
    createSessionCookie.mockResolvedValueOnce('server-minted-session-jwt');
    const { POST } = await import('../auth/session/route');

    const response = await POST(
      jsonRequest('/api/auth/session', { token: 'real-id-token', rememberMe: true })
    );

    expect(response.status).toBe(200);
    expect(verifyIdToken).toHaveBeenCalledWith('real-id-token');
    const cookie = response.cookies.get('auth-token');
    expect(cookie?.value).toBe('server-minted-session-jwt');
    expect(cookie?.value).not.toBe('real-id-token');
    // Remembered sessions are capped at Firebase's 14-day session-cookie limit.
    expect(createSessionCookie).toHaveBeenCalledWith('real-id-token', {
      expiresIn: 14 * 24 * 60 * 60 * 1000,
    });
    expect(cookie?.maxAge).toBe(14 * 24 * 60 * 60);
  });

  it('uses a 1-day session JWT for non-remembered sessions', async () => {
    verifyIdToken.mockResolvedValueOnce({ uid: 'user-1' });
    createSessionCookie.mockResolvedValueOnce('short-session-jwt');
    const { POST } = await import('../auth/session/route');

    const response = await POST(
      jsonRequest('/api/auth/session', { token: 'real-id-token', rememberMe: false })
    );

    expect(response.status).toBe(200);
    expect(createSessionCookie).toHaveBeenCalledWith('real-id-token', {
      expiresIn: 24 * 60 * 60 * 1000,
    });
    // Browser-session cookie: no Max-Age attribute.
    expect(response.cookies.get('auth-token')?.maxAge).toBeUndefined();
  });
});

describe('POST /api/stripe/create-checkout-session', () => {
  it('rejects requests without a verifiable session', async () => {
    createSessionCookie.mockClear();
    const { POST } = await import('../stripe/create-checkout-session/route');

    const response = await POST(
      jsonRequest(
        '/api/stripe/create-checkout-session',
        { tier: 'plus', period: 'monthly', userId: 'victim-uid' },
        { cookie: 'auth-token=any-non-verifiable-value' }
      )
    );

    expect(response.status).toBe(401);
    expect(stripeSessionCreate).not.toHaveBeenCalled();
  });

  it('derives identity from the verified session and ignores body userId/userEmail', async () => {
    const { POST } = await import('../stripe/create-checkout-session/route');
    verifySessionCookieMock.mockResolvedValueOnce({
      uid: 'session-uid',
      email: 'session@example.com',
      emailVerified: true,
    });

    const response = await POST(
      jsonRequest(
        '/api/stripe/create-checkout-session',
        {
          tier: 'plus',
          period: 'monthly',
          userId: 'attacker-chosen-uid',
          userEmail: 'attacker@example.com',
        },
        { cookie: 'auth-token=valid-session' }
      )
    );

    expect(response.status).toBe(200);
    expect(stripeSessionCreate).toHaveBeenCalledTimes(1);
    const params = stripeSessionCreate.mock.calls[0][0] as Record<string, unknown>;
    expect(params.client_reference_id).toBe('session-uid');
    expect(params.customer_email).toBe('session@example.com');
    expect((params.metadata as Record<string, string>).userId).toBe('session-uid');
  });
});

describe('POST /api/auth/activity', () => {
  it('rejects a non-verifiable session cookie with 401', async () => {
    const { POST } = await import('../auth/activity/route');

    const response = await POST(
      jsonRequest('/api/auth/activity', {}, { cookie: 'auth-token=stale-or-forged' })
    );

    expect(response.status).toBe(401);
  });
});
