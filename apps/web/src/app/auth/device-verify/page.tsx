'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@crush/core';
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input } from '@crush/ui';
import { AlertTriangle, Loader2, LogOut, MailCheck, Shield } from 'lucide-react';
import { appendRedirectParam, sanitizeRedirectPath } from '@/shared/lib/auth-redirect';

function DeviceVerifyPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = sanitizeRedirectPath(searchParams.get('redirect'));
  const reason = searchParams.get('reason');

  const {
    user,
    initialized,
    loading,
    deviceTrustChecked,
    deviceTrusted,
    checkDeviceTrust,
    sendEmailSignInLink,
    signOut,
  } = useAuthStore();

  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (user?.email) {
      setEmail(user.email);
      return;
    }

    if (typeof window !== 'undefined') {
      const stored = window.localStorage.getItem('emailForSignIn');
      if (stored) {
        setEmail(stored);
      }
    }
  }, [user?.email]);

  useEffect(() => {
    if (!initialized || loading) {
      return;
    }

    if (user && !deviceTrustChecked) {
      void checkDeviceTrust();
      return;
    }

    if (user && deviceTrustChecked && deviceTrusted) {
      router.replace(redirectPath);
    }
  }, [
    initialized,
    loading,
    user,
    deviceTrustChecked,
    deviceTrusted,
    checkDeviceTrust,
    redirectPath,
    router,
  ]);

  const handleSendVerificationLink = useCallback(async () => {
    if (!email) {
      setErrorMessage('Enter your email address to continue.');
      return;
    }

    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      setSending(true);
      const completePath = `/auth/device-verify/complete?redirect=${encodeURIComponent(redirectPath)}`;
      await sendEmailSignInLink(email, completePath);
      setSuccessMessage(`Verification link sent to ${email}. Open it on this device to continue.`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to send verification link.');
    } finally {
      setSending(false);
    }
  }, [email, redirectPath, sendEmailSignInLink]);

  const handleSignOut = useCallback(async () => {
    try {
      await signOut();
    } finally {
      router.replace('/auth/login');
    }
  }, [signOut, router]);

  const loginHref = appendRedirectParam('/auth/login', redirectPath);

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 w-14 h-14 rounded-full bg-amber-500/10 flex items-center justify-center">
          <Shield className="w-7 h-7 text-amber-500" />
        </div>
        <CardTitle className="text-2xl">Verify this new device</CardTitle>
        <CardDescription>
          {reason === 'device'
            ? 'We detected a sign-in from a new browser or device.'
            : 'This account requires device verification before access.'}
          <br />
          Confirm via your email to protect your account.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>
              We only trust devices that are verified from your email inbox.
            </span>
          </div>
        </div>

        <Input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
          disabled={sending}
        />

        {successMessage && (
          <p className="text-sm text-green-600 text-center">{successMessage}</p>
        )}

        {errorMessage && (
          <p className="text-sm text-destructive text-center">{errorMessage}</p>
        )}

        <Button
          className="w-full h-12"
          onClick={handleSendVerificationLink}
          disabled={sending || !email}
        >
          {sending ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Sending link...
            </>
          ) : (
            <>
              <MailCheck className="w-4 h-4 mr-2" />
              Email verification link
            </>
          )}
        </Button>

        <Button
          className="w-full h-12"
          variant="outline"
          onClick={handleSignOut}
          disabled={sending}
        >
          <LogOut className="w-4 h-4 mr-2" />
          Sign out
        </Button>

        <p className="text-center text-sm text-muted-foreground">
          Prefer another account?{' '}
          <Link href={loginHref} className="text-primary hover:underline font-medium">
            Back to Login
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}

export default function DeviceVerifyPage() {
  return (
    <Suspense
      fallback={
        <Card className="border-0 shadow-lg">
          <CardContent className="py-12">
            <div className="flex items-center justify-center gap-3 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Loading verification...</span>
            </div>
          </CardContent>
        </Card>
      }
    >
      <DeviceVerifyPageContent />
    </Suspense>
  );
}
