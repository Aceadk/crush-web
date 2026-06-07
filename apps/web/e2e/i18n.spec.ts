import { test, expect } from '@playwright/test';
import { bootstrapE2EAuth } from './helpers/e2e-auth';

/**
 * Prioritized locale E2E (Phase 8 Step 18). Covers the two shipped non-English
 * catalogs: es (LTR) and ar (RTL), plus the default + switcher persistence.
 * Runs in the E2E lane against the dev server.
 */

const LOCALE_COOKIE = 'crush-locale';

async function setLocaleCookie(page: import('@playwright/test').Page, locale: string) {
  await page.context().addCookies([
    {
      name: LOCALE_COOKIE,
      value: locale,
      domain: 'localhost',
      path: '/',
      sameSite: 'Lax',
    },
  ]);
}

test.describe('Locale rendering from persisted cookie', () => {
  test('default (no cookie) renders English', async ({ page }) => {
    await page.goto('/auth/login');
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.getByText('Welcome back')).toBeVisible();
  });

  test('Spanish cookie renders es + lang=es (LTR)', async ({ page }) => {
    await setLocaleCookie(page, 'es');
    await page.goto('/auth/login');
    await expect(page.locator('html')).toHaveAttribute('lang', 'es');
    await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
    await expect(page.getByText('Bienvenido de nuevo')).toBeVisible();
  });

  test('Arabic cookie renders ar + dir=rtl', async ({ page }) => {
    await setLocaleCookie(page, 'ar');
    await page.goto('/auth/login');
    await expect(page.locator('html')).toHaveAttribute('lang', 'ar');
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    await expect(page.getByText('مرحبًا بعودتك')).toBeVisible();
  });
});

test.describe('Locale switcher persistence (authenticated)', () => {
  test('switching locale updates UI and persists across reload', async ({
    page,
  }) => {
    await bootstrapE2EAuth(page, { scenario: 'discovery' });
    await page.goto('/discover');
    await page.waitForLoadState('networkidle');

    // English baseline in the sidebar nav.
    await expect(page.getByText('Discover').first()).toBeVisible();

    // Open the language switcher and choose Spanish.
    await page.getByRole('button', { name: /language|idioma/i }).first().click();
    await page.getByRole('menuitemradio', { name: 'Español' }).click();

    // Nav label is now Spanish, html lang updated.
    await expect(page.getByText('Descubrir').first()).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('lang', 'es');

    // Persisted: reload keeps Spanish.
    await page.reload();
    await page.waitForLoadState('networkidle');
    await expect(page.locator('html')).toHaveAttribute('lang', 'es');
    await expect(page.getByText('Descubrir').first()).toBeVisible();
  });
});
