import { describe, expect, it } from 'vitest';
import type { User } from 'firebase/auth';
import { isFederatedSignIn } from '@crush/core';

function userWithProviders(...providerIds: string[]): User {
  return {
    providerData: providerIds.map((providerId) => ({ providerId })),
  } as User;
}

/**
 * Federated (Google/Apple) sign-ins must skip the password-account
 * new-device email verification flow — otherwise a Google account already
 * signed in to the browser is blocked from a one-tap login and can get
 * stranded on the email-link completion step.
 */
describe('isFederatedSignIn (device-verification skip)', () => {
  it('is true for a Google sign-in', () => {
    expect(isFederatedSignIn(userWithProviders('google.com'))).toBe(true);
  });

  it('is true for an Apple sign-in', () => {
    expect(isFederatedSignIn(userWithProviders('apple.com'))).toBe(true);
  });

  it('is true when a federated provider is linked alongside password', () => {
    expect(isFederatedSignIn(userWithProviders('password', 'google.com'))).toBe(true);
  });

  it('is false for an email/password-only account (device verification applies)', () => {
    expect(isFederatedSignIn(userWithProviders('password'))).toBe(false);
  });

  it('is false for a phone-only account', () => {
    expect(isFederatedSignIn(userWithProviders('phone'))).toBe(false);
  });
});
