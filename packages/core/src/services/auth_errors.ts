/**
 * Shared auth error mapper (P1 #6 of the web-mobile alignment audit).
 *
 * Web auth surfaces two error families:
 *  1. Firebase Auth client errors    — code like `auth/wrong-password`
 *  2. Cloud Functions callable errors — HttpsError code like
 *     `functions/failed-precondition` (or bare `failed-precondition`)
 *
 * Previously the auth store displayed `error.message` verbatim, so users saw
 * technical strings like "Firebase: Error (auth/wrong-password).". This maps
 * both families to consistent, friendly messages aligned with the native app's
 * presentation. For backend callables whose message is intentionally
 * user-facing (e.g. "Unsend is only available on the Plus plan."), the backend
 * message is preferred over a generic one.
 */

const DEFAULT_MESSAGE = 'Something went wrong. Please try again.';

/** Friendly messages keyed by the normalized error code (last path segment). */
const FIREBASE_AUTH_MESSAGES: Record<string, string> = {
  'wrong-password': 'Incorrect email or password.',
  'invalid-credential': 'Incorrect email or password.',
  'invalid-login-credentials': 'Incorrect email or password.',
  'user-not-found': 'No account found with that email.',
  'invalid-email': 'Please enter a valid email address.',
  'user-disabled': 'This account has been disabled. Please contact support.',
  'email-already-in-use': 'An account with this email already exists.',
  'weak-password': 'Password is too weak. Use at least 6 characters.',
  'too-many-requests':
    'Too many attempts. Please wait a moment and try again.',
  'network-request-failed':
    'Network error. Check your connection and try again.',
  'popup-closed-by-user': 'Sign-in was cancelled.',
  'cancelled-popup-request': 'Sign-in was cancelled.',
  'popup-blocked':
    'Your browser blocked the sign-in popup. Allow popups and try again.',
  'account-exists-with-different-credential':
    'This email is already linked to a different sign-in method.',
  'requires-recent-login':
    'For your security, please sign in again to complete this action.',
  'invalid-action-code': 'This link is invalid or has already been used.',
  'expired-action-code': 'This link has expired. Please request a new one.',
  'invalid-verification-code': 'The verification code is incorrect.',
  'code-expired': 'The verification code has expired. Request a new one.',
  'missing-phone-number': 'Please enter a phone number.',
  'invalid-phone-number': 'Please enter a valid phone number.',
  'operation-not-allowed': 'This sign-in method is not enabled.',
  'unverified-email': 'Please verify your email address first.',
};

/** Friendly messages for generic callable status codes. */
const CALLABLE_MESSAGES: Record<string, string> = {
  unauthenticated: 'Please sign in to continue.',
  'permission-denied': 'You do not have permission to do that.',
  'not-found': 'The requested item could not be found.',
  'resource-exhausted': 'You have reached a limit. Please try again later.',
  'deadline-exceeded': 'The request timed out. Please try again.',
  unavailable: 'Service is temporarily unavailable. Please try again.',
  cancelled: 'The request was cancelled.',
  internal: DEFAULT_MESSAGE,
  unknown: DEFAULT_MESSAGE,
};

/**
 * Callable codes whose backend `message` is intentionally user-facing and
 * should be shown verbatim (the backend authored a specific explanation).
 */
const PREFER_BACKEND_MESSAGE = new Set([
  'invalid-argument',
  'failed-precondition',
  'already-exists',
  'out-of-range',
]);

function extractCode(error: unknown): string | null {
  if (!error || typeof error !== 'object') return null;
  const raw = (error as { code?: unknown }).code;
  if (typeof raw !== 'string' || !raw) return null;
  // Normalize "auth/wrong-password" / "functions/failed-precondition" → last seg.
  const lastSlash = raw.lastIndexOf('/');
  return (lastSlash >= 0 ? raw.slice(lastSlash + 1) : raw).toLowerCase();
}

function extractMessage(error: unknown): string | null {
  if (!error) return null;
  if (typeof error === 'string') return error;
  if (typeof error === 'object') {
    const msg = (error as { message?: unknown }).message;
    if (typeof msg === 'string' && msg) return msg;
  }
  return null;
}

/**
 * True when a message looks like a raw Firebase technical string rather than a
 * human-friendly sentence (so we hide it behind the fallback).
 */
function looksTechnical(message: string): boolean {
  return (
    /^firebase:/i.test(message) ||
    /\b(auth|functions)\/[a-z-]+/i.test(message) ||
    message.includes('(') && /[a-z]+\/[a-z-]+/i.test(message)
  );
}

/**
 * Auth/callable codes that have a localized message in the web `authErrors`
 * i18n namespace (apps/web/src/i18n/messages). Kept in sync with that catalog so
 * `getAuthErrorKey` only returns keys that resolve.
 */
const LOCALIZED_AUTH_ERROR_CODES = new Set<string>([
  'wrong-password',
  'invalid-credential',
  'user-not-found',
  'invalid-email',
  'user-disabled',
  'email-already-in-use',
  'weak-password',
  'too-many-requests',
  'network-request-failed',
  'popup-closed-by-user',
  'popup-blocked',
  'requires-recent-login',
  'invalid-verification-code',
  'invalid-phone-number',
  'unauthenticated',
  'permission-denied',
  'resource-exhausted',
  'unavailable',
]);

/**
 * Resolve an error to an i18n key in the `authErrors` namespace (e.g.
 * `authErrors.wrong-password`) for localized display, or `null` when no
 * localized mapping exists (callers should fall back to `getAuthErrorMessage`
 * or a generic key). Pure — no React/i18n dependency, so it stays in core.
 */
export function getAuthErrorKey(error: unknown): string | null {
  const code = extractCode(error);
  if (code && LOCALIZED_AUTH_ERROR_CODES.has(code)) {
    return `authErrors.${code}`;
  }
  return null;
}

/**
 * Convert any auth/callable error into a friendly, user-facing message.
 */
export function getAuthErrorMessage(
  error: unknown,
  fallback: string = DEFAULT_MESSAGE
): string {
  const code = extractCode(error);
  const rawMessage = extractMessage(error);

  if (code) {
    if (FIREBASE_AUTH_MESSAGES[code]) return FIREBASE_AUTH_MESSAGES[code];
    if (PREFER_BACKEND_MESSAGE.has(code) && rawMessage && !looksTechnical(rawMessage)) {
      return rawMessage;
    }
    if (CALLABLE_MESSAGES[code]) return CALLABLE_MESSAGES[code];
    // Known-but-unmapped argument/precondition without a clean message.
    if (PREFER_BACKEND_MESSAGE.has(code)) return fallback;
  }

  // No code: surface a clean message if it isn't a technical Firebase string.
  if (rawMessage && !looksTechnical(rawMessage)) return rawMessage;

  return fallback;
}
