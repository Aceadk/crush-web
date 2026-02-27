'use client';

import { cn } from '@crush/ui';
import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';

interface ProtectedImageProps {
  src: string;
  alt: string;
  className?: string;
  /** Username to display in watermark - appears more visible in screenshots */
  watermarkUsername?: string;
  /** Additional watermark text */
  watermarkText?: string;
  /** Enable watermark overlay */
  showWatermark?: boolean;
  /** Callback when screenshot attempt is detected */
  onScreenshotAttempt?: () => void;
}

/**
 * ProtectedImage - A component that adds protection layers to images
 *
 * Features:
 * - Disables right-click context menu
 * - Prevents image dragging
 * - Prevents long-press on mobile
 * - Adds username watermark that becomes visible in screenshots
 * - Prevents saving via keyboard shortcuts
 *
 * The watermark uses a technique where very low opacity text
 * becomes more visible after screenshot due to compression artifacts
 */
export function ProtectedImage({
  src,
  alt,
  className,
  watermarkUsername,
  watermarkText,
  showWatermark = false,
  onScreenshotAttempt,
}: ProtectedImageProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLongPress, setIsLongPress] = useState(false);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);

  // Generate watermark text with username
  const fullWatermarkText = watermarkUsername
    ? `CRUSH • ${watermarkUsername}`
    : watermarkText || 'CRUSH';

  // Prevent context menu (right-click)
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    return false;
  };

  // Prevent drag start
  const handleDragStart = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    return false;
  };

  // Prevent long press on mobile (shows save dialog)
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

  // Prevent keyboard shortcuts for saving
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent Ctrl+S, Ctrl+Shift+S, Cmd+S
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
      }
      // Detect Print Screen (limited support)
      if (e.key === 'PrintScreen') {
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
      {/* Actual image */}
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

      {/* Invisible overlay to block interactions */}
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

      {/* Username watermark pattern - becomes visible in screenshots */}
      {(showWatermark || watermarkUsername) && (
        <div
          className="pointer-events-none absolute inset-0 z-20 overflow-hidden"
          style={{
            // Very subtle during normal viewing, more visible in screenshots
            opacity: 0.04,
          }}
        >
          {/* Repeating diagonal watermark pattern */}
          <div
            className="absolute -left-1/2 -top-1/2 h-[200%] w-[200%]"
            style={{
              transform: 'rotate(-30deg)',
              display: 'flex',
              flexWrap: 'wrap',
              gap: '40px',
              padding: '20px',
            }}
          >
            {/* Generate multiple watermark instances for full coverage */}
            {Array.from({ length: 50 }).map((_, i) => (
              <span
                key={i}
                className="select-none whitespace-nowrap font-bold text-white"
                style={{
                  fontSize: '14px',
                  letterSpacing: '2px',
                  textShadow: '0 0 2px rgba(0,0,0,0.5)',
                  // Slightly different opacity for each to create depth
                  opacity: 0.8 + (i % 3) * 0.1,
                }}
              >
                {fullWatermarkText}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Secondary watermark layer - inverse colors for visibility on any background */}
      {(showWatermark || watermarkUsername) && (
        <div
          className="z-21 pointer-events-none absolute inset-0 overflow-hidden"
          style={{
            opacity: 0.03,
            mixBlendMode: 'difference',
          }}
        >
          <div
            className="absolute -left-1/4 -top-1/4 h-[200%] w-[200%]"
            style={{
              transform: 'rotate(-45deg)',
              display: 'flex',
              flexWrap: 'wrap',
              gap: '60px',
              padding: '30px',
            }}
          >
            {Array.from({ length: 30 }).map((_, i) => (
              <span
                key={i}
                className="select-none whitespace-nowrap font-bold text-white"
                style={{
                  fontSize: '12px',
                  letterSpacing: '3px',
                }}
              >
                {fullWatermarkText}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Timestamp watermark for tracing */}
      {watermarkUsername && (
        <div
          className="z-22 pointer-events-none absolute bottom-2 right-2"
          style={{
            opacity: 0.02,
            fontSize: '8px',
            color: 'white',
            textShadow: '0 0 1px rgba(0,0,0,0.3)',
          }}
        >
          {watermarkUsername} • {new Date().toISOString().split('T')[0]}
        </div>
      )}
    </div>
  );
}
