import { NextRequest, NextResponse } from 'next/server';
import { verifyCsrf } from '@/shared/lib/csrf';
import { checkRateLimit, getRateLimitKey } from '@/shared/lib/rate-limit';
import { verifySessionCookie } from '@/shared/lib/server-session';

const LAST_ACTIVE_COOKIE_NAME = 'session-last-active';
const REMEMBER_ME_COOKIE_NAME = 'session-remember-me';
// Matches the Firebase session-cookie maximum lifetime (14 days).
const PERSISTENT_SESSION_MAX_AGE_SECONDS = 14 * 24 * 60 * 60;

function createActivityCookieOptions(rememberMe: boolean) {
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

  return baseOptions;
}

/**
 * POST /api/auth/activity — refresh session last-active timestamp for idle timeout enforcement
 */
export async function POST(request: NextRequest) {
  try {
    // CSRF protection
    const csrfError = verifyCsrf(request);
    if (csrfError) {
      return NextResponse.json({ error: csrfError }, { status: 403 });
    }

    // Rate limiting — high enough for normal interaction, low enough to throttle abuse
    const rlKey = getRateLimitKey(request, 'auth-activity');
    const rl = await checkRateLimit(rlKey, { limit: 240, windowSeconds: 900 });
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Too many requests' },
        { status: 429, headers: { 'Retry-After': String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } }
      );
    }

    // Cryptographically verify the session cookie — presence is not enough.
    const session = await verifySessionCookie(request);
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const rememberMe = request.cookies.get(REMEMBER_ME_COOKIE_NAME)?.value === '1';
    const lastActiveAt = Date.now();
    const response = NextResponse.json({ success: true, lastActiveAt });

    response.cookies.set(
      LAST_ACTIVE_COOKIE_NAME,
      String(lastActiveAt),
      createActivityCookieOptions(rememberMe)
    );

    return response;
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
