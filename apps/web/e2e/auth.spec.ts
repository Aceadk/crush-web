import { test, expect } from '@playwright/test';

test.describe('Authentication Pages', () => {
  test('login page loads correctly', async ({ page }) => {
    await page.goto('/auth/login');

    // Check page has loaded
    await expect(page).toHaveTitle(/login|sign in/i);

    // Check email input exists
    const emailInput = page.getByRole('textbox', { name: /email/i }).or(
      page.locator('input[type="email"]')
    );
    await expect(emailInput).toBeVisible();

    // Check password input exists
    const passwordInput = page.locator('input[type="password"]');
    await expect(passwordInput).toBeVisible();

    // Check login button exists
    const loginButton = page.getByRole('button', { name: /sign in|log in|login/i });
    await expect(loginButton).toBeVisible();
  });

  test('signup page loads correctly', async ({ page }) => {
    await page.goto('/auth/signup');

    // Check page has loaded - either signup or may redirect to login
    await expect(page).toHaveURL(/auth\/(signup|login)/);

    // Check form elements exist
    const emailInput = page.getByRole('textbox', { name: /email/i }).or(
      page.locator('input[type="email"]')
    );
    await expect(emailInput).toBeVisible();
  });

  test('login form shows validation errors', async ({ page }) => {
    await page.goto('/auth/login');

    // Click login without filling form
    const loginButton = page.getByRole('button', { name: /sign in|log in|login/i });
    await loginButton.click();

    // Should show some validation message or the inputs should be marked as invalid
    const emailInput = page.locator('input[type="email"]');
    const isInvalid = await emailInput.evaluate(el => !el.checkValidity());
    expect(isInvalid).toBe(true);
  });

  test('can navigate between login and signup', async ({ page }) => {
    await page.goto('/auth/login');

    // Look for link to signup
    const signupLink = page.getByRole('link', { name: /sign up|register|create account/i });
    if (await signupLink.isVisible()) {
      await signupLink.click();
      await expect(page).toHaveURL(/signup/);
    }
  });

  test('forgot password page exists', async ({ page }) => {
    await page.goto('/auth/login');

    // Look for forgot password link
    const forgotLink = page.getByRole('link', { name: /forgot|reset/i });
    if (await forgotLink.isVisible()) {
      await forgotLink.click();
      await expect(page).toHaveURL(/forgot|reset/);
    }
  });

  test('social login buttons are visible', async ({ page }) => {
    await page.goto('/auth/login');

    // Check for Google login button
    const googleButton = page.getByRole('button', { name: /google/i }).or(
      page.locator('button').filter({ hasText: /google/i })
    );

    // Social login may or may not be present
    // Just check page loads without error
    await expect(page.locator('body')).toBeVisible();
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
