'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore, usePromoCodeStore, useUIStore } from '@crush/core';
import { Button, Card, Input } from '@crush/ui';
import { cn } from '@crush/ui';
import {
  Tag,
  Check,
  X,
  Loader2,
  Sparkles,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Gift,
} from 'lucide-react';

interface PromoCodeInputProps {
  selectedPlan?: string;
  onSuccess?: () => void;
  className?: string;
  collapsible?: boolean;
  defaultExpanded?: boolean;
}

export function PromoCodeInput({
  selectedPlan = 'monthly',
  onSuccess,
  className,
  collapsible = true,
  defaultExpanded = false,
}: PromoCodeInputProps) {
  const router = useRouter();
  const { user, refreshProfile } = useAuthStore();
  const { addToast } = useUIStore();
  const {
    promoCode,
    setPromoCode,
    validationResult,
    applyResult,
    isValidating,
    isApplying,
    error,
    validatePromoCode,
    applyPromoCode,
    clearPromoCode,
  } = usePromoCodeStore();

  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [localCode, setLocalCode] = useState('');

  const handleCodeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const code = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    setLocalCode(code);
    if (code.length >= 4) {
      setPromoCode(code);
    }
  }, [setPromoCode]);

  const handleValidate = useCallback(async () => {
    if (!user || !localCode) return;

    const result = await validatePromoCode(localCode, user.uid, selectedPlan);
    if (result.isValid) {
      addToast({
        type: 'success',
        title: 'Valid Promo Code!',
        description: result.isFreeAccess
          ? 'This code gives you free premium access!'
          : `${result.discountPercent}% discount will be applied`,
      });
    }
  }, [user, localCode, selectedPlan, validatePromoCode, addToast]);

  const handleApply = useCallback(async () => {
    if (!user || !localCode) return;

    const result = await applyPromoCode(localCode, user.uid, selectedPlan);

    if (result.success) {
      if (result.isFreeAccess) {
        // 100% discount - Premium activated instantly
        addToast({
          type: 'success',
          title: 'Premium Activated!',
          description: 'Congratulations! You now have premium access.',
        });
        // Refresh user profile to get updated premium status
        await refreshProfile();
        clearPromoCode();
        onSuccess?.();
        // Redirect to premium page to show status
        router.push('/premium');
      } else if (result.redirectToPayment) {
        // Partial discount - redirect to payment
        addToast({
          type: 'info',
          title: 'Discount Applied!',
          description: `${result.discountPercent}% discount will be applied at checkout.`,
        });
        // Redirect to premium page with promo code
        router.push(`/premium?promo=${localCode}&plan=${selectedPlan}`);
      }
    } else {
      addToast({
        type: 'error',
        title: 'Error',
        description: result.error || 'Failed to apply promo code',
      });
    }
  }, [user, localCode, selectedPlan, applyPromoCode, addToast, refreshProfile, clearPromoCode, onSuccess, router]);

  const handleClear = useCallback(() => {
    setLocalCode('');
    clearPromoCode();
  }, [clearPromoCode]);

  const isCodeValid = validationResult?.isValid === true;
  const isFreeAccess = validationResult?.isFreeAccess === true;

  if (collapsible && !isExpanded) {
    return (
      <Card className={cn('overflow-hidden', className)}>
        <button
          onClick={() => setIsExpanded(true)}
          className="w-full p-4 flex items-center gap-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
            <Gift className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <p className="font-medium text-gray-900 dark:text-white">
              Have a Promo Code?
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Enter your code to get a discount
            </p>
          </div>
          <ChevronDown className="w-5 h-5 text-gray-400" />
        </button>
      </Card>
    );
  }

  return (
    <Card className={cn('overflow-hidden', className)}>
      {collapsible && (
        <button
          onClick={() => setIsExpanded(false)}
          className="w-full px-4 py-3 flex items-center justify-between bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700"
        >
          <div className="flex items-center gap-2">
            <Gift className="w-5 h-5 text-amber-500" />
            <span className="font-semibold text-gray-900 dark:text-white">
              Promo Code
            </span>
          </div>
          <ChevronUp className="w-5 h-5 text-gray-400" />
        </button>
      )}

      <div className="p-4 space-y-4">
        {/* Input and buttons */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={localCode}
              onChange={handleCodeChange}
              placeholder="Enter promo code"
              maxLength={20}
              className={cn(
                'w-full pl-10 pr-10 py-3 rounded-xl border text-sm font-medium tracking-wider uppercase',
                'bg-gray-50 dark:bg-gray-800',
                'focus:outline-none focus:ring-2 focus:ring-primary/50',
                'transition-colors',
                isCodeValid
                  ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                  : error
                    ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                    : 'border-gray-200 dark:border-gray-700'
              )}
            />
            {localCode && (
              <button
                onClick={handleClear}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            )}
          </div>
          <Button
            onClick={isCodeValid ? handleApply : handleValidate}
            disabled={!localCode || isValidating || isApplying}
            className={cn(
              'px-4',
              isCodeValid && 'bg-green-600 hover:bg-green-700'
            )}
          >
            {isValidating || isApplying ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : isCodeValid ? (
              'Apply'
            ) : (
              'Validate'
            )}
          </Button>
        </div>

        {/* Validation result */}
        {validationResult && (
          <div
            className={cn(
              'p-3 rounded-xl flex items-start gap-3',
              isCodeValid
                ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
            )}
          >
            {isCodeValid ? (
              <>
                <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/50 flex items-center justify-center flex-shrink-0">
                  <Check className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="font-medium text-green-700 dark:text-green-400">
                    {isFreeAccess ? 'Free Premium!' : `${validationResult.discountPercent}% Discount`}
                  </p>
                  <p className="text-sm text-green-600 dark:text-green-500">
                    {isFreeAccess
                      ? 'Click Apply to activate your free premium membership!'
                      : 'Click Apply to use this discount at checkout.'}
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-900/50 flex items-center justify-center flex-shrink-0">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <p className="font-medium text-red-700 dark:text-red-400">
                    Invalid Code
                  </p>
                  <p className="text-sm text-red-600 dark:text-red-500">
                    {validationResult.error || 'This promo code is not valid.'}
                  </p>
                </div>
              </>
            )}
          </div>
        )}

        {/* Success message for 100% discount */}
        {applyResult?.success && applyResult.isFreeAccess && (
          <div className="p-4 rounded-xl bg-gradient-to-r from-primary/10 to-secondary/10 border border-primary/20">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-semibold text-gray-900 dark:text-white">
                  Premium Activated!
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Enjoy all premium features
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
