/**
 * Content-Security-Policy builder (extracted from middleware for testability).
 *
 * connect-src must include every backend origin the web app calls:
 * - Cloud Functions callables + discovery REST  → *.cloudfunctions.net
 * - App Check token exchange (firebaseappcheck)  → *.googleapis.com
 * - reCAPTCHA verification for App Check          → www.google.com
 * script-src/frame-src include the reCAPTCHA origins (google.com / gstatic.com)
 * so App Check's reCAPTCHA v3 script + iframe load.
 *
 * See docs/reports/crush_web_mobile_alignment_reaudit_2026-06-06.md (P0.2).
 */

export function buildCspHeader(isDevelopment: boolean, nonce: string): string {
  const scriptSrc = [
    "'self'",
    `'nonce-${nonce}'`,
    'https://apis.google.com',
    'https://*.firebaseio.com',
    'https://*.googleapis.com',
    'https://js.stripe.com',
    // App Check reCAPTCHA v3 loads its script from google.com/gstatic.com.
    'https://www.google.com',
    'https://www.gstatic.com',
    // Next.js webpack dev runtime needs eval/inline during local dev & E2E.
    ...(isDevelopment ? ["'unsafe-eval'", "'unsafe-inline'"] : []),
  ].join(' ');

  // Build CSP header with nonce instead of 'unsafe-inline' for script-src
  return [
    "default-src 'self'",
    `script-src ${scriptSrc}`,
    // style-src keeps 'unsafe-inline' — required for Tailwind CSS inline styles and Google Fonts
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "img-src 'self' data: blob: https://firebasestorage.googleapis.com https://lh3.googleusercontent.com https://*.stripe.com",
    "font-src 'self' https://fonts.gstatic.com",
    // Cloud Functions (callables + discovery REST) live on *.cloudfunctions.net;
    // App Check token exchange uses firebaseappcheck.googleapis.com (*.googleapis.com)
    // and reCAPTCHA verification reaches www.google.com.
    "connect-src 'self' https://*.firebaseio.com https://*.googleapis.com https://*.cloudfunctions.net https://*.firebase.google.com https://api.stripe.com https://firebasestorage.googleapis.com https://nominatim.openstreetmap.org https://www.google.com wss://*.firebaseio.com",
    // reCAPTCHA renders an iframe from google.com for App Check.
    "frame-src 'self' https://*.firebaseapp.com https://js.stripe.com https://hooks.stripe.com https://www.google.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    'upgrade-insecure-requests',
  ].join('; ');
}
