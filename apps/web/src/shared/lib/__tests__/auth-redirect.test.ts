import { describe, expect, it } from 'vitest';
import { appendRedirectParam, sanitizeRedirectPath } from '../auth-redirect';

describe('sanitizeRedirectPath', () => {
  it('returns default fallback for nullish values', () => {
    expect(sanitizeRedirectPath(null)).toBe('/discover');
    expect(sanitizeRedirectPath(undefined)).toBe('/discover');
    expect(sanitizeRedirectPath('')).toBe('/discover');
  });

  it('accepts internal paths with query/hash', () => {
    expect(sanitizeRedirectPath('/messages/123?tab=info#top')).toBe('/messages/123?tab=info#top');
  });

  it('rejects external or malformed redirects', () => {
    expect(sanitizeRedirectPath('https://evil.example/steal')).toBe('/discover');
    expect(sanitizeRedirectPath('//evil.example/steal')).toBe('/discover');
    expect(sanitizeRedirectPath('javascript:alert(1)')).toBe('/discover');
  });
});

describe('appendRedirectParam', () => {
  it('adds redirect to a clean path', () => {
    expect(appendRedirectParam('/auth/login', '/messages/abc')).toBe(
      '/auth/login?redirect=%2Fmessages%2Fabc'
    );
  });

  it('preserves existing query params and hash', () => {
    expect(
      appendRedirectParam('/auth/signup?source=paywall#hero', '/weekly-picks?mode=all')
    ).toBe('/auth/signup?source=paywall&redirect=%2Fweekly-picks%3Fmode%3Dall#hero');
  });

  it('replaces existing redirect param and ignores invalid redirects', () => {
    expect(appendRedirectParam('/auth/login?redirect=%2Fdiscover', '/messages')).toBe(
      '/auth/login?redirect=%2Fmessages'
    );
    expect(appendRedirectParam('/auth/login?source=gate', 'https://evil.example')).toBe(
      '/auth/login?source=gate'
    );
  });
});

