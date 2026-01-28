'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@crush/core';
import { Button, Input, Card, CardContent, CardHeader, CardTitle, CardDescription } from '@crush/ui';
import { Phone, ArrowLeft, ChevronRight, ChevronDown, Timer } from 'lucide-react';

type Step = 'phone' | 'code';

// Common country codes
const COUNTRY_CODES = [
  { code: '+1', country: 'US', flag: '🇺🇸', name: 'United States' },
  { code: '+1', country: 'CA', flag: '🇨🇦', name: 'Canada' },
  { code: '+44', country: 'GB', flag: '🇬🇧', name: 'United Kingdom' },
  { code: '+61', country: 'AU', flag: '🇦🇺', name: 'Australia' },
  { code: '+91', country: 'IN', flag: '🇮🇳', name: 'India' },
  { code: '+49', country: 'DE', flag: '🇩🇪', name: 'Germany' },
  { code: '+33', country: 'FR', flag: '🇫🇷', name: 'France' },
  { code: '+81', country: 'JP', flag: '🇯🇵', name: 'Japan' },
  { code: '+86', country: 'CN', flag: '🇨🇳', name: 'China' },
  { code: '+82', country: 'KR', flag: '🇰🇷', name: 'South Korea' },
  { code: '+55', country: 'BR', flag: '🇧🇷', name: 'Brazil' },
  { code: '+52', country: 'MX', flag: '🇲🇽', name: 'Mexico' },
  { code: '+34', country: 'ES', flag: '🇪🇸', name: 'Spain' },
  { code: '+39', country: 'IT', flag: '🇮🇹', name: 'Italy' },
  { code: '+31', country: 'NL', flag: '🇳🇱', name: 'Netherlands' },
  { code: '+46', country: 'SE', flag: '🇸🇪', name: 'Sweden' },
  { code: '+47', country: 'NO', flag: '🇳🇴', name: 'Norway' },
  { code: '+45', country: 'DK', flag: '🇩🇰', name: 'Denmark' },
  { code: '+358', country: 'FI', flag: '🇫🇮', name: 'Finland' },
  { code: '+48', country: 'PL', flag: '🇵🇱', name: 'Poland' },
  { code: '+7', country: 'RU', flag: '🇷🇺', name: 'Russia' },
  { code: '+971', country: 'AE', flag: '🇦🇪', name: 'UAE' },
  { code: '+966', country: 'SA', flag: '🇸🇦', name: 'Saudi Arabia' },
  { code: '+65', country: 'SG', flag: '🇸🇬', name: 'Singapore' },
  { code: '+63', country: 'PH', flag: '🇵🇭', name: 'Philippines' },
  { code: '+60', country: 'MY', flag: '🇲🇾', name: 'Malaysia' },
  { code: '+66', country: 'TH', flag: '🇹🇭', name: 'Thailand' },
  { code: '+62', country: 'ID', flag: '🇮🇩', name: 'Indonesia' },
  { code: '+84', country: 'VN', flag: '🇻🇳', name: 'Vietnam' },
  { code: '+27', country: 'ZA', flag: '🇿🇦', name: 'South Africa' },
  { code: '+234', country: 'NG', flag: '🇳🇬', name: 'Nigeria' },
  { code: '+20', country: 'EG', flag: '🇪🇬', name: 'Egypt' },
  { code: '+254', country: 'KE', flag: '🇰🇪', name: 'Kenya' },
];

const RESEND_COOLDOWN = 30; // seconds

export default function PhoneAuthPage() {
  const router = useRouter();
  const { user, profile, startPhoneVerification, verifyPhoneCode, loading, error, clearError, initialized } = useAuthStore();

  const [step, setStep] = useState<Step>('phone');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [selectedCountry, setSelectedCountry] = useState(COUNTRY_CODES[0]); // Default to US
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const codeInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const countryPickerRef = useRef<HTMLDivElement>(null);
  const recaptchaContainerId = 'recaptcha-container';

  // Handle click outside to close country picker
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (countryPickerRef.current && !countryPickerRef.current.contains(event.target as Node)) {
        setShowCountryPicker(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  // Redirect when user is authenticated
  useEffect(() => {
    if (initialized && user && !loading) {
      // Check if user needs onboarding
      if (profile && profile.onboardingComplete) {
        router.push('/discover');
      } else {
        router.push('/onboarding');
      }
    }
  }, [user, profile, initialized, loading, router]);

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
    if (digits.length < 7 || digits.length > 15) {
      setValidationError('Please enter a valid phone number');
      return;
    }

    try {
      // Format as E.164 with selected country code
      await startPhoneVerification(`${selectedCountry.code}${digits}`, recaptchaContainerId);
      setResendCooldown(RESEND_COOLDOWN);
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
      setIsVerifying(true);
      await verifyPhoneCode(fullCode);
      // Redirect will happen via useEffect when user state updates
    } catch {
      setIsVerifying(false);
      // Error is handled by the store
    }
  };

  const handleResendCode = async () => {
    if (resendCooldown > 0) return;

    setCode(['', '', '', '', '', '']);
    clearError();

    const digits = phoneNumber.replace(/\D/g, '');
    try {
      await startPhoneVerification(`${selectedCountry.code}${digits}`, recaptchaContainerId);
      setResendCooldown(RESEND_COOLDOWN);
    } catch {
      // Error is handled by the store
    }
  };

  const isLoading = loading || isVerifying;

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
            <div className="flex gap-2">
              {/* Country code selector */}
              <div className="relative" ref={countryPickerRef}>
                <button
                  type="button"
                  onClick={() => setShowCountryPicker(!showCountryPicker)}
                  disabled={isLoading}
                  className="flex items-center gap-1 h-10 px-3 border rounded-md hover:bg-muted transition-colors disabled:opacity-50"
                >
                  <span className="text-lg">{selectedCountry.flag}</span>
                  <span className="text-sm font-medium">{selectedCountry.code}</span>
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                </button>

                {/* Country dropdown */}
                {showCountryPicker && (
                  <div className="absolute top-full left-0 mt-1 w-64 max-h-60 overflow-y-auto bg-background border rounded-lg shadow-lg z-50">
                    {COUNTRY_CODES.map((country, index) => (
                      <button
                        key={`${country.code}-${country.country}-${index}`}
                        type="button"
                        onClick={() => {
                          setSelectedCountry(country);
                          setShowCountryPicker(false);
                        }}
                        className={`w-full flex items-center gap-3 px-3 py-2 hover:bg-muted transition-colors text-left ${
                          selectedCountry.country === country.country && selectedCountry.code === country.code
                            ? 'bg-primary/10'
                            : ''
                        }`}
                      >
                        <span className="text-lg">{country.flag}</span>
                        <span className="flex-1 text-sm">{country.name}</span>
                        <span className="text-sm text-muted-foreground">{country.code}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Phone input */}
              <div className="relative flex-1">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  type="tel"
                  placeholder="Phone number"
                  value={phoneNumber}
                  onChange={handlePhoneChange}
                  className="pl-10"
                  disabled={isLoading}
                />
              </div>
            </div>

            {(error || validationError) && (
              <p className="text-sm text-destructive text-center">
                {error || validationError}
              </p>
            )}

            <Button type="submit" className="w-full h-12" loading={isLoading}>
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
                  disabled={isLoading}
                />
              ))}
            </div>

            {(error || validationError) && (
              <p className="text-sm text-destructive text-center">
                {error || validationError}
              </p>
            )}

            <Button type="submit" className="w-full h-12" loading={isLoading}>
              {isVerifying ? 'Verifying...' : 'Verify'}
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              Didn't receive a code?{' '}
              {resendCooldown > 0 ? (
                <span className="inline-flex items-center gap-1 text-muted-foreground">
                  <Timer className="w-3.5 h-3.5" />
                  Resend in {resendCooldown}s
                </span>
              ) : (
                <button
                  type="button"
                  onClick={handleResendCode}
                  className="text-primary hover:underline font-medium"
                  disabled={isLoading}
                >
                  Resend
                </button>
              )}
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
