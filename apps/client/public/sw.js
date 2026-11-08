// OLX ORBIT Service Worker (PWA)
const CACHE_NAME = 'bharatmarket-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.svg',
  '/icon-512.svg',
];

// Install: pre-cache application shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Pre-caching static app shell');
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate: cleanup stale caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[SW] Removing old cache:', key);
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch strategy:
// - Static assets (scripts, styles, images): Cache-first with network fallback
// - API calls (/api/v1): Network-first with cached response fallback
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Skip non-GET requests and WebSocket connections
  if (request.method !== 'GET' || url.pathname.startsWith('/socket.io/')) {
    return;
  }

  // API calls: Network-first
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(async () => {
          const cachedResponse = await caches.match(request);
          if (cachedResponse) {
            return cachedResponse;
          }
          return new Response(
            JSON.stringify({
              success: false,
              error: {
                code: 'OFFLINE',
                message: 'You are currently offline. Check your internet connection.',
              },
            }),
            {
              status: 503,
              headers: { 'Content-Type': 'application/json' },
            }
          );
        })
    );
    return;
  }

  // App Shell & Static Assets: Stale-while-revalidate
  event.respondWith(
    caches.match(request).then((cached) => {
      const fetchPromise = fetch(request)
        .then((networkResponse) => {
          if (networkResponse.ok) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return networkResponse;
        })
        .catch(() => cached);

      return cached || fetchPromise;
    })
  );
});

// Push Notification & Firebase Messaging Handler (Configured dynamically from env)
try {
  importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
  importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

  const swParams = new URLSearchParams(self.location.search);
  const swConfig = {
    apiKey: swParams.get('apiKey'),
    authDomain: swParams.get('authDomain'),
    projectId: swParams.get('projectId'),
    storageBucket: swParams.get('storageBucket'),
    messagingSenderId: swParams.get('messagingSenderId'),
    appId: swParams.get('appId'),
  };

  const setupMessaging = (config) => {
    if (!config || !config.apiKey || !config.projectId) return;
    try {
      if (!firebase.apps.length) {
        firebase.initializeApp(config);
      }
      const messaging = firebase.messaging();
      messaging.onBackgroundMessage((payload) => {
        const data = payload.data || {};
        const notification = payload.notification || {};
        const title = notification.title || data.title || data.senderName || 'New Message';
        const body = notification.body || data.body || data.messageText || 'Sent a new message';
        const conversationId = data.conversationId || 'default';
        const clickAction = data.click_action || data.url || `/chat?conversationId=${conversationId}`;

        self.registration.showNotification(title, {
          body,
          icon: notification.icon || data.senderAvatar || '/icon-192.svg',
          badge: '/icon-192.svg',
          tag: data.tag || `conv_${conversationId}`,
          renotify: true,
          data: { click_action: clickAction, conversationId },
          vibrate: [200, 100, 200],
        });
      });
    } catch (e) {
      console.warn('[SW] Firebase messaging init warning:', e);
    }
  };

  if (swConfig.apiKey && swConfig.projectId) {
    setupMessaging(swConfig);
  } else {
    fetch('/api/v1/notifications/firebase-client-config')
      .then((res) => (res.ok ? res.json() : null))
      .then((cfg) => {
        if (cfg) setupMessaging(cfg);
      })
      .catch(() => {});
  }
} catch (err) {
  console.warn('[SW] Firebase messaging initialization skipped or offline:', err);
}

// Notification Click Handler (WhatsApp style: focuses active tab or opens new chat window)
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const clickAction = event.notification.data?.click_action || '/chat';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes('/chat') && 'focus' in client) {
          if ('navigate' in client) {
            client.navigate(clickAction);
          }
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(clickAction);
      }
    })
  );
});
