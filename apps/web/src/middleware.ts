import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Routes that require authentication
const protectedRoutes = [
  '/discover',
  '/matches',
  '/messages',
  '/profile',
  '/settings',
  '/onboarding',
  '/likes',
  '/weekly-picks',
  '/date-safety',
  '/date-ideas',
  '/compatibility-quiz',
  '/insights',
  '/premium',
];

// Routes that should redirect to app if authenticated
const authRoutes = [
  '/auth/login',
  '/auth/signup',
  '/auth/phone',
  '/auth/forgot-password',
];

const AUTH_COOKIE_NAME = 'auth-token';
const LAST_ACTIVE_COOKIE_NAME = 'session-last-active';
const REMEMBER_ME_COOKIE_NAME = 'session-remember-me';
const PERSISTENT_SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60; // 30 days

const parsedIdleTimeout = Number(process.env.SESSION_IDLE_TIMEOUT_SECONDS);
const SESSION_IDLE_TIMEOUT_SECONDS =
  Number.isFinite(parsedIdleTimeout) && parsedIdleTimeout > 0
    ? parsedIdleTimeout
    : 30 * 60; // 30 minutes

function buildCspHeader(isDevelopment: boolean, nonce: string): string {
  const scriptSrc = [
    "'self'",
    `'nonce-${nonce}'`,
    'https://apis.google.com',
    'https://*.firebaseio.com',
    'https://*.googleapis.com',
    'https://js.stripe.com',
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
    "connect-src 'self' https://*.firebaseio.com https://*.googleapis.com https://*.firebase.google.com https://api.stripe.com https://firebasestorage.googleapis.com https://nominatim.openstreetmap.org wss://*.firebaseio.com",
    "frame-src 'self' https://*.firebaseapp.com https://js.stripe.com https://hooks.stripe.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    'upgrade-insecure-requests',
  ].join('; ');
}

function applyCspHeader(response: NextResponse, cspHeader: string) {
  response.headers.set('Content-Security-Policy', cspHeader);
}

function clearAuthCookies(response: NextResponse) {
  const clearOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: 0,
  };

  response.cookies.set(AUTH_COOKIE_NAME, '', clearOptions);
  response.cookies.set(LAST_ACTIVE_COOKIE_NAME, '', clearOptions);
  response.cookies.set(REMEMBER_ME_COOKIE_NAME, '', clearOptions);
}

function maybeSeedLastActiveCookie(request: NextRequest, response: NextResponse) {
  const authToken = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  const hasLastActive = Boolean(request.cookies.get(LAST_ACTIVE_COOKIE_NAME)?.value);

  if (!authToken || hasLastActive) {
    return;
  }

  const rememberMe = request.cookies.get(REMEMBER_ME_COOKIE_NAME)?.value === '1';
  const baseOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
  };

  if (rememberMe) {
    response.cookies.set(LAST_ACTIVE_COOKIE_NAME, String(Date.now()), {
      ...baseOptions,
      maxAge: PERSISTENT_SESSION_MAX_AGE_SECONDS,
    });
    return;
  }

  response.cookies.set(LAST_ACTIVE_COOKIE_NAME, String(Date.now()), baseOptions);
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isDevelopment = process.env.NODE_ENV !== 'production';

  // Generate a nonce for CSP (CR-AUD-025)
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
  const cspHeader = buildCspHeader(isDevelopment, nonce);

  const authToken = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  const lastActiveRaw = request.cookies.get(LAST_ACTIVE_COOKIE_NAME)?.value;

  let lastActiveAt: number | null = null;
  if (lastActiveRaw) {
    const parsed = Number(lastActiveRaw);
    if (Number.isFinite(parsed) && parsed > 0) {
      lastActiveAt = parsed;
    }
  }

  const idleTimeoutMs = SESSION_IDLE_TIMEOUT_SECONDS * 1000;
  const now = Date.now();
  const sessionExpired = Boolean(authToken && lastActiveAt && now - lastActiveAt > idleTimeoutMs);
  const effectiveAuthToken = sessionExpired ? undefined : authToken;

  // Check if the route is protected
  const isProtectedRoute = protectedRoutes.some((route) =>
    pathname === route || pathname.startsWith(`${route}/`)
  );

  // Check if the route is an auth route
  const isAuthRoute = authRoutes.some((route) =>
    pathname === route || pathname.startsWith(`${route}/`)
  );

  // Redirect unauthenticated users from protected routes
  if (isProtectedRoute && !effectiveAuthToken) {
    const loginUrl = new URL('/auth/login', request.url);
    const intendedPath = `${pathname}${request.nextUrl.search}`;
    loginUrl.searchParams.set('redirect', intendedPath);

    if (sessionExpired) {
      loginUrl.searchParams.set('reason', 'timeout');
    }

    const response = NextResponse.redirect(loginUrl);
    if (sessionExpired) {
      clearAuthCookies(response);
    }

    applyCspHeader(response, cspHeader);
    return response;
  }

  // Redirect authenticated users from auth routes to discover
  if (isAuthRoute && effectiveAuthToken) {
    const response = NextResponse.redirect(new URL('/discover', request.url));
    applyCspHeader(response, cspHeader);
    return response;
  }

  // For all other requests, set CSP header and pass nonce via request header
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });

  if (sessionExpired) {
    clearAuthCookies(response);
  } else {
    maybeSeedLastActiveCookie(request, response);
  }

  applyCspHeader(response, cspHeader);
  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     * - api routes
     */
    '/((?!_next/static|_next/image|favicon.ico|public|api).*)',
  ],
};
