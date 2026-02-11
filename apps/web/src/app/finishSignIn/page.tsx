'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Heart, Loader2, CheckCircle, XCircle } from 'lucide-react';

export default function FinishSignInPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    async function completeSignIn() {
      try {
        const { getAuth, isSignInWithEmailLink, signInWithEmailLink } = await import('firebase/auth');
        const auth = getAuth();

        if (isSignInWithEmailLink(auth, window.location.href)) {
          let email = window.localStorage.getItem('emailForSignIn');
          if (!email) {
            email = window.prompt('Please provide your email for confirmation');
          }
          if (!email) {
            setStatus('error');
            setErrorMessage('Email is required to complete sign-in.');
            return;
          }
          await signInWithEmailLink(auth, email, window.location.href);
          window.localStorage.removeItem('emailForSignIn');
          setStatus('success');
          setTimeout(() => router.push('/discover'), 1500);
        } else {
          setStatus('error');
          setErrorMessage('Invalid sign-in link. Please request a new one.');
        }
      } catch (err: any) {
        setStatus('error');
        setErrorMessage(err?.message || 'Failed to complete sign-in.');
      }
    }
    completeSignIn();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="max-w-md w-full text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-6">
          <Heart className="w-8 h-8 text-primary" />
        </div>

        {status === 'loading' && (
          <>
            <h1 className="text-2xl font-bold mb-2">Completing Sign In...</h1>
            <p className="text-muted-foreground mb-6">Please wait while we verify your email link.</p>
            <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto" />
          </>
        )}

        {status === 'success' && (
          <>
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-2">Sign In Successful!</h1>
            <p className="text-muted-foreground">Redirecting you to Crush...</p>
          </>
        )}

        {status === 'error' && (
          <>
            <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-2">Sign In Failed</h1>
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
