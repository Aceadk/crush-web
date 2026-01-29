'use client';

import Link from 'next/link';
import { Skeleton, Button } from '@crush/ui';

export function AuthLoadingShell() {
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

export function AuthRedirectingShell() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center space-y-3">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-sm text-muted-foreground">Redirecting to sign in…</p>
        <Button asChild variant="outline" size="sm">
          <Link href="/auth/login">Go to login</Link>
        </Button>
      </div>
    </div>
  );
}
