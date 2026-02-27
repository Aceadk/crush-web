/**
 * Unit tests for CSRF verification utility.
 * CR-AUD-040
 */
import { describe, it, expect } from 'vitest';
import { verifyCsrf } from '../csrf';

describe('verifyCsrf', () => {
  it('allows requests with valid origin (localhost)', () => {
    const request = new Request('https://example.com/api/test', {
      method: 'POST',
      headers: { origin: 'http://localhost:3000' },
    });
    expect(verifyCsrf(request)).toBeNull();
  });

  it('allows requests with valid origin (production)', () => {
    const request = new Request('https://crush.app/api/test', {
      method: 'POST',
      headers: { origin: 'https://crush.app' },
    });
    expect(verifyCsrf(request)).toBeNull();
  });

  it('rejects requests with invalid origin', () => {
    const request = new Request('https://example.com/api/test', {
      method: 'POST',
      headers: { origin: 'https://evil.com' },
    });
    const result = verifyCsrf(request);
    expect(result).toContain('Forbidden');
    expect(result).toContain('evil.com');
  });

  it('falls back to referer when no origin header', () => {
    const request = new Request('https://example.com/api/test', {
      method: 'POST',
      headers: { referer: 'http://localhost:3000/page' },
    });
    expect(verifyCsrf(request)).toBeNull();
  });

  it('rejects requests with invalid referer', () => {
    const request = new Request('https://example.com/api/test', {
      method: 'POST',
      headers: { referer: 'https://evil.com/fake' },
    });
    const result = verifyCsrf(request);
    expect(result).toContain('Forbidden');
  });

  it('rejects requests with malformed referer', () => {
    const request = new Request('https://example.com/api/test', {
      method: 'POST',
      headers: { referer: 'not-a-url' },
    });
    expect(verifyCsrf(request)).toBe('Forbidden: invalid referer');
  });

  it('rejects requests with no origin or referer', () => {
    const request = new Request('https://example.com/api/test', {
      method: 'POST',
    });
    expect(verifyCsrf(request)).toBe('Forbidden: missing origin header');
  });
});
