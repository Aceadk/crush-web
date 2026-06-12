/* global firebase */
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

const params = new URLSearchParams(self.location.search);
const firebaseConfig = {
  apiKey: params.get('apiKey') || undefined,
  authDomain: params.get('authDomain') || undefined,
  projectId: params.get('projectId') || undefined,
  storageBucket: params.get('storageBucket') || undefined,
  messagingSenderId: params.get('messagingSenderId') || undefined,
  appId: params.get('appId') || undefined,
  measurementId: params.get('measurementId') || undefined,
};

function hasFirebaseConfig(config) {
  return Boolean(config.apiKey && config.projectId && config.messagingSenderId && config.appId);
}

function allowRoute(rawRoute) {
  if (!rawRoute || typeof rawRoute !== 'string') return null;
  const trimmed = rawRoute.trim();
  if (!trimmed) return null;

  let path = trimmed;
  try {
    const parsed = new URL(trimmed);
    const allowedHosts = new Set(['crushhour.app', 'www.crushhour.app', 'crush.app']);
    if (!allowedHosts.has(parsed.hostname)) return null;
    path = `${parsed.pathname}${parsed.search}`;
  } catch (_error) {
    if (!trimmed.startsWith('/')) return null;
  }

  const [pathname, search = ''] = path.split('?');
  const mappedPath = pathname
    .replace(/^\/chat\//, '/messages/')
    .replace(/^\/likes-you$/, '/likes')
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

function resolveRoute(data) {
  const payload = data || {};
  const explicit =
    allowRoute(payload.targetRoute) || allowRoute(payload.route) || allowRoute(payload.deepLink);
  if (explicit) return explicit;

  const type = String(payload.type || payload.notificationType || '').toLowerCase();
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
    case 'data_export_ready':
      return '/settings/account';
    case 'call_safety_alert':
    case 'safety_alert':
      return '/date-safety';
    default:
      return '/messages';
  }
}

if (hasFirebaseConfig(firebaseConfig)) {
  firebase.initializeApp(firebaseConfig);
  const messaging = firebase.messaging();

  messaging.onBackgroundMessage((payload) => {
    const title = payload.notification?.title || 'Crush';
    const body = payload.notification?.body || 'You have a new notification.';
    const icon = payload.notification?.icon || '/favicon.svg';
    const data = payload.data || {};

    self.registration.showNotification(title, {
      body,
      icon,
      badge: '/favicon.svg',
      data: {
        ...data,
        route: resolveRoute(data),
      },
    });
  });
}

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const data = event.notification.data || {};
  const route = allowRoute(data.route) || resolveRoute(data);
  const url = new URL(route, self.location.origin).toString();

  event.waitUntil(
    (async () => {
      const clientsList = await clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const client of clientsList) {
        if ('focus' in client) {
          await client.focus();
          if ('navigate' in client) {
            return client.navigate(url);
          }
          return undefined;
        }
      }
      return clients.openWindow(url);
    })()
  );
});
