'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Heart, Loader2, XCircle } from 'lucide-react';

export default function AuthCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function handleCallback() {
      try {
        const { getAuth, getRedirectResult } = await import('firebase/auth');
        const auth = getAuth();
        const result = await getRedirectResult(auth);

        if (result?.user) {
          router.push('/discover');
        } else {
          // No redirect result — user may have navigated here directly
          router.push('/auth/login');
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Authentication failed. Please try again.');
      }
    }
    handleCallback();
  }, [router]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <div className="max-w-md w-full text-center">
          <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Authentication Error</h1>
          <p className="text-muted-foreground mb-6">{error}</p>
          <Link
            href="/auth/login"
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            Back to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="max-w-md w-full text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-6">
          <Heart className="w-8 h-8 text-primary" />
        </div>
        <h1 className="text-2xl font-bold mb-2">Signing you in...</h1>
        <p className="text-muted-foreground mb-6">Please wait while we complete authentication.</p>
        <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto" />
      </div>
    </div>
  );
}
