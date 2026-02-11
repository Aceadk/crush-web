import { NextRequest, NextResponse } from 'next/server';
import { verifyCsrf } from '@/shared/lib/csrf';
import { checkRateLimit, getRateLimitKey } from '@/shared/lib/rate-limit';

/**
 * POST /api/auth/session — Set HttpOnly auth cookie (called from client after Firebase sign-in)
 * DELETE /api/auth/session — Clear the auth cookie (called on sign-out)
 */

export async function POST(request: NextRequest) {
  try {
    // CSRF protection
    const csrfError = verifyCsrf(request);
    if (csrfError) {
      return NextResponse.json({ error: csrfError }, { status: 403 });
    }

    // Rate limiting — 20 session sets per 15 minutes per IP
    const rlKey = getRateLimitKey(request, 'session');
    const rl = checkRateLimit(rlKey, { limit: 20, windowSeconds: 900 });
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Too many requests' },
        { status: 429, headers: { 'Retry-After': String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } }
      );
    }

    const { token } = await request.json();

    if (!token || typeof token !== 'string') {
      return NextResponse.json(
        { error: 'Token is required' },
        { status: 400 }
      );
    }

    const response = NextResponse.json({ success: true });

    // Set HttpOnly cookie — not accessible via document.cookie
    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

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

  response.cookies.set('auth-token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });

  return response;
}
