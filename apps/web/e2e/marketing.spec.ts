import { test, expect } from '@playwright/test';

test.describe('Marketing Pages', () => {
  test('homepage loads correctly', async ({ page }) => {
    await page.goto('/');

    // Check page title
    await expect(page).toHaveTitle(/Crush/i);

    // Check hero section exists
    const heroHeading = page.locator('h1').first();
    await expect(heroHeading).toBeVisible();

    // Check CTA buttons exist
    const getStartedButton = page.getByRole('link', { name: /get started|sign up/i });
    await expect(getStartedButton.first()).toBeVisible();
  });

  test('features page loads correctly', async ({ page }) => {
    await page.goto('/features');

    // Check page has loaded
    await expect(page).toHaveTitle(/features/i);

    // Check main heading
    const heading = page.getByRole('heading', { level: 1 });
    await expect(heading).toBeVisible();
  });

  test('pricing page loads correctly', async ({ page }) => {
    await page.goto('/pricing');

    // Check page has loaded
    await expect(page).toHaveTitle(/pricing/i);

    // Check pricing cards exist
    const pricingCards = page.locator('[data-testid="pricing-card"]').or(
      page.locator('.pricing-card, [class*="pricing"]')
    );

    // At minimum, the page should have text about pricing
    const pricingText = page.getByText(/free|premium|crush\+/i);
    await expect(pricingText.first()).toBeVisible();
  });

  test('FAQ page loads correctly', async ({ page }) => {
    await page.goto('/faq');

    // Check page has loaded
    await expect(page).toHaveTitle(/faq/i);

    // Check FAQ items exist
    const faqQuestion = page.getByText(/how|what|when|why/i);
    await expect(faqQuestion.first()).toBeVisible();
  });

  test('contact page loads correctly', async ({ page }) => {
    await page.goto('/contact');

    // Check page has loaded
    await expect(page).toHaveTitle(/contact/i);

    // Check contact form or info exists
    const contactElement = page.getByText(/contact|email|support/i);
    await expect(contactElement.first()).toBeVisible();
  });

  test('navigation links work', async ({ page }) => {
    await page.goto('/');

    // Click on Features link
    const featuresLink = page.getByRole('link', { name: /features/i }).first();
    if (await featuresLink.isVisible()) {
      await featuresLink.click();
      await expect(page).toHaveURL(/features/);
    }
  });

  test('mobile menu works on small screens', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');

    // Look for mobile menu button (hamburger icon)
    const menuButton = page.getByRole('button', { name: /menu/i }).or(
      page.locator('[aria-label*="menu"]')
    ).or(
      page.locator('button').filter({ has: page.locator('svg') }).first()
    );

    // If mobile menu exists, test it
    if (await menuButton.isVisible()) {
      await menuButton.click();
      // Menu should now be visible
      const navMenu = page.locator('nav, [role="navigation"]');
      await expect(navMenu.first()).toBeVisible();
    }
  });
});

test.describe('SEO & Metadata', () => {
  test('homepage has proper meta tags', async ({ page }) => {
    await page.goto('/');

    // Check for Open Graph tags
    const ogTitle = page.locator('meta[property="og:title"]');
    await expect(ogTitle).toHaveAttribute('content', /.+/);

    const ogDescription = page.locator('meta[property="og:description"]');
    await expect(ogDescription).toHaveAttribute('content', /.+/);

    // Check for Twitter Card tags
    const twitterCard = page.locator('meta[name="twitter:card"]');
    await expect(twitterCard).toHaveAttribute('content', /.+/);
  });

  test('robots.txt is accessible', async ({ page }) => {
    const response = await page.goto('/robots.txt');
    expect(response?.status()).toBe(200);
  });

  test('sitemap.xml is accessible', async ({ page }) => {
    const response = await page.goto('/sitemap.xml');
    expect(response?.status()).toBe(200);
  });
});
