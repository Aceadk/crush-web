'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Heart, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { Suspense } from 'react';
import { userService } from '@crush/core';

function VerifyContent() {
  const router = useRouter();
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

        // Sync verification status to Firestore for cross-platform consistency
        const currentUser = auth.currentUser;
        if (currentUser) {
          try {
            await userService.updateUserProfile(currentUser.uid, { isEmailVerified: true });
          } catch {
            // Non-blocking — Firebase Auth is the source of truth
            console.error('Failed to sync isEmailVerified to Firestore');
          }
        }

        setStatus('success');
      } catch (err: unknown) {
        setStatus('error');
        const firebaseError = err as { code?: string; message?: string };
        if (firebaseError?.code === 'auth/invalid-action-code') {
          setErrorMessage('This verification link is invalid or already used.');
        } else if (firebaseError?.code === 'auth/expired-action-code') {
          setErrorMessage('This verification link has expired. Please request a new one.');
        } else {
          setErrorMessage(err instanceof Error ? err.message : 'Verification failed. The link may have expired.');
        }
      }
    }
    verifyEmail();
  }, [searchParams]);

  useEffect(() => {
    if (status !== 'success') return;

    const timeoutId = window.setTimeout(() => {
      router.replace('/auth/verify-email?verified=1');
    }, 1200);

    return () => window.clearTimeout(timeoutId);
  }, [status, router]);

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
              Your email has been successfully verified. We are taking you to the next step.
            </p>
            <Link
              href="/auth/verify-email?verified=1"
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              Continue
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
