'use client';

import { useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import {
  notificationService,
  resolveNotificationRoute,
  userService,
  useAuthStore,
} from '@crush/core';
import { toast } from 'sonner';

const WEB_PUSH_PROMPT_KEY = 'crush:web-push-prompted';
const WEB_PUSH_PROMPT_ID = 'enable-web-push';

interface NotificationInitializerProps {
  children: ReactNode;
}

export function NotificationInitializer({ children }: NotificationInitializerProps) {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);

  useEffect(() => {
    if (!user) return;

    let cancelled = false;
    void (async () => {
      try {
        await notificationService.syncTokenIfGranted(user.uid);
        if (
          cancelled ||
          notificationService.getPermission() !== 'default' ||
          sessionStorage.getItem(WEB_PUSH_PROMPT_KEY) === '1' ||
          !(await notificationService.isSupported())
        ) {
          return;
        }

        sessionStorage.setItem(WEB_PUSH_PROMPT_KEY, '1');
        toast('Never miss a message or match', {
          id: WEB_PUSH_PROMPT_ID,
          description: 'Enable device notifications so Crush can alert you when someone replies.',
          duration: 20_000,
          action: {
            label: 'Enable',
            onClick: () => {
              void (async () => {
                try {
                  const token = await notificationService.requestPermissionAndRegister(user.uid);
                  if (!token) {
                    toast.error('Notifications were not enabled. Check your browser settings.');
                    return;
                  }
                  await userService.updateNotificationSettings(user.uid, { push: true });
                  toast.success('Device notifications enabled.');
                } catch (error) {
                  toast.error(
                    error instanceof Error
                      ? error.message
                      : 'Device notifications could not be enabled.'
                  );
                }
              })();
            },
          },
        });
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.warn('Web push token sync failed:', error);
        }
      }
    })();

    return () => {
      cancelled = true;
      toast.dismiss(WEB_PUSH_PROMPT_ID);
    };
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
