// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('server-only', () => ({}));

const { verifySessionCookieMock, privateAccountGet, publicUserGet, portalSessionCreate } =
  vi.hoisted(() => ({
    verifySessionCookieMock: vi.fn(async (): Promise<unknown> => null),
    privateAccountGet: vi.fn(),
    publicUserGet: vi.fn(),
    portalSessionCreate: vi.fn(async () => ({
      url: 'https://billing.stripe.com/p/session/test_portal',
    })),
  }));

vi.mock('@/shared/lib/server-session', () => ({
  verifySessionCookie: verifySessionCookieMock,
}));

vi.mock('@/shared/lib/rate-limit', () => ({
  checkRateLimit: vi.fn(async () => ({ allowed: true, resetAt: Date.now() + 1000 })),
  getRateLimitKey: vi.fn(() => 'portal-test-key'),
}));

const privateAccountDoc = { get: privateAccountGet };
const privateCollection = { doc: vi.fn(() => privateAccountDoc) };
const userDoc = {
  collection: vi.fn(() => privateCollection),
  get: publicUserGet,
};
const usersCollection = { doc: vi.fn(() => userDoc) };

vi.mock('@/lib/firebase-admin', () => ({
  getAdminDb: () => ({ collection: vi.fn(() => usersCollection) }),
}));

vi.mock('stripe', () => ({
  default: class StripeMock {
    billingPortal = { sessions: { create: portalSessionCreate } };
  },
}));

const ORIGIN = 'http://localhost:3000';

function portalRequest(body: Record<string, unknown> = {}): NextRequest {
  return new NextRequest(`${ORIGIN}/api/stripe/create-portal-session`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      origin: ORIGIN,
      cookie: 'auth-token=test-session',
    },
    body: JSON.stringify(body),
  });
}

function snapshot(fields: Record<string, unknown>) {
  return { get: (field: string) => fields[field] };
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.STRIPE_SECRET_KEY = 'sk_test_dummy';
  process.env.NEXT_PUBLIC_APP_URL = ORIGIN;
  privateAccountGet.mockResolvedValue(snapshot({}));
  publicUserGet.mockResolvedValue(snapshot({}));
});

describe('POST /api/stripe/create-portal-session', () => {
  it('rejects a request without a verified Firebase session', async () => {
    const { POST } = await import('../stripe/create-portal-session/route');

    const response = await POST(portalRequest({ customerId: 'cus_attacker' }));

    expect(response.status).toBe(401);
    expect(portalSessionCreate).not.toHaveBeenCalled();
  });

  it('uses the private server-owned customer ID and a fixed return URL', async () => {
    verifySessionCookieMock.mockResolvedValueOnce({
      uid: 'session-user',
      email: 'user@example.com',
      emailVerified: true,
    });
    privateAccountGet.mockResolvedValueOnce(snapshot({ stripeCustomerId: 'cus_private' }));
    const { POST } = await import('../stripe/create-portal-session/route');

    const response = await POST(
      portalRequest({
        customerId: 'cus_attacker',
        returnUrl: 'https://evil.example/steal',
      })
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      url: 'https://billing.stripe.com/p/session/test_portal',
    });
    expect(usersCollection.doc).toHaveBeenCalledWith('session-user');
    expect(portalSessionCreate).toHaveBeenCalledWith({
      customer: 'cus_private',
      return_url: 'http://localhost:3000/settings/account',
    });
    expect(publicUserGet).not.toHaveBeenCalled();
  });

  it('falls back to the legacy public customer field during migration', async () => {
    verifySessionCookieMock.mockResolvedValueOnce({ uid: 'legacy-user' });
    publicUserGet.mockResolvedValueOnce(snapshot({ stripeCustomerId: 'cus_legacy' }));
    const { POST } = await import('../stripe/create-portal-session/route');

    const response = await POST(portalRequest());

    expect(response.status).toBe(200);
    expect(portalSessionCreate).toHaveBeenCalledWith({
      customer: 'cus_legacy',
      return_url: 'http://localhost:3000/settings/account',
    });
  });

  it('returns a conflict when the signed-in account has no Stripe customer', async () => {
    verifySessionCookieMock.mockResolvedValueOnce({ uid: 'native-iap-user' });
    const { POST } = await import('../stripe/create-portal-session/route');

    const response = await POST(portalRequest());

    expect(response.status).toBe(409);
    expect(portalSessionCreate).not.toHaveBeenCalled();
  });
});
