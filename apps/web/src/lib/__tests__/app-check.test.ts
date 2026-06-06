/**
 * App Check init tests (Gate 0 / P0.2).
 *
 * Verifies the web client initializes Firebase App Check (reCAPTCHA v3) when
 * configured, honors the debug token, no-ops cleanly when unconfigured, and
 * runs initializeAppCheck exactly once (re-entrancy + idempotency).
 */

import { describe, it, expect, vi, afterEach } from 'vitest';

const { initializeAppCheckMock, reCaptchaCtorMock } = vi.hoisted(() => ({
  initializeAppCheckMock: vi.fn((..._args: unknown[]) => ({ __brand: 'appcheck' })),
  reCaptchaCtorMock: vi.fn((_key?: string) => undefined),
}));

vi.mock('firebase/app-check', () => ({
  initializeAppCheck: (...args: unknown[]) => initializeAppCheckMock(...args),
  ReCaptchaV3Provider: class {
    key: string;
    constructor(key: string) {
      this.key = key;
      reCaptchaCtorMock(key);
    }
  },
}));
vi.mock('firebase/app', () => ({
  initializeApp: vi.fn(() => ({ name: 'app' })),
  getApps: vi.fn(() => []),
}));
vi.mock('firebase/auth', () => ({ getAuth: vi.fn() }));
vi.mock('firebase/firestore', () => ({ getFirestore: vi.fn() }));
vi.mock('firebase/functions', () => ({ getFunctions: vi.fn() }));
vi.mock('firebase/storage', () => ({ getStorage: vi.fn() }));

async function loadConfigWith(env: Record<string, string>) {
  vi.resetModules();
  initializeAppCheckMock.mockClear();
  reCaptchaCtorMock.mockClear();
  vi.stubEnv('NEXT_PUBLIC_FIREBASE_API_KEY', 'test-key');
  vi.stubEnv('NEXT_PUBLIC_FIREBASE_PROJECT_ID', 'test-project');
  vi.stubEnv('NEXT_PUBLIC_FIREBASE_APPCHECK_RECAPTCHA_KEY', env.recaptchaKey ?? '');
  vi.stubEnv('NEXT_PUBLIC_FIREBASE_APPCHECK_DEBUG_TOKEN', env.debugToken ?? '');
  return import('@crush/core/firebase/config');
}

afterEach(() => {
  vi.unstubAllEnvs();
  delete (self as unknown as { FIREBASE_APPCHECK_DEBUG_TOKEN?: unknown })
    .FIREBASE_APPCHECK_DEBUG_TOKEN;
});

describe('App Check — unconfigured', () => {
  it('isAppCheckConfigured is false and init is a no-op without a site key', async () => {
    const cfg = await loadConfigWith({ recaptchaKey: '' });
    expect(cfg.isAppCheckConfigured()).toBe(false);
    expect(cfg.initializeWebAppCheck()).toBeNull();
    expect(initializeAppCheckMock).not.toHaveBeenCalled();
  });
});

describe('App Check — configured', () => {
  it('initializes reCAPTCHA v3 with the site key and auto-refresh', async () => {
    const cfg = await loadConfigWith({ recaptchaKey: 'site-key-123' });
    expect(cfg.isAppCheckConfigured()).toBe(true);

    const instance = cfg.initializeWebAppCheck();
    expect(instance).toBeTruthy();
    expect(reCaptchaCtorMock).toHaveBeenCalledWith('site-key-123');
    expect(initializeAppCheckMock).toHaveBeenCalledTimes(1);
    const options = initializeAppCheckMock.mock.calls[0][1] as {
      isTokenAutoRefreshEnabled: boolean;
    };
    expect(options.isTokenAutoRefreshEnabled).toBe(true);
  });

  it('runs initializeAppCheck exactly once across repeated calls (idempotent)', async () => {
    const cfg = await loadConfigWith({ recaptchaKey: 'site-key-123' });
    cfg.initializeWebAppCheck();
    cfg.initializeWebAppCheck();
    cfg.getFirebaseAppCheck();
    expect(initializeAppCheckMock).toHaveBeenCalledTimes(1);
  });

  it('sets the debug token on self before initializing when provided', async () => {
    const cfg = await loadConfigWith({
      recaptchaKey: 'site-key-123',
      debugToken: 'debug-abc',
    });
    cfg.initializeWebAppCheck();
    expect(
      (self as unknown as { FIREBASE_APPCHECK_DEBUG_TOKEN?: string })
        .FIREBASE_APPCHECK_DEBUG_TOKEN
    ).toBe('debug-abc');
  });

  it('does not set a debug token when none is provided', async () => {
    const cfg = await loadConfigWith({ recaptchaKey: 'site-key-123' });
    cfg.initializeWebAppCheck();
    expect(
      (self as unknown as { FIREBASE_APPCHECK_DEBUG_TOKEN?: string })
        .FIREBASE_APPCHECK_DEBUG_TOKEN
    ).toBeUndefined();
  });
});
