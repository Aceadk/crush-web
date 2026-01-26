'use client';

import dynamic from 'next/dynamic';
import { Skeleton } from '@crush/ui';

const ProfilePreview = dynamic(() => import('./profile-preview'), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen flex items-center justify-center bg-gray-900">
      <Skeleton className="w-full max-w-md aspect-[3/4] rounded-3xl" />
    </div>
  ),
});

export default function ProfilePreviewPage() {
  return <ProfilePreview />;
}
