/**
 * CSP regression tests (Gate 0 / P0.2 + Phase 2 Step 3).
 *
 * Ensures the Content-Security-Policy permits every backend integration the web
 * app needs (Firebase callables, discovery REST, Storage, Stripe, web push/FCM,
 * App Check/reCAPTCHA), stays environment-specific (dev emulator origins; strict
 * prod), and supports the canonical REST API origin once the domain lands.
 */

import { describe, expect, it } from 'vitest';
import { buildCspHeader } from '@/shared/lib/csp';

function directive(csp: string, name: string): string {
  const part = csp
    .split(';')
    .map((s) => s.trim())
    .find((s) => s.startsWith(`${name} `) || s === name);
  return part ?? '';
}

describe('CSP — required backend origins (production)', () => {
  const csp = buildCspHeader({ isDevelopment: false, nonce: 'test-nonce' });

  it('Firebase callables + discovery REST (cloudfunctions)', () => {
    expect(directive(csp, 'connect-src')).toContain('https://*.cloudfunctions.net');
  });

  it('App Check token exchange + FCM registration (googleapis)', () => {
    expect(directive(csp, 'connect-src')).toContain('https://*.googleapis.com');
  });

  it('Firebase Storage', () => {
    const csp2 = csp;
    expect(directive(csp2, 'connect-src')).toContain(
      'https://firebasestorage.googleapis.com'
    );
    expect(directive(csp2, 'img-src')).toContain(
      'https://firebasestorage.googleapis.com'
    );
  });

  it('Stripe (connect + script + frame)', () => {
    expect(directive(csp, 'connect-src')).toContain('https://api.stripe.com');
    expect(directive(csp, 'script-src')).toContain('https://js.stripe.com');
    expect(directive(csp, 'frame-src')).toContain('https://js.stripe.com');
    expect(directive(csp, 'frame-src')).toContain('https://hooks.stripe.com');
  });

  it('web push service worker via worker-src self', () => {
    expect(directive(csp, 'worker-src')).toContain("'self'");
  });

  it('reCAPTCHA / App Check (connect + script + frame)', () => {
    expect(directive(csp, 'connect-src')).toContain('https://www.google.com');
    expect(directive(csp, 'script-src')).toContain('https://www.google.com');
    expect(directive(csp, 'script-src')).toContain('https://www.gstatic.com');
    expect(directive(csp, 'frame-src')).toContain('https://www.google.com');
  });

  it('Firebase realtime + websockets', () => {
    expect(directive(csp, 'connect-src')).toContain('https://*.firebaseio.com');
    expect(directive(csp, 'connect-src')).toContain('wss://*.firebaseio.com');
  });

  it('embeds the nonce and locks down object/base/default', () => {
    expect(directive(csp, 'script-src')).toContain("'nonce-test-nonce'");
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("base-uri 'self'");
  });
});

describe('CSP — environment-specific behavior', () => {
  it('production is restrictive: no unsafe-eval/inline in script-src, no localhost', () => {
    const prod = buildCspHeader({ isDevelopment: false, nonce: 'n' });
    expect(directive(prod, 'script-src')).not.toContain("'unsafe-eval'");
    expect(directive(prod, 'script-src')).not.toContain("'unsafe-inline'");
    expect(directive(prod, 'connect-src')).not.toContain('localhost');
    expect(directive(prod, 'connect-src')).not.toContain('127.0.0.1');
  });

  it('development allows webpack eval/inline and local emulator origins', () => {
    const dev = buildCspHeader({ isDevelopment: true, nonce: 'n' });
    expect(directive(dev, 'script-src')).toContain("'unsafe-eval'");
    const connect = directive(dev, 'connect-src');
    expect(connect).toContain('http://localhost:*');
    expect(connect).toContain('http://127.0.0.1:*');
    expect(connect).toContain('ws://localhost:*');
  });
});

describe('CSP — canonical REST API origin', () => {
  it('adds a valid https apiOrigin to connect-src', () => {
    const csp = buildCspHeader({
      isDevelopment: false,
      nonce: 'n',
      apiOrigin: 'https://api.crush.app',
    });
    expect(directive(csp, 'connect-src')).toContain('https://api.crush.app');
  });

  it('strips a trailing slash from apiOrigin', () => {
    const csp = buildCspHeader({
      isDevelopment: false,
      nonce: 'n',
      apiOrigin: 'https://api.crush.app/',
    });
    const connect = directive(csp, 'connect-src');
    expect(connect).toContain('https://api.crush.app');
    expect(connect).not.toContain('https://api.crush.app/');
  });

  it('ignores an invalid/malicious apiOrigin', () => {
    const csp = buildCspHeader({
      isDevelopment: false,
      nonce: 'n',
      apiOrigin: "https://evil.example' 'unsafe-inline",
    });
    expect(directive(csp, 'connect-src')).not.toContain('evil.example');
    expect(directive(csp, 'connect-src')).not.toContain("'unsafe-inline'");
  });

  it('is a no-op when apiOrigin is absent', () => {
    const withOut = buildCspHeader({ isDevelopment: false, nonce: 'n' });
    expect(directive(withOut, 'connect-src')).toContain('https://*.cloudfunctions.net');
  });
});

describe('CSP — back-compat positional signature', () => {
  it('still accepts (isDevelopment, nonce)', () => {
    const csp = buildCspHeader(false, 'legacy-nonce');
    expect(directive(csp, 'script-src')).toContain("'nonce-legacy-nonce'");
    expect(directive(csp, 'connect-src')).toContain('https://*.cloudfunctions.net');
  });
});
