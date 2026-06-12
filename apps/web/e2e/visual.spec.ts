import { test, expect } from '@playwright/test';
import { bootstrapE2EAuth } from './helpers/e2e-auth';

/**
 * Visual-regression coverage for critical screens (Phase 8 Step 16).
 *
 * Baselines are committed per-platform (`*-snapshots/`). Generate/update with:
 *   pnpm test:e2e visual.spec.ts --update-snapshots
 * Run in the E2E lane against the dev server (needs `pnpm dev` or webServer);
 * this file is no-op outside that lane.
 *
 * `maxDiffPixelRatio` absorbs sub-pixel font rendering; animations are disabled
 * so screenshots are deterministic.
 */

const shot = { animations: 'disabled', maxDiffPixelRatio: 0.02 } as const;

test.describe('Visual regression — marketing (unauthenticated)', () => {
  const pages: Array<[string, string]> = [
    ['home', '/'],
    ['pricing', '/pricing'],
    ['login', '/auth/login'],
  ];

  for (const [name, path] of pages) {
    test(`${name} matches baseline`, async ({ page }) => {
      await page.goto(path);
      await page.waitForLoadState('networkidle');
      await expect(page).toHaveScreenshot(`${name}.png`, {
        fullPage: true,
        ...shot,
      });
    });
  }
});

test.describe('Visual regression — authenticated app', () => {
  const pages: Array<[string, string]> = [
    ['discover', '/discover'],
    ['matches', '/matches'],
    ['messages', '/messages'],
    ['profile', '/profile'],
    ['settings', '/settings'],
    ['premium', '/premium'],
  ];

  for (const [name, path] of pages) {
    test(`${name} matches baseline`, async ({ page }) => {
      await bootstrapE2EAuth(page, { scenario: 'discovery' });
      await page.goto(path);
      await page.waitForLoadState('networkidle');
      await expect(page).toHaveScreenshot(`app-${name}.png`, {
        fullPage: true,
        ...shot,
      });
    });
  }
});
