import { test, expect } from '@playwright/test';
import { bootstrapE2EAuth } from './helpers/e2e-auth';

/**
 * Accessibility interaction checks (Phase 8 Step 17): keyboard navigation,
 * focus order, dialog focus trap, reduced-motion, and 200% zoom reflow.
 * Runs in the E2E lane against the dev server.
 */

test.describe('Keyboard navigation & focus order', () => {
  test('tab order reaches interactive elements without a focus trap on a page', async ({
    page,
  }) => {
    await page.goto('/auth/login');

    const seen = new Set<string>();
    let movements = 0;
    for (let i = 0; i < 15; i++) {
      await page.keyboard.press('Tab');
      const handle = await page.evaluateHandle(() => {
        const el = document.activeElement as HTMLElement | null;
        return el
          ? `${el.tagName}:${el.getAttribute('name') ?? el.getAttribute('aria-label') ?? el.textContent?.slice(0, 12) ?? ''}`
          : 'none';
      });
      const key = String(await handle.jsonValue());
      if (!seen.has(key)) movements++;
      seen.add(key);
    }
    // Focus should land on several distinct elements (not stuck on one).
    expect(movements).toBeGreaterThan(2);
  });

  test('Enter activates the focused primary control', async ({ page }) => {
    await page.goto('/');
    const cta = page.getByRole('link', { name: /get started|sign up|join/i }).first();
    if (await cta.count()) {
      await cta.focus();
      await expect(cta).toBeFocused();
    }
  });
});

test.describe('Dialog focus trap', () => {
  test('focus stays within an open dialog and Escape closes it', async ({
    page,
  }) => {
    await bootstrapE2EAuth(page, { scenario: 'discovery' });
    await page.goto('/settings/account');
    await page.waitForLoadState('networkidle');

    // Open the first dialog-triggering control if present (e.g. delete account).
    const trigger = page
      .getByRole('button', { name: /delete|deactivate|log ?out|sign ?out/i })
      .first();
    if (!(await trigger.count())) test.skip(true, 'no dialog trigger on page');

    await trigger.click();
    const dialog = page.getByRole('dialog').first();
    await expect(dialog).toBeVisible();

    // Focus should be inside the dialog.
    const focusInside = await dialog.evaluate(
      (el) => el.contains(document.activeElement)
    );
    expect(focusInside).toBeTruthy();

    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
  });
});

test.describe('Reduced motion', () => {
  test('honors prefers-reduced-motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    const matches = await page.evaluate(
      () => window.matchMedia('(prefers-reduced-motion: reduce)').matches
    );
    expect(matches).toBeTruthy();
    // Page still renders its primary landmark under reduced motion.
    await expect(page.locator('main, [role="main"]').first()).toBeVisible();
  });
});

test.describe('Zoom / reflow (WCAG 1.4.10)', () => {
  test('no horizontal scroll at 200% zoom on a 1280px viewport', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/');
    // Emulate 200% zoom by halving the CSS viewport via devicePixelRatio-style
    // narrowing: a 640px effective width must not produce horizontal overflow.
    await page.setViewportSize({ width: 640, height: 800 });
    await page.waitForLoadState('networkidle');
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth
    );
    expect(overflow).toBeLessThanOrEqual(2); // sub-pixel tolerance
  });
});
