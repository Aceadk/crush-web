'use client';

import { useEffect, useRef, useState } from 'react';

interface NetworkStatus {
  isOnline: boolean;
  reconnectCount: number;
  lastChangedAt: number | null;
}

function getInitialOnlineStatus(): boolean {
  if (typeof navigator === 'undefined') {
    return true;
  }
  return navigator.onLine;
}

export function useNetworkStatus(): NetworkStatus {
  const [isOnline, setIsOnline] = useState<boolean>(getInitialOnlineStatus);
  const [reconnectCount, setReconnectCount] = useState(0);
  const [lastChangedAt, setLastChangedAt] = useState<number | null>(null);
  const hasSeenOfflineRef = useRef(!getInitialOnlineStatus());

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setLastChangedAt(Date.now());
      if (hasSeenOfflineRef.current) {
        setReconnectCount((prev) => prev + 1);
      }
    };

    const handleOffline = () => {
      hasSeenOfflineRef.current = true;
      setIsOnline(false);
      setLastChangedAt(Date.now());
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return {
    isOnline,
    reconnectCount,
    lastChangedAt,
  };
}
