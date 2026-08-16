'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@crush/core';
import { Button, Card } from '@crush/ui';
import { Crown, Heart, Sparkles, CheckCircle } from 'lucide-react';
import Confetti from 'react-confetti';

export default function PremiumSuccessPage() {
  const router = useRouter();
  const { user, refreshProfile } = useAuthStore();
  const [showConfetti, setShowConfetti] = useState(true);
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    setWindowSize({
      width: window.innerWidth,
      height: window.innerHeight,
    });

    // Reload user profile to get updated premium status
    if (user) {
      refreshProfile();
    }

    // Stop confetti after 5 seconds
    const timer = setTimeout(() => setShowConfetti(false), 5000);
    return () => clearTimeout(timer);
  }, [user, refreshProfile]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-primary/5 to-secondary/5 p-6">
      {showConfetti && (
        <Confetti
          width={windowSize.width}
          height={windowSize.height}
          recycle={false}
          numberOfPieces={200}
        />
      )}

      <Card className="w-full max-w-md p-8 text-center">
        <div className="relative mb-6 inline-block">
          <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-primary to-secondary shadow-xl">
            <Crown className="h-12 w-12 text-white" />
          </div>
          <div className="absolute -bottom-2 -right-2 flex h-10 w-10 items-center justify-center rounded-full bg-green-500 shadow-lg">
            <CheckCircle className="h-6 w-6 text-white" />
          </div>
        </div>

        <h1 className="mb-2 text-3xl font-bold text-gray-900 dark:text-white">
          Welcome to Premium!
        </h1>
        <p className="mb-8 text-gray-600 dark:text-gray-300">
          Your subscription is now active. Enjoy all the exclusive features!
        </p>

        <div className="mb-8 space-y-3">
          <div className="flex items-center gap-3 rounded-xl bg-primary/10 p-3">
            <Heart className="h-5 w-5 text-primary" />
            <span className="text-sm text-gray-700 dark:text-gray-300">
              Unlimited likes unlocked
            </span>
          </div>
          <div className="flex items-center gap-3 rounded-xl bg-primary/10 p-3">
            <Sparkles className="h-5 w-5 text-primary" />
            <span className="text-sm text-gray-700 dark:text-gray-300">7 Super Likes per day</span>
          </div>
          <div className="flex items-center gap-3 rounded-xl bg-primary/10 p-3">
            <Crown className="h-5 w-5 text-primary" />
            <span className="text-sm text-gray-700 dark:text-gray-300">
              All Premium features active
            </span>
          </div>
        </div>

        <div className="space-y-3">
          <Button onClick={() => router.push('/discover')} className="w-full gap-2" size="lg">
            <Heart className="h-5 w-5" />
            Start Discovering
          </Button>
          <Button variant="outline" onClick={() => router.push('/settings')} className="w-full">
            Manage Subscription
          </Button>
        </div>
      </Card>
    </div>
  );
}
