/**
 * Sanitizes error text before it is shown to a user.
 *
 * Raw errors from Firebase/network layers sometimes embed full request URLs,
 * including `key=AIza…` API keys, storage download `token=…` values, or auth
 * `oobCode=…` parameters. Those must never reach the UI. Hand-written
 * friendly messages pass through unchanged.
 */

const GOOGLE_API_KEY = /AIza[0-9A-Za-z_-]{20,}/g;
const CREDENTIAL_PARAM =
  /\b(api[_-]?key|key|token|access[_-]?token|id[_-]?token|refresh[_-]?token|oob[_-]?code|secret|signature|password)=[^&#\s"']+/gi;
const BEARER_TOKEN = /Bearer\s+[A-Za-z0-9\-._~+/]+=*/gi;

export function sanitizeErrorText(text: string): string {
  return text
    .replace(GOOGLE_API_KEY, '[hidden]')
    .replace(CREDENTIAL_PARAM, (_match, name: string) => `${name}=[hidden]`)
    .replace(BEARER_TOKEN, 'Bearer [hidden]');
}

/**
 * Standard way to turn a caught `unknown` into user-facing text: uses the
 * error's message (sanitized) when available, otherwise the fallback.
 */
export function errorText(error: unknown, fallback: string): string {
  return error instanceof Error ? sanitizeErrorText(error.message) : fallback;
}
