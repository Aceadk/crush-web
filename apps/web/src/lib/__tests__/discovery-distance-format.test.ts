import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { locationService } from '@crush/core';
import { describe, expect, it } from 'vitest';

describe('web Discovery distance presentation', () => {
  it('formats kilometres with at most one decimal and no trailing zero', () => {
    expect(locationService.formatDistance(1.23456789)).toBe('1.2 km away');
    expect(locationService.formatDistance(3.46)).toBe('3.5 km away');
    expect(locationService.formatDistance(6)).toBe('6 km away');
    expect(locationService.formatDistance(4.849999999)).toBe('4.8 km away');
  });

  it('handles very close and invalid distances without exposing raw values', () => {
    expect(locationService.formatDistance(0)).toBe('Less than 0.1 km away');
    expect(locationService.formatDistance(0.09)).toBe('Less than 0.1 km away');
    expect(locationService.formatDistance(-1)).toBe('');
    expect(locationService.formatDistance(Number.NaN)).toBe('');
  });

  it('wires the Discovery card to the shared kilometre formatter', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'src/features/discover/components/swipe-card.tsx'),
      'utf8'
    );

    expect(source).toContain('locationService.formatDistance(profile.distance)');
    expect(source).not.toContain('miles away');
  });
});
