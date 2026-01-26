'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@crush/core';
import { Button, Input, Card, CardContent, CardHeader, CardTitle, CardDescription } from '@crush/ui';
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react';

export default function ForgotPasswordPage() {
  const { sendPasswordReset, loading, error, clearError } = useAuthStore();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);
    clearError();

    if (!email) {
      setValidationError('Please enter your email address');
      return;
    }

    try {
      await sendPasswordReset(email);
      setSent(true);
    } catch {
      // Error is handled by the store
    }
  };

  if (sent) {
    return (
      <Card className="border-0 shadow-lg">
        <CardContent className="pt-8 pb-8 text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
            <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-foreground mb-2">Check your email</h2>
            <p className="text-muted-foreground text-sm">
              We've sent a password reset link to<br />
              <span className="font-medium text-foreground">{email}</span>
            </p>
          </div>
          <p className="text-xs text-muted-foreground">
            Didn't receive the email? Check your spam folder or{' '}
            <button
              onClick={() => setSent(false)}
              className="text-primary hover:underline"
            >
              try again
            </button>
          </p>
          <Link href="/auth/login">
            <Button variant="outline" className="w-full mt-4">
              Back to Sign In
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Reset your password</CardTitle>
        <CardDescription>
          Enter your email and we'll send you a link to reset your password
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="pl-10"
              disabled={loading}
              autoFocus
            />
          </div>

          {(error || validationError) && (
            <p className="text-sm text-destructive text-center">
              {error || validationError}
            </p>
          )}

          <Button type="submit" className="w-full h-12" loading={loading}>
            Send Reset Link
          </Button>
        </form>

        <Link
          href="/auth/login"
          className="flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Sign In
        </Link>
      </CardContent>
    </Card>
  );
}
