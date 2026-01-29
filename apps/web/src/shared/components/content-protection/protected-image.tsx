'use client';

import { useState, useRef, useEffect } from 'react';
import { cn } from '@crush/ui';

interface ProtectedImageProps {
  src: string;
  alt: string;
  className?: string;
  watermarkText?: string;
  showWatermark?: boolean;
  onScreenshotAttempt?: () => void;
}

/**
 * ProtectedImage - A component that adds protection layers to images
 *
 * Features:
 * - Disables right-click context menu
 * - Prevents image dragging
 * - Prevents long-press on mobile
 * - Adds invisible watermark overlay
 * - Prevents saving via keyboard shortcuts
 */
export function ProtectedImage({
  src,
  alt,
  className,
  watermarkText,
  showWatermark = false,
  onScreenshotAttempt,
}: ProtectedImageProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLongPress, setIsLongPress] = useState(false);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);

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
      <img
        src={src}
        alt={alt}
        className="w-full h-full object-cover pointer-events-none"
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

      {/* Watermark overlay */}
      {(showWatermark || watermarkText) && (
        <div
          className="absolute inset-0 z-20 pointer-events-none flex items-center justify-center"
          style={{
            background: showWatermark
              ? 'repeating-linear-gradient(45deg, transparent, transparent 100px, rgba(255,255,255,0.03) 100px, rgba(255,255,255,0.03) 200px)'
              : 'none',
          }}
        >
          {watermarkText && (
            <span
              className="text-white/10 text-2xl font-bold transform rotate-[-30deg] select-none"
              style={{
                textShadow: '0 0 1px rgba(255,255,255,0.1)',
              }}
            >
              {watermarkText}
            </span>
          )}
        </div>
      )}

      {/* Canvas-based invisible watermark for tracing */}
      <canvas
        className="absolute inset-0 z-5 pointer-events-none opacity-0"
        data-watermark={watermarkText}
      />
    </div>
  );
}
