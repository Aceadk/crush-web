import { test, expect, type Page } from '@playwright/test';

async function gotoAuthPage(page: Page, path: string) {
  await page.goto(path, { waitUntil: 'domcontentloaded' });
  await expect(page).toHaveURL(new RegExp(path.replace('?', '\\?')));
  await expect(page).toHaveTitle(/crush/i);
}

async function waitForAuthForm(page: Page) {
  const emailInput = page.locator('input[type="email"]');
  const passwordInputs = page.locator('input[type="password"]');
  await expect(emailInput).toBeVisible({ timeout: 20_000 });
  await expect(passwordInputs.first()).toBeVisible({ timeout: 20_000 });
}

test.describe('Authentication Pages', () => {
  test('login page loads correctly', async ({ page }) => {
    await gotoAuthPage(page, '/auth/login');
    await waitForAuthForm(page);

    // Check login button exists
    const loginButton = page.getByRole('button', { name: /sign in|log in|login/i });
    await expect(loginButton).toBeVisible();
  });

  test('signup page loads correctly', async ({ page }) => {
    await gotoAuthPage(page, '/auth/signup');
    await waitForAuthForm(page);
  });

  test('login form shows validation errors', async ({ page }) => {
    await gotoAuthPage(page, '/auth/login');
    await waitForAuthForm(page);

    // Click login without filling form
    const loginButton = page.getByRole('button', { name: /sign in|log in|login/i });
    await loginButton.click();

    await expect(page.getByText(/please fill in all fields/i)).toBeVisible();
  });

  test('can navigate between login and signup', async ({ page }) => {
    await gotoAuthPage(page, '/auth/login');
    await waitForAuthForm(page);

    // Look for link to signup
    const signupLink = page.getByRole('link', { name: /sign up|register|create account/i });
    await expect(signupLink).toBeVisible();
    await signupLink.click();
    await expect(page).toHaveURL(/\/auth\/signup/);
  });

  test('forgot password page exists', async ({ page }) => {
    await gotoAuthPage(page, '/auth/forgot-password');
    await expect(page.getByRole('heading', { name: /reset your password/i })).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.locator('input[type="email"]')).toBeVisible({ timeout: 20_000 });
    await expect(page.getByRole('button', { name: /send reset link/i })).toBeVisible();
  });

  test('social login buttons are visible', async ({ page }) => {
    await gotoAuthPage(page, '/auth/login');
    await waitForAuthForm(page);
    await expect(page.getByRole('button', { name: /continue with google/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /continue with phone/i })).toBeVisible();
  });
});

test.describe('Protected Routes', () => {
  test('discover page redirects to login when not authenticated', async ({ page }) => {
    await page.goto('/discover');

    // Should redirect to login or show auth required message
    await expect(page).toHaveURL(/auth\/login|login/);
  });

  test('messages page redirects to login when not authenticated', async ({ page }) => {
    await page.goto('/messages');

    // Should redirect to login
    await expect(page).toHaveURL(/auth\/login|login/);
  });

  test('profile page redirects to login when not authenticated', async ({ page }) => {
    await page.goto('/profile');

    // Should redirect to login
    await expect(page).toHaveURL(/auth\/login|login/);
  });

  test('settings page redirects to login when not authenticated', async ({ page }) => {
    await page.goto('/settings');

    // Should redirect to login
    await expect(page).toHaveURL(/auth\/login|login/);
  });
});
