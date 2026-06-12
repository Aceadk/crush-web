import type { FullConfig } from '@playwright/test';

/**
 * Warm the dev server's lazily-compiled routes before tests run.
 *
 * The E2E web server is `next dev`, which compiles each route on first
 * request. Cold compiles (especially /auth/login with its Firebase deps)
 * regularly ate into individual test timeouts and caused flaky failures on
 * whichever test happened to visit a route first.
 */
const WARM_ROUTES = [
  '/',
  '/auth/login',
  '/auth/signup',
  '/features',
  '/pricing',
  '/about',
  '/safety',
  '/contact',
  '/faq',
  '/help',
  '/privacy',
  '/terms',
  '/guidelines',
  '/discover',
];

export default async function globalSetup(config: FullConfig) {
  const baseURL =
    config.projects[0]?.use?.baseURL ||
    process.env.PLAYWRIGHT_BASE_URL ||
    'http://localhost:3000';

  // Warm sequentially with a small concurrency to avoid overwhelming the
  // dev compiler; failures are non-fatal (the test itself will surface them).
  for (const route of WARM_ROUTES) {
    try {
      await fetch(`${baseURL}${route}`, { redirect: 'manual' });
    } catch {
      // best effort
    }
  }
}
