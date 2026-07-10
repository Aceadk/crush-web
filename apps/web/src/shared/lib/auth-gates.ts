export interface AuthLoadingGateState {
  initialized: boolean;
  loading: boolean;
  hasUser: boolean;
  needsEmailVerification: boolean;
  deviceTrustChecked: boolean;
}

/**
 * Blocks protected content only while the initial authentication/device-trust
 * decision is unresolved. Later trusted-device list refreshes must not unmount
 * the current page.
 */
export function shouldShowAuthLoadingShell({
  initialized,
  loading,
  hasUser,
  needsEmailVerification,
  deviceTrustChecked,
}: AuthLoadingGateState): boolean {
  return (
    !initialized ||
    loading ||
    (hasUser && !needsEmailVerification && !deviceTrustChecked)
  );
}
