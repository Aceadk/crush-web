/**
 * CSRF protection utilities for API routes.
 *
 * Uses the "double submit cookie" pattern with Origin/Referer header
 * verification. Since we're a Next.js app with SameSite=Lax cookies,
 * the primary defense is verifying the request origin matches our domain.
 */

const ALLOWED_ORIGINS = new Set([
  process.env.NEXT_PUBLIC_APP_URL?.trim(),
  'https://crush.app',
  'https://crush-web-chi.vercel.app',
  'http://localhost:3000',
  'http://localhost:3001',
].filter(Boolean));

/**
 * Verify that a mutating request (POST, PUT, DELETE, PATCH) comes from
 * an allowed origin. Returns null if valid, or an error message if invalid.
 */
export function verifyCsrf(request: Request): string | null {
  const origin = request.headers.get('origin');
  const referer = request.headers.get('referer');

  // Origin header is the most reliable
  if (origin) {
    if (ALLOWED_ORIGINS.has(origin)) return null;
    return `Forbidden: origin ${origin} not allowed`;
  }

  // Fall back to Referer
  if (referer) {
    try {
      const refererOrigin = new URL(referer).origin;
      if (ALLOWED_ORIGINS.has(refererOrigin)) return null;
      return `Forbidden: referer origin ${refererOrigin} not allowed`;
    } catch {
      return 'Forbidden: invalid referer';
    }
  }

  // No origin or referer — block by default for API routes
  // (Stripe webhooks are excluded from this check)
  return 'Forbidden: missing origin header';
}
