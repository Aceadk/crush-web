'use client';

import { useEffect, type ReactNode } from 'react';
import { useAuthStore } from '@crush/core';

interface AuthInitializerProps {
  children: ReactNode;
}

/**
 * Global auth initializer component that sets up the Firebase auth state listener.
 * This must be rendered at the app root level to ensure auth state is tracked
 * across all pages, including auth pages (login, signup).
 */
export function AuthInitializer({ children }: AuthInitializerProps) {
  const initialize = useAuthStore((state) => state.initialize);

  useEffect(() => {
    // Initialize auth listener on mount
    initialize();
  }, [initialize]);

  return <>{children}</>;
}
