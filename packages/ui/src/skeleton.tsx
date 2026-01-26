'use client';

import { cn } from './utils';

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('animate-pulse rounded-xl bg-muted', className)}
      {...props}
    />
  );
}

function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn('space-y-4', className)}>
      <Skeleton className="h-48 w-full" />
      <div className="space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
      </div>
    </div>
  );
}

function SkeletonProfile({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center space-x-4', className)}>
      <Skeleton className="h-12 w-12 rounded-full" />
      <div className="space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-24" />
      </div>
    </div>
  );
}

function SkeletonSwipeCard({ className }: { className?: string }) {
  return (
    <div className={cn('relative w-full aspect-[3/4] rounded-3xl overflow-hidden', className)}>
      <Skeleton className="h-full w-full" />
      <div className="absolute bottom-0 left-0 right-0 p-6 space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-4 w-64" />
      </div>
    </div>
  );
}

function SkeletonChat({ className }: { className?: string }) {
  return (
    <div className={cn('space-y-4', className)}>
      {[...Array(5)].map((_, i) => (
        <div
          key={i}
          className={cn('flex', i % 2 === 0 ? 'justify-start' : 'justify-end')}
        >
          <Skeleton
            className={cn(
              'h-12 rounded-2xl',
              i % 2 === 0 ? 'w-48' : 'w-36'
            )}
          />
        </div>
      ))}
    </div>
  );
}

export { Skeleton, SkeletonCard, SkeletonProfile, SkeletonSwipeCard, SkeletonChat };
