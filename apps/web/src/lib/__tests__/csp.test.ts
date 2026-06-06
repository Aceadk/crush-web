/**
 * CSP tests (Gate 0 / P0.2).
 *
 * Ensures the Content-Security-Policy permits every backend origin the web app
 * must reach — especially the Cloud Functions host (callables + discovery REST)
 * and the App Check / reCAPTCHA origins, which the re-audit found missing.
 */

import { describe, expect, it } from 'vitest';
import { buildCspHeader } from '@/shared/lib/csp';

function directive(csp: string, name: string): string {
  const part = csp.split(';').map((s) => s.trim()).find((s) => s.startsWith(`${name} `));
  return part ?? '';
}

describe('buildCspHeader — backend origins', () => {
  const csp = buildCspHeader(false, 'test-nonce');

  it('allows Cloud Functions (callables + discovery REST) in connect-src', () => {
    expect(directive(csp, 'connect-src')).toContain('https://*.cloudfunctions.net');
  });

  it('allows App Check token exchange via googleapis in connect-src', () => {
    expect(directive(csp, 'connect-src')).toContain('https://*.googleapis.com');
  });

  it('allows reCAPTCHA verification host in connect-src', () => {
    expect(directive(csp, 'connect-src')).toContain('https://www.google.com');
  });

  it('allows the reCAPTCHA script origins in script-src', () => {
    const scriptSrc = directive(csp, 'script-src');
    expect(scriptSrc).toContain('https://www.google.com');
    expect(scriptSrc).toContain('https://www.gstatic.com');
  });

  it('allows the reCAPTCHA iframe in frame-src', () => {
    expect(directive(csp, 'frame-src')).toContain('https://www.google.com');
  });

  it('keeps Stripe + Firebase origins intact', () => {
    expect(directive(csp, 'connect-src')).toContain('https://api.stripe.com');
    expect(directive(csp, 'connect-src')).toContain('https://*.firebaseio.com');
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("object-src 'none'");
  });

  it('embeds the nonce in script-src', () => {
    expect(directive(csp, 'script-src')).toContain("'nonce-test-nonce'");
  });
});

describe('buildCspHeader — environment behavior', () => {
  it('adds unsafe-eval/unsafe-inline ONLY in development', () => {
    const dev = buildCspHeader(true, 'n');
    const prod = buildCspHeader(false, 'n');
    expect(dev).toContain("'unsafe-eval'");
    expect(prod).not.toContain("'unsafe-eval'");
    // production must not weaken script-src with unsafe-inline
    expect(directive(prod, 'script-src')).not.toContain("'unsafe-inline'");
  });
});
