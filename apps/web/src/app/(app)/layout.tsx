'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore, useUIStore, useMatchStore } from '@crush/core';
import { Sidebar } from '@/shared/components/layout/app-sidebar';
import { useIsMobile } from '@/shared/hooks';
import { Skeleton } from '@crush/ui';

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
    return (
      <div className="min-h-screen flex bg-background">
        {/* Sidebar skeleton */}
        <div className="hidden lg:block w-64 border-r border-border bg-sidebar p-4 space-y-4">
          <div className="flex items-center gap-2 px-2 h-10">
            <Skeleton className="w-6 h-6 rounded-md" />
            <Skeleton className="h-5 w-20" />
          </div>
          <div className="space-y-1">
            <Skeleton className="h-9 w-full rounded-lg" />
            <Skeleton className="h-9 w-full rounded-lg" />
            <Skeleton className="h-9 w-full rounded-lg" />
            <Skeleton className="h-9 w-full rounded-lg" />
            <Skeleton className="h-9 w-full rounded-lg" />
          </div>
        </div>

        {/* Content skeleton */}
        <div className="flex-1 p-6">
          <Skeleton className="h-6 w-40 mb-6" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Skeleton className="h-56 rounded-xl" />
            <Skeleton className="h-56 rounded-xl" />
            <Skeleton className="h-56 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  // Not authenticated - show loading while redirecting
  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Redirecting...</p>
        </div>
      </div>
    );
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
