'use client';

import Link from 'next/link';
import { Heart, Home, ArrowLeft } from 'lucide-react';
import { Button } from '@crush/ui';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background to-muted">
      <div className="max-w-md w-full text-center">
        {/* 404 Visual */}
        <div className="relative mb-8">
          <div className="text-[150px] font-bold text-muted-foreground/10 leading-none select-none">
            404
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center">
              <Heart className="w-12 h-12 text-primary" />
            </div>
          </div>
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-foreground mb-2">
          Page not found
        </h1>

        {/* Description */}
        <p className="text-muted-foreground mb-8">
          Looks like this page has swiped left on us. Let's get you back to
          finding your perfect match!
        </p>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button asChild>
            <Link href="/">
              <Home className="w-4 h-4 mr-2" />
              Go Home
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/discover">
              <Heart className="w-4 h-4 mr-2" />
              Start Swiping
            </Link>
          </Button>
        </div>

        {/* Back link */}
        <button
          onClick={() => window.history.back()}
          className="mt-6 text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Go back
        </button>
      </div>
    </div>
  );
}
