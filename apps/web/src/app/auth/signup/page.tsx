'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@crush/core';
import { Button, Input, Card, CardContent, CardHeader, CardTitle, CardDescription } from '@crush/ui';
import { Mail, Lock, Eye, EyeOff, User, Chrome, Phone, Check, X } from 'lucide-react';

// Password strength calculation
interface PasswordStrength {
  score: number; // 0-4
  label: string;
  color: string;
  requirements: {
    length: boolean;
    uppercase: boolean;
    lowercase: boolean;
    number: boolean;
    special: boolean;
  };
}

function calculatePasswordStrength(password: string): PasswordStrength {
  const requirements = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
  };

  const metCount = Object.values(requirements).filter(Boolean).length;

  let score = 0;
  let label = 'Too weak';
  let color = 'bg-red-500';

  if (metCount >= 5) {
    score = 4;
    label = 'Very strong';
    color = 'bg-green-500';
  } else if (metCount >= 4) {
    score = 3;
    label = 'Strong';
    color = 'bg-green-400';
  } else if (metCount >= 3) {
    score = 2;
    label = 'Fair';
    color = 'bg-yellow-500';
  } else if (metCount >= 2) {
    score = 1;
    label = 'Weak';
    color = 'bg-orange-500';
  }

  return { score, label, color, requirements };
}

export default function SignupPage() {
  const router = useRouter();
  const { user, profile, signUpWithEmail, signInWithGoogle, loading, error, clearError, initialized } = useAuthStore();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isSigningUp, setIsSigningUp] = useState(false);
  const [showRequirements, setShowRequirements] = useState(false);

  const passwordStrength = useMemo(() => calculatePasswordStrength(password), [password]);

  // Redirect when user is authenticated
  useEffect(() => {
    if (initialized && user && !loading) {
      // New users always go to onboarding
      // Existing users go to discover or onboarding based on profile
      if (profile && profile.onboardingComplete) {
        router.push('/discover');
      } else {
        router.push('/onboarding');
      }
    }
  }, [user, profile, initialized, loading, router]);

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
      setIsSigningUp(true);
      await signUpWithEmail(email, password, name);
      // Redirect will happen via useEffect when user state updates
    } catch {
      setIsSigningUp(false);
      // Error is handled by the store
    }
  };

  const handleGoogleSignup = async () => {
    clearError();
    try {
      setIsSigningUp(true);
      await signInWithGoogle();
      // Redirect will happen via useEffect when user state updates
    } catch {
      setIsSigningUp(false);
      // Error is handled by the store
    }
  };

  const isLoading = loading || isSigningUp;

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
            disabled={isLoading}
          >
            <Chrome className="w-5 h-5 mr-2" />
            Continue with Google
          </Button>

          <Link href="/auth/phone">
            <Button variant="outline" className="w-full h-12" disabled={isLoading}>
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
              disabled={isLoading}
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
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                type={showPassword ? 'text' : 'password'}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onFocus={() => setShowRequirements(true)}
                onBlur={() => setShowRequirements(false)}
                className="pl-10 pr-10"
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>

            {/* Password strength indicator */}
            {password.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${passwordStrength.color}`}
                      style={{ width: `${(passwordStrength.score / 4) * 100}%` }}
                    />
                  </div>
                  <span className={`text-xs font-medium ${
                    passwordStrength.score >= 3 ? 'text-green-500' :
                    passwordStrength.score >= 2 ? 'text-yellow-500' : 'text-red-500'
                  }`}>
                    {passwordStrength.label}
                  </span>
                </div>

                {/* Password requirements */}
                {showRequirements && (
                  <div className="p-3 bg-muted/50 rounded-lg space-y-1.5 text-xs">
                    <p className="font-medium text-muted-foreground mb-2">Password requirements:</p>
                    <div className="grid grid-cols-2 gap-1">
                      <div className={`flex items-center gap-1 ${passwordStrength.requirements.length ? 'text-green-500' : 'text-muted-foreground'}`}>
                        {passwordStrength.requirements.length ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                        <span>8+ characters</span>
                      </div>
                      <div className={`flex items-center gap-1 ${passwordStrength.requirements.uppercase ? 'text-green-500' : 'text-muted-foreground'}`}>
                        {passwordStrength.requirements.uppercase ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                        <span>Uppercase letter</span>
                      </div>
                      <div className={`flex items-center gap-1 ${passwordStrength.requirements.lowercase ? 'text-green-500' : 'text-muted-foreground'}`}>
                        {passwordStrength.requirements.lowercase ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                        <span>Lowercase letter</span>
                      </div>
                      <div className={`flex items-center gap-1 ${passwordStrength.requirements.number ? 'text-green-500' : 'text-muted-foreground'}`}>
                        {passwordStrength.requirements.number ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                        <span>Number</span>
                      </div>
                      <div className={`flex items-center gap-1 ${passwordStrength.requirements.special ? 'text-green-500' : 'text-muted-foreground'}`}>
                        {passwordStrength.requirements.special ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                        <span>Special character</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              type={showPassword ? 'text' : 'password'}
              placeholder="Confirm password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="pl-10"
              disabled={isLoading}
            />
          </div>

          {(error || validationError) && (
            <p className="text-sm text-destructive text-center">
              {error || validationError}
            </p>
          )}

          <Button type="submit" className="w-full h-12" loading={isLoading}>
            {isSigningUp ? 'Creating account...' : 'Create Account'}
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
