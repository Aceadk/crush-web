'use client';

/**
 * Crush-branded Firebase Auth action handler — /auth/action.
 *
 * Firebase emails (password reset, email verification, email-change revert)
 * land on a Google-hosted page at `{authDomain}/__/auth/action` by default.
 * That page is unbranded, says "firebaseapp.com" in the address bar, and is
 * not something we control. Pointing the Console's "Customize action URL" at
 * this route replaces it with a page that looks like Crush.
 *
 * IMPORTANT — this route only becomes live once the action URL is changed in
 * Firebase Console (Authentication → Templates → edit → Customize action URL).
 * Until then the default Google page keeps handling the links exactly as it
 * does today, so shipping this changes nothing for existing users.
 *
 * The `oobCode` in the link is a Firebase-issued security token; it cannot be
 * shortened or removed. This route only changes where the link LANDS.
 *
 * Modes handled, matching Firebase's contract:
 *   resetPassword | verifyEmail | recoverEmail | verifyAndChangeEmail
 * Anything else is handed back to Firebase's own handler rather than guessed
 * at, so an unrecognised mode can never dead-end the user.
 */

import { Suspense, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  CheckCircle,
  Eye,
  EyeOff,
  Heart,
  Loader2,
  XCircle,
} from 'lucide-react';
import { Button, Input } from '@crush/ui';
import { getAuthErrorMessage } from '@crush/core';

type ActionMode =
  | 'resetPassword'
  | 'verifyEmail'
  | 'recoverEmail'
  | 'verifyAndChangeEmail';

type Phase =
  | 'checking'
  | 'needsPassword'
  | 'working'
  | 'success'
  | 'error'
  | 'unsupported';

const MIN_PASSWORD_LENGTH = 8;

/** Same rules the signup form enforces, so a reset cannot weaken an account. */
function passwordProblem(password: string, confirm: string): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters`;
  }
  if (!/[A-Z]/.test(password)) return 'Password must include an uppercase letter';
  if (!/[a-z]/.test(password)) return 'Password must include a lowercase letter';
  if (!/[0-9]/.test(password)) return 'Password must include a number';
  if (password !== confirm) return 'Passwords do not match';
  return null;
}

function successCopy(mode: ActionMode): { title: string; body: string } {
  switch (mode) {
    case 'resetPassword':
      return {
        title: 'Password updated',
        body: 'You can now sign in to Crush with your new password.',
      };
    case 'verifyEmail':
    case 'verifyAndChangeEmail':
      return {
        title: 'Email verified',
        body: 'Your email address is confirmed. You are all set.',
      };
    case 'recoverEmail':
      return {
        title: 'Email change reverted',
        body:
          'Your account is back on its original email address. We recommend ' +
          'resetting your password as well.',
      };
  }
}

function ActionContent() {
  const searchParams = useSearchParams();
  const mode = searchParams.get('mode') as ActionMode | null;
  const oobCode = searchParams.get('oobCode');

  const [phase, setPhase] = useState<Phase>('checking');
  const [message, setMessage] = useState('');
  const [accountEmail, setAccountEmail] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const describe = useCallback((error: unknown, fallback: string): string => {
    const code = (error as { code?: string })?.code;
    if (code === 'auth/invalid-action-code') {
      return 'This link is invalid or has already been used. Please request a new one.';
    }
    if (code === 'auth/expired-action-code') {
      return 'This link has expired. Please request a new one.';
    }
    if (code === 'auth/user-disabled') {
      return 'This account has been disabled. Contact support for help.';
    }
    // Never surface a raw Firebase string — the shared mapper owns that, and
    // falls back to our own copy for codes it does not know.
    return getAuthErrorMessage(error, fallback);
  }, []);

  // Validate the code up front so an expired link fails BEFORE the user types
  // a new password, rather than after.
  useEffect(() => {
    let cancelled = false;

    async function prepare() {
      if (!mode || !oobCode) {
        if (cancelled) return;
        setPhase('error');
        setMessage('This link is incomplete. Please open the link from your email again.');
        return;
      }

      if (
        mode !== 'resetPassword' &&
        mode !== 'verifyEmail' &&
        mode !== 'recoverEmail' &&
        mode !== 'verifyAndChangeEmail'
      ) {
        if (cancelled) return;
        setPhase('unsupported');
        return;
      }

      try {
        const { getFirebaseAuth } = await import('@crush/core');
        const auth = getFirebaseAuth();

        if (mode === 'resetPassword') {
          const { verifyPasswordResetCode } = await import('firebase/auth');
          const email = await verifyPasswordResetCode(auth, oobCode);
          if (cancelled) return;
          setAccountEmail(email);
          setPhase('needsPassword');
          return;
        }

        // verifyEmail / recoverEmail / verifyAndChangeEmail all just apply.
        const { applyActionCode } = await import('firebase/auth');
        await applyActionCode(auth, oobCode);
        if (cancelled) return;
        setPhase('success');
      } catch (error) {
        if (cancelled) return;
        setPhase('error');
        setMessage(describe(error, 'We could not process this link.'));
      }
    }

    void prepare();
    return () => {
      cancelled = true;
    };
  }, [mode, oobCode, describe]);

  const submitNewPassword = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();
      if (!oobCode) return;

      const problem = passwordProblem(password, confirmPassword);
      if (problem) {
        setMessage(problem);
        return;
      }

      setMessage('');
      setPhase('working');
      try {
        const { getFirebaseAuth } = await import('@crush/core');
        const { confirmPasswordReset } = await import('firebase/auth');
        await confirmPasswordReset(getFirebaseAuth(), oobCode, password);
        setPhase('success');
      } catch (error) {
        setPhase('needsPassword');
        setMessage(describe(error, 'We could not update your password.'));
      }
    },
    [confirmPassword, describe, oobCode, password]
  );

  // An unrecognised mode is handed back to Firebase's own handler rather than
  // guessed at, so a future action type can never dead-end here.
  if (phase === 'unsupported') {
    return (
      <Shell>
        <XCircle className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
        <h1 className="mb-2 text-2xl font-bold">Unsupported link</h1>
        <p className="mb-6 text-muted-foreground">
          This link asks for something this page does not handle. Please open it from your
          email again, or request a new one.
        </p>
        <BackToLogin />
      </Shell>
    );
  }

  if (phase === 'checking') {
    return (
      <Shell>
        <h1 className="mb-2 text-2xl font-bold">Checking your link…</h1>
        <p className="mb-6 text-muted-foreground">This only takes a moment.</p>
        <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
      </Shell>
    );
  }

  if (phase === 'error') {
    return (
      <Shell>
        <XCircle className="mx-auto mb-4 h-12 w-12 text-red-500" />
        <h1 className="mb-2 text-2xl font-bold">Link not valid</h1>
        <p className="mb-6 text-muted-foreground">{message}</p>
        <div className="flex flex-col gap-2">
          <Link
            href="/auth/forgot-password"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Request a new link
          </Link>
          <BackToLogin variant="quiet" />
        </div>
      </Shell>
    );
  }

  if (phase === 'success') {
    const copy = successCopy((mode ?? 'verifyEmail') as ActionMode);
    return (
      <Shell>
        <CheckCircle className="mx-auto mb-4 h-12 w-12 text-green-500" />
        <h1 className="mb-2 text-2xl font-bold">{copy.title}</h1>
        <p className="mb-6 text-muted-foreground">{copy.body}</p>
        <Link
          href="/auth/login"
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Sign in to Crush
        </Link>
      </Shell>
    );
  }

  // needsPassword | working
  const busy = phase === 'working';
  return (
    <Shell>
      <h1 className="mb-2 text-2xl font-bold">Choose a new password</h1>
      <p className="mb-6 text-muted-foreground">
        {accountEmail ? (
          <>
            for <span className="font-medium text-foreground">{accountEmail}</span>
          </>
        ) : (
          'Enter a new password for your Crush account.'
        )}
      </p>

      <form onSubmit={submitNewPassword} className="space-y-4 text-left">
        <div>
          <label htmlFor="new-password" className="mb-1.5 block text-sm font-medium">
            New password
          </label>
          <div className="relative">
            <Input
              id="new-password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={busy}
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword((visible) => !visible)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <p className="mt-1.5 text-xs text-muted-foreground">
            At least {MIN_PASSWORD_LENGTH} characters, with an uppercase letter, a lowercase
            letter, and a number.
          </p>
        </div>

        <div>
          <label htmlFor="confirm-password" className="mb-1.5 block text-sm font-medium">
            Confirm new password
          </label>
          <Input
            id="confirm-password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            disabled={busy}
            required
          />
        </div>

        {message && (
          <p role="alert" className="text-sm text-red-500">
            {message}
          </p>
        )}

        <Button type="submit" className="w-full" loading={busy}>
          Update password
        </Button>
      </form>

      <div className="mt-4">
        <BackToLogin variant="quiet" />
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md text-center">
        <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
          <Heart className="h-8 w-8 text-primary" />
        </div>
        {children}
      </div>
    </div>
  );
}

function BackToLogin({ variant = 'solid' }: { variant?: 'solid' | 'quiet' }) {
  return (
    <Link
      href="/auth/login"
      className={
        variant === 'quiet'
          ? 'inline-flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground'
          : 'inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90'
      }
    >
      <ArrowLeft className="h-4 w-4" />
      Back to sign in
    </Link>
  );
}

export default function AuthActionPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background p-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <ActionContent />
    </Suspense>
  );
}
