'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

const CONSENT_KEY = 'crush-cookie-consent';

type ConsentValue = 'accepted' | 'rejected' | null;

function getConsent(): ConsentValue {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(CONSENT_KEY) as ConsentValue;
}

export function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Show banner only if user hasn't responded yet
    const consent = getConsent();
    if (!consent) {
      // Slight delay so it doesn't flash on page load
      const timer = setTimeout(() => setVisible(true), 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  function accept() {
    localStorage.setItem(CONSENT_KEY, 'accepted');
    setVisible(false);
  }

  function reject() {
    localStorage.setItem(CONSENT_KEY, 'rejected');
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Cookie consent"
      className="fixed bottom-0 left-0 right-0 z-50 p-4 sm:p-6"
    >
      <div className="mx-auto max-w-3xl rounded-xl border border-border bg-card p-4 sm:p-6 shadow-lg">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex-1">
            <p className="text-sm text-card-foreground">
              We use cookies and similar technologies to improve your experience,
              analyze traffic, and personalize content.{' '}
              <Link
                href="/privacy"
                className="underline text-primary hover:text-primary/80"
              >
                Privacy Policy
              </Link>
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={reject}
              className="px-4 py-2 text-sm font-medium rounded-lg border border-border text-muted-foreground hover:bg-muted transition-colors"
            >
              Decline
            </button>
            <button
              onClick={accept}
              className="px-4 py-2 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Accept
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
