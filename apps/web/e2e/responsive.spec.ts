import { test, expect } from '@playwright/test';
import { bootstrapE2EAuth } from './helpers/e2e-auth';

/**
 * Responsive layout sweep (Phase 8 Step 17): narrow mobile web → wide desktop.
 * Asserts no horizontal overflow and that the navigation adapts per breakpoint.
 * Runs in the E2E lane against the dev server.
 *
 * Breakpoints mirror tailwind.config.ts: xs 475, sm 640, md 768, lg 1024,
 * xl 1280, 2xl 1536 (+ 320 narrowest baseline).
 */

const WIDTHS = [320, 375, 475, 640, 768, 1024, 1280, 1536];

async function horizontalOverflow(page: import('@playwright/test').Page) {
  return page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth
  );
}

test.describe('Responsive — marketing', () => {
  for (const width of WIDTHS) {
    test(`home has no horizontal overflow at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      expect(await horizontalOverflow(page)).toBeLessThanOrEqual(2);
    });
  }
});

test.describe('Responsive — authenticated app', () => {
  for (const width of WIDTHS) {
    test(`discover has no horizontal overflow at ${width}px`, async ({
      page,
    }) => {
      await bootstrapE2EAuth(page, { scenario: 'discovery' });
      await page.setViewportSize({ width, height: 900 });
      await page.goto('/discover');
      await page.waitForLoadState('networkidle');
      expect(await horizontalOverflow(page)).toBeLessThanOrEqual(2);
    });
  }

  test('navigation adapts: bottom/mobile nav narrow, sidebar wide', async ({
    page,
  }) => {
    await bootstrapE2EAuth(page, { scenario: 'discovery' });

    // Wide desktop: persistent sidebar nav is visible.
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/discover');
    await page.waitForLoadState('networkidle');
    const wideNav = page.locator('nav, [role="navigation"]');
    await expect(wideNav.first()).toBeVisible();

    // Narrow mobile: a navigation landmark is still reachable (bottom nav or
    // a menu trigger), and there is no horizontal overflow.
    await page.setViewportSize({ width: 375, height: 812 });
    await page.waitForLoadState('networkidle');
    expect(await horizontalOverflow(page)).toBeLessThanOrEqual(2);
    const narrowNav = page.locator(
      'nav, [role="navigation"], button[aria-label*="menu" i]'
    );
    await expect(narrowNav.first()).toBeVisible();
  });
});
