'use client';

import { Suspense, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore, useUIStore, useMatchStore } from '@crush/core';
import { Sidebar } from '@/shared/components/layout/app-sidebar';
import { AuthLoadingShell, AuthRedirectingShell } from '@/shared/components/layout/auth-shell';
import { useIsMobile } from '@/shared/hooks';
import { appendRedirectParam } from '@/shared/lib/auth-redirect';
import { RuntimeProviders } from '@/shared/providers/runtime-providers';

function AppLayoutContent({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const {
    user,
    profile,
    loading,
    initialized,
    deviceTrusted,
    deviceTrustChecked,
    deviceTrustLoading,
    checkDeviceTrust,
  } = useAuthStore();
  const { setIsMobile } = useUIStore();
  const { subscribeToMatches, cleanup } = useMatchStore();
  const isMobile = useIsMobile();
  const needsEmailVerification = Boolean(user?.email && !user.emailVerified);

  // Note: Auth is initialized globally in AuthInitializer provider

  useEffect(() => {
    setIsMobile(isMobile);
  }, [isMobile, setIsMobile]);

  // Subscribe to matches when authenticated
  useEffect(() => {
    if (user && !needsEmailVerification) {
      subscribeToMatches(user.uid);
    }

    return () => {
      cleanup();
    };
  }, [user, needsEmailVerification, subscribeToMatches, cleanup]);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (initialized && !loading && !user) {
      // Clear auth cookie via server-side API (HttpOnly) then redirect
      fetch('/api/auth/session', { method: 'DELETE' }).finally(() => {
        window.location.href = '/auth/login';
      });
    }
  }, [user, loading, initialized]);

  // Enforce email verification for email/password users before app access.
  useEffect(() => {
    if (initialized && !loading && user && needsEmailVerification) {
      const currentSearch = typeof window !== 'undefined' ? window.location.search : '';
      const currentPath = `${pathname}${currentSearch}`;
      router.replace(appendRedirectParam('/auth/verify-email', currentPath));
    }
  }, [initialized, loading, user, needsEmailVerification, pathname, router]);

  // Re-check trust state for verified email sessions if it is not available yet.
  useEffect(() => {
    if (!initialized || loading || !user || needsEmailVerification) {
      return;
    }

    if (!deviceTrustChecked && !deviceTrustLoading) {
      void checkDeviceTrust();
    }
  }, [
    initialized,
    loading,
    user,
    needsEmailVerification,
    deviceTrustChecked,
    deviceTrustLoading,
    checkDeviceTrust,
  ]);

  // Enforce device verification for verified email accounts on protected app routes.
  useEffect(() => {
    if (!initialized || loading || !user || needsEmailVerification) {
      return;
    }

    if (!deviceTrustChecked || deviceTrustLoading || deviceTrusted) {
      return;
    }

    const currentSearch = typeof window !== 'undefined' ? window.location.search : '';
    const currentPath = `${pathname}${currentSearch}`;
    const verifyUrl = appendRedirectParam('/auth/device-verify', currentPath);
    const redirectUrl = `${verifyUrl}${verifyUrl.includes('?') ? '&' : '?'}reason=device`;
    router.replace(redirectUrl);
  }, [
    initialized,
    loading,
    user,
    needsEmailVerification,
    deviceTrustChecked,
    deviceTrustLoading,
    deviceTrusted,
    pathname,
    router,
  ]);

  // Redirect to onboarding if not completed
  useEffect(() => {
    if (profile && !profile.onboardingComplete && !needsEmailVerification) {
      router.push('/onboarding');
    }
  }, [profile, needsEmailVerification, router]);

  // Loading state
  if (
    !initialized ||
    loading ||
    (user && !needsEmailVerification && (!deviceTrustChecked || deviceTrustLoading))
  ) {
    return <AuthLoadingShell />;
  }

  // Not authenticated - show loading while redirecting
  if (!user) {
    return <AuthRedirectingShell />;
  }

  // Authenticated but still verifying email - hold render while redirecting.
  if (needsEmailVerification) {
    return <AuthRedirectingShell />;
  }

  if (!deviceTrusted) {
    return <AuthRedirectingShell />;
  }

  return (
    <div className="min-h-screen flex bg-background">
      <Sidebar />

      {/* Main content */}
      <main
        className={`flex-1 transition-all duration-300 ${
          !isMobile ? 'lg:ml-64' : ''
        }`}
      >
        <div className="min-h-screen">{children}</div>
      </main>
    </div>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <RuntimeProviders>
      <Suspense fallback={<AuthLoadingShell />}>
        <AppLayoutContent>{children}</AppLayoutContent>
      </Suspense>
    </RuntimeProviders>
  );
}
