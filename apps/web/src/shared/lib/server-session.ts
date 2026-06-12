import 'server-only';

import type { NextRequest } from 'next/server';
import { getAdminAuth } from '@/lib/firebase-admin';

export const AUTH_COOKIE_NAME = 'auth-token';

export interface VerifiedSession {
  uid: string;
  email: string | null;
  emailVerified: boolean;
}

/**
 * Verify the HttpOnly Firebase session cookie set by POST /api/auth/session.
 *
 * Returns the verified identity, or `null` when the cookie is missing,
 * malformed, expired, or fails signature verification. API routes must derive
 * the acting user from this result — never from request-body fields.
 *
 * Revocation is not re-checked per request (it would add a network round-trip
 * to every call); sign-out clears the cookie and the session JWT expires on
 * its own (1 day, or 14 days for remembered sessions).
 */
export async function verifySessionCookie(
  request: NextRequest
): Promise<VerifiedSession | null> {
  const cookie = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  if (!cookie) {
    return null;
  }

  try {
    const decoded = await getAdminAuth().verifySessionCookie(cookie, false);
    return {
      uid: decoded.uid,
      email: decoded.email ?? null,
      emailVerified: decoded.email_verified === true,
    };
  } catch {
    return null;
  }
}
