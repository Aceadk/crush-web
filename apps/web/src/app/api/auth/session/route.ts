import { NextRequest, NextResponse } from 'next/server';
import { verifyCsrf } from '@/shared/lib/csrf';
import { checkRateLimit, getRateLimitKey } from '@/shared/lib/rate-limit';

/**
 * POST /api/auth/session — Set HttpOnly auth cookie (called from client after Firebase sign-in)
 * DELETE /api/auth/session — Clear the auth cookie (called on sign-out)
 */

const AUTH_COOKIE_NAME = 'auth-token';
const LAST_ACTIVE_COOKIE_NAME = 'session-last-active';
const REMEMBER_ME_COOKIE_NAME = 'session-remember-me';
const PERSISTENT_SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60; // 30 days

function createSessionCookieOptions(rememberMe: boolean) {
  const baseOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
  };

  if (rememberMe) {
    return {
      ...baseOptions,
      maxAge: PERSISTENT_SESSION_MAX_AGE_SECONDS,
    };
  }

  // Session cookie (cleared when browser session ends)
  return baseOptions;
}

function clearCookie(response: NextResponse, name: string) {
  response.cookies.set(name, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
}

export async function POST(request: NextRequest) {
  try {
    // CSRF protection
    const csrfError = verifyCsrf(request);
    if (csrfError) {
      return NextResponse.json({ error: csrfError }, { status: 403 });
    }

    // Rate limiting — 20 session sets per 15 minutes per IP
    const rlKey = getRateLimitKey(request, 'session');
    const rl = await checkRateLimit(rlKey, { limit: 20, windowSeconds: 900 });
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Too many requests' },
        { status: 429, headers: { 'Retry-After': String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } }
      );
    }

    const { token, rememberMe } = await request.json();

    if (!token || typeof token !== 'string') {
      return NextResponse.json(
        { error: 'Token is required' },
        { status: 400 }
      );
    }

    const rememberSession = typeof rememberMe === 'boolean' ? rememberMe : true;
    const sessionCookieOptions = createSessionCookieOptions(rememberSession);
    const now = Date.now();
    const response = NextResponse.json({ success: true, rememberMe: rememberSession });

    // Set HttpOnly cookies — not accessible via document.cookie
    response.cookies.set(AUTH_COOKIE_NAME, token, sessionCookieOptions);
    response.cookies.set(LAST_ACTIVE_COOKIE_NAME, String(now), sessionCookieOptions);
    response.cookies.set(
      REMEMBER_ME_COOKIE_NAME,
      rememberSession ? '1' : '0',
      sessionCookieOptions
    );

    return response;
  } catch {
    return NextResponse.json(
      { error: 'Invalid request' },
      { status: 400 }
    );
  }
}

export async function DELETE() {
  const response = NextResponse.json({ success: true });

  clearCookie(response, AUTH_COOKIE_NAME);
  clearCookie(response, LAST_ACTIVE_COOKIE_NAME);
  clearCookie(response, REMEMBER_ME_COOKIE_NAME);

  return response;
}
