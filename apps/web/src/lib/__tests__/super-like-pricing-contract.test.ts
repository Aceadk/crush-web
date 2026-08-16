import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { BILLING_CONFIG } from '@crush/core';
import { describe, expect, it } from 'vitest';

const featureFor = (tier: 'free' | 'plus' | 'platinum') =>
  BILLING_CONFIG.plans
    .find((plan) => plan.tier === tier)
    ?.features.find((feature) => feature.name.toLowerCase().includes('super like'));

describe('Super Like pricing contract', () => {
  it('matches the server-enforced daily allowance in every plan', () => {
    expect(featureFor('free')).toEqual({ name: '1 Super like/day', included: true });
    expect(featureFor('plus')).toEqual({ name: '7 Super likes/day', included: true });
    expect(featureFor('platinum')).toEqual({ name: '7 Super likes/day', included: true });
  });

  it('does not publish the retired weekly, five-per-day, or unlimited claims', () => {
    const files = [
      'src/app/(marketing)/faq/faq-data.ts',
      'src/app/(marketing)/help/help-content.tsx',
      'src/app/(marketing)/pricing/pricing-content.tsx',
      'src/app/(app)/premium/success/page.tsx',
    ];
    const marketingCopy = files
      .map((file) => readFileSync(resolve(process.cwd(), file), 'utf8'))
      .join('\n');

    expect(marketingCopy).not.toMatch(/1 Super Like per week/i);
    expect(marketingCopy).not.toMatch(/5 Super Likes per day/i);
    expect(marketingCopy).not.toMatch(/unlimited Super Likes/i);
  });
});
