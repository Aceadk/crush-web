'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore, useUIStore, useMatchStore } from '@crush/core';
import { Sidebar } from '@/shared/components/layout/app-sidebar';
import { AuthLoadingShell, AuthRedirectingShell } from '@/shared/components/layout/auth-shell';
import { useIsMobile } from '@/shared/hooks';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, profile, loading, initialized } = useAuthStore();
  const { setIsMobile } = useUIStore();
  const { subscribeToMatches, cleanup } = useMatchStore();
  const isMobile = useIsMobile();

  // Note: Auth is initialized globally in AuthInitializer provider

  useEffect(() => {
    setIsMobile(isMobile);
  }, [isMobile, setIsMobile]);

  // Subscribe to matches when authenticated
  useEffect(() => {
    if (user) {
      subscribeToMatches(user.uid);
    }

    return () => {
      cleanup();
    };
  }, [user, subscribeToMatches, cleanup]);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (initialized && !loading && !user) {
      // Clear any stale auth cookie before redirecting
      // This prevents redirect loop with middleware
      document.cookie = 'auth-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
      // Use window.location for full page reload to ensure cookie is cleared
      window.location.href = '/auth/login';
    }
  }, [user, loading, initialized]);

  // Redirect to onboarding if not completed
  useEffect(() => {
    if (profile && !profile.onboardingComplete) {
      router.push('/onboarding');
    }
  }, [profile, router]);

  // Loading state
  if (!initialized || loading) {
    return <AuthLoadingShell />;
  }

  // Not authenticated - show loading while redirecting
  if (!user) {
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
