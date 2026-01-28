'use client';

import Image, { ImageProps } from 'next/image';
import { useState } from 'react';
import { cn } from '@crush/ui';

interface OptimizedImageProps extends Omit<ImageProps, 'onLoad'> {
  fallback?: string;
  aspectRatio?: 'square' | 'portrait' | 'landscape' | 'video';
  showSkeleton?: boolean;
}

const aspectRatioClasses = {
  square: 'aspect-square',
  portrait: 'aspect-[3/4]',
  landscape: 'aspect-[4/3]',
  video: 'aspect-video',
};

export function OptimizedImage({
  src,
  alt,
  fallback = '/images/placeholder.png',
  aspectRatio,
  showSkeleton = true,
  className,
  ...props
}: OptimizedImageProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  const imageSrc = error ? fallback : src;

  return (
    <div
      className={cn(
        'relative overflow-hidden bg-muted',
        aspectRatio && aspectRatioClasses[aspectRatio],
        className
      )}
    >
      {/* Skeleton loader */}
      {showSkeleton && isLoading && (
        <div className="absolute inset-0 animate-pulse bg-muted" />
      )}

      <Image
        src={imageSrc}
        alt={alt}
        className={cn(
          'object-cover transition-opacity duration-300',
          isLoading ? 'opacity-0' : 'opacity-100'
        )}
        onLoad={() => setIsLoading(false)}
        onError={() => {
          setError(true);
          setIsLoading(false);
        }}
        {...props}
      />
    </div>
  );
}

// Avatar-specific optimized image
interface AvatarImageProps {
  src?: string | null;
  alt: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const avatarSizes = {
  sm: 'w-8 h-8',
  md: 'w-12 h-12',
  lg: 'w-16 h-16',
  xl: 'w-24 h-24',
};

const avatarPixelSizes = {
  sm: 32,
  md: 48,
  lg: 64,
  xl: 96,
};

export function AvatarImage({ src, alt, size = 'md', className }: AvatarImageProps) {
  const [error, setError] = useState(false);

  if (!src || error) {
    return (
      <div
        className={cn(
          'rounded-full bg-muted flex items-center justify-center',
          avatarSizes[size],
          className
        )}
      >
        <span className="text-muted-foreground font-medium">
          {alt.charAt(0).toUpperCase()}
        </span>
      </div>
    );
  }

  return (
    <div className={cn('relative rounded-full overflow-hidden', avatarSizes[size], className)}>
      <Image
        src={src}
        alt={alt}
        width={avatarPixelSizes[size]}
        height={avatarPixelSizes[size]}
        className="object-cover"
        onError={() => setError(true)}
      />
    </div>
  );
}

// Profile photo carousel optimized for performance
interface ProfilePhotoProps {
  photos: string[];
  currentIndex: number;
  alt: string;
  priority?: boolean;
}

export function ProfilePhoto({ photos, currentIndex, alt, priority = false }: ProfilePhotoProps) {
  const [loadedImages, setLoadedImages] = useState<Set<number>>(new Set([0]));

  // Preload adjacent images
  const preloadIndexes = [
    currentIndex - 1,
    currentIndex,
    currentIndex + 1,
  ].filter((i) => i >= 0 && i < photos.length);

  return (
    <div className="relative w-full aspect-[3/4] bg-muted">
      {photos.map((photo, index) => (
        <div
          key={photo}
          className={cn(
            'absolute inset-0 transition-opacity duration-300',
            index === currentIndex ? 'opacity-100 z-10' : 'opacity-0 z-0'
          )}
        >
          {(loadedImages.has(index) || preloadIndexes.includes(index)) && (
            <Image
              src={photo}
              alt={`${alt} - Photo ${index + 1}`}
              fill
              className="object-cover"
              priority={priority && index === 0}
              sizes="(max-width: 768px) 100vw, 50vw"
              onLoad={() => {
                setLoadedImages((prev) => new Set([...prev, index]));
              }}
            />
          )}
        </div>
      ))}

      {/* Loading skeleton for current image */}
      {!loadedImages.has(currentIndex) && (
        <div className="absolute inset-0 animate-pulse bg-muted" />
      )}
    </div>
  );
}
