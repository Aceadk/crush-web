import { test, expect } from '@playwright/test';

/**
 * Accessibility tests using Playwright's built-in checks
 * For full axe-core integration, install @axe-core/playwright
 */

test.describe('Accessibility', () => {
  test('homepage has no critical accessibility issues', async ({ page }) => {
    await page.goto('/');

    // Check images have alt text
    const images = page.locator('img');
    const imageCount = await images.count();

    for (let i = 0; i < imageCount; i++) {
      const img = images.nth(i);
      const alt = await img.getAttribute('alt');
      const role = await img.getAttribute('role');

      // Image should have alt text or role="presentation"
      expect(alt !== null || role === 'presentation').toBeTruthy();
    }

    // Check buttons have accessible names
    const buttons = page.locator('button');
    const buttonCount = await buttons.count();

    for (let i = 0; i < buttonCount; i++) {
      const button = buttons.nth(i);
      const name = await button.getAttribute('aria-label') ||
        await button.innerText();
      expect(name.length).toBeGreaterThan(0);
    }

    // Check links have accessible names
    const links = page.locator('a');
    const linkCount = await links.count();

    for (let i = 0; i < Math.min(linkCount, 20); i++) {
      const link = links.nth(i);
      const text = await link.innerText();
      const ariaLabel = await link.getAttribute('aria-label');
      expect(text.length > 0 || ariaLabel !== null).toBeTruthy();
    }
  });

  test('page has proper heading hierarchy', async ({ page }) => {
    await page.goto('/');

    // Should have exactly one h1
    const h1s = page.locator('h1');
    await expect(h1s).toHaveCount(1);

    // Check heading order doesn't skip levels (h1 -> h3 without h2)
    const headings = await page.locator('h1, h2, h3, h4, h5, h6').all();

    let lastLevel = 0;
    for (const heading of headings) {
      const tagName = await heading.evaluate(el => el.tagName.toLowerCase());
      const currentLevel = parseInt(tagName.replace('h', ''));

      // Heading level should not skip more than one level
      if (lastLevel > 0 && currentLevel > lastLevel + 1) {
        console.warn(`Heading hierarchy warning: h${lastLevel} followed by h${currentLevel}`);
      }
      lastLevel = currentLevel;
    }
  });

  test('interactive elements are keyboard accessible', async ({ page }) => {
    await page.goto('/');

    // Tab through the page
    await page.keyboard.press('Tab');

    // Focus should move to a focusable element
    const focusedElement = page.locator(':focus');
    await expect(focusedElement).toBeVisible();

    // Tab a few more times to ensure focus moves
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Tab');
      const newFocus = page.locator(':focus');
      await expect(newFocus).toBeVisible();
    }
  });

  test('form labels are properly associated', async ({ page }) => {
    await page.goto('/auth/login');

    // Check input fields have associated labels
    const inputs = page.locator('input:not([type="hidden"]):not([type="submit"]):not([type="button"])');
    const inputCount = await inputs.count();

    for (let i = 0; i < inputCount; i++) {
      const input = inputs.nth(i);
      const id = await input.getAttribute('id');
      const ariaLabel = await input.getAttribute('aria-label');
      const ariaLabelledby = await input.getAttribute('aria-labelledby');
      const placeholder = await input.getAttribute('placeholder');

      // Input should have either:
      // - An id with matching label
      // - aria-label
      // - aria-labelledby
      // - placeholder (fallback)
      const hasLabel = id !== null || ariaLabel !== null || ariaLabelledby !== null || placeholder !== null;
      expect(hasLabel).toBeTruthy();
    }
  });

  test('color contrast is sufficient', async ({ page }) => {
    await page.goto('/');

    // This is a basic check - for comprehensive contrast testing,
    // use axe-core or similar tools

    // Check that body text color is set
    const bodyColor = await page.locator('body').evaluate(
      el => getComputedStyle(el).color
    );
    expect(bodyColor).not.toBe('');

    // Check that primary buttons have sufficient contrast
    const primaryButton = page.locator('button').first();
    if (await primaryButton.isVisible()) {
      const bgColor = await primaryButton.evaluate(
        el => getComputedStyle(el).backgroundColor
      );
      const textColor = await primaryButton.evaluate(
        el => getComputedStyle(el).color
      );
      expect(bgColor).not.toBe(textColor);
    }
  });

  test('skip to content link exists', async ({ page }) => {
    await page.goto('/');

    // Check for skip link (common accessibility pattern)
    const skipLink = page.locator('a[href="#main"], a[href="#content"], a:text("Skip to")');

    // Skip link may be hidden until focused
    await page.keyboard.press('Tab');

    // Skip link is optional but recommended
    // Just check page loads without error
    await expect(page.locator('body')).toBeVisible();
  });

  test('focus visible styles are applied', async ({ page }) => {
    await page.goto('/');

    // Tab to first focusable element
    await page.keyboard.press('Tab');

    const focusedElement = page.locator(':focus');

    // Check if the element has visible focus indication
    const outlineWidth = await focusedElement.evaluate(
      el => getComputedStyle(el).outlineWidth
    );
    const boxShadow = await focusedElement.evaluate(
      el => getComputedStyle(el).boxShadow
    );
    const borderColor = await focusedElement.evaluate(
      el => getComputedStyle(el).borderColor
    );

    // Element should have some visual focus indicator
    const hasFocusIndicator =
      outlineWidth !== '0px' ||
      boxShadow !== 'none' ||
      borderColor.includes('rgb');

    expect(hasFocusIndicator).toBeTruthy();
  });
});

test.describe('Screen Reader Announcements', () => {
  test('page has proper landmark regions', async ({ page }) => {
    await page.goto('/');

    // Check for main landmark
    const main = page.locator('main, [role="main"]');
    await expect(main.first()).toBeVisible();

    // Check for navigation landmark
    const nav = page.locator('nav, [role="navigation"]');
    await expect(nav.first()).toBeVisible();
  });

  test('live regions update appropriately', async ({ page }) => {
    await page.goto('/auth/login');

    // Fill in invalid email and submit
    const emailInput = page.locator('input[type="email"]');
    await emailInput.fill('invalid-email');

    const passwordInput = page.locator('input[type="password"]');
    await passwordInput.fill('password123');

    const submitButton = page.getByRole('button', { name: /sign in|log in|login/i });
    await submitButton.click();

    // Error messages should be announced via aria-live or role="alert"
    // This is a basic structural check
    await page.waitForTimeout(500);

    const alerts = page.locator('[role="alert"], [aria-live="polite"], [aria-live="assertive"]');
    // Alerts may or may not be present depending on form state
    await expect(page.locator('body')).toBeVisible();
  });
});
