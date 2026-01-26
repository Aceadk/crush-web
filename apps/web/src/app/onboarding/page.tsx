'use client';

import dynamic from 'next/dynamic';
import { Skeleton } from '@crush/ui';

const OnboardingFlow = dynamic(() => import('./onboarding-flow'), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="w-full max-w-md p-6 space-y-6">
        <Skeleton className="h-2 w-full rounded-full" />
        <Skeleton className="h-8 w-48 mx-auto" />
        <Skeleton className="h-4 w-64 mx-auto" />
        <div className="space-y-4 pt-8">
          <Skeleton className="h-12 w-full rounded-xl" />
          <Skeleton className="h-12 w-full rounded-xl" />
        </div>
      </div>
    </div>
  ),
});

export default function OnboardingPage() {
  return <OnboardingFlow />;
}
