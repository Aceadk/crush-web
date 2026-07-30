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

      {/* Capture trace, burned over the media itself.

          Rendered continuously and DELIBERATELY imperceptible. That is not a
          compromise — it is the only thing that can work: the web exposes no
          screenshot event (nothing fires for macOS Cmd+Shift+4, Snipping Tool,
          extensions, or a phone camera), so a watermark can only land in a
          capture if it is already painted. The lever is therefore visibility,
          not timing.

          This replaced 80 absolutely-positioned <span>s per image (50 + 30),
          which cost real layout work on the swipe deck — two cards plus chat
          media meant hundreds of nodes — and whose stacked opacities visibly
          hazed light photos. One repeating background paints identically for a
          fraction of the cost. */}
      {(showWatermark || watermarkUsername) && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-20 select-none"
          data-testid="protected-image-watermark"
          style={{
            backgroundImage: `url("${captureTraceDataUrl(fullWatermarkText)}")`,
            backgroundRepeat: 'repeat',
            backgroundSize: '300px 120px',
            opacity: 0.05,
          }}
        />
      )}
    </div>
  );
}

/**
 * Repeating diagonal trace tile. Text is XML-escaped because it carries a
 * user-supplied display name straight into SVG markup.
 */
function captureTraceDataUrl(label: string): string {
  const safeLabel = label
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

  const svg = [
    '<svg xmlns="http://www.w3.org/2000/svg" width="300" height="120" viewBox="0 0 300 120">',
    '<g transform="rotate(-30 150 60)">',
    '<text x="20" y="66" font-family="system-ui,-apple-system,sans-serif"',
    ' font-size="13" font-weight="700" letter-spacing="2" fill="#FFFFFF">',
    safeLabel,
    '</text>',
    '</g>',
    '</svg>',
  ].join('');

  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}
