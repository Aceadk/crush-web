'use client';

import { motion } from 'framer-motion';
import {
  Loader2,
  AlertCircle,
  WifiOff,
  RefreshCw,
  Search,
  Inbox,
  Heart,
  MessageCircle,
  Users,
  Settings,
  Image,
} from 'lucide-react';
import { Button } from '@crush/ui';

// ============================================================
// Loading States
// ============================================================

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function LoadingSpinner({ size = 'md', className = '' }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  };

  return (
    <Loader2
      className={`animate-spin text-primary ${sizeClasses[size]} ${className}`}
    />
  );
}

interface PageLoadingProps {
  message?: string;
}

export function PageLoading({ message = 'Loading...' }: PageLoadingProps) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4">
      <motion.div
        animate={{
          scale: [1, 1.1, 1],
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      >
        <Heart className="w-12 h-12 text-primary" />
      </motion.div>
      <p className="text-muted-foreground animate-pulse">{message}</p>
    </div>
  );
}

interface CardSkeletonProps {
  count?: number;
}

export function CardSkeleton({ count = 3 }: CardSkeletonProps) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rounded-xl border border-border bg-card p-4 animate-pulse"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-muted" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-muted rounded w-1/4" />
              <div className="h-3 bg-muted rounded w-1/2" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function ProfileSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="aspect-[3/4] bg-muted rounded-2xl mb-4" />
      <div className="space-y-3">
        <div className="h-6 bg-muted rounded w-1/3" />
        <div className="h-4 bg-muted rounded w-1/2" />
        <div className="flex gap-2">
          <div className="h-8 bg-muted rounded-full w-20" />
          <div className="h-8 bg-muted rounded-full w-24" />
          <div className="h-8 bg-muted rounded-full w-16" />
        </div>
      </div>
    </div>
  );
}

export function ChatSkeleton() {
  return (
    <div className="space-y-4 p-4 animate-pulse">
      {/* Received message */}
      <div className="flex gap-2">
        <div className="w-8 h-8 rounded-full bg-muted flex-shrink-0" />
        <div className="bg-muted rounded-2xl rounded-tl-none p-3 max-w-[70%]">
          <div className="h-4 bg-muted-foreground/20 rounded w-32" />
        </div>
      </div>

      {/* Sent message */}
      <div className="flex gap-2 justify-end">
        <div className="bg-primary/30 rounded-2xl rounded-tr-none p-3 max-w-[70%]">
          <div className="h-4 bg-primary/40 rounded w-40" />
        </div>
      </div>

      {/* Received message */}
      <div className="flex gap-2">
        <div className="w-8 h-8 rounded-full bg-muted flex-shrink-0" />
        <div className="bg-muted rounded-2xl rounded-tl-none p-3 max-w-[70%]">
          <div className="space-y-2">
            <div className="h-4 bg-muted-foreground/20 rounded w-48" />
            <div className="h-4 bg-muted-foreground/20 rounded w-32" />
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Empty States
// ============================================================

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className = '',
}: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center text-center p-8 ${className}`}>
      {icon && (
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-semibold text-foreground mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-muted-foreground max-w-sm mb-4">{description}</p>
      )}
      {action && (
        <Button onClick={action.onClick}>{action.label}</Button>
      )}
    </div>
  );
}

export function NoMatchesFound() {
  return (
    <EmptyState
      icon={<Search className="w-8 h-8 text-muted-foreground" />}
      title="No matches found"
      description="Try adjusting your filters or check back later for new profiles."
      action={{
        label: 'Adjust Filters',
        onClick: () => window.location.href = '/settings/discovery',
      }}
    />
  );
}

export function NoMessages() {
  return (
    <EmptyState
      icon={<MessageCircle className="w-8 h-8 text-muted-foreground" />}
      title="No messages yet"
      description="When you match with someone, you can start a conversation here."
      action={{
        label: 'Find Matches',
        onClick: () => window.location.href = '/discover',
      }}
    />
  );
}

export function NoMatches() {
  return (
    <EmptyState
      icon={<Heart className="w-8 h-8 text-muted-foreground" />}
      title="No matches yet"
      description="Keep swiping! When you and someone else both like each other, you'll see them here."
      action={{
        label: 'Start Swiping',
        onClick: () => window.location.href = '/discover',
      }}
    />
  );
}

export function NoLikes() {
  return (
    <EmptyState
      icon={<Users className="w-8 h-8 text-muted-foreground" />}
      title="No likes yet"
      description="People who like you will appear here. Make sure your profile is complete!"
      action={{
        label: 'Edit Profile',
        onClick: () => window.location.href = '/profile/edit',
      }}
    />
  );
}

export function NoPhotos() {
  return (
    <EmptyState
      icon={<Image className="w-8 h-8 text-muted-foreground" />}
      title="No photos yet"
      description="Add photos to show off your personality and get more matches."
    />
  );
}

// ============================================================
// Error States
// ============================================================

interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({
  title = 'Something went wrong',
  description = 'We encountered an error while loading. Please try again.',
  onRetry,
  className = '',
}: ErrorStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center text-center p-8 ${className}`}>
      <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
        <AlertCircle className="w-8 h-8 text-destructive" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-sm mb-4">{description}</p>
      {onRetry && (
        <Button onClick={onRetry} variant="outline">
          <RefreshCw className="w-4 h-4 mr-2" />
          Try Again
        </Button>
      )}
    </div>
  );
}

export function NetworkError({ onRetry }: { onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center text-center p-8">
      <div className="w-16 h-16 rounded-full bg-warning/10 flex items-center justify-center mb-4">
        <WifiOff className="w-8 h-8 text-warning" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-1">No internet connection</h3>
      <p className="text-sm text-muted-foreground max-w-sm mb-4">
        Please check your connection and try again.
      </p>
      {onRetry && (
        <Button onClick={onRetry} variant="outline">
          <RefreshCw className="w-4 h-4 mr-2" />
          Retry
        </Button>
      )}
    </div>
  );
}

export function MaintenanceMode() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center p-8">
      <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
        <Settings className="w-10 h-10 text-primary animate-spin-slow" />
      </div>
      <h1 className="text-2xl font-bold text-foreground mb-2">Under Maintenance</h1>
      <p className="text-muted-foreground max-w-md mb-6">
        We're making some improvements to give you a better experience.
        Please check back soon!
      </p>
      <p className="text-sm text-muted-foreground">
        Follow us on social media for updates.
      </p>
    </div>
  );
}

// ============================================================
// 404 Not Found
// ============================================================

export function NotFoundState() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center p-8">
      <div className="text-8xl font-bold text-muted-foreground/20 mb-4">404</div>
      <h1 className="text-2xl font-bold text-foreground mb-2">Page not found</h1>
      <p className="text-muted-foreground max-w-md mb-6">
        The page you're looking for doesn't exist or has been moved.
      </p>
      <Button onClick={() => window.location.href = '/'}>
        Go to Homepage
      </Button>
    </div>
  );
}
