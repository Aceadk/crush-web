import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import {
  initializeAppCheck,
  ReCaptchaV3Provider,
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

// App Check (reCAPTCHA v3) — production callable/REST paths enforce App Check,
// so the web client must attest. The site key is environment-specific; a debug
// token enables local/emulator use without weakening production enforcement.
const APPCHECK_RECAPTCHA_KEY =
  process.env.NEXT_PUBLIC_FIREBASE_APPCHECK_RECAPTCHA_KEY?.trim();
const APPCHECK_DEBUG_TOKEN =
  process.env.NEXT_PUBLIC_FIREBASE_APPCHECK_DEBUG_TOKEN?.trim();

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
 * Initialize Firebase App Check (reCAPTCHA v3) once, client-side. Returns the
 * AppCheck instance, or null when not in a browser or not configured (the call
 * is a safe no-op so SSR/build and unconfigured envs never throw).
 *
 * Set NEXT_PUBLIC_FIREBASE_APPCHECK_DEBUG_TOKEN locally to use a registered
 * debug token against the emulator/staging without a real reCAPTCHA challenge.
 */
export function initializeWebAppCheck(): AppCheck | null {
  if (appCheck) return appCheck;
  // Re-entrancy guard: getFirebaseApp() calls back into this function.
  if (appCheckInitStarted) return appCheck;
  if (typeof window === 'undefined' || !isFirebaseConfigured()) return null;
  if (!APPCHECK_RECAPTCHA_KEY) {
    console.warn(
      'App Check is not configured (missing NEXT_PUBLIC_FIREBASE_APPCHECK_RECAPTCHA_KEY). ' +
        'Protected backend calls will fail where App Check is enforced.'
    );
    return null;
  }
  appCheckInitStarted = true;

  // Must be set BEFORE initializeAppCheck so the SDK uses the debug provider.
  if (APPCHECK_DEBUG_TOKEN) {
    (
      self as unknown as { FIREBASE_APPCHECK_DEBUG_TOKEN?: string | boolean }
    ).FIREBASE_APPCHECK_DEBUG_TOKEN = APPCHECK_DEBUG_TOKEN;
  }

  appCheck = initializeAppCheck(getFirebaseApp(), {
    provider: new ReCaptchaV3Provider(APPCHECK_RECAPTCHA_KEY),
    isTokenAutoRefreshEnabled: true,
  });
  return appCheck;
}

/** Returns the initialized AppCheck instance, initializing it if needed. */
export function getFirebaseAppCheck(): AppCheck | null {
  return appCheck ?? initializeWebAppCheck();
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
