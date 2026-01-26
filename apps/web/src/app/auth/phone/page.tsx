'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@crush/core';
import { Button, Input, Card, CardContent, CardHeader, CardTitle, CardDescription } from '@crush/ui';
import { Phone, ArrowLeft, ChevronRight } from 'lucide-react';

type Step = 'phone' | 'code';

export default function PhoneAuthPage() {
  const router = useRouter();
  const { startPhoneVerification, verifyPhoneCode, loading, error, clearError } = useAuthStore();

  const [step, setStep] = useState<Step>('phone');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [validationError, setValidationError] = useState<string | null>(null);

  const codeInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const recaptchaContainerId = 'recaptcha-container';

  useEffect(() => {
    // Focus first code input when on code step
    if (step === 'code' && codeInputRefs.current[0]) {
      codeInputRefs.current[0].focus();
    }
  }, [step]);

  const formatPhoneNumber = (value: string) => {
    // Remove all non-digits
    const digits = value.replace(/\D/g, '');
    // Format as (XXX) XXX-XXXX
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    setPhoneNumber(formatted);
  };

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);
    clearError();

    const digits = phoneNumber.replace(/\D/g, '');
    if (digits.length !== 10) {
      setValidationError('Please enter a valid 10-digit phone number');
      return;
    }

    try {
      // Format as E.164 (assuming US number)
      await startPhoneVerification(`+1${digits}`, recaptchaContainerId);
      setStep('code');
    } catch {
      // Error is handled by the store
    }
  };

  const handleCodeChange = (index: number, value: string) => {
    if (value.length > 1) {
      // Handle paste
      const digits = value.replace(/\D/g, '').slice(0, 6);
      const newCode = [...code];
      digits.split('').forEach((digit, i) => {
        if (index + i < 6) {
          newCode[index + i] = digit;
        }
      });
      setCode(newCode);

      // Focus appropriate input
      const nextIndex = Math.min(index + digits.length, 5);
      codeInputRefs.current[nextIndex]?.focus();
    } else {
      // Handle single digit
      const newCode = [...code];
      newCode[index] = value.replace(/\D/g, '');
      setCode(newCode);

      // Auto-advance to next input
      if (value && index < 5) {
        codeInputRefs.current[index + 1]?.focus();
      }
    }
  };

  const handleCodeKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      codeInputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);
    clearError();

    const fullCode = code.join('');
    if (fullCode.length !== 6) {
      setValidationError('Please enter the 6-digit code');
      return;
    }

    try {
      await verifyPhoneCode(fullCode);
      router.push('/onboarding');
    } catch {
      // Error is handled by the store
    }
  };

  const handleResendCode = async () => {
    setCode(['', '', '', '', '', '']);
    clearError();

    const digits = phoneNumber.replace(/\D/g, '');
    try {
      await startPhoneVerification(`+1${digits}`, recaptchaContainerId);
    } catch {
      // Error is handled by the store
    }
  };

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="text-center">
        {step === 'code' && (
          <button
            onClick={() => setStep('phone')}
            className="absolute left-6 top-6 p-2 hover:bg-muted rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        )}
        <CardTitle className="text-2xl">
          {step === 'phone' ? 'Enter your phone number' : 'Enter verification code'}
        </CardTitle>
        <CardDescription>
          {step === 'phone'
            ? "We'll send you a verification code"
            : `We sent a code to ${phoneNumber}`}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {step === 'phone' ? (
          <form onSubmit={handleSendCode} className="space-y-4">
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <div className="absolute left-12 top-1/2 -translate-y-1/2 text-muted-foreground border-r pr-2">
                +1
              </div>
              <Input
                type="tel"
                placeholder="(555) 555-5555"
                value={phoneNumber}
                onChange={handlePhoneChange}
                className="pl-20"
                disabled={loading}
                maxLength={14}
              />
            </div>

            {(error || validationError) && (
              <p className="text-sm text-destructive text-center">
                {error || validationError}
              </p>
            )}

            <Button type="submit" className="w-full h-12" loading={loading}>
              Send Code
              <ChevronRight className="w-5 h-5 ml-2" />
            </Button>

            {/* Recaptcha container */}
            <div id={recaptchaContainerId} />
          </form>
        ) : (
          <form onSubmit={handleVerifyCode} className="space-y-6">
            {/* Code input */}
            <div className="flex justify-center gap-2">
              {code.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => { codeInputRefs.current[index] = el; }}
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={digit}
                  onChange={(e) => handleCodeChange(index, e.target.value)}
                  onKeyDown={(e) => handleCodeKeyDown(index, e)}
                  className="w-12 h-14 text-center text-xl font-semibold border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                  disabled={loading}
                />
              ))}
            </div>

            {(error || validationError) && (
              <p className="text-sm text-destructive text-center">
                {error || validationError}
              </p>
            )}

            <Button type="submit" className="w-full h-12" loading={loading}>
              Verify
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              Didn't receive a code?{' '}
              <button
                type="button"
                onClick={handleResendCode}
                className="text-primary hover:underline font-medium"
                disabled={loading}
              >
                Resend
              </button>
            </p>
          </form>
        )}

        {/* Other auth options */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">Or</span>
          </div>
        </div>

        <div className="flex gap-4">
          <Link href="/auth/login" className="flex-1">
            <Button variant="outline" className="w-full">
              Email
            </Button>
          </Link>
          <Link href="/auth/signup" className="flex-1">
            <Button variant="outline" className="w-full">
              Sign up
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
