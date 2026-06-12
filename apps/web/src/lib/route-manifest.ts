/**
 * As-built web route manifest (Phase 6 Step 11).
 *
 * The canonical list of routes the web app actually implements, plus the set of
 * routes the notification resolver can navigate to. route-existence.test.ts
 * validates both against the filesystem so notifications/deep links never point
 * at a route that doesn't exist (the old route matrix was aspirational).
 *
 * Dynamic segments are written as `:param` here and matched against Next.js
 * `[param]` directories on disk.
 */

/** Every implemented web route (as-built; mirrors apps/web/src/app/**\/page.tsx). */
export const WEB_ROUTES = [
  '/',
  '/about',
  '/auth/callback',
  '/auth/device-verify',
  '/auth/device-verify/complete',
  '/auth/forgot-password',
  '/auth/login',
  '/auth/phone',
  '/auth/signup',
  '/auth/verify',
  '/auth/verify-email',
  '/compatibility-quiz',
  '/contact',
  '/date-ideas',
  '/date-safety',
  '/discover',
  '/faq',
  '/features',
  '/finishSignIn',
  '/guidelines',
  '/help',
  '/insights',
  '/likes',
  '/matches',
  '/messages',
  '/messages/:matchId',
  '/messages/requests',
  '/onboarding',
  '/premium',
  '/premium/cancel',
  '/premium/success',
  '/pricing',
  '/privacy',
  '/profile',
  '/profile/edit',
  '/profile/preview',
  '/safety',
  '/settings',
  '/settings/account',
  '/settings/blocked',
  '/settings/discovery',
  '/settings/incognito',
  '/settings/notifications',
  '/settings/privacy',
  '/terms',
  '/weekly-picks',
] as const;

/**
 * Every web route the notification resolver (resolveNotificationRoute) can
 * navigate to. Each MUST be a WEB_ROUTES entry (static or dynamic), so a
 * notification tap always lands on a real page.
 */
export const NOTIFICATION_REACHABLE_ROUTES = [
  '/messages',
  '/messages/:matchId',
  '/messages/requests',
  '/likes',
  '/weekly-picks',
  '/discover',
  '/premium',
  '/date-safety',
  '/settings',
  '/settings/account',
  '/settings/notifications',
  '/settings/privacy',
  '/settings/blocked',
  '/settings/discovery',
  '/settings/incognito',
] as const;

/** Returns true if `route` matches an implemented WEB_ROUTES entry (dynamic-aware). */
export function isImplementedWebRoute(route: string): boolean {
  const path = route.split('?')[0];
  return WEB_ROUTES.some((r) => routesMatch(r, path));
}

function routesMatch(manifestRoute: string, actual: string): boolean {
  const a = manifestRoute.split('/');
  const b = actual.split('/');
  if (a.length !== b.length) return false;
  return a.every((seg, i) => seg.startsWith(':') || seg === b[i]);
}
