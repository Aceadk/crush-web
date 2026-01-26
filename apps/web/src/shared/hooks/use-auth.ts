'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@crush/core';

interface UseAuthOptions {
  required?: boolean;
  redirectTo?: string;
  onUnauthenticated?: () => void;
}

/**
 * Hook to handle authentication state and redirects
 */
export function useAuth(options: UseAuthOptions = {}) {
  const {
    required = false,
    redirectTo = '/auth/login',
    onUnauthenticated,
  } = options;

  const router = useRouter();
  const pathname = usePathname();
  const { user, profile, loading, initialized, initialize } = useAuthStore();

  // Initialize auth listener on mount
  useEffect(() => {
    initialize();
  }, [initialize]);

  // Handle redirects for protected routes
  useEffect(() => {
    if (!initialized || loading) return;

    if (required && !user) {
      if (onUnauthenticated) {
        onUnauthenticated();
      } else {
        const redirectUrl = `${redirectTo}?redirect=${encodeURIComponent(pathname)}`;
        router.push(redirectUrl);
      }
    }
  }, [user, required, initialized, loading, router, pathname, redirectTo, onUnauthenticated]);

  return {
    user,
    profile,
    loading: loading || !initialized,
    isAuthenticated: !!user,
    isOnboarded: profile?.onboardingComplete ?? false,
    isProfileComplete: profile?.profileComplete ?? false,
  };
}

/**
 * Hook to require authentication - redirects if not authenticated
 */
export function useRequireAuth(redirectTo?: string) {
  return useAuth({ required: true, redirectTo });
}

/**
 * Hook for guest-only pages (login, signup) - redirects if authenticated
 */
export function useGuestOnly(redirectTo: string = '/discover') {
  const router = useRouter();
  const { user, loading, initialized, initialize } = useAuthStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    if (!initialized || loading) return;

    if (user) {
      router.push(redirectTo);
    }
  }, [user, initialized, loading, router, redirectTo]);

  return {
    loading: loading || !initialized,
  };
}
