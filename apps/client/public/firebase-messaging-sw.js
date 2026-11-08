/* eslint-disable no-undef */
// Firebase Messaging Service Worker for Background Push Notifications (Loaded dynamically from env)
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

    // Background push notification handler (WhatsApp style)
    messaging.onBackgroundMessage((payload) => {
      console.log('[SW] Received background push message:', payload);

      const data = payload.data || {};
      const notification = payload.notification || {};

      const title = notification.title || data.title || data.senderName || 'New Message';
      const body = notification.body || data.body || data.messageText || 'Sent a new message';
      const conversationId = data.conversationId || 'default';
      const clickAction = data.click_action || data.url || `/chat?conversationId=${conversationId}`;

      const notificationOptions = {
        body,
        icon: notification.icon || data.senderAvatar || '/icon-192.svg',
        badge: '/icon-192.svg',
        tag: data.tag || `conv_${conversationId}`,
        renotify: true,
        data: {
          click_action: clickAction,
          conversationId,
        },
        vibrate: [200, 100, 200],
        actions: [{ action: 'open_chat', title: 'Open Chat' }],
      };

      self.registration.showNotification(title, notificationOptions);
    });
  } catch (err) {
    console.warn('[SW] Messaging init error:', err);
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

// Click notification to focus existing tab or open chat window
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const clickAction = event.notification.data?.click_action || '/chat';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // If a chat tab is already open, focus it and navigate
      for (const client of windowClients) {
        if (client.url.includes('/chat') && 'focus' in client) {
          if ('navigate' in client) {
            client.navigate(clickAction);
          }
          return client.focus();
        }
      }
      // Otherwise open a new window
      if (clients.openWindow) {
        return clients.openWindow(clickAction);
      }
    })
  );
});

