'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
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
  /**
   * UID whose onboarding resolve already succeeded and reached discovery.
   *
   * Mirrors the mobile warm-start fast path (route_redirect.dart
   * `cachedComplete`): once an account is known-complete it goes straight into
   * the app instead of waiting on the resolver again. Without this the gate
   * below re-ran on EVERY navigation — see the comment on that effect.
   */
  const resolvedUidRef = useRef<string | null>(null);

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
    const uid = user?.uid ?? null;

    // Do NOT re-gate a navigation for an account already resolved.
    //
    // This effect has `pathname` in its dependencies and used to begin with an
    // unconditional `setOnboardingChecked(false)`, which makes the layout below
    // render <AuthLoadingShell /> — blanking the entire app — and then await a
    // `resolveOnboardingState` Cloud Function round-trip. So every single
    // in-app navigation (Discover → Matches → Chats → Profile) blanked the UI
    // and blocked on the network before rendering anything. `user` is also a
    // dependency and Firebase mutates/reuses that object, so it re-fired on
    // token refreshes too. That is the app-wide "everything takes a long time
    // to respond".
    //
    // Once resolved for a uid we keep rendering; a real change of account still
    // falls through to the full gate below.
    if (uid && resolvedUidRef.current === uid) {
      setOnboardingChecked(true);
      return;
    }

    setOnboardingChecked(false);
    if (!initialized || loading || !user || needsEmailVerification) {
      if (!uid) resolvedUidRef.current = null;
      return;
    }
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
          resolvedUidRef.current = expectedUid;
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
          heading). Cleared at md+ where the sidebar takes over the layout.

          min-w-0 is load-bearing: main is a flex item, and a flex item's
          default min-width:auto lets ANY descendant with an unshrinkable
          min-content width (nowrap text, a wide media element) stretch main
          past the viewport. Every block inside then renders at the stretched
          width, the whole app pans horizontally on phones, and every
          `truncate` downstream silently stops clipping — which is exactly the
          bug this fixes. overflow-x-clip is the belt to that suspender: even a
          transient overflow (the resize case noted above) can no longer pan
          the page. `clip` rather than `hidden` so the wrapper is not promoted
          to a scroll container. */}
      <main className={`min-w-0 flex-1 ${!isMobile ? 'md:ml-64' : ''}`}>
        <div className="min-h-screen overflow-x-clip pt-14 md:pt-0">{children}</div>
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
