/**
 * App Check init tests (Gate 0 / P0.2 + Phase 2 Step 2).
 *
 * Verifies the web client:
 * - initializes App Check with reCAPTCHA Enterprise by default (v3 opt-in),
 * - honors the debug token ONLY in local development,
 * - validates env (errors in staging/prod, warnings in dev),
 * - exposes a REST token/header helper with logging,
 * - runs initializeAppCheck exactly once (re-entrancy + idempotency).
 */

import { describe, it, expect, vi, afterEach } from 'vitest';

const {
  initializeAppCheckMock,
  reCaptchaV3CtorMock,
  reCaptchaEnterpriseCtorMock,
  getTokenMock,
} = vi.hoisted(() => ({
  initializeAppCheckMock: vi.fn((..._args: unknown[]) => ({ __brand: 'appcheck' })),
  reCaptchaV3CtorMock: vi.fn((_key?: string) => undefined),
  reCaptchaEnterpriseCtorMock: vi.fn((_key?: string) => undefined),
  getTokenMock: vi.fn(),
}));

vi.mock('firebase/app-check', () => ({
  initializeAppCheck: (...args: unknown[]) => initializeAppCheckMock(...args),
  getToken: (...args: unknown[]) => getTokenMock(...args),
  ReCaptchaV3Provider: class {
    key: string;
    constructor(key: string) {
      this.key = key;
      reCaptchaV3CtorMock(key);
    }
  },
  ReCaptchaEnterpriseProvider: class {
    key: string;
    constructor(key: string) {
      this.key = key;
      reCaptchaEnterpriseCtorMock(key);
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

interface ConfigEnv {
  recaptchaKey?: string;
  debugToken?: string;
  provider?: string;
  appEnv?: string;
}

async function loadConfigWith(env: ConfigEnv) {
  vi.resetModules();
  initializeAppCheckMock.mockClear();
  reCaptchaV3CtorMock.mockClear();
  reCaptchaEnterpriseCtorMock.mockClear();
  getTokenMock.mockReset();
  vi.stubEnv('NEXT_PUBLIC_FIREBASE_API_KEY', 'test-key');
  vi.stubEnv('NEXT_PUBLIC_FIREBASE_PROJECT_ID', 'test-project');
  vi.stubEnv('NEXT_PUBLIC_FIREBASE_APPCHECK_RECAPTCHA_KEY', env.recaptchaKey ?? '');
  vi.stubEnv('NEXT_PUBLIC_FIREBASE_APPCHECK_DEBUG_TOKEN', env.debugToken ?? '');
  vi.stubEnv('NEXT_PUBLIC_FIREBASE_APPCHECK_PROVIDER', env.provider ?? '');
  vi.stubEnv('NEXT_PUBLIC_APP_ENV', env.appEnv ?? 'development');
  return import('@crush/core/firebase/config');
}

function debugTokenOnSelf(): unknown {
  return (self as unknown as { FIREBASE_APPCHECK_DEBUG_TOKEN?: unknown })
    .FIREBASE_APPCHECK_DEBUG_TOKEN;
}

afterEach(() => {
  vi.unstubAllEnvs();
  delete (self as unknown as { FIREBASE_APPCHECK_DEBUG_TOKEN?: unknown })
    .FIREBASE_APPCHECK_DEBUG_TOKEN;
});

describe('App Check — provider selection', () => {
  it('defaults to reCAPTCHA Enterprise', async () => {
    const cfg = await loadConfigWith({ recaptchaKey: 'site-key' });
    cfg.initializeWebAppCheck();
    expect(reCaptchaEnterpriseCtorMock).toHaveBeenCalledWith('site-key');
    expect(reCaptchaV3CtorMock).not.toHaveBeenCalled();
  });

  it('uses reCAPTCHA v3 when explicitly opted in', async () => {
    const cfg = await loadConfigWith({
      recaptchaKey: 'site-key',
      provider: 'recaptcha-v3',
    });
    cfg.initializeWebAppCheck();
    expect(reCaptchaV3CtorMock).toHaveBeenCalledWith('site-key');
    expect(reCaptchaEnterpriseCtorMock).not.toHaveBeenCalled();
  });

  it('enables auto token refresh', async () => {
    const cfg = await loadConfigWith({ recaptchaKey: 'site-key' });
    cfg.initializeWebAppCheck();
    const options = initializeAppCheckMock.mock.calls[0][1] as {
      isTokenAutoRefreshEnabled: boolean;
    };
    expect(options.isTokenAutoRefreshEnabled).toBe(true);
  });
});

describe('App Check — debug token gating', () => {
  it('sets the debug token in local development', async () => {
    const cfg = await loadConfigWith({
      recaptchaKey: 'site-key',
      debugToken: 'debug-abc',
      appEnv: 'development',
    });
    cfg.initializeWebAppCheck();
    expect(debugTokenOnSelf()).toBe('debug-abc');
  });

  it('IGNORES the debug token in staging', async () => {
    const cfg = await loadConfigWith({
      recaptchaKey: 'site-key',
      debugToken: 'debug-abc',
      appEnv: 'staging',
    });
    cfg.initializeWebAppCheck();
    expect(debugTokenOnSelf()).toBeUndefined();
  });

  it('IGNORES the debug token in production', async () => {
    const cfg = await loadConfigWith({
      recaptchaKey: 'site-key',
      debugToken: 'debug-abc',
      appEnv: 'production',
    });
    cfg.initializeWebAppCheck();
    expect(debugTokenOnSelf()).toBeUndefined();
  });
});

describe('App Check — env validation', () => {
  it('missing key is an ERROR in production', async () => {
    const cfg = await loadConfigWith({ recaptchaKey: '', appEnv: 'production' });
    const v = cfg.validateAppCheckEnv();
    expect(v.ok).toBe(false);
    expect(v.errors.join(' ')).toMatch(/site key missing/i);
  });

  it('missing key is only a WARNING in development', async () => {
    const cfg = await loadConfigWith({ recaptchaKey: '', appEnv: 'development' });
    const v = cfg.validateAppCheckEnv();
    expect(v.ok).toBe(true);
    expect(v.warnings.join(' ')).toMatch(/site key missing/i);
  });

  it('debug token outside development is a warning', async () => {
    const cfg = await loadConfigWith({
      recaptchaKey: 'site-key',
      debugToken: 'debug-abc',
      appEnv: 'production',
    });
    const v = cfg.validateAppCheckEnv();
    expect(v.warnings.join(' ')).toMatch(/debug token/i);
  });
});

describe('App Check — unconfigured + idempotency', () => {
  it('init is a no-op without a site key', async () => {
    const cfg = await loadConfigWith({ recaptchaKey: '' });
    expect(cfg.isAppCheckConfigured()).toBe(false);
    expect(cfg.initializeWebAppCheck()).toBeNull();
    expect(initializeAppCheckMock).not.toHaveBeenCalled();
  });

  it('runs initializeAppCheck exactly once across repeated calls', async () => {
    const cfg = await loadConfigWith({ recaptchaKey: 'site-key' });
    cfg.initializeWebAppCheck();
    cfg.initializeWebAppCheck();
    cfg.getFirebaseAppCheck();
    expect(initializeAppCheckMock).toHaveBeenCalledTimes(1);
  });
});

describe('App Check — REST token helper', () => {
  it('returns the token and X-Firebase-AppCheck header when valid', async () => {
    const cfg = await loadConfigWith({ recaptchaKey: 'site-key' });
    getTokenMock.mockResolvedValue({ token: 'tok-123' });
    expect(await cfg.getAppCheckToken()).toBe('tok-123');
    expect(await cfg.getAppCheckHeaders()).toEqual({
      'X-Firebase-AppCheck': 'tok-123',
    });
  });

  it('returns null/empty headers and logs when token retrieval fails', async () => {
    const cfg = await loadConfigWith({ recaptchaKey: 'site-key' });
    const err = Object.assign(new Error('token expired'), { code: 'appCheck/fetch-status-error' });
    getTokenMock.mockRejectedValue(err);
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(await cfg.getAppCheckToken()).toBeNull();
    expect(await cfg.getAppCheckHeaders()).toEqual({});
    expect(errorSpy).toHaveBeenCalled();
    expect(errorSpy.mock.calls.some((c) => /expired|invalid/i.test(String(c[0])))).toBe(true);
    errorSpy.mockRestore();
  });

  it('returns null without throwing when App Check is unconfigured', async () => {
    const cfg = await loadConfigWith({ recaptchaKey: '' });
    expect(await cfg.getAppCheckToken()).toBeNull();
    expect(await cfg.getAppCheckHeaders()).toEqual({});
  });
});
