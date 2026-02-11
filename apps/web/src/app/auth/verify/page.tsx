'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Heart, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { Suspense } from 'react';

function VerifyContent() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    async function verifyEmail() {
      try {
        const { getAuth, applyActionCode } = await import('firebase/auth');
        const auth = getAuth();

        const oobCode = searchParams.get('oobCode');
        if (!oobCode) {
          setStatus('error');
          setErrorMessage('Invalid verification link. Please request a new one.');
          return;
        }

        await applyActionCode(auth, oobCode);
        setStatus('success');
      } catch (err: any) {
        setStatus('error');
        setErrorMessage(err?.message || 'Verification failed. The link may have expired.');
      }
    }
    verifyEmail();
  }, [searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="max-w-md w-full text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-6">
          <Heart className="w-8 h-8 text-primary" />
        </div>

        {status === 'loading' && (
          <>
            <h1 className="text-2xl font-bold mb-2">Verifying Your Email...</h1>
            <p className="text-muted-foreground mb-6">Please wait while we verify your email address.</p>
            <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto" />
          </>
        )}

        {status === 'success' && (
          <>
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-2">Email Verified!</h1>
            <p className="text-muted-foreground mb-6">
              Your email has been successfully verified. You can now sign in to your account.
            </p>
            <Link
              href="/auth/login"
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              Sign In
            </Link>
          </>
        )}

        {status === 'error' && (
          <>
            <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-2">Verification Failed</h1>
            <p className="text-muted-foreground mb-6">{errorMessage}</p>
            <Link
              href="/auth/login"
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              Back to Login
            </Link>
          </>
        )}
      </div>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    }>
      <VerifyContent />
    </Suspense>
  );
}
