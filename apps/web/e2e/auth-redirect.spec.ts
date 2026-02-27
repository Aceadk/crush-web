import { expect, test, type Page } from '@playwright/test';

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

test.describe('Auth Redirect Preservation', () => {
  test('unauthenticated protected route redirects with intended destination', async ({ page }) => {
    await gotoWithRetry(page, '/messages/abc?tab=media');
    await expect(page).toHaveURL(/\/auth\/login\?redirect=%2Fmessages%2Fabc%3Ftab%3Dmedia/);
  });
});
