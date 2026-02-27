import { expect, test, type Page } from '@playwright/test';
import { bootstrapE2EAuth, e2eAuthConstants } from './helpers/e2e-auth';

const APP_READY_TIMEOUT = 30_000;

async function gotoWithRetry(page: Page, url: string) {
  let lastError: unknown;

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45_000 });
      return;
    } catch (error) {
      lastError = error;
      const message = error instanceof Error ? error.message : String(error);
      const retryable =
        message.includes('ERR_ABORTED') ||
        message.includes('frame was detached') ||
        message.includes('Navigation timeout');

      if (!retryable || attempt === 3) {
        throw error;
      }

      await page.waitForTimeout(attempt * 1000);
    }
  }

  throw lastError;
}

test.describe('Authenticated App Flow', () => {
  test.describe.configure({ timeout: 90_000 });

  test('redirects incomplete profiles into onboarding flow', async ({ page }) => {
    await bootstrapE2EAuth(page, { scenario: 'onboarding', onboardingComplete: false });

    await gotoWithRetry(page, '/discover');

    await expect(page).toHaveURL(/\/onboarding$/, { timeout: APP_READY_TIMEOUT });
    await expect(
      page.getByRole('heading', { name: /Welcome to Crush/i })
    ).toBeVisible({ timeout: APP_READY_TIMEOUT });
    await expect(page.getByRole('button', { name: /Continue/i })).toBeVisible({
      timeout: APP_READY_TIMEOUT,
    });
  });

  test('supports discovery like action into match modal and messages hub', async ({ page }) => {
    await bootstrapE2EAuth(page, { scenario: 'discovery' });

    await gotoWithRetry(page, '/discover');

    await expect(page).toHaveURL(/\/discover$/, { timeout: APP_READY_TIMEOUT });
    await expect(page.getByText(e2eAuthConstants.otherUserName).first()).toBeVisible({
      timeout: APP_READY_TIMEOUT,
    });

    await page.getByRole('button', { name: /^Like$/ }).click();

    await expect(page.getByRole('heading', { name: /It's a Match!/i })).toBeVisible({
      timeout: APP_READY_TIMEOUT,
    });
    await page.getByRole('button', { name: /Send a Message/i }).click();

    await expect(page).toHaveURL(/\/messages$/, { timeout: APP_READY_TIMEOUT });
    await expect(page.getByRole('heading', { name: /Messages/i })).toBeVisible({
      timeout: APP_READY_TIMEOUT,
    });
  });

  test('covers chat moderation controls with deterministic dialog assertions', async ({ page }) => {
    test.setTimeout(60_000);
    await bootstrapE2EAuth(page, { scenario: 'chat' });

    await gotoWithRetry(page, '/messages');

    const conversationLink = page.locator(`a[href="/messages/${e2eAuthConstants.matchId}"]`).first();
    await expect(conversationLink).toBeVisible({ timeout: APP_READY_TIMEOUT });
    await gotoWithRetry(page, `/messages/${e2eAuthConstants.matchId}`);

    await expect(page).toHaveURL(new RegExp(`/messages/${e2eAuthConstants.matchId}$`), {
      timeout: APP_READY_TIMEOUT,
    });
    await expect(page.getByText(e2eAuthConstants.otherUserName).first()).toBeVisible({
      timeout: APP_READY_TIMEOUT,
    });

    await page.getByRole('button', { name: /More options/i }).click();
    await page.getByRole('button', { name: /^Report$/ }).click();

    const reportDialog = page.getByRole('dialog').filter({
      hasText: `Report ${e2eAuthConstants.otherUserName}`,
    });
    await expect(reportDialog).toBeVisible();
    await reportDialog.getByLabel('Spam or scam').check();
    await expect(reportDialog.getByRole('button', { name: /Submit Report/i })).toBeEnabled();
    await reportDialog.getByRole('button', { name: 'Cancel' }).click();

    await page.getByRole('button', { name: /More options/i }).click();
    await page.getByRole('button', { name: /Delete chat/i }).click();

    const deleteDialog = page.getByRole('dialog').filter({
      hasText: 'Delete this conversation?',
    });
    await expect(deleteDialog).toBeVisible();
    await deleteDialog.getByRole('button', { name: 'Cancel' }).click();

  });

  test('persists settings theme updates', async ({ page }) => {
    await bootstrapE2EAuth(page, { scenario: 'discovery' });

    await gotoWithRetry(page, '/settings');

    await expect(page).toHaveURL(/\/settings$/, { timeout: APP_READY_TIMEOUT });
    await expect(page.getByRole('heading', { name: /Settings/i })).toBeVisible({
      timeout: APP_READY_TIMEOUT,
    });

    await page.getByRole('button', { name: /^Dark$/ }).click();
    await expect.poll(() =>
      page.evaluate(() => document.documentElement.classList.contains('dark'))
    ).toBe(true);
    await expect.poll(() =>
      page.evaluate(() => localStorage.getItem('crush-theme'))
    ).toBe('dark');

    await page.getByRole('button', { name: /^Light$/ }).click();
    await expect.poll(() =>
      page.evaluate(() => document.documentElement.classList.contains('light'))
    ).toBe(true);
    await expect.poll(() =>
      page.evaluate(() => localStorage.getItem('crush-theme'))
    ).toBe('light');
  });
});
