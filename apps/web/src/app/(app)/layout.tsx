'use client';

import { Suspense, useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  authVerificationFactsFromUser,
  isAccountVerified,
  onboardingService,
  useAuthStore,
  useUIStore,
  useMatchStore,
} from '@crush/core';
import { Sidebar } from '@/shared/components/layout/app-sidebar';
import { AuthLoadingShell, AuthRedirectingShell } from '@/shared/components/layout/auth-shell';
import { useIsMobile, usePresenceHeartbeat } from '@/shared/hooks';
import { appendRedirectParam } from '@/shared/lib/auth-redirect';
import { shouldShowAuthLoadingShell } from '@/shared/lib/auth-gates';
import { RuntimeProviders } from '@/shared/providers/runtime-providers';

function AppLayoutContent({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const {
    user,
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
  // Write the presence heartbeat while any authenticated screen is mounted so
  // web-active users appear online to their matches (mobile reads presence/).
  usePresenceHeartbeat();
  // Firebase can mutate and reuse the same User object during reload(). Read
  // verification primitives on every store render instead of memoizing by
  // object identity, or a freshly verified account can remain locally false.
  const authFacts = authVerificationFactsFromUser(user);
  const needsEmailVerification = Boolean(user && !isAccountVerified(authFacts));
  const [onboardingChecked, setOnboardingChecked] = useState(false);

  // Note: Auth is initialized globally in AuthInitializer provider

  useEffect(() => {
    setIsMobile(isMobile);
  }, [isMobile, setIsMobile]);

  // Subscribe to matches when authenticated
  useEffect(() => {
    if (user && !needsEmailVerification && onboardingChecked) {
      subscribeToMatches(user.uid);
    }

    return () => {
      cleanup();
    };
  }, [user, needsEmailVerification, onboardingChecked, subscribeToMatches, cleanup]);

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

  // The server resolver is the sole routing gate. Root booleans are legacy
  // discovery mirrors and are intentionally ignored here.
  useEffect(() => {
    setOnboardingChecked(false);
    if (!initialized || loading || !user || needsEmailVerification) return;
    const expectedUid = user.uid;
    let cancelled = false;
    void onboardingService
      .resolve(authVerificationFactsFromUser(useAuthStore.getState().user))
      .then((resolution) => {
        if (cancelled || useAuthStore.getState().user?.uid !== expectedUid) return;
        const destination = String(resolution.destination);
        if (
          destination === 'discovery' ||
          destination === '/discover' ||
          destination.startsWith('/discover?')
        ) {
          setOnboardingChecked(true);
          return;
        }
        const currentSearch = typeof window !== 'undefined' ? window.location.search : '';
        const currentPath = `${pathname}${currentSearch}`;
        const step = resolution.readiness.firstIncompleteStep;
        const onboardingPath =
          step === 'discovery'
            ? '/onboarding'
            : step === 'emailVerification'
              ? '/auth/verify-email'
              : step === 'phoneVerification'
                ? '/auth/phone'
                : `/onboarding?step=${encodeURIComponent(step)}`;
        router.replace(appendRedirectParam(onboardingPath, currentPath));
      })
      .catch(() => {
        if (cancelled) return;
        const currentSearch = typeof window !== 'undefined' ? window.location.search : '';
        router.replace(appendRedirectParam('/onboarding', `${pathname}${currentSearch}`));
      });
    return () => {
      cancelled = true;
    };
  }, [initialized, loading, needsEmailVerification, pathname, router, user]);

  // Loading state
  if (
    shouldShowAuthLoadingShell({
      initialized,
      loading,
      hasUser: Boolean(user),
      needsEmailVerification,
      deviceTrustChecked,
    }) ||
    !onboardingChecked
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
    <div className="flex min-h-screen bg-background">
      <Sidebar />

      {/* Main content. md:ml-64 matches the useIsMobile (768px) breakpoint that
          controls sidebar visibility — lg: left the sidebar overlapping content
          between 768–1023px. No transition: animating the margin on viewport
          resize caused a transient horizontal overflow.

          pt-14 below md reserves space for the fixed mobile menu button
          (app-sidebar: `fixed top-3 left-3`), which otherwise overlaps the
          top-left of every page's content (e.g. the discover "STORIES"
          heading). Cleared at md+ where the sidebar takes over the layout. */}
      <main className={`flex-1 ${!isMobile ? 'md:ml-64' : ''}`}>
        <div className="min-h-screen pt-14 md:pt-0">{children}</div>
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
