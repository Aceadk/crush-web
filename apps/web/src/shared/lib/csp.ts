/**
 * Content-Security-Policy builder (extracted from middleware for testability).
 *
 * connect-src must include every backend origin the web app calls:
 * - Cloud Functions callables + discovery REST  → *.cloudfunctions.net
 *   (and the canonical REST API origin once the domain decision lands)
 * - App Check token exchange (firebaseappcheck)  → *.googleapis.com
 * - reCAPTCHA verification for App Check          → www.google.com
 * - Firebase Storage download/upload             → firebasestorage.googleapis.com
 * - Web push / FCM registration + installations  → *.googleapis.com
 * - Stripe API                                    → api.stripe.com
 * script-src/frame-src include the reCAPTCHA + Stripe origins; worker-src allows
 * the firebase-messaging service worker. The policy is environment-specific:
 * development additionally allows local emulator origins (localhost/127.0.0.1
 * over http + ws) and webpack's unsafe-eval; staging/production stay
 * restrictive otherwise (HTTPS origins only, object-src 'none', base-uri 'self').
 *
 * Why script-src uses 'unsafe-inline' instead of a nonce (CR-AUD-025 revision):
 * almost every route in this app is statically prerendered, and Next.js embeds
 * its bootstrap/flight data as inline <script> tags in that static HTML. Those
 * scripts cannot carry a per-request nonce, and per the CSP spec the presence
 * of a nonce makes browsers IGNORE 'unsafe-inline' — so the previous
 * nonce-based policy blocked React hydration (and the theme/locale init
 * scripts) on every static page in production. A meaningful-but-working policy
 * beats a strict-but-breaking one. To return to a strict nonce +
 * 'strict-dynamic' policy, the affected routes must become dynamically
 * rendered (read the nonce via headers()) — see
 * https://nextjs.org/docs/app/guides/content-security-policy
 *
 * See docs/reports/crush_web_mobile_alignment_reaudit_2026-06-06.md (P0.2) and
 * domain_environment_matrix (canonical API origin).
 */

export interface CspOptions {
  isDevelopment: boolean;
  /**
   * Canonical REST API origin (e.g. https://api.crush.app) added once the domain
   * decision is made. Supplied from NEXT_PUBLIC_API_ORIGIN. Optional/unset is
   * fine — *.cloudfunctions.net already covers the default backend.
   */
  apiOrigin?: string | null;
}

/** Local Firebase emulator origins, allowed in development only. */
const DEV_EMULATOR_ORIGINS = [
  'http://localhost:*',
  'http://127.0.0.1:*',
  'ws://localhost:*',
  'ws://127.0.0.1:*',
];

function sanitizeApiOrigin(apiOrigin?: string | null): string | null {
  if (!apiOrigin) return null;
  const trimmed = apiOrigin.trim();
  // Only accept absolute https origins (or http for localhost in dev callers).
  if (!/^https?:\/\/[^\s'";]+$/.test(trimmed)) return null;
  return trimmed.replace(/\/$/, '');
}

export function buildCspHeader(options: CspOptions): string {
  const { isDevelopment } = options;
  const apiOrigin = sanitizeApiOrigin(options.apiOrigin);

  const scriptSrc = [
    "'self'",
    // Required for Next.js inline bootstrap scripts on statically prerendered
    // routes and the theme/locale init scripts (see header comment — a nonce
    // here would make browsers ignore 'unsafe-inline' and break hydration).
    "'unsafe-inline'",
    'https://apis.google.com',
    'https://*.firebaseio.com',
    'https://*.googleapis.com',
    'https://js.stripe.com',
    // App Check reCAPTCHA v3/Enterprise load their script from google/gstatic.
    'https://www.google.com',
    'https://www.gstatic.com',
    // Next.js webpack dev runtime needs eval during local dev & E2E.
    ...(isDevelopment ? ["'unsafe-eval'"] : []),
  ].join(' ');

  const connectSrc = [
    "'self'",
    'https://*.firebaseio.com',
    'https://*.googleapis.com', // App Check, FCM registration/installations, Storage
    'https://*.cloudfunctions.net', // callables + discovery REST
    'https://*.firebase.google.com',
    'https://api.stripe.com',
    'https://firebasestorage.googleapis.com',
    'https://nominatim.openstreetmap.org',
    'https://www.google.com', // reCAPTCHA verification
    'wss://*.firebaseio.com',
    ...(apiOrigin ? [apiOrigin] : []),
    ...(isDevelopment ? DEV_EMULATOR_ORIGINS : []),
  ].join(' ');

  return [
    "default-src 'self'",
    `script-src ${scriptSrc}`,
    // style-src keeps 'unsafe-inline' — required for Tailwind CSS inline styles and Google Fonts
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "img-src 'self' data: blob: https://firebasestorage.googleapis.com https://lh3.googleusercontent.com https://*.stripe.com",
    "font-src 'self' https://fonts.gstatic.com",
    `connect-src ${connectSrc}`,
    // reCAPTCHA renders an iframe from google.com for App Check.
    "frame-src 'self' https://*.firebaseapp.com https://js.stripe.com https://hooks.stripe.com https://www.google.com",
    // firebase-messaging service worker (web push) is served same-origin.
    "worker-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    // Local Next development serves plain HTTP. Upgrading same-origin RSC/API
    // requests there produces HTTPS-to-an-HTTP-port failures.
    ...(!isDevelopment ? ['upgrade-insecure-requests'] : []),
  ].join('; ');
}
