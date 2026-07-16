'use client';

import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { authService, useAuthStore } from '@crush/core';
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from '@crush/ui';
import { ArrowLeft, CheckCircle2, Loader2, LogOut, Mail, RefreshCw } from 'lucide-react';
import { appendRedirectParam, sanitizeRedirectPath } from '@/shared/lib/auth-redirect';

const RESEND_COOLDOWN_SECONDS = 60;

function VerifyEmailRequiredPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading, initialized, signOut, refreshEmailVerification } = useAuthStore();
  const checkInFlightRef = useRef(false);
  const initialCheckUidRef = useRef<string | null>(null);
  const navigationStartedRef = useRef(false);
  const mountedRef = useRef(true);
  const [cameFromVerificationLink, setCameFromVerificationLink] = useState(false);
  const redirectAfterAuth = sanitizeRedirectPath(searchParams.get('redirect'));

  const [checking, setChecking] = useState(false);
  const [resending, setResending] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [showChangeEmail, setShowChangeEmail] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [emailPassword, setEmailPassword] = useState('');
  const [changingEmail, setChangingEmail] = useState(false);

  const getPostVerificationRoute = useCallback(() => {
    // The centralized resolver decides whether this UID resumes onboarding or
    // goes straight to discovery. Never route from an old profile boolean.
    return appendRedirectParam('/onboarding', redirectAfterAuth);
  }, [redirectAfterAuth]);

  const checkVerification = useCallback(
    async (silent = false) => {
      if (!user?.email || checkInFlightRef.current || navigationStartedRef.current) return;

      checkInFlightRef.current = true;
      setChecking(true);
      if (!silent) {
        setErrorMessage(null);
      }

      try {
        const expectedUid = user.uid;
        const verified = await refreshEmailVerification();
        if (!mountedRef.current || useAuthStore.getState().user?.uid !== expectedUid) return;

        if (verified && !navigationStartedRef.current) {
          navigationStartedRef.current = true;
          setInfoMessage('Email verified. Redirecting...');
          router.replace(getPostVerificationRoute());
          return;
        }

        if (!silent) {
          setInfoMessage(
            'We still cannot confirm your verification. Make sure you clicked the link in the latest verification email, then return here and try again.'
          );
        }
      } catch (error) {
        if (!silent) {
          setErrorMessage(
            error instanceof Error ? error.message : 'Could not verify email status.'
          );
        }
      } finally {
        checkInFlightRef.current = false;
        if (mountedRef.current) setChecking(false);
      }
    },
    [user?.email, user?.uid, router, getPostVerificationRoute, refreshEmailVerification]
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
      setErrorMessage(
        error instanceof Error ? error.message : 'Failed to send verification email.'
      );
    } finally {
      setResending(false);
    }
  }, [user?.email, resending, cooldown]);

  const handleChangeEmail = useCallback(async () => {
    const trimmedEmail = newEmail.trim();
    if (!trimmedEmail || !emailPassword || changingEmail) return;
    setChangingEmail(true);
    setErrorMessage(null);
    try {
      await authService.updateEmail(trimmedEmail, emailPassword);
      await authService.sendEmailVerification();
      await refreshEmailVerification();
      setInfoMessage(
        `Verification email sent to ${trimmedEmail}. Open the email and click the verification link to continue.`
      );
      setCooldown(RESEND_COOLDOWN_SECONDS);
      setShowChangeEmail(false);
      setEmailPassword('');
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Could not change the email address.'
      );
    } finally {
      setChangingEmail(false);
    }
  }, [changingEmail, emailPassword, newEmail, refreshEmailVerification]);

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
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!initialized || loading) return;

    if (!user) {
      router.replace('/auth/login');
      return;
    }

    // Phone-only users do not require email verification.
    if ((!user.email || user.emailVerified) && !navigationStartedRef.current) {
      navigationStartedRef.current = true;
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

    if (cameFromVerificationLink) {
      setInfoMessage('Verification link processed. Finalizing your account...');
    }

    // A persisted Firebase User can still expose its pre-verification value on
    // a cold app restart. Perform one silent reload/token refresh per UID even
    // when no focus, visibility, or verification-link event is delivered.
    // The shared in-flight guard coalesces this with link/resume/button checks.
    if (initialCheckUidRef.current === user.uid) return;
    initialCheckUidRef.current = user.uid;
    void checkVerification(true);
  }, [
    initialized,
    loading,
    user?.uid,
    user?.email,
    user?.emailVerified,
    cameFromVerificationLink,
    checkVerification,
  ]);

  useEffect(() => {
    if (!initialized || loading || !user?.email || user.emailVerified) return;
    const handleResume = () => {
      if (document.visibilityState === 'visible') void checkVerification(true);
    };
    const handleFocus = () => void checkVerification(true);
    document.addEventListener('visibilitychange', handleResume);
    window.addEventListener('focus', handleFocus);
    return () => {
      document.removeEventListener('visibilitychange', handleResume);
      window.removeEventListener('focus', handleFocus);
    };
  }, [initialized, loading, user?.email, user?.emailVerified, checkVerification]);

  if (!initialized || loading || !user) {
    return (
      <Card className="border-0 shadow-lg">
        <CardContent className="py-12">
          <div className="flex items-center justify-center gap-3 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Loading...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
          <Mail className="h-7 w-7 text-primary" />
        </div>
        <CardTitle className="text-2xl">Verify your email</CardTitle>
        <CardDescription>
          Verification email sent to{' '}
          <span className="font-medium text-foreground">{user.email}</span>.
          <br />
          Open the email and click the verification link to continue.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Didn’t receive the email? Please check your Spam, Junk, Promotions, or All Mail folder.
        </p>
        {infoMessage && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0" />
              <span>{infoMessage}</span>
            </div>
          </div>
        )}

        {errorMessage && <p className="text-center text-sm text-destructive">{errorMessage}</p>}

        <Button
          className="h-12 w-full"
          variant="outline"
          onClick={() => void checkVerification(false)}
          disabled={checking}
        >
          {checking ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Checking...
            </>
          ) : (
            <>
              <CheckCircle2 className="mr-2 h-4 w-4" />
              I’ve Verified My Email
            </>
          )}
        </Button>

        <Button
          className="h-12 w-full"
          variant="outline"
          onClick={handleResend}
          disabled={resending || cooldown > 0}
        >
          {resending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Sending...
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 h-4 w-4" />
              {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend Verification Email'}
            </>
          )}
        </Button>

        <Button
          className="h-12 w-full"
          variant="ghost"
          onClick={() => setShowChangeEmail((visible) => !visible)}
          disabled={changingEmail}
        >
          Wrong email address? Change it safely
        </Button>

        {showChangeEmail && (
          <div className="space-y-3 rounded-lg border p-3">
            <label className="block text-sm font-medium" htmlFor="verification-new-email">
              New email address
            </label>
            <input
              id="verification-new-email"
              type="email"
              autoComplete="email"
              value={newEmail}
              onChange={(event) => setNewEmail(event.target.value)}
              className="h-10 w-full rounded-md border bg-background px-3 text-sm"
            />
            <label className="block text-sm font-medium" htmlFor="verification-current-password">
              Current password
            </label>
            <input
              id="verification-current-password"
              type="password"
              autoComplete="current-password"
              value={emailPassword}
              onChange={(event) => setEmailPassword(event.target.value)}
              className="h-10 w-full rounded-md border bg-background px-3 text-sm"
            />
            <p className="text-xs text-muted-foreground">
              For security, Firebase requires your current password before changing the address.
            </p>
            <Button
              className="w-full"
              onClick={() => void handleChangeEmail()}
              disabled={changingEmail || !newEmail.trim() || !emailPassword}
            >
              {changingEmail ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Updating…
                </>
              ) : (
                'Update email and send verification'
              )}
            </Button>
          </div>
        )}

        <Button
          className="h-12 w-full"
          variant="ghost"
          onClick={() => void handleSignOut()}
          disabled={signingOut}
        >
          {signingOut ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Signing out...
            </>
          ) : (
            <>
              <LogOut className="mr-2 h-4 w-4" />
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
          <ArrowLeft className="h-4 w-4" />
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
              <Loader2 className="h-5 w-5 animate-spin" />
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
