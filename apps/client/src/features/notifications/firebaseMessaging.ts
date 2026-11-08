import { initializeApp, getApps, getApp } from 'firebase/app';
import { getMessaging, getToken, onMessage, isSupported, Messaging } from 'firebase/messaging';
import { apiClient } from '@/lib/api-client';

export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || '',
};

export function isFirebaseConfigured(): boolean {
  return Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);
}

// Safe Firebase App Initialization
export function getFirebaseApp() {
  if (!isFirebaseConfigured()) return null;
  if (getApps().length > 0) {
    return getApp();
  }
  return initializeApp(firebaseConfig);
}

let messagingInstance: Messaging | null = null;

export async function getFirebaseMessaging(): Promise<Messaging | null> {
  if (typeof window === 'undefined' || !isFirebaseConfigured()) return null;
  const supported = await isSupported().catch(() => false);
  if (!supported) return null;

  if (!messagingInstance) {
    const app = getFirebaseApp();
    if (app) {
      messagingInstance = getMessaging(app);
    }
  }
  return messagingInstance;
}

/**
 * Requests Notification permission and registers FCM token with backend
 */
export async function requestAndRegisterPushToken(): Promise<string | null> {
  if (typeof window === 'undefined' || !('Notification' in window) || !('serviceWorker' in navigator)) {
    console.warn('[FCM] Push notifications are not supported in this environment');
    return null;
  }

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    console.log('[FCM] Notification permission was not granted:', permission);
    return null;
  }

  const messaging = await getFirebaseMessaging();
  if (!messaging) {
    console.warn('[FCM] Messaging is not supported');
    return null;
  }

  try {
    const configParams = isFirebaseConfigured()
      ? '?' +
        new URLSearchParams({
          apiKey: firebaseConfig.apiKey,
          authDomain: firebaseConfig.authDomain,
          projectId: firebaseConfig.projectId,
          storageBucket: firebaseConfig.storageBucket,
          messagingSenderId: firebaseConfig.messagingSenderId,
          appId: firebaseConfig.appId,
        }).toString()
      : '';

    let registration = await navigator.serviceWorker.getRegistration('/');
    if (!registration) {
      registration = await navigator.serviceWorker.register('/sw.js' + configParams, { scope: '/' });
    }

    // Wait until service worker is active
    await navigator.serviceWorker.ready;

    const vapidKey = (import.meta as any).env?.VITE_FIREBASE_VAPID_KEY || (typeof window !== 'undefined' ? (window as any).__FIREBASE_VAPID_KEY__ : undefined);

    const token = await getToken(messaging, {
      serviceWorkerRegistration: registration,
      ...(vapidKey ? { vapidKey } : {}),
    });

    if (token) {
      localStorage.setItem('olx_fcm_token', token);
      await apiClient.post('/notifications/push-token', {
        token,
        platform: 'web',
      });
      console.log('[FCM] Push token registered with backend successfully');
      return token;
    }
  } catch (err: any) {
    if (err?.code === 'messaging/missing-vapid-key') {
      console.warn('[FCM] VAPID Key required for FCM background web push. Native browser notifications active.');
    } else {
      console.error('[FCM] Failed to retrieve or register FCM token:', err);
    }
  }

  return null;
}

/**
 * Foreground message handler (WhatsApp style)
 */
export async function setupForegroundPushListener(
  onForegroundMessage: (payload: any) => void
): Promise<(() => void) | null> {
  const messaging = await getFirebaseMessaging();
  if (!messaging) return null;

  return onMessage(messaging, (payload) => {
    console.log('[FCM] Foreground push message received:', payload);
    onForegroundMessage(payload);
  });
}

