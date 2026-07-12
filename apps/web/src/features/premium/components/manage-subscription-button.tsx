'use client';

import { Button } from '@crush/ui';
import { ExternalLink, Loader2 } from 'lucide-react';
import { useState } from 'react';

interface ManageSubscriptionButtonProps {
  className?: string;
  showDescription?: boolean;
}

export function ManageSubscriptionButton({
  className = 'w-full',
  showDescription = true,
}: ManageSubscriptionButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openPortal = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/stripe/create-portal-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const result = (await response.json()) as { url?: string; error?: string };

      if (!response.ok || !result.url) {
        throw new Error(result.error || 'Unable to open subscription management.');
      }

      window.location.assign(result.url);
    } catch (portalError) {
      setError(
        portalError instanceof Error
          ? portalError.message
          : 'Unable to open subscription management.'
      );
      setLoading(false);
    }
  };

  return (
    <div>
      <Button
        type="button"
        variant="outline"
        className={className}
        onClick={() => void openPortal()}
        disabled={loading}
      >
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Opening Stripe…
          </>
        ) : (
          <>
            <ExternalLink className="mr-2 h-4 w-4" />
            Manage Subscription
          </>
        )}
      </Button>
      {showDescription && !error && (
        <p className="mt-2 text-center text-xs text-gray-500">
          Update payment method, view invoices, or cancel your subscription
        </p>
      )}
      {error && <p className="mt-2 text-center text-sm text-red-500">{error}</p>}
    </div>
  );
}
