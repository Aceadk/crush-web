'use client';

import dynamic from 'next/dynamic';
import { Skeleton } from '@crush/ui';

const PremiumView = dynamic(() => import('./premium-view'), {
  ssr: false,
  loading: () => (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <Skeleton className="h-48 w-full rounded-xl" />
      <div className="space-y-4">
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-24 w-full rounded-xl" />
      </div>
    </div>
  ),
});

export default function PremiumPage() {
  return <PremiumView />;
}
