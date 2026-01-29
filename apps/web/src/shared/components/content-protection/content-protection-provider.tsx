'use client';

import { ReactNode, useEffect } from 'react';
import { cn } from '@crush/ui';
import { useContentProtection } from './use-content-protection';
import { ShieldAlert } from 'lucide-react';

interface ContentProtectionProviderProps {
  children: ReactNode;
  className?: string;
  enabled?: boolean;
  showWarningOnScreenshot?: boolean;
  blurIntensity?: 'light' | 'medium' | 'heavy';
  onScreenshotAttempt?: () => void;
}

/**
 * ContentProtectionProvider - Wraps content with protection features
 *
 * Features:
 * - Blurs content when user switches tabs
 * - Shows overlay when screenshot is attempted
 * - Disables text selection
 * - Prevents printing
 */
export function ContentProtectionProvider({
  children,
  className,
  enabled = true,
  showWarningOnScreenshot = true,
  blurIntensity = 'heavy',
  onScreenshotAttempt,
}: ContentProtectionProviderProps) {
  const { isBlurred, screenshotAttempted } = useContentProtection({
    blurOnTabSwitch: enabled,
    detectScreenshot: enabled,
    onScreenshotAttempt,
  });

  // Disable printing
  useEffect(() => {
    if (!enabled) return;

    const handleBeforePrint = () => {
      document.body.style.visibility = 'hidden';
    };

    const handleAfterPrint = () => {
      document.body.style.visibility = 'visible';
    };

    window.addEventListener('beforeprint', handleBeforePrint);
    window.addEventListener('afterprint', handleAfterPrint);

    return () => {
      window.removeEventListener('beforeprint', handleBeforePrint);
      window.removeEventListener('afterprint', handleAfterPrint);
    };
  }, [enabled]);

  // Add print-blocking CSS
  useEffect(() => {
    if (!enabled) return;

    const style = document.createElement('style');
    style.id = 'content-protection-print';
    style.innerHTML = `
      @media print {
        body * {
          visibility: hidden !important;
        }
        body::after {
          content: "Content protected - printing disabled";
          visibility: visible !important;
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          font-size: 24px;
          color: #666;
        }
      }
    `;
    document.head.appendChild(style);

    return () => {
      const existingStyle = document.getElementById('content-protection-print');
      if (existingStyle) {
        existingStyle.remove();
      }
    };
  }, [enabled]);

  const blurValues = {
    light: 'blur(4px)',
    medium: 'blur(12px)',
    heavy: 'blur(20px)',
  };

  if (!enabled) {
    return <>{children}</>;
  }

  return (
    <div
      className={cn(
        'relative transition-all duration-300',
        className
      )}
      style={{
        WebkitUserSelect: 'none',
        userSelect: 'none',
      }}
    >
      {/* Content with blur effect */}
      <div
        className="transition-all duration-300"
        style={{
          filter: isBlurred ? blurValues[blurIntensity] : 'none',
        }}
      >
        {children}
      </div>

      {/* Blur overlay when tab is switched */}
      {isBlurred && (
        <div className="absolute inset-0 z-50 bg-background/80 backdrop-blur-xl flex items-center justify-center">
          <div className="text-center p-6">
            <ShieldAlert className="w-16 h-16 text-primary mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-foreground mb-2">
              Content Protected
            </h3>
            <p className="text-muted-foreground">
              Return to this tab to view content
            </p>
          </div>
        </div>
      )}

      {/* Screenshot warning overlay */}
      {showWarningOnScreenshot && screenshotAttempted && (
        <div className="absolute inset-0 z-50 bg-red-500/90 flex items-center justify-center animate-pulse">
          <div className="text-center p-6 text-white">
            <ShieldAlert className="w-16 h-16 mx-auto mb-4" />
            <h3 className="text-xl font-bold mb-2">Screenshot Detected!</h3>
            <p className="text-white/80">
              Screenshots of private content are not allowed.
              <br />
              This action may be reported.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
