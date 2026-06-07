#!/usr/bin/env node
/**
 * Deprecated-domain CI guard (Phase 6 Step 10).
 *
 * Fails if web app source references a deprecated domain. crush.app is canonical
 * (see my_first_project/docs/contracts/domain_deployment_decision_2026-06-07.md).
 *
 * crushhour.app is allowed ONLY in the documented legacy-redirect allowlist
 * (the notification route resolver accepts it as a legacy host, and the test
 * that exercises that behavior) — mobile/backend still emit crushhour.app deep
 * links until the infra migration completes, so the web must keep accepting them.
 *
 * Scope: crush-web web app + shared packages source only (NOT the mobile repo,
 * whose deep-link/cert-pinning domain migrates on the infra schedule).
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');

const SCAN_DIRS = ['apps/web/src', 'packages/core/src', 'packages/ui/src'];
const EXTS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.json']);

// Hard-deprecated domains: never allowed in web source.
const DEPRECATED = [/crushapp\.com/, /app\.crush\.dating/, /\bcrush\.dating\b/];

// crushhour.app is allowed only in these files (documented legacy-redirect host).
const CRUSHHOUR_ALLOWLIST = new Set([
  'packages/core/src/services/notification.ts',
  'apps/web/src/lib/__tests__/notification-route-parity.test.ts',
]);
const CRUSHHOUR = /crushhour\.app/;

function walk(dir) {
  const out = [];
  let entries;
  try {
    entries = readdirSync(join(repoRoot, dir));
  } catch {
    return out;
  }
  for (const name of entries) {
    const rel = join(dir, name);
    const abs = join(repoRoot, rel);
    const st = statSync(abs);
    if (st.isDirectory()) {
      if (name === 'node_modules' || name === '.next' || name === 'dist') continue;
      out.push(...walk(rel));
    } else if (EXTS.has(rel.slice(rel.lastIndexOf('.')))) {
      out.push(rel);
    }
  }
  return out;
}

const violations = [];
for (const dir of SCAN_DIRS) {
  for (const file of walk(dir)) {
    const text = readFileSync(join(repoRoot, file), 'utf8');
    text.split('\n').forEach((line, i) => {
      for (const re of DEPRECATED) {
        if (re.test(line)) {
          violations.push(`${file}:${i + 1}: ${line.trim()}`);
        }
      }
      if (CRUSHHOUR.test(line) && !CRUSHHOUR_ALLOWLIST.has(file)) {
        violations.push(
          `${file}:${i + 1}: crushhour.app (not in legacy-redirect allowlist): ${line.trim()}`
        );
      }
    });
  }
}

if (violations.length > 0) {
  console.error('Deprecated domain references found (canonical is crush.app):\n');
  for (const v of violations) console.error('  ' + v);
  console.error(
    '\nUse crush.app. crushhour.app is only allowed in the documented legacy-redirect allowlist.'
  );
  process.exit(1);
}

console.log('✓ No deprecated domain references in web app source.');
