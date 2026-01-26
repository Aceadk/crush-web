import Link from 'next/link';
import { Heart } from 'lucide-react';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary via-primary-dark to-secondary relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute inset-0">
          <div className="absolute top-20 left-20 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-center px-12 text-white">
          <Link href="/" className="flex items-center gap-3 mb-8">
            <Heart className="w-12 h-12 fill-white" />
            <span className="text-4xl font-bold tracking-tight">CRUSH</span>
          </Link>

          <h1 className="text-5xl font-bold leading-tight mb-6">
            Find Your
            <br />
            Perfect Match
          </h1>

          <p className="text-xl text-white/80 max-w-md">
            Join millions of people discovering meaningful connections every day.
            Your journey to love starts here.
          </p>

          {/* Stats */}
          <div className="flex gap-12 mt-12">
            <div>
              <div className="text-4xl font-bold">10M+</div>
              <div className="text-white/70">Active Users</div>
            </div>
            <div>
              <div className="text-4xl font-bold">500K+</div>
              <div className="text-white/70">Matches Daily</div>
            </div>
            <div>
              <div className="text-4xl font-bold">150+</div>
              <div className="text-white/70">Countries</div>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Auth form */}
      <div className="flex-1 flex flex-col">
        {/* Mobile header */}
        <div className="lg:hidden p-6 flex justify-center">
          <Link href="/" className="flex items-center gap-2 text-primary">
            <Heart className="w-8 h-8 fill-primary" />
            <span className="text-2xl font-bold">CRUSH</span>
          </Link>
        </div>

        {/* Form container */}
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-md">{children}</div>
        </div>

        {/* Footer */}
        <div className="p-6 text-center text-sm text-muted-foreground">
          <p>
            By continuing, you agree to our{' '}
            <Link href="/terms" className="text-primary hover:underline">
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link href="/privacy" className="text-primary hover:underline">
              Privacy Policy
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
