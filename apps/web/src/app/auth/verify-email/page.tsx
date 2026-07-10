'use client';

import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { authService, useAuthStore } from '@crush/core';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@crush/ui';
import { ArrowLeft, CheckCircle2, Loader2, LogOut, Mail, RefreshCw } from 'lucide-react';
import { appendRedirectParam, sanitizeRedirectPath } from '@/shared/lib/auth-redirect';

const RESEND_COOLDOWN_SECONDS = 60;
const VERIFICATION_POLL_INTERVAL_MS = 5000;

function VerifyEmailRequiredPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, profile, loading, initialized, signOut } = useAuthStore();
  const checkInFlightRef = useRef(false);
  const [cameFromVerificationLink, setCameFromVerificationLink] = useState(false);
  const redirectAfterAuth = sanitizeRedirectPath(searchParams.get('redirect'));

  const [checking, setChecking] = useState(false);
  const [resending, setResending] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  const getPostVerificationRoute = useCallback(() => {
    if (profile && !profile.onboardingComplete) {
      return appendRedirectParam('/onboarding', redirectAfterAuth);
    }
    return redirectAfterAuth;
  }, [profile, redirectAfterAuth]);

  const checkVerification = useCallback(
    async (silent = false) => {
      if (!user?.email || checkInFlightRef.current) return;

      checkInFlightRef.current = true;
      setChecking(true);
      if (!silent) {
        setErrorMessage(null);
      }

      try {
        const verified = await authService.checkEmailVerification();

        if (verified) {
          // Firebase Auth is the cross-platform source of truth for email
          // verification (mobile ORs the doc flag with the Auth flag, and the
          // backend checks the Auth token). The previous "sync to Firestore"
          // write here was a silent no-op — buildUserProfileUpdateData never
          // mapped isEmailVerified — so it was removed rather than faked.
          setInfoMessage('Email verified. Redirecting...');
          router.replace(getPostVerificationRoute());
          return;
        }

        if (!silent) {
          setInfoMessage('Email not verified yet. Please click the link in your inbox, then try again.');
        }
      } catch (error) {
        if (!silent) {
          setErrorMessage(error instanceof Error ? error.message : 'Could not verify email status.');
        }
      } finally {
        checkInFlightRef.current = false;
        setChecking(false);
      }
    },
    [user?.email, router, getPostVerificationRoute]
  );

  const handleResend = useCallback(async () => {
    if (!user?.email || resending || cooldown > 0) return;

    setResending(true);
    setErrorMessage(null);

    try {
      await authService.sendEmailVerification();
      setInfoMessage(`Verification email sent to ${user.email}.`);
      setCooldown(RESEND_COOLDOWN_SECONDS);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to send verification email.');
    } finally {
      setResending(false);
    }
  }, [user?.email, resending, cooldown]);

  const handleSignOut = useCallback(async () => {
    if (signingOut) return;
    setSigningOut(true);
    setErrorMessage(null);
    try {
      await signOut();
    } catch (error) {
      // Sign-out must never trap the user on this screen — log and leave anyway.
      // The store already clears Firebase auth + the session cookie best-effort.
      console.error('Sign out error (navigating to login regardless):', error);
    }
    // Hard redirect so middleware re-evaluates with the cleared session cookie
    // and cannot bounce the user back to verify-email.
    window.location.href = '/auth/login';
  }, [signOut, signingOut]);

  useEffect(() => {
    if (!initialized || loading) return;

    if (!user) {
      router.replace('/auth/login');
      return;
    }

    // Phone-only users do not require email verification.
    if (!user.email || user.emailVerified) {
      router.replace(getPostVerificationRoute());
    }
  }, [initialized, loading, user, router, getPostVerificationRoute]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timeoutId = window.setTimeout(() => {
      setCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => window.clearTimeout(timeoutId);
  }, [cooldown]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setCameFromVerificationLink(params.get('verified') === '1');
  }, []);

  useEffect(() => {
    if (!initialized || loading) return;
    if (!user?.email || user.emailVerified) return;

    // When coming from verification link, immediately re-check and auto-advance.
    if (cameFromVerificationLink) {
      setInfoMessage('Verification link processed. Finalizing your account...');
      void checkVerification(true);
    }
  }, [initialized, loading, user?.email, user?.emailVerified, cameFromVerificationLink, checkVerification]);

  useEffect(() => {
    if (!initialized || loading || !user?.email || user.emailVerified) return;

    const intervalId = window.setInterval(() => {
      void checkVerification(true);
    }, VERIFICATION_POLL_INTERVAL_MS);

    return () => window.clearInterval(intervalId);
  }, [initialized, loading, user?.email, user?.emailVerified, checkVerification]);

  if (!initialized || loading || !user) {
    return (
      <Card className="border-0 shadow-lg">
        <CardContent className="py-12">
          <div className="flex items-center justify-center gap-3 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Loading...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
          <Mail className="w-7 h-7 text-primary" />
        </div>
        <CardTitle className="text-2xl">Verify your email</CardTitle>
        <CardDescription>
          We sent a verification link to <span className="font-medium text-foreground">{user.email}</span>.
          <br />
          Verify your email before continuing.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {infoMessage && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{infoMessage}</span>
            </div>
          </div>
        )}

        {errorMessage && (
          <p className="text-sm text-destructive text-center">{errorMessage}</p>
        )}

        <Button
          className="w-full h-12"
          variant="outline"
          onClick={() => void checkVerification(false)}
          disabled={checking}
        >
          {checking ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Checking...
            </>
          ) : (
            <>
              <CheckCircle2 className="w-4 h-4 mr-2" />
              I have verified my email
            </>
          )}
        </Button>

        <Button
          className="w-full h-12"
          variant="outline"
          onClick={handleResend}
          disabled={resending || cooldown > 0}
        >
          {resending ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Sending...
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4 mr-2" />
              {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend verification email'}
            </>
          )}
        </Button>

        <Button
          className="w-full h-12"
          variant="ghost"
          onClick={() => void handleSignOut()}
          disabled={signingOut}
        >
          {signingOut ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Signing out...
            </>
          ) : (
            <>
              <LogOut className="w-4 h-4 mr-2" />
              Sign out
            </>
          )}
        </Button>

        {/* Escape hatch: users who can't verify right now (or don't want to
            sign out) can still return to the public site. The home route is
            public, so this never bounces back here. */}
        <Link
          href="/"
          className="flex items-center justify-center gap-2 pt-1 text-sm text-muted-foreground hover:text-foreground hover:underline"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to home
        </Link>
      </CardContent>
    </Card>
  );
}

export default function VerifyEmailRequiredPage() {
  return (
    <Suspense
      fallback={
        <Card className="border-0 shadow-lg">
          <CardContent className="py-12">
            <div className="flex items-center justify-center gap-3 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Loading verification status...</span>
            </div>
          </CardContent>
        </Card>
      }
    >
      <VerifyEmailRequiredPageContent />
    </Suspense>
  );
}
