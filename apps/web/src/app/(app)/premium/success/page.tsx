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
    <div className="min-h-screen bg-gradient-to-b from-primary/5 to-secondary/5 flex items-center justify-center p-6">
      {showConfetti && (
        <Confetti
          width={windowSize.width}
          height={windowSize.height}
          recycle={false}
          numberOfPieces={200}
        />
      )}

      <Card className="max-w-md w-full p-8 text-center">
        <div className="relative inline-block mb-6">
          <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-xl">
            <Crown className="w-12 h-12 text-white" />
          </div>
          <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-green-500 rounded-full flex items-center justify-center shadow-lg">
            <CheckCircle className="w-6 h-6 text-white" />
          </div>
        </div>

        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Welcome to Premium!
        </h1>
        <p className="text-gray-600 dark:text-gray-300 mb-8">
          Your subscription is now active. Enjoy all the exclusive features!
        </p>

        <div className="space-y-3 mb-8">
          <div className="flex items-center gap-3 p-3 bg-primary/10 rounded-xl">
            <Heart className="w-5 h-5 text-primary" />
            <span className="text-sm text-gray-700 dark:text-gray-300">
              Unlimited likes unlocked
            </span>
          </div>
          <div className="flex items-center gap-3 p-3 bg-primary/10 rounded-xl">
            <Sparkles className="w-5 h-5 text-primary" />
            <span className="text-sm text-gray-700 dark:text-gray-300">
              5 Super Likes per day
            </span>
          </div>
          <div className="flex items-center gap-3 p-3 bg-primary/10 rounded-xl">
            <Crown className="w-5 h-5 text-primary" />
            <span className="text-sm text-gray-700 dark:text-gray-300">
              All Premium features active
            </span>
          </div>
        </div>

        <div className="space-y-3">
          <Button
            onClick={() => router.push('/discover')}
            className="w-full gap-2"
            size="lg"
          >
            <Heart className="w-5 h-5" />
            Start Discovering
          </Button>
          <Button
            variant="outline"
            onClick={() => router.push('/settings')}
            className="w-full"
          >
            Manage Subscription
          </Button>
        </div>
      </Card>
    </div>
  );
}
