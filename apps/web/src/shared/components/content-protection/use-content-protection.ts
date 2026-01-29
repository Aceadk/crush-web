'use client';

import { useState, useEffect, useCallback } from 'react';

interface ContentProtectionOptions {
  blurOnTabSwitch?: boolean;
  detectScreenshot?: boolean;
  onScreenshotAttempt?: () => void;
  onVisibilityChange?: (isVisible: boolean) => void;
}

interface ContentProtectionState {
  isBlurred: boolean;
  screenshotAttempted: boolean;
  isVisible: boolean;
}

/**
 * useContentProtection - Hook for protecting sensitive content
 *
 * Features:
 * - Blurs content when user switches tabs
 * - Detects potential screenshot attempts (keyboard shortcuts)
 * - Tracks page visibility
 */
export function useContentProtection(options: ContentProtectionOptions = {}) {
  const {
    blurOnTabSwitch = true,
    detectScreenshot = true,
    onScreenshotAttempt,
    onVisibilityChange,
  } = options;

  const [state, setState] = useState<ContentProtectionState>({
    isBlurred: false,
    screenshotAttempted: false,
    isVisible: true,
  });

  // Handle visibility change (tab switch)
  useEffect(() => {
    if (!blurOnTabSwitch) return;

    const handleVisibilityChange = () => {
      const isVisible = document.visibilityState === 'visible';

      setState((prev) => ({
        ...prev,
        isBlurred: !isVisible,
        isVisible,
      }));

      onVisibilityChange?.(isVisible);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Also handle window blur/focus for additional coverage
    const handleWindowBlur = () => {
      setState((prev) => ({ ...prev, isBlurred: true, isVisible: false }));
      onVisibilityChange?.(false);
    };

    const handleWindowFocus = () => {
      setState((prev) => ({ ...prev, isBlurred: false, isVisible: true }));
      onVisibilityChange?.(true);
    };

    window.addEventListener('blur', handleWindowBlur);
    window.addEventListener('focus', handleWindowFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      window.removeEventListener('focus', handleWindowFocus);
    };
  }, [blurOnTabSwitch, onVisibilityChange]);

  // Detect screenshot attempts via keyboard
  useEffect(() => {
    if (!detectScreenshot) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Detect common screenshot shortcuts
      const isScreenshotKey =
        e.key === 'PrintScreen' ||
        // Mac screenshot: Cmd+Shift+3 or Cmd+Shift+4
        (e.metaKey && e.shiftKey && (e.key === '3' || e.key === '4')) ||
        // Windows Snipping Tool: Win+Shift+S
        (e.metaKey && e.shiftKey && e.key === 's');

      if (isScreenshotKey) {
        setState((prev) => ({ ...prev, screenshotAttempted: true }));
        onScreenshotAttempt?.();

        // Reset after a delay
        setTimeout(() => {
          setState((prev) => ({ ...prev, screenshotAttempted: false }));
        }, 3000);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [detectScreenshot, onScreenshotAttempt]);

  const resetScreenshotFlag = useCallback(() => {
    setState((prev) => ({ ...prev, screenshotAttempted: false }));
  }, []);

  return {
    ...state,
    resetScreenshotFlag,
  };
}
