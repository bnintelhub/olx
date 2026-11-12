import fs from 'fs';
import path from 'path';
import { initializeApp, cert, getApps, App } from 'firebase-admin/app';
import { getMessaging, Messaging, MulticastMessage } from 'firebase-admin/messaging';
import { env } from '../../config/env';
import { fcmTokenStore } from './fcm.token.store';

export interface ChatPushPayload {
  recipientId: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string | null;
  messageText: string;
  conversationId: string;
  adTitle?: string | null;
  messageId?: string;
  attachmentUrl?: string | null;
  priority?: 'HIGH' | 'NORMAL';
}

class FcmService {
  private app: App | null = null;
  private messaging: Messaging | null = null;
  private initialized = false;

  constructor() {
    this.init();
  }

  private init() {
    try {
      if (getApps().length > 0) {
        this.app = getApps()[0];
        this.messaging = getMessaging(this.app);
        this.initialized = true;
        return;
      }

      // Check direct environment variables (useful for containerized/cloud deployments)
      if (env.FIREBASE_PRIVATE_KEY && env.FIREBASE_CLIENT_EMAIL) {
        const privateKey = env.FIREBASE_PRIVATE_KEY.includes('\\n')
          ? env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
          : env.FIREBASE_PRIVATE_KEY;
        this.app = initializeApp({
          credential: cert({
            projectId: env.FIREBASE_PROJECT_ID || 'gen-lang-client-0067863163',
            clientEmail: env.FIREBASE_CLIENT_EMAIL,
            privateKey,
          }),
          projectId: env.FIREBASE_PROJECT_ID || 'gen-lang-client-0067863163',
        });
        this.messaging = getMessaging(this.app);
        this.initialized = true;
        console.log(`[FCM] Initialized successfully for project: ${env.FIREBASE_PROJECT_ID || 'gen-lang-client-0067863163'}`);
        return;
      }

      // Check configured path or default service account JSON in server root
      const candidatePaths: string[] = [];

      if (env.FIREBASE_SERVICE_ACCOUNT_PATH && env.FIREBASE_SERVICE_ACCOUNT_PATH.trim() !== '') {
        candidatePaths.push(
          path.resolve(process.cwd(), env.FIREBASE_SERVICE_ACCOUNT_PATH.trim()),
          path.resolve(__dirname, '../../..', env.FIREBASE_SERVICE_ACCOUNT_PATH.trim())
        );
      }

      candidatePaths.push(
        path.resolve(__dirname, '../../../gen-lang-client-0067863163-firebase-adminsdk-fbsvc-3a9115427b.json')
      );

      const resolvedPath = candidatePaths.find((p) => {
        try {
          return fs.existsSync(p) && fs.statSync(p).isFile();
        } catch {
          return false;
        }
      });

      if (!resolvedPath) {
        console.warn('[FCM] Service account credentials not found. Push notifications disabled.');
        return;
      }

      const raw = fs.readFileSync(resolvedPath, 'utf8');
      const serviceAccount = JSON.parse(raw);

      this.app = initializeApp({
        credential: cert(serviceAccount),
        projectId: serviceAccount.project_id || 'gen-lang-client-0067863163',
      });
      this.messaging = getMessaging(this.app);
      this.initialized = true;
      console.log(`[FCM] Initialized successfully for project: ${serviceAccount.project_id}`);
    } catch (err: any) {
      console.warn('[FCM] Initialization failed:', err.message);
    }
  }

  isReady(): boolean {
    return this.initialized && this.messaging !== null;
  }

  /**
   * WhatsApp-style push notification for chat messages:
   * - Grouped per conversation via tag: conv_{id}
   * - Displays sender name & context (ad title if any)
   * - High urgency with click action to open conversation directly
   */
  async sendChatMessagePush(payload: ChatPushPayload): Promise<{ sent: number; failed: number }> {
    if (!this.messaging) return { sent: 0, failed: 0 };

    const tokens = await fcmTokenStore.getTokensForUser(payload.recipientId);
    if (!tokens || tokens.length === 0) {
      return { sent: 0, failed: 0 };
    }

    const title = payload.adTitle
      ? `${payload.senderName} (${payload.adTitle})`
      : payload.senderName || 'New Message';

    let body = payload.messageText || '';
    if (!body && payload.attachmentUrl) {
      body = '📷 Photo';
    }

    const clickUrl = `${env.CLIENT_URL}/chat?conversationId=${payload.conversationId}`;
    const tag = `conv_${payload.conversationId}`;

    const message: MulticastMessage = {
      tokens,
      notification: {
        title,
        body: body.slice(0, 200),
        imageUrl: payload.senderAvatar || undefined,
      },
      data: {
        type: 'CHAT_MESSAGE',
        conversationId: payload.conversationId,
        senderId: payload.senderId,
        senderName: payload.senderName,
        messageId: payload.messageId || '',
        tag,
        click_action: clickUrl,
        url: clickUrl,
      },
      webpush: {
        headers: {
          Urgency: payload.priority === 'HIGH' ? 'high' : 'normal',
        },
        notification: {
          title,
          body: body.slice(0, 200),
          icon: payload.senderAvatar || '/favicon.ico',
          badge: '/favicon.ico',
          tag,
          renotify: true,
          requireInteraction: payload.priority === 'HIGH',
        },
        fcmOptions: {
          link: clickUrl,
        },
      },
      android: {
        priority: payload.priority === 'HIGH' ? 'high' : 'normal',
        collapseKey: tag,
        notification: {
          title,
          body: body.slice(0, 200),
          tag,
          sound: 'default',
          clickAction: clickUrl,
        },
      },
    };

    try {
      const response = await this.messaging.sendEachForMulticast(message);
      let sentCount = 0;
      let failedCount = 0;

      response.responses.forEach((res, idx) => {
        if (res.success) {
          sentCount++;
        } else {
          failedCount++;
          const errCode = res.error?.code;
          // Clean up stale or unregistered FCM tokens automatically
          if (
            errCode === 'messaging/registration-token-not-registered' ||
            errCode === 'messaging/invalid-argument'
          ) {
            const staleToken = tokens[idx];
            if (staleToken) {
              void fcmTokenStore.removeInvalidToken(staleToken, payload.recipientId);
            }
          }
        }
      });

      return { sent: sentCount, failed: failedCount };
    } catch (err: any) {
      console.warn('[FCM] Failed to dispatch multicast notification:', err.message);
      return { sent: 0, failed: tokens.length };
    }
  }

  /**
   * Helper to send a test notification directly to verify credentials on a target token
   */
  async sendDirectTestPush(token: string, userName = 'You'): Promise<boolean> {
    if (!this.messaging) return false;
    try {
      await this.messaging.send({
        token,
        notification: {
          title: 'OLX Push Notifications',
          body: `Hello ${userName}! WhatsApp-style push notifications are working smoothly.`,
        },
        data: {
          type: 'TEST_PUSH',
          click_action: `${env.CLIENT_URL}/chat`,
        },
      });
      return true;
    } catch (err: any) {
      console.error('[FCM] Direct test notification error:', err);
      return false;
    }
  }
}

export const fcmService = new FcmService();

