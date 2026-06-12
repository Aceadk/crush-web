/**
 * Design-token parity test (Phase 8 Step 16).
 *
 * Enforces the design-system alignment contract
 * (docs/contracts/design_system_alignment_2026-06-07.md):
 *
 *  1. Every `hsl(var(--X))` color the Tailwind config references must have a
 *     matching `--X:` definition in globals.css (otherwise the utility class
 *     silently renders nothing — this is exactly how `bg-primary-dark` and the
 *     `glass-*` classes were dead before this phase).
 *  2. The exact glass / primary-dark utility classes the shared UI components
 *     use must resolve to real Tailwind config keys.
 *  3. The documented canonical semantic color roles must exist.
 */

import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import tailwindConfig from '../../../tailwind.config';

const here = path.dirname(fileURLToPath(import.meta.url)); // apps/web/src/lib/__tests__
const webRoot = path.resolve(here, '../../..'); // apps/web
const repoRoot = path.resolve(webRoot, '../..'); // crush-web

const globalsCss = fs.readFileSync(
  path.join(webRoot, 'src/styles/globals.css'),
  'utf8'
);

// CSS custom properties defined under :root (light theme is the source of truth;
// .dark only overrides a subset).
const rootBlock = globalsCss.slice(
  globalsCss.indexOf(':root'),
  globalsCss.indexOf('.dark')
);
const definedVars = new Set(
  [...rootBlock.matchAll(/--([\w-]+)\s*:/g)].map((m) => m[1])
);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const colors = (tailwindConfig.theme?.extend?.colors ?? {}) as Record<
  string,
  unknown
>;

function collectStrings(value: unknown, acc: string[]): string[] {
  if (typeof value === 'string') acc.push(value);
  else if (value && typeof value === 'object')
    for (const v of Object.values(value)) collectStrings(v, acc);
  return acc;
}

describe('design-token parity: tailwind ↔ globals.css', () => {
  it('every CSS var referenced by tailwind colors is defined in :root', () => {
    const referenced = new Set<string>();
    for (const str of collectStrings(colors, [])) {
      for (const m of str.matchAll(/var\(--([\w-]+)\)/g)) referenced.add(m[1]);
    }
    expect(referenced.size).toBeGreaterThan(0);

    const missing = [...referenced].filter((v) => !definedVars.has(v));
    expect(missing, `tailwind references undefined CSS vars: ${missing.join(', ')}`).toEqual(
      []
    );
  });

  it('documents the canonical semantic color roles', () => {
    const requiredRoles = [
      'background',
      'foreground',
      'card',
      'popover',
      'primary',
      'secondary',
      'muted',
      'accent',
      'destructive',
      'success',
      'warning',
      'info',
      'border',
      'input',
      'ring',
      'action',
      'online',
      'offline',
      'busy',
      'glass',
    ];
    const missing = requiredRoles.filter((r) => !(r in colors));
    expect(missing, `missing semantic roles: ${missing.join(', ')}`).toEqual([]);
  });
});

describe('design-token parity: shared UI component classes resolve', () => {
  // Classes the shared components rely on — guard against them going dead again.
  const componentSources = [
    'packages/ui/src/button.tsx',
    'packages/ui/src/card.tsx',
    'packages/ui/src/dialog.tsx',
  ]
    .map((p) => fs.readFileSync(path.join(repoRoot, p), 'utf8'))
    .join('\n');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const glass = (colors.glass ?? {}) as Record<string, unknown>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const primary = (colors.primary ?? {}) as Record<string, unknown>;
  const backdropBlur = (tailwindConfig.theme?.extend?.backdropBlur ??
    {}) as Record<string, unknown>;

  it('primary-dark is backed when components reference bg/via-primary-dark', () => {
    if (/-primary-dark\b/.test(componentSources)) {
      expect(primary).toHaveProperty('dark');
    }
  });

  it('glass surface/border tokens are backed when referenced', () => {
    if (/-glass-light-surface\b/.test(componentSources)) {
      expect(glass).toHaveProperty('light-surface');
    }
    if (/-glass-light-border\b/.test(componentSources)) {
      expect(glass).toHaveProperty('light-border');
    }
  });

  it('backdrop-blur-glass is backed when referenced', () => {
    if (/backdrop-blur-glass\b/.test(componentSources)) {
      expect(backdropBlur).toHaveProperty('glass');
    }
  });
});
