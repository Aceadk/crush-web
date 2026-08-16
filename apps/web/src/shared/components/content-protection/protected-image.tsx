'use client';

import { cn } from '@crush/ui';
import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';

interface ProtectedImageProps {
  src: string;
  alt: string;
  className?: string;
  /** Callback when a browser-exposed screenshot shortcut is detected. */
  onScreenshotAttempt?: () => void;
}

/**
 * Image wrapper that discourages direct saving without painting a viewer
 * identity or capture-trace overlay over the media.
 */
export function ProtectedImage({
  src,
  alt,
  className,
  onScreenshotAttempt,
}: ProtectedImageProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLongPress, setIsLongPress] = useState(false);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);

  const handleContextMenu = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    return false;
  };

  const handleDragStart = (event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    return false;
  };

  const handleTouchStart = () => {
    longPressTimer.current = setTimeout(() => {
      setIsLongPress(true);
    }, 500);
  };

  const handleTouchEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    setIsLongPress(false);
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 's') {
        event.preventDefault();
      }
      if (event.key === 'PrintScreen') {
        onScreenshotAttempt?.();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onScreenshotAttempt]);

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative select-none overflow-hidden',
        isLongPress && 'pointer-events-none',
        className
      )}
      onContextMenu={handleContextMenu}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
    >
      <Image
        src={src}
        alt={alt}
        fill
        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        className="pointer-events-none object-cover"
        draggable={false}
        onDragStart={handleDragStart}
        onContextMenu={handleContextMenu}
        style={{
          WebkitUserSelect: 'none',
          WebkitTouchCallout: 'none',
          userSelect: 'none',
        }}
      />

      <div
        className="absolute inset-0 z-10"
        onContextMenu={handleContextMenu}
        onDragStart={handleDragStart}
        style={{
          WebkitUserSelect: 'none',
          WebkitTouchCallout: 'none',
          userSelect: 'none',
        }}
      />
    </div>
  );
}
