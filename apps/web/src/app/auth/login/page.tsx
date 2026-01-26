'use client';

import dynamic from 'next/dynamic';
import { Skeleton } from '@crush/ui';

// Dynamically import the login form to avoid SSR issues with Firebase
const LoginForm = dynamic(() => import('./login-form'), {
  ssr: false,
  loading: () => (
    <div className="space-y-6 p-6">
      <div className="text-center space-y-2">
        <Skeleton className="h-8 w-48 mx-auto" />
        <Skeleton className="h-4 w-64 mx-auto" />
      </div>
      <div className="space-y-3">
        <Skeleton className="h-12 w-full rounded-xl" />
        <Skeleton className="h-12 w-full rounded-xl" />
      </div>
      <Skeleton className="h-px w-full" />
      <div className="space-y-4">
        <Skeleton className="h-12 w-full rounded-xl" />
        <Skeleton className="h-12 w-full rounded-xl" />
        <Skeleton className="h-12 w-full rounded-xl" />
      </div>
    </div>
  ),
});

export default function LoginPage() {
  return <LoginForm />;
}
