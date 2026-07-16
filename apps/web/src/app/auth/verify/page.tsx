'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Heart, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { Suspense } from 'react';
import { authService } from '@crush/core';

function VerifyContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    async function verifyEmail() {
      try {
        const { applyActionCode } = await import('firebase/auth');
        // getFirebaseAuth() self-initializes the Firebase app; a bare getAuth()
        // can throw "No Firebase App '[DEFAULT]'" when this page is opened
        // directly from an email link before providers initialize Firebase.
        const { getFirebaseAuth } = await import('@crush/core');
        const auth = getFirebaseAuth();

        const oobCode = searchParams.get('oobCode');
        if (!oobCode) {
          setStatus('error');
          setErrorMessage('Invalid verification link. Please request a new one.');
          return;
        }

        await applyActionCode(auth, oobCode);

        // Refresh Firebase Auth + token first; the trusted callable repairs the
        // Firestore mirror. Never self-write a verification boolean.
        const currentUser = auth.currentUser;
        if (currentUser) {
          await authService.refreshAndCheckEmailVerification();
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
          setErrorMessage(
            err instanceof Error ? err.message : 'Verification failed. The link may have expired.'
          );
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
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md text-center">
        <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
          <Heart className="h-8 w-8 text-primary" />
        </div>

        {status === 'loading' && (
          <>
            <h1 className="mb-2 text-2xl font-bold">Verifying Your Email...</h1>
            <p className="mb-6 text-muted-foreground">
              Please wait while we verify your email address.
            </p>
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
          </>
        )}

        {status === 'success' && (
          <>
            <CheckCircle className="mx-auto mb-4 h-12 w-12 text-green-500" />
            <h1 className="mb-2 text-2xl font-bold">Email Verified!</h1>
            <p className="mb-6 text-muted-foreground">
              Your email has been successfully verified. We are taking you to the next step.
            </p>
            <Link
              href="/auth/verify-email?verified=1"
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Continue
            </Link>
          </>
        )}

        {status === 'error' && (
          <>
            <XCircle className="mx-auto mb-4 h-12 w-12 text-red-500" />
            <h1 className="mb-2 text-2xl font-bold">Verification Failed</h1>
            <p className="mb-6 text-muted-foreground">{errorMessage}</p>
            <Link
              href="/auth/login"
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
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
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background p-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <VerifyContent />
    </Suspense>
  );
}
