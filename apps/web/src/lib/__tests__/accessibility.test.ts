/**
 * Unit tests for accessibility utility functions.
 * Tests pure functions only (no React hooks, which require renderHook).
 * CR-AUD-040
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  generateId,
  describeElement,
  getContrastRatio,
  meetsContrastRequirement,
  focusFirstElement,
  prefersReducedMotion,
} from '../accessibility';

describe('generateId', () => {
  it('returns unique IDs with default prefix', () => {
    const id1 = generateId();
    const id2 = generateId();
    expect(id1).toMatch(/^aria-\d+$/);
    expect(id2).toMatch(/^aria-\d+$/);
    expect(id1).not.toBe(id2);
  });

  it('uses custom prefix', () => {
    const id = generateId('modal');
    expect(id).toMatch(/^modal-\d+$/);
  });
});

describe('describeElement', () => {
  it('returns description props with auto-generated ID', () => {
    const result = describeElement('Help text');
    expect(result.describedById).toMatch(/^desc-\d+$/);
    expect(result.descriptionProps.children).toBe('Help text');
    expect(result.descriptionProps.className).toBe('sr-only');
    expect(result.elementProps['aria-describedby']).toBe(result.describedById);
  });

  it('uses provided ID', () => {
    const result = describeElement('Help', 'my-id');
    expect(result.describedById).toBe('my-id');
    expect(result.elementProps['aria-describedby']).toBe('my-id');
  });
});

describe('getContrastRatio', () => {
  it('returns 21:1 for black on white', () => {
    const ratio = getContrastRatio([0, 0, 0], [255, 255, 255]);
    expect(ratio).toBeCloseTo(21, 0);
  });

  it('returns 1:1 for identical colors', () => {
    const ratio = getContrastRatio([128, 128, 128], [128, 128, 128]);
    expect(ratio).toBeCloseTo(1, 1);
  });

  it('is order-independent', () => {
    const r1 = getContrastRatio([0, 0, 0], [255, 255, 255]);
    const r2 = getContrastRatio([255, 255, 255], [0, 0, 0]);
    expect(r1).toBeCloseTo(r2, 5);
  });

  it('calculates intermediate contrast correctly', () => {
    // Gray (#767676) on white — known ~4.54:1 ratio (WCAG AA boundary)
    const ratio = getContrastRatio([118, 118, 118], [255, 255, 255]);
    expect(ratio).toBeGreaterThan(4.5);
    expect(ratio).toBeLessThan(5);
  });
});

describe('meetsContrastRequirement', () => {
  it('AA normal text requires 4.5:1', () => {
    expect(meetsContrastRequirement(4.5, 'AA', false)).toBe(true);
    expect(meetsContrastRequirement(4.49, 'AA', false)).toBe(false);
  });

  it('AA large text requires 3:1', () => {
    expect(meetsContrastRequirement(3, 'AA', true)).toBe(true);
    expect(meetsContrastRequirement(2.99, 'AA', true)).toBe(false);
  });

  it('AAA normal text requires 7:1', () => {
    expect(meetsContrastRequirement(7, 'AAA', false)).toBe(true);
    expect(meetsContrastRequirement(6.99, 'AAA', false)).toBe(false);
  });

  it('AAA large text requires 4.5:1', () => {
    expect(meetsContrastRequirement(4.5, 'AAA', true)).toBe(true);
    expect(meetsContrastRequirement(4.49, 'AAA', true)).toBe(false);
  });

  it('defaults to AA and normal text', () => {
    expect(meetsContrastRequirement(4.5)).toBe(true);
    expect(meetsContrastRequirement(4.49)).toBe(false);
  });
});

describe('focusFirstElement', () => {
  it('focuses the first focusable element', () => {
    const container = document.createElement('div');
    const button = document.createElement('button');
    button.textContent = 'Click me';
    container.appendChild(button);
    document.body.appendChild(container);

    focusFirstElement(container);
    expect(document.activeElement).toBe(button);

    document.body.removeChild(container);
  });

  it('does nothing for null container', () => {
    expect(() => focusFirstElement(null)).not.toThrow();
  });

  it('does nothing for empty container', () => {
    const container = document.createElement('div');
    expect(() => focusFirstElement(container)).not.toThrow();
  });
});

describe('prefersReducedMotion', () => {
  it('returns a boolean', () => {
    expect(typeof prefersReducedMotion()).toBe('boolean');
  });
});
