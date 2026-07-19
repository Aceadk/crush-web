import { deleteToken, getMessaging, getToken, isSupported, onMessage } from 'firebase/messaging';
import type { MessagePayload } from 'firebase/messaging';
import { deleteDoc, doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { firebaseConfig, getFirebaseApp, getFirebaseDb } from '../firebase/config';

const TOKEN_COLLECTION = 'fcmTokens';
const USERS_COLLECTION = 'users';
const SERVICE_WORKER_PATH = '/firebase-messaging-sw.js';

// Channel toggles (push/email) + the canonical content categories. The category
// keys MUST match the backend NotificationCategory union (functions/src/index.ts)
// so a user's preference actually gates delivery. See
// my_first_project/docs/contracts/notification_preferences_schema_2026-06-07.md.
export interface WebNotificationPrefs {
  // Channels
  push: boolean;
  email: boolean;
  // Delivery style — mirror the mobile app's Sound/Vibration toggles. The
  // backend reads notificationPrefs.sound/.vibration to pick the Android
  // channel and set the push sound per recipient across all their devices.
  sound: boolean;
  vibration: boolean;
  // Categories (mirror backend NotificationCategory)
  matches: boolean;
  messages: boolean;
  likes: boolean;
  calls: boolean;
  profileViews: boolean;
  promotions: boolean;
  subscriptions: boolean;
  safetyAlerts: boolean;
}

export const WEB_NOTIFICATION_PREF_DEFAULTS: WebNotificationPrefs = {
  push: true,
  email: true,
  sound: true,
  vibration: true,
  matches: true,
  messages: true,
  likes: true,
  calls: true,
  profileViews: true,
  promotions: true,
  subscriptions: true,
  // safetyAlerts are not user-disableable on the backend; default on.
  safetyAlerts: true,
};

function buildServiceWorkerUrl(): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(firebaseConfig)) {
    if (typeof value === 'string' && value.length > 0) {
      params.set(key, value);
    }
  }
  return `${SERVICE_WORKER_PATH}?${params.toString()}`;
}

export function buildWebPushTokenOptions(
  registration: ServiceWorkerRegistration,
  vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY?.trim()
): {
  serviceWorkerRegistration: ServiceWorkerRegistration;
  vapidKey?: string;
} {
  return {
    serviceWorkerRegistration: registration,
    ...(vapidKey ? { vapidKey } : {}),
  };
}

function notificationSupportedByBrowser(): boolean {
  return (
    typeof window !== 'undefined' &&
    'Notification' in window &&
    'serviceWorker' in navigator &&
    typeof window.isSecureContext === 'boolean' &&
    window.isSecureContext
  );
}

async function getServiceWorkerRegistration(): Promise<ServiceWorkerRegistration> {
  const existing = await navigator.serviceWorker.getRegistration(SERVICE_WORKER_PATH);
  if (existing?.active || existing?.installing || existing?.waiting) {
    return existing;
  }
  return navigator.serviceWorker.register(buildServiceWorkerUrl(), { scope: '/' });
}

function normalizePayloadData(data?: Record<string, string>): Record<string, string> {
  return data ?? {};
}

function allowRoute(rawRoute?: string): string | null {
  if (!rawRoute) return null;
  const trimmed = rawRoute.trim();
  if (!trimmed) return null;

  let path = trimmed;
  try {
    const parsed = new URL(trimmed);
    // crush.app is canonical; crushhour.app/www are accepted LEGACY-REDIRECT
    // hosts (mobile/backend still emit crushhour.app deep links until the infra
    // migration completes — see domain_deployment_decision_2026-06-07.md).
    const allowedHosts = new Set([
      'crush.app',
      'www.crush.app',
      'crushhour.app',
      'www.crushhour.app',
    ]);
    if (!allowedHosts.has(parsed.hostname)) return null;
    path = `${parsed.pathname}${parsed.search}`;
  } catch {
    if (!trimmed.startsWith('/')) return null;
  }

  // Map mobile/backend route names to their canonical web equivalents.
  // Every targetRoute emitted by functions/src/index.ts (+ calls signaling) is
  // covered here so notification taps land on a real web page. See
  // my_first_project/docs/reports/route_deeplink_matrix_2026-06-05.md.
  const [pathname, search = ''] = path.split('?');
  const mappedPath = pathname
    .replace(/^\/chat\//, '/messages/')
    .replace(/^\/likes-you$/, '/likes')
    .replace(/^\/weekly-picks$/, '/weekly-picks')
    .replace(/^\/call-history$/, '/messages')
    // Web has no calling UI yet; route call notifications to messages.
    .replace(/^\/incoming-call$/, '/messages')
    // Backend sends /notifications (e.g. match_ended); web has no inbox.
    .replace(/^\/notifications$/, '/messages')
    .replace(/^\/safety$/, '/date-safety')
    .replace(/^\/settings\/account-actions$/, '/settings/account')
    // Subscription management lives under /settings/account on web.
    .replace(/^\/settings\/subscription$/, '/settings/account');

  const allowed =
    [
      '/discover',
      '/messages',
      '/messages/requests',
      '/likes',
      '/weekly-picks',
      '/premium',
      '/date-safety',
      '/settings',
      '/settings/notifications',
      '/settings/account',
      '/settings/privacy',
      '/settings/blocked',
      '/settings/discovery',
      '/settings/incognito',
    ].includes(mappedPath) ||
    mappedPath.startsWith('/messages/') ||
    mappedPath.startsWith('/profile/');

  if (!allowed) return null;
  return search ? `${mappedPath}?${search}` : mappedPath;
}

export function resolveNotificationRoute(data?: Record<string, string>): string {
  const payload = normalizePayloadData(data);
  const explicit =
    allowRoute(payload.targetRoute) || allowRoute(payload.route) || allowRoute(payload.deepLink);
  if (explicit) return explicit;

  const type = (payload.type || payload.notificationType || '').toLowerCase();
  const targetId = payload.targetId || payload.matchId || payload.conversationId;

  // Type values mirror the backend notification `data.type` fields emitted by
  // functions/src/index.ts (message, match, match_ended, like, subscription,
  // data_export_ready) plus calls/safety variants.
  switch (type) {
    case 'message':
    case 'match':
      return targetId ? `/messages/${encodeURIComponent(targetId)}` : '/messages';
    case 'match_ended':
      // Unmatch — the conversation is gone; land on the messages list.
      return '/messages';
    case 'message_request':
      return '/messages/requests';
    case 'like':
    case 'super_like':
      return '/likes';
    case 'weekly_picks':
      return '/weekly-picks';
    case 'subscription':
      return '/settings/account';
    case 'data_export_ready':
      return '/settings/account';
    case 'call':
    case 'incoming_call':
    case 'call_missed':
      // No web calling UI yet; route to messages.
      return '/messages';
    case 'call_safety_alert':
    case 'safety_alert':
      return '/date-safety';
    default:
      return '/messages';
  }
}

class NotificationService {
  async isSupported(): Promise<boolean> {
    return notificationSupportedByBrowser() && (await isSupported());
  }

  getPermission(): NotificationPermission | 'unsupported' {
    if (!notificationSupportedByBrowser()) return 'unsupported';
    return Notification.permission;
  }

  async requestPermissionAndRegister(userId: string): Promise<string | null> {
    if (!(await this.isSupported())) return null;
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return null;
    return this.registerToken(userId);
  }

  async syncTokenIfGranted(userId: string): Promise<string | null> {
    if (!(await this.isSupported())) return null;
    if (Notification.permission !== 'granted') return null;
    return this.registerToken(userId);
  }

  async registerToken(userId: string): Promise<string | null> {
    const registration = await getServiceWorkerRegistration();
    const messaging = getMessaging(getFirebaseApp());
    const token = await getToken(messaging, buildWebPushTokenOptions(registration));
    if (!token) return null;

    const db = getFirebaseDb();
    await setDoc(
      doc(db, USERS_COLLECTION, userId, TOKEN_COLLECTION, token),
      {
        platform: 'web',
        browser: navigator.userAgent,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    return token;
  }

  async deleteCurrentTokenForUser(userId: string): Promise<void> {
    if (!(await this.isSupported())) return;
    const registration = await getServiceWorkerRegistration();
    const messaging = getMessaging(getFirebaseApp());
    let token: string | null = null;
    try {
      token = await getToken(messaging, buildWebPushTokenOptions(registration));
    } catch {
      token = null;
    }
    if (token) {
      await deleteDoc(doc(getFirebaseDb(), USERS_COLLECTION, userId, TOKEN_COLLECTION, token));
    }
    await deleteToken(messaging);
  }

  async onForegroundMessage(listener: (payload: MessagePayload) => void): Promise<() => void> {
    if (!(await this.isSupported())) return () => {};
    const messaging = getMessaging(getFirebaseApp());
    return onMessage(messaging, listener);
  }
}

export const notificationService = new NotificationService();
