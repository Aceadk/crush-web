'use client';

import { useRouter } from 'next/navigation';
import { Button, Card } from '@crush/ui';
import { ArrowLeft, CreditCard, RotateCcw, XCircle } from 'lucide-react';

export default function PremiumCancelPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gradient-to-b from-muted/20 to-background flex items-center justify-center p-6">
      <Card className="max-w-md w-full p-8 text-center">
        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
          <XCircle className="w-10 h-10 text-amber-600 dark:text-amber-400" />
        </div>

        <h1 className="text-2xl font-bold mb-2">Checkout canceled</h1>
        <p className="text-muted-foreground mb-8">
          No payment was made. Your current plan is unchanged.
        </p>

        <div className="space-y-3">
          <Button
            className="w-full gap-2"
            onClick={() => router.push('/premium')}
            size="lg"
          >
            <RotateCcw className="w-4 h-4" />
            Try checkout again
          </Button>

          <Button
            variant="outline"
            className="w-full gap-2"
            onClick={() => router.push('/settings/account')}
          >
            <CreditCard className="w-4 h-4" />
            Payment settings
          </Button>

          <Button
            variant="ghost"
            className="w-full gap-2"
            onClick={() => router.push('/discover')}
          >
            <ArrowLeft className="w-4 h-4" />
            Back to discover
          </Button>
        </div>
      </Card>
    </div>
  );
}

