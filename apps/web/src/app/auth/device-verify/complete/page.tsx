'use client';

import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { errorText, useAuthStore } from '@crush/core';
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from '@crush/ui';
import { CheckCircle2, Loader2, ShieldAlert, ShieldCheck } from 'lucide-react';
import { appendRedirectParam, sanitizeRedirectPath } from '@/shared/lib/auth-redirect';

function DeviceVerifyCompletePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = sanitizeRedirectPath(searchParams.get('redirect'));

  const {
    user,
    initialized,
    loading,
    deviceTrusted,
    deviceTrustChecked,
    trustCurrentDevice,
    checkDeviceTrust,
  } = useAuthStore();

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const runOnceRef = useRef(false);

  const runVerification = useCallback(async () => {
    if (runOnceRef.current) {
      return;
    }
    runOnceRef.current = true;

    setStatus('loading');
    setErrorMessage(null);

    try {
      await trustCurrentDevice();
      await checkDeviceTrust();
      setStatus('success');
      window.setTimeout(() => {
        router.replace(redirectPath);
      }, 900);
    } catch (error) {
      setStatus('error');
      setErrorMessage(errorText(error, 'Could not complete device verification.'));
      runOnceRef.current = false;
    }
  }, [trustCurrentDevice, checkDeviceTrust, redirectPath, router]);

  useEffect(() => {
    if (!initialized || loading) {
      return;
    }

    if (!user) {
      router.replace(appendRedirectParam('/auth/login', redirectPath));
      return;
    }

    if (deviceTrustChecked && deviceTrusted) {
      router.replace(redirectPath);
      return;
    }

    void runVerification();
  }, [
    initialized,
    loading,
    user,
    deviceTrustChecked,
    deviceTrusted,
    runVerification,
    redirectPath,
    router,
  ]);

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
          {status === 'error' ? (
            <ShieldAlert className="w-7 h-7 text-destructive" />
          ) : status === 'success' ? (
            <ShieldCheck className="w-7 h-7 text-green-600" />
          ) : (
            <Loader2 className="w-7 h-7 text-primary animate-spin" />
          )}
        </div>
        <CardTitle className="text-2xl">
          {status === 'error' ? 'Verification failed' : 'Securing your device'}
        </CardTitle>
        <CardDescription>
          {status === 'loading' && 'Finalizing trusted-device verification...'}
          {status === 'success' && 'This device is now trusted. Redirecting...'}
          {status === 'error' && 'We could not trust this device yet.'}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {status === 'success' && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>Trusted device verification complete.</span>
            </div>
          </div>
        )}

        {status === 'error' && (
          <>
            <p className="text-sm text-destructive text-center">
              {errorMessage || 'Please retry verification.'}
            </p>
            <Button className="w-full h-12" onClick={() => void runVerification()}>
              Retry verification
            </Button>
            <Button
              className="w-full h-12"
              variant="outline"
              onClick={() => router.replace(appendRedirectParam('/auth/device-verify', redirectPath))}
            >
              Back to device verification
            </Button>
          </>
        )}

        {status !== 'error' && (
          <p className="text-center text-sm text-muted-foreground">
            Need help?{' '}
            <Link href="/help" className="text-primary hover:underline font-medium">
              Visit Help Center
            </Link>
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export default function DeviceVerifyCompletePage() {
  return (
    <Suspense
      fallback={
        <Card className="border-0 shadow-lg">
          <CardContent className="py-12">
            <div className="flex items-center justify-center gap-3 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Finalizing device verification...</span>
            </div>
          </CardContent>
        </Card>
      }
    >
      <DeviceVerifyCompletePageContent />
    </Suspense>
  );
}
