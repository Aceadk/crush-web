/**
 * Notification route parity tests (P1 #8 of the web-mobile alignment audit).
 *
 * Verifies that resolveNotificationRoute() maps EVERY targetRoute and
 * notification `type` emitted by the backend (functions/src/index.ts + calls
 * signaling) to a real web route. See
 * my_first_project/docs/reports/route_deeplink_matrix_2026-06-05.md.
 */

import { describe, expect, it, vi } from 'vitest';

// notification.ts imports firebase/messaging at module load; stub it so the
// pure resolveNotificationRoute() can be imported in jsdom.
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

import { resolveNotificationRoute } from '@crush/core/services/notification';

describe('resolveNotificationRoute — backend targetRoute coverage', () => {
  // Every targetRoute string emitted by the backend → expected web route.
  const targetRouteCases: Array<[string, string]> = [
    ['/likes-you', '/likes'],
    ['/notifications', '/messages'],
    ['/settings/account-actions', '/settings/account'],
    ['/settings/subscription', '/settings/account'],
    ['/call-history', '/messages'],
    ['/incoming-call', '/messages'],
    ['/safety', '/date-safety'],
    ['/chat/match123', '/messages/match123'],
  ];

  it.each(targetRouteCases)(
    'maps backend targetRoute %s → %s',
    (targetRoute, expected) => {
      expect(resolveNotificationRoute({ targetRoute })).toBe(expected);
    }
  );

  it('passes through already-canonical web routes', () => {
    expect(resolveNotificationRoute({ targetRoute: '/messages/abc' })).toBe(
      '/messages/abc'
    );
    expect(resolveNotificationRoute({ targetRoute: '/profile/user1' })).toBe(
      '/profile/user1'
    );
    expect(resolveNotificationRoute({ targetRoute: '/premium' })).toBe(
      '/premium'
    );
  });

  it('preserves query strings through mapping', () => {
    expect(
      resolveNotificationRoute({ targetRoute: '/chat/m1?from=push' })
    ).toBe('/messages/m1?from=push');
  });

  it('accepts full URLs on allowed hosts and strips the origin', () => {
    expect(
      resolveNotificationRoute({ targetRoute: 'https://crush.app/likes-you' })
    ).toBe('/likes');
    expect(
      resolveNotificationRoute({
        targetRoute: 'https://crushhour.app/settings/subscription',
      })
    ).toBe('/settings/account');
  });

  it('rejects routes on disallowed hosts (falls back to type)', () => {
    expect(
      resolveNotificationRoute({
        targetRoute: 'https://evil.example/likes',
        type: 'like',
      })
    ).toBe('/likes');
  });

  it('rejects unknown relative routes (falls back to type)', () => {
    expect(
      resolveNotificationRoute({ targetRoute: '/totally-unknown', type: 'message' })
    ).toBe('/messages');
  });
});

describe('resolveNotificationRoute — backend notification type coverage', () => {
  const typeCases: Array<[string, Record<string, string>, string]> = [
    ['message (with matchId)', { type: 'message', matchId: 'm1' }, '/messages/m1'],
    ['message (no id)', { type: 'message' }, '/messages'],
    ['match (with matchId)', { type: 'match', matchId: 'm2' }, '/messages/m2'],
    ['match_ended', { type: 'match_ended' }, '/messages'],
    ['like', { type: 'like' }, '/likes'],
    ['super_like', { type: 'super_like' }, '/likes'],
    ['subscription', { type: 'subscription' }, '/settings/account'],
    ['data_export_ready', { type: 'data_export_ready' }, '/settings/account'],
    ['safety_alert', { type: 'safety_alert' }, '/date-safety'],
    ['call_safety_alert', { type: 'call_safety_alert' }, '/date-safety'],
    ['incoming_call', { type: 'incoming_call' }, '/messages'],
    ['unknown', { type: 'something_new' }, '/messages'],
    ['empty', {}, '/messages'],
  ];

  it.each(typeCases)('routes type %s correctly', (_label, data, expected) => {
    expect(resolveNotificationRoute(data)).toBe(expected);
  });

  it('prefers explicit targetRoute over type', () => {
    expect(
      resolveNotificationRoute({ type: 'like', targetRoute: '/chat/m9' })
    ).toBe('/messages/m9');
  });
});
