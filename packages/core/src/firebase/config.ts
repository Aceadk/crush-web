import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import {
  initializeAppCheck,
  getToken as getAppCheckTokenInternal,
  ReCaptchaV3Provider,
  ReCaptchaEnterpriseProvider,
  type AppCheck,
} from 'firebase/app-check';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getFunctions, Functions } from 'firebase/functions';
import { getStorage, FirebaseStorage } from 'firebase/storage';

// Trim all env values to prevent whitespace/newline contamination (e.g. Vercel env vars)
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY?.trim(),
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN?.trim(),
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim(),
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET?.trim(),
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID?.trim(),
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID?.trim(),
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID?.trim(),
};

// Check if Firebase is configured (only on client side)
export function isFirebaseConfigured(): boolean {
  return (
    typeof window !== 'undefined' && Boolean(firebaseConfig.apiKey && firebaseConfig.projectId)
  );
}

// Cloud Functions region must match the deployed functions runtime.
// See docs/reports/shared_backend_contract_matrix_2026-06-05.md (us-central1).
const FUNCTIONS_REGION = 'us-central1';

// App Check — production callable/REST paths enforce App Check, so the web
// client must attest. The site key is environment-specific. The default
// provider is reCAPTCHA Enterprise (the approved production provider); set
// NEXT_PUBLIC_FIREBASE_APPCHECK_PROVIDER=recaptcha-v3 to opt into classic v3.
// A debug token is honored ONLY in local development, never in staging/prod.
const APPCHECK_RECAPTCHA_KEY =
  process.env.NEXT_PUBLIC_FIREBASE_APPCHECK_RECAPTCHA_KEY?.trim();
const APPCHECK_DEBUG_TOKEN =
  process.env.NEXT_PUBLIC_FIREBASE_APPCHECK_DEBUG_TOKEN?.trim();
const APPCHECK_PROVIDER = (
  process.env.NEXT_PUBLIC_FIREBASE_APPCHECK_PROVIDER?.trim().toLowerCase() ||
  'recaptcha-enterprise'
) as 'recaptcha-enterprise' | 'recaptcha-v3';

/** Resolved app environment: development | staging | production. */
function resolveAppEnv(): 'development' | 'staging' | 'production' {
  const raw = (
    process.env.NEXT_PUBLIC_APP_ENV?.trim().toLowerCase() ||
    process.env.NODE_ENV?.trim().toLowerCase() ||
    ''
  );
  if (raw === 'staging' || raw === 'preview') return 'staging';
  if (raw === 'production') return 'production';
  // 'development', 'local', 'test', or unset → development.
  return 'development';
}

/** Debug tokens are honored only in local development. */
function debugTokenAllowed(): boolean {
  return resolveAppEnv() === 'development';
}

export interface AppCheckEnvValidation {
  ok: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validate App Check environment configuration. Missing the site key is an
 * error in staging/production (App Check is enforced there) and a warning in
 * development. A debug token present outside development is a warning (ignored).
 */
export function validateAppCheckEnv(): AppCheckEnvValidation {
  const env = resolveAppEnv();
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!APPCHECK_RECAPTCHA_KEY) {
    const msg =
      'App Check site key missing (NEXT_PUBLIC_FIREBASE_APPCHECK_RECAPTCHA_KEY). ' +
      'Protected callable/REST calls will be rejected where App Check is enforced.';
    if (env === 'development') warnings.push(msg);
    else errors.push(msg);
  }

  if (APPCHECK_DEBUG_TOKEN && env !== 'development') {
    warnings.push(
      `App Check debug token is set in ${env}; it is ignored outside local development.`
    );
  }

  if (APPCHECK_PROVIDER !== 'recaptcha-enterprise' && APPCHECK_PROVIDER !== 'recaptcha-v3') {
    warnings.push(
      `Unknown App Check provider "${APPCHECK_PROVIDER}"; falling back to recaptcha-enterprise.`
    );
  }

  return { ok: errors.length === 0, errors, warnings };
}

// Initialize Firebase only once
let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
let storage: FirebaseStorage | null = null;
let functions: Functions | null = null;
let appCheck: AppCheck | null = null;
// Guards against re-entrancy: getFirebaseApp() triggers App Check init, and
// initializeWebAppCheck() calls getFirebaseApp(), so without this the
// initializeAppCheck() call could run twice.
let appCheckInitStarted = false;

export function getFirebaseApp(): FirebaseApp {
  if (!isFirebaseConfigured()) {
    console.warn('Firebase is not configured. Please set environment variables.');
    throw new Error('Firebase is not configured');
  }
  if (!app) {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
    // Initialize App Check immediately after the app so tokens attach to the
    // very first Firestore/Functions/Storage request. Browser-only + idempotent.
    initializeWebAppCheck();
  }
  return app;
}

/** True when a reCAPTCHA site key is present and we are in the browser. */
export function isAppCheckConfigured(): boolean {
  return typeof window !== 'undefined' && Boolean(APPCHECK_RECAPTCHA_KEY);
}

/**
 * Initialize Firebase App Check once, client-side. Uses reCAPTCHA Enterprise by
 * default (or v3 when NEXT_PUBLIC_FIREBASE_APPCHECK_PROVIDER=recaptcha-v3).
 * Returns the AppCheck instance, or null when not in a browser or not configured
 * (the call is a safe no-op so SSR/build and unconfigured envs never throw).
 *
 * In LOCAL DEVELOPMENT only, NEXT_PUBLIC_FIREBASE_APPCHECK_DEBUG_TOKEN is honored
 * so the emulator/dev can attest without a real reCAPTCHA challenge. The debug
 * token is ignored in staging/production.
 */
export function initializeWebAppCheck(): AppCheck | null {
  if (appCheck) return appCheck;
  // Re-entrancy guard: getFirebaseApp() calls back into this function.
  if (appCheckInitStarted) return appCheck;
  if (typeof window === 'undefined' || !isFirebaseConfigured()) return null;

  // Log env validation issues once at init (errors in staging/prod, warns in dev).
  const validation = validateAppCheckEnv();
  validation.errors.forEach((e) => console.error(`[AppCheck] ${e}`));
  validation.warnings.forEach((w) => console.warn(`[AppCheck] ${w}`));

  if (!APPCHECK_RECAPTCHA_KEY) {
    return null;
  }
  appCheckInitStarted = true;

  // Debug token: local development only. Must be set BEFORE initializeAppCheck.
  if (APPCHECK_DEBUG_TOKEN && debugTokenAllowed()) {
    (
      self as unknown as { FIREBASE_APPCHECK_DEBUG_TOKEN?: string | boolean }
    ).FIREBASE_APPCHECK_DEBUG_TOKEN = APPCHECK_DEBUG_TOKEN;
  }

  const provider =
    APPCHECK_PROVIDER === 'recaptcha-v3'
      ? new ReCaptchaV3Provider(APPCHECK_RECAPTCHA_KEY)
      : new ReCaptchaEnterpriseProvider(APPCHECK_RECAPTCHA_KEY);

  appCheck = initializeAppCheck(getFirebaseApp(), {
    provider,
    isTokenAutoRefreshEnabled: true,
  });
  return appCheck;
}

/** Returns the initialized AppCheck instance, initializing it if needed. */
export function getFirebaseAppCheck(): AppCheck | null {
  return appCheck ?? initializeWebAppCheck();
}

/**
 * Get a current App Check token string (for manual attachment to REST/fetch
 * calls — Firestore/callable SDKs attach it automatically). Returns null when
 * App Check is unavailable. Logs missing/invalid/expired-token conditions.
 *
 * The SDK refreshes tokens automatically; `getToken` returns a fresh one and
 * throws on attestation failure, which we classify and log here.
 */
export async function getAppCheckToken(
  forceRefresh = false
): Promise<string | null> {
  const instance = getFirebaseAppCheck();
  if (!instance) {
    if (isAppCheckConfigured()) {
      console.warn('[AppCheck] Token requested but App Check failed to initialize.');
    }
    return null;
  }
  try {
    const result = await getAppCheckTokenInternal(instance, forceRefresh);
    if (!result?.token) {
      console.warn('[AppCheck] Empty App Check token returned.');
      return null;
    }
    return result.token;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const code =
      typeof (error as { code?: unknown })?.code === 'string'
        ? (error as { code: string }).code
        : '';
    // App Check surfaces attestation/expiry failures here; classify for logs.
    const expired = /expir/i.test(message) || /expir/i.test(code);
    console.error(
      `[AppCheck] Failed to obtain App Check token (${
        expired ? 'expired/invalid' : 'invalid'
      })${code ? ` [${code}]` : ''}: ${message}`
    );
    return null;
  }
}

/**
 * Returns headers that carry the App Check token for manual REST requests, or an
 * empty object when unavailable. Use to spread into fetch() init headers.
 */
export async function getAppCheckHeaders(
  forceRefresh = false
): Promise<Record<string, string>> {
  const token = await getAppCheckToken(forceRefresh);
  return token ? { 'X-Firebase-AppCheck': token } : {};
}

export function getFirebaseAuth(): Auth {
  if (!auth) {
    auth = getAuth(getFirebaseApp());
  }
  return auth;
}

export function getFirebaseDb(): Firestore {
  if (!db) {
    db = getFirestore(getFirebaseApp());
  }
  return db;
}

export function getFirebaseStorage(): FirebaseStorage {
  if (!storage) {
    storage = getStorage(getFirebaseApp());
  }
  return storage;
}

export function getFirebaseFunctions(): Functions {
  if (!functions) {
    functions = getFunctions(getFirebaseApp(), FUNCTIONS_REGION);
  }
  return functions;
}

export { firebaseConfig };
