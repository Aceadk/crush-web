import { describe, expect, it } from 'vitest';
import { shouldShowAuthLoadingShell } from '@/shared/lib/auth-gates';

describe('authenticated app loading gate', () => {
  it('blocks while the initial device-trust decision is unresolved', () => {
    expect(
      shouldShowAuthLoadingShell({
        initialized: true,
        loading: false,
        hasUser: true,
        needsEmailVerification: false,
        deviceTrustChecked: false,
      })
    ).toBe(true);
  });

  it('keeps protected content mounted after trust has been checked', () => {
    expect(
      shouldShowAuthLoadingShell({
        initialized: true,
        loading: false,
        hasUser: true,
        needsEmailVerification: false,
        deviceTrustChecked: true,
      })
    ).toBe(false);
  });
});
