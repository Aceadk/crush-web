/**
 * Route-existence tests (Phase 6 Step 11).
 *
 * Validates routes from the shared manifest against the as-built filesystem:
 * 1. every WEB_ROUTES entry corresponds to a real Next.js page on disk, and
 * 2. every notification-reachable route is an implemented WEB_ROUTE.
 *
 * This is the guard that keeps notifications/deep links pointed at real routes —
 * the old route matrix listed target routes as if they existed.
 */

import { describe, it, expect } from 'vitest';
import { readdirSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import {
  WEB_ROUTES,
  NOTIFICATION_REACHABLE_ROUTES,
  isImplementedWebRoute,
} from '@/lib/route-manifest';

const APP_DIR = join(process.cwd(), 'src', 'app');

/** Discover as-built routes by scanning page.tsx files, normalizing groups + dynamic segs. */
function discoverRoutes(dir: string, prefix = ''): string[] {
  const routes: string[] = [];
  for (const name of readdirSync(dir)) {
    const abs = join(dir, name);
    if (!statSync(abs).isDirectory()) {
      if (name === 'page.tsx' || name === 'page.ts') {
        routes.push(prefix === '' ? '/' : prefix);
      }
      continue;
    }
    // Route groups (auth)/(app)/(marketing) don't add a path segment.
    const seg = /^\(.+\)$/.test(name)
      ? ''
      : name.startsWith('[') && name.endsWith(']')
        ? `/:${name.slice(1, -1)}`
        : `/${name}`;
    routes.push(...discoverRoutes(abs, prefix + seg));
  }
  return routes;
}

describe('route manifest ↔ filesystem (as-built)', () => {
  const onDisk = new Set(discoverRoutes(APP_DIR));

  it('every WEB_ROUTES entry exists as a page on disk', () => {
    const missing = WEB_ROUTES.filter((r) => !onDisk.has(r));
    expect(missing, `manifest routes with no page file: ${missing.join(', ')}`).toEqual([]);
  });

  it('every on-disk route is listed in WEB_ROUTES (no undocumented routes)', () => {
    const undocumented = [...onDisk].filter(
      (r) => !(WEB_ROUTES as readonly string[]).includes(r)
    );
    expect(
      undocumented,
      `routes on disk missing from the manifest: ${undocumented.join(', ')}`
    ).toEqual([]);
  });
});

describe('notification-reachable routes are real', () => {
  it.each(NOTIFICATION_REACHABLE_ROUTES)(
    'notification route %s is an implemented web route',
    (route) => {
      expect(isImplementedWebRoute(route)).toBe(true);
    }
  );
});

describe('isImplementedWebRoute', () => {
  it('matches dynamic segments', () => {
    expect(isImplementedWebRoute('/messages/abc123')).toBe(true);
    expect(isImplementedWebRoute('/messages/abc123?from=push')).toBe(true);
  });
  it('accepts the peer profile route (/profile/:userId)', () => {
    // Five surfaces (chat header, likes, weekly picks, matches ×2) link
    // here; it 404'd until the page was added.
    expect(isImplementedWebRoute('/profile/user-1')).toBe(true);
  });
  it('rejects non-existent routes', () => {
    expect(isImplementedWebRoute('/totally-made-up')).toBe(false);
  });
  it('sanity: app dir resolves', () => {
    expect(existsSync(APP_DIR)).toBe(true);
  });
});
