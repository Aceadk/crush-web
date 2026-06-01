'use client';

import { useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { notificationService, resolveNotificationRoute, useAuthStore } from '@crush/core';
import { toast } from 'sonner';

interface NotificationInitializerProps {
  children: ReactNode;
}

export function NotificationInitializer({ children }: NotificationInitializerProps) {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);

  useEffect(() => {
    if (!user) return;
    void notificationService.syncTokenIfGranted(user.uid).catch((error) => {
      if (process.env.NODE_ENV === 'development') {
        console.warn('Web push token sync failed:', error);
      }
    });
  }, [user]);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    let cancelled = false;

    void notificationService
      .onForegroundMessage((payload) => {
        const title = payload.notification?.title || 'Crush';
        const description = payload.notification?.body || 'You have a new notification.';
        const route = resolveNotificationRoute(payload.data);

        toast(title, {
          description,
          action: {
            label: 'Open',
            onClick: () => router.push(route),
          },
        });
      })
      .then((cleanup) => {
        if (cancelled) {
          cleanup();
        } else {
          unsubscribe = cleanup;
        }
      });

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [router]);

  return <>{children}</>;
}
