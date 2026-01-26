'use client';

import dynamic from 'next/dynamic';
import { Skeleton } from '@crush/ui';

const SettingsView = dynamic(() => import('./settings-view'), {
  ssr: false,
  loading: () => (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <Skeleton className="h-8 w-32" />
      <div className="space-y-4">
        <Skeleton className="h-16 w-full rounded-xl" />
        <Skeleton className="h-16 w-full rounded-xl" />
        <Skeleton className="h-16 w-full rounded-xl" />
        <Skeleton className="h-16 w-full rounded-xl" />
      </div>
    </div>
  ),
});

export default function SettingsPage() {
  return <SettingsView />;
}
