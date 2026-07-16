'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@crush/core';
import {
  Button,
  Input,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@crush/ui';
import { Mail, Lock, Eye, EyeOff, Chrome, Phone } from 'lucide-react';
import { useAnalytics } from '@/components/analytics';
import { appendRedirectParam, sanitizeRedirectPath } from '@/shared/lib/auth-redirect';
import { useTranslations } from '@/i18n';

export default function LoginForm() {
  const { t } = useTranslations();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = sanitizeRedirectPath(searchParams.get('redirect'));
  const timeoutReason = searchParams.get('reason');
  const signupHref = appendRedirectParam('/auth/signup', redirect);
  const phoneHref = appendRedirectParam('/auth/phone', redirect);
  const forgotPasswordHref = appendRedirectParam('/auth/forgot-password', redirect);

  const {
    user,
    signInWithEmail,
    signInWithGoogle,
    sendEmailSignInLink,
    rememberMe,
    setRememberMe,
    loading,
    error,
    clearError,
    initialized,
  } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isSendingEmailLink, setIsSendingEmailLink] = useState(false);
  const [emailLinkSuccess, setEmailLinkSuccess] = useState<string | null>(null);
  const { track, funnelStep } = useAnalytics();

  // Redirect when user is authenticated
  useEffect(() => {
    if (initialized && user && !loading) {
      // Email/password users must verify email before entering app flow.
      if (user.email && !user.emailVerified) {
        router.push(appendRedirectParam('/auth/verify-email', redirect));
        return;
      }

      // The onboarding resolver, not a cached profile boolean, decides whether
      // this UID resumes a step or immediately reaches the requested route.
      router.push(appendRedirectParam('/onboarding', redirect));
    }
  }, [user, initialized, loading, redirect, router]);

  useEffect(() => {
    if (timeoutReason === 'timeout') {
      setValidationError(t('auth.sessionExpired'));
      return;
    }

    if (timeoutReason === 'device') {
      setValidationError(t('auth.deviceVerifyNeeded'));
    }
  }, [timeoutReason, t]);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);
    setEmailLinkSuccess(null);
    clearError();

    if (!email || !password) {
      setValidationError(t('auth.fillAllFields'));
      return;
    }

    try {
      setIsSigningIn(true);
      funnelStep('auth', 'login_attempt', 'started', { method: 'email_password' });
      await signInWithEmail(email, password, { rememberMe });
      track({
        name: 'login',
        properties: { method: 'email_password' },
      });
      funnelStep('auth', 'login_success', 'completed', { method: 'email_password' });
      // Redirect will happen via useEffect when user state updates
    } catch (error) {
      funnelStep('auth', 'login_failed', 'failed', {
        method: 'email_password',
        reason: error instanceof Error ? error.message : 'unknown_error',
      });
      setIsSigningIn(false);
      // Error is handled by the store
    }
  };

  const handleGoogleLogin = async () => {
    setEmailLinkSuccess(null);
    clearError();
    try {
      setIsSigningIn(true);
      funnelStep('auth', 'login_attempt', 'started', { method: 'google' });
      await signInWithGoogle({ rememberMe });
      track({
        name: 'login',
        properties: { method: 'google' },
      });
      funnelStep('auth', 'login_success', 'completed', { method: 'google' });
      // Redirect will happen via useEffect when user state updates
    } catch (error) {
      funnelStep('auth', 'login_failed', 'failed', {
        method: 'google',
        reason: error instanceof Error ? error.message : 'unknown_error',
      });
      setIsSigningIn(false);
      // Error is handled by the store
    }
  };

  const handleEmailLinkLogin = async () => {
    setValidationError(null);
    setEmailLinkSuccess(null);
    clearError();

    if (!email) {
      setValidationError(t('auth.enterEmailFirst'));
      return;
    }

    try {
      setIsSendingEmailLink(true);
      funnelStep('auth', 'email_link_requested', 'started', { method: 'email_link' });
      await sendEmailSignInLink(email, redirect);
      setEmailLinkSuccess(t('auth.emailLinkSent', { email }));
      funnelStep('auth', 'email_link_requested', 'completed', { method: 'email_link' });
    } catch {
      funnelStep('auth', 'email_link_requested', 'failed', { method: 'email_link' });
      // Error is handled by the store
    } finally {
      setIsSendingEmailLink(false);
    }
  };

  const isLoading = loading || isSigningIn || isSendingEmailLink;

  return (
    <Card className="border border-white/10 bg-white/[0.05] shadow-[0_24px_80px_-24px_rgba(0,0,0,0.85)] backdrop-blur-2xl">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">{t('auth.welcomeBack')}</CardTitle>
        <CardDescription>{t('auth.signInSubtitle')}</CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Social login */}
        <div className="space-y-3">
          <Button
            variant="outline"
            className="h-12 w-full"
            onClick={handleGoogleLogin}
            disabled={isLoading}
          >
            <Chrome className="mr-2 h-5 w-5" />
            {t('auth.continueWithGoogle')}
          </Button>

          <Link href={phoneHref}>
            <Button variant="outline" className="h-12 w-full" disabled={isLoading}>
              <Phone className="mr-2 h-5 w-5" />
              {t('auth.continueWithPhone')}
            </Button>
          </Link>
        </div>

        {/* Divider */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-muted-foreground">
              {t('auth.orContinueWithEmail')}
            </span>
          </div>
        </div>

        {/* Email form */}
        <form onSubmit={handleEmailLogin} className="space-y-4">
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="email"
              placeholder={t('auth.emailPlaceholder')}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="pl-10"
              disabled={isLoading}
            />
          </div>

          <div className="relative">
            <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <Input
              type={showPassword ? 'text' : 'password'}
              placeholder={t('auth.password')}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pl-10 pr-10"
              disabled={isLoading}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>

          {(error || validationError) && (
            <p className="text-center text-sm text-destructive">{error || validationError}</p>
          )}

          {emailLinkSuccess && (
            <p className="text-center text-sm text-green-600">{emailLinkSuccess}</p>
          )}

          <div className="flex items-center justify-between gap-3">
            <label className="inline-flex items-center gap-2 text-sm text-muted-foreground">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-4 w-4 rounded border-input accent-primary"
                disabled={isLoading}
              />
              {t('auth.rememberMe')}
            </label>

            <Link
              href={forgotPasswordHref}
              className="whitespace-nowrap text-sm text-primary hover:underline"
            >
              {t('auth.forgotPassword')}
            </Link>
          </div>

          <Button type="submit" className="h-12 w-full" loading={isLoading}>
            {isSigningIn ? t('auth.signingIn') : t('auth.signIn')}
          </Button>

          <Button
            type="button"
            variant="outline"
            className="h-12 w-full"
            onClick={handleEmailLinkLogin}
            loading={isSendingEmailLink}
            disabled={isLoading}
          >
            {t('auth.emailMeLink')}
          </Button>
        </form>

        {/* Sign up link */}
        <p className="text-center text-sm text-muted-foreground">
          {t('auth.noAccount')}{' '}
          <Link href={signupHref} className="font-medium text-primary hover:underline">
            {t('auth.signUp')}
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
