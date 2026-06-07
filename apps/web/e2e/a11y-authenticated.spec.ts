import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { bootstrapE2EAuth } from './helpers/e2e-auth';

/**
 * Authenticated axe-core accessibility scans (Phase 8 Step 17).
 *
 * Runs the WCAG 2.1 A/AA rule set against the signed-in surfaces that the
 * unauthenticated accessibility.spec.ts cannot reach. Needs the dev server +
 * the E2E auth bootstrap; runs in the E2E lane.
 */

const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

const SURFACES: Array<[string, string]> = [
  ['discover', '/discover'],
  ['matches', '/matches'],
  ['messages', '/messages'],
  ['likes', '/likes'],
  ['profile', '/profile'],
  ['profile/edit', '/profile/edit'],
  ['settings', '/settings'],
  ['settings/notifications', '/settings/notifications'],
  ['premium', '/premium'],
];

test.describe('Authenticated accessibility (axe-core, WCAG 2.1 AA)', () => {
  for (const [name, path] of SURFACES) {
    test(`${name} has no serious/critical violations`, async ({ page }) => {
      await bootstrapE2EAuth(page, { scenario: 'discovery' });
      await page.goto(path);
      await page.waitForLoadState('networkidle');

      const results = await new AxeBuilder({ page }).withTags(TAGS).analyze();

      const blocking = results.violations.filter(
        (v) => v.impact === 'serious' || v.impact === 'critical'
      );

      // Surface a readable summary on failure.
      const summary = blocking
        .map((v) => `${v.id} (${v.impact}) — ${v.help} [${v.nodes.length}]`)
        .join('\n');

      expect(blocking, `axe violations on ${path}:\n${summary}`).toEqual([]);
    });
  }
});
