'use client';

import dynamic from 'next/dynamic';
import { Skeleton } from '@crush/ui';

const ProfileView = dynamic(() => import('./profile-view'), {
  ssr: false,
  loading: () => (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <Skeleton className="w-32 h-32 rounded-full mx-auto" />
      <Skeleton className="h-8 w-48 mx-auto" />
      <div className="space-y-4">
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-24 w-full rounded-xl" />
      </div>
    </div>
  ),
});

export default function ProfilePage() {
  return <ProfileView />;
}
