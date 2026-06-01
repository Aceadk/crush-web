import { deleteToken, getMessaging, getToken, isSupported, onMessage } from 'firebase/messaging';
import type { MessagePayload } from 'firebase/messaging';
import { deleteDoc, doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { firebaseConfig, getFirebaseApp, getFirebaseDb } from '../firebase/config';

const TOKEN_COLLECTION = 'fcmTokens';
const USERS_COLLECTION = 'users';
const SERVICE_WORKER_PATH = '/firebase-messaging-sw.js';

export interface WebNotificationPrefs {
  push: boolean;
  email: boolean;
  matches: boolean;
  messages: boolean;
  likes: boolean;
  profileViews: boolean;
  promotions: boolean;
  subscriptions: boolean;
  safetyAlerts: boolean;
}

export const WEB_NOTIFICATION_PREF_DEFAULTS: WebNotificationPrefs = {
  push: true,
  email: true,
  matches: true,
  messages: true,
  likes: true,
  profileViews: true,
  promotions: true,
  subscriptions: true,
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

function getVapidKey(): string {
  const key = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY?.trim();
  if (!key) {
    throw new Error('Missing NEXT_PUBLIC_FIREBASE_VAPID_KEY');
  }
  return key;
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
    const allowedHosts = new Set(['crushhour.app', 'www.crushhour.app', 'crush.app']);
    if (!allowedHosts.has(parsed.hostname)) return null;
    path = `${parsed.pathname}${parsed.search}`;
  } catch {
    if (!trimmed.startsWith('/')) return null;
  }

  const [pathname, search = ''] = path.split('?');
  const mappedPath = pathname
    .replace(/^\/chat\//, '/messages/')
    .replace(/^\/likes-you$/, '/likes')
    .replace(/^\/weekly-picks$/, '/weekly-picks')
    .replace(/^\/call-history$/, '/messages')
    .replace(/^\/safety$/, '/date-safety')
    .replace(/^\/settings\/account-actions$/, '/settings/account');

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

  switch (type) {
    case 'message':
    case 'match':
      return targetId ? `/messages/${encodeURIComponent(targetId)}` : '/messages';
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
    const token = await getToken(messaging, {
      vapidKey: getVapidKey(),
      serviceWorkerRegistration: registration,
    });
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
      token = await getToken(messaging, {
        vapidKey: getVapidKey(),
        serviceWorkerRegistration: registration,
      });
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
