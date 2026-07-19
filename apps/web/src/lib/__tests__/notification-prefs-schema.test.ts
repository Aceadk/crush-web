/**
 * Notification-preferences schema test (Phase 7 Step 14).
 *
 * Verifies the web preferences keys match the canonical backend
 * NotificationCategory set (so a preference actually gates delivery) plus the
 * push/email channel toggles, and that defaults are opt-out (all enabled).
 */

import { describe, it, expect, vi } from 'vitest';

vi.mock('firebase/messaging', () => ({
  getMessaging: vi.fn(),
  getToken: vi.fn(),
  deleteToken: vi.fn(),
  isSupported: vi.fn().mockResolvedValue(false),
  onMessage: vi.fn(),
}));
vi.mock('firebase/firestore', () => ({
  doc: vi.fn(),
  setDoc: vi.fn(),
  deleteDoc: vi.fn(),
  serverTimestamp: vi.fn(),
}));
vi.mock('@crush/core/firebase/config', () => ({
  firebaseConfig: { projectId: 'test' },
  getFirebaseApp: vi.fn(),
  getFirebaseDb: vi.fn(),
}));

import {
  buildWebPushTokenOptions,
  WEB_NOTIFICATION_PREF_DEFAULTS,
} from '@crush/core/services/notification';

// Authoritative backend categories (functions/src/index.ts NotificationCategory).
const BACKEND_CATEGORIES = [
  'calls',
  'messages',
  'matches',
  'subscriptions',
  'likes',
  'profileViews',
  'promotions',
  'safetyAlerts',
] as const;

const CHANNELS = ['push', 'email'] as const;

// Delivery-style prefs (mirror the mobile Sound/Vibration toggles). The backend
// reads notificationPrefs.sound/.vibration to pick the Android channel and the
// push sound per recipient.
const DELIVERY_STYLE = ['sound', 'vibration'] as const;

describe('WebNotificationPrefs schema ↔ backend categories', () => {
  it('includes every backend notification category', () => {
    for (const category of BACKEND_CATEGORIES) {
      expect(WEB_NOTIFICATION_PREF_DEFAULTS, `missing category "${category}"`).toHaveProperty(
        category
      );
    }
  });

  it('includes the push/email channel toggles', () => {
    for (const channel of CHANNELS) {
      expect(WEB_NOTIFICATION_PREF_DEFAULTS).toHaveProperty(channel);
    }
  });

  it('includes the sound/vibration delivery-style toggles', () => {
    for (const key of DELIVERY_STYLE) {
      expect(WEB_NOTIFICATION_PREF_DEFAULTS).toHaveProperty(key);
    }
  });

  it('has no keys beyond channels + delivery style + backend categories', () => {
    const allowed = new Set<string>([...CHANNELS, ...DELIVERY_STYLE, ...BACKEND_CATEGORIES]);
    const extra = Object.keys(WEB_NOTIFICATION_PREF_DEFAULTS).filter((k) => !allowed.has(k));
    expect(extra, `unexpected pref keys: ${extra.join(', ')}`).toEqual([]);
  });

  it('defaults are opt-out (all enabled)', () => {
    for (const [key, value] of Object.entries(WEB_NOTIFICATION_PREF_DEFAULTS)) {
      expect(value, `${key} should default true`).toBe(true);
    }
  });

  it('uses Firebase default web-push credentials when no VAPID env key exists', () => {
    const registration = {} as ServiceWorkerRegistration;
    expect(buildWebPushTokenOptions(registration, '')).toEqual({
      serviceWorkerRegistration: registration,
    });
  });

  it('passes a configured VAPID key to Firebase messaging', () => {
    const registration = {} as ServiceWorkerRegistration;
    expect(buildWebPushTokenOptions(registration, 'vapid-key')).toEqual({
      serviceWorkerRegistration: registration,
      vapidKey: 'vapid-key',
    });
  });
});
