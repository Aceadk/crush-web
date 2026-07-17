'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Heart, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { sanitizeRedirectPath } from '@/shared/lib/auth-redirect';

export default function FinishSignInPage() {
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    async function completeSignIn() {
      try {
        const { isSignInWithEmailLink, signInWithEmailLink } = await import('firebase/auth');
        // Use the app's lazy-initializing accessor, NOT the raw getAuth().
        // /finishSignIn is a top-level route outside RuntimeProviders, so when
        // the email link opens it in a fresh tab nothing has called
        // initializeApp() yet — a bare getAuth() then throws "No Firebase App
        // '[DEFAULT]'". getFirebaseAuth() runs getAuth(getFirebaseApp()), and
        // getFirebaseApp() initializes the app on first use.
        const { getFirebaseAuth } = await import('@crush/core');
        const auth = getFirebaseAuth();
        // Capture the full link, then immediately scrub the address bar: the
        // Firebase email link carries apiKey/oobCode query params that must
        // not stay visible (or end up in history/screenshots).
        const signInLink = window.location.href;
        const redirectPath = sanitizeRedirectPath(
          new URL(signInLink).searchParams.get('redirect')
        );
        window.history.replaceState(null, '', window.location.pathname);

        if (isSignInWithEmailLink(auth, signInLink)) {
          let email = window.localStorage.getItem('emailForSignIn');
          if (!email) {
            email = window.prompt('Please provide your email for confirmation');
          }
          if (!email) {
            setStatus('error');
            setErrorMessage('Email is required to complete sign-in.');
            return;
          }
          await signInWithEmailLink(auth, email, signInLink);
          window.localStorage.removeItem('emailForSignIn');
          setStatus('success');
          setTimeout(() => router.push(redirectPath), 1500);
        } else {
          setStatus('error');
          setErrorMessage('Invalid sign-in link. Please request a new one.');
        }
      } catch (err: unknown) {
        const { errorText } = await import('@crush/core');
        setStatus('error');
        setErrorMessage(errorText(err, 'Failed to complete sign-in.'));
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
