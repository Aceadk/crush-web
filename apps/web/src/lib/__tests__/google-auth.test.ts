import { describe, expect, it } from 'vitest';
import type { User } from 'firebase/auth';
import { reconcileGooglePopupError } from '@crush/core/services/auth';

function userWithProviders(...providerIds: string[]): User {
  return {
    providerData: providerIds.map((providerId) => ({ providerId })),
  } as User;
}

describe('reconcileGooglePopupError', () => {
  it('treats an authenticated Google user as a successful popup result', () => {
    const user = userWithProviders('password', 'google.com');

    expect(reconcileGooglePopupError(new Error('popup closed'), user)).toBe(user);
  });

  it('preserves the popup failure when no Google user is authenticated', () => {
    const error = new Error('popup closed');

    expect(() => reconcileGooglePopupError(error, null)).toThrow(error);
    expect(() => reconcileGooglePopupError(error, userWithProviders('password'))).toThrow(error);
  });
});
