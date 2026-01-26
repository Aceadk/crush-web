'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@crush/core';
import { Button, Input, Card, CardContent, CardHeader, CardTitle, CardDescription } from '@crush/ui';
import { Mail, Lock, Eye, EyeOff, User, Chrome, Phone } from 'lucide-react';

export default function SignupPage() {
  const router = useRouter();
  const { signUpWithEmail, signInWithGoogle, loading, error, clearError } = useAuthStore();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const validateForm = () => {
    if (!name || !email || !password || !confirmPassword) {
      setValidationError('Please fill in all fields');
      return false;
    }

    if (password.length < 8) {
      setValidationError('Password must be at least 8 characters');
      return false;
    }

    if (password !== confirmPassword) {
      setValidationError('Passwords do not match');
      return false;
    }

    return true;
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);
    clearError();

    if (!validateForm()) return;

    try {
      await signUpWithEmail(email, password, name);
      router.push('/onboarding');
    } catch {
      // Error is handled by the store
    }
  };

  const handleGoogleSignup = async () => {
    clearError();
    try {
      await signInWithGoogle();
      router.push('/onboarding');
    } catch {
      // Error is handled by the store
    }
  };

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Create your account</CardTitle>
        <CardDescription>Start your journey to find love</CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Social signup */}
        <div className="space-y-3">
          <Button
            variant="outline"
            className="w-full h-12"
            onClick={handleGoogleSignup}
            disabled={loading}
          >
            <Chrome className="w-5 h-5 mr-2" />
            Continue with Google
          </Button>

          <Link href="/auth/phone">
            <Button variant="outline" className="w-full h-12">
              <Phone className="w-5 h-5 mr-2" />
              Continue with Phone
            </Button>
          </Link>
        </div>

        {/* Divider */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">
              Or sign up with email
            </span>
          </div>
        </div>

        {/* Email form */}
        <form onSubmit={handleSignup} className="space-y-4">
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="pl-10"
              disabled={loading}
            />
          </div>

          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="pl-10"
              disabled={loading}
            />
          </div>

          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              type={showPassword ? 'text' : 'password'}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pl-10 pr-10"
              disabled={loading}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>

          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              type={showPassword ? 'text' : 'password'}
              placeholder="Confirm password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="pl-10"
              disabled={loading}
            />
          </div>

          {(error || validationError) && (
            <p className="text-sm text-destructive text-center">
              {error || validationError}
            </p>
          )}

          <Button type="submit" className="w-full h-12" loading={loading}>
            Create Account
          </Button>
        </form>

        {/* Sign in link */}
        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link href="/auth/login" className="text-primary hover:underline font-medium">
            Sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
