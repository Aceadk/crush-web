const DEFAULT_REDIRECT_PATH = '/discover';

/**
 * Sanitize a user-provided redirect path and force internal relative routing.
 */
export function sanitizeRedirectPath(
  redirect: string | null | undefined,
  fallback: string = DEFAULT_REDIRECT_PATH
): string {
  if (!redirect) {
    return fallback;
  }

  const trimmed = redirect.trim();
  if (!trimmed.startsWith('/') || trimmed.startsWith('//')) {
    return fallback;
  }

  try {
    const base = new URL('https://crush.local');
    const url = new URL(trimmed, base);
    if (url.origin !== base.origin) {
      return fallback;
    }

    const normalized = `${url.pathname}${url.search}${url.hash}`;
    if (!normalized.startsWith('/') || normalized.startsWith('//')) {
      return fallback;
    }

    return normalized;
  } catch {
    return fallback;
  }
}

/**
 * Append or replace `redirect` query param while preserving existing query/hash.
 */
export function appendRedirectParam(
  path: string,
  redirect: string | null | undefined
): string {
  const safeRedirect = sanitizeRedirectPath(redirect, '');
  if (!safeRedirect) {
    return path;
  }

  const hashIndex = path.indexOf('#');
  const hash = hashIndex >= 0 ? path.slice(hashIndex) : '';
  const pathWithoutHash = hashIndex >= 0 ? path.slice(0, hashIndex) : path;

  const queryIndex = pathWithoutHash.indexOf('?');
  const pathname =
    queryIndex >= 0 ? pathWithoutHash.slice(0, queryIndex) : pathWithoutHash;
  const queryString = queryIndex >= 0 ? pathWithoutHash.slice(queryIndex + 1) : '';
  const params = new URLSearchParams(queryString);
  params.set('redirect', safeRedirect);

  const nextQuery = params.toString();
  return `${pathname}${nextQuery ? `?${nextQuery}` : ''}${hash}`;
}

