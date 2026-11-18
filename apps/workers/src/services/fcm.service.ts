import fs from 'fs';
import path from 'path';
import { initializeApp, cert, getApps, App } from 'firebase-admin/app';
import { getMessaging, Messaging, MulticastMessage } from 'firebase-admin/messaging';
import { redis } from '../config/redis';

export interface ChatPushPayload {
  recipientId: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string | null;
  messageText: string;
  conversationId: string;
  messageId?: string;
  attachmentUrl?: string | null;
  priority?: 'HIGH' | 'NORMAL';
}

export interface NotificationPushPayload {
  recipientId: string;
  title: string;
  body: string;
  notificationId: string;
  type?: string;
  clickUrl?: string;
  data?: Record<string, any>;
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

      // Resolve service account json inside apps/workers
      const candidatePaths = [
        path.resolve(process.cwd(), 'gen-lang-client-0067863163-firebase-adminsdk-fbsvc-3a9115427b.json'),
        path.resolve(__dirname, '../../gen-lang-client-0067863163-firebase-adminsdk-fbsvc-3a9115427b.json'),
      ];

      const resolvedPath = candidatePaths.find((p) => {
        try {
          return fs.existsSync(p) && fs.statSync(p).isFile();
        } catch {
          return false;
        }
      });

      if (!resolvedPath) {
        console.warn('[FCM Worker] Service account credentials not found. Push worker operating in simulation mode.');
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
      console.log(`[FCM Worker] Initialized successfully for project: ${serviceAccount.project_id}`);
    } catch (err: any) {
      console.warn('[FCM Worker] Initialization failed:', err.message);
    }
  }

  isReady(): boolean {
    return this.initialized && this.messaging !== null;
  }

  private async getTokensForUser(userId: string): Promise<string[]> {
    if (!userId) return [];
    try {
      const tokens = await redis.smembers(`fcm:user:${userId}:tokens`);
      return tokens || [];
    } catch {
      return [];
    }
  }

  private async removeInvalidToken(token: string, userId: string): Promise<void> {
    try {
      await redis.srem(`fcm:user:${userId}:tokens`, token);
      await redis.del(`fcm:token:${token}`);
      console.log(`[FCM Worker] Pruned invalid token for user ${userId}`);
    } catch {
      // Ignored
    }
  }

  /**
   * Dispatches push notification for chat messages.
   */
  async sendChatMessagePush(payload: ChatPushPayload): Promise<{ sent: number; failed: number }> {
    if (!this.isReady()) {
      console.log(`[FCM Worker Simulated] Chat Push to ${payload.recipientId}: "${payload.messageText}"`);
      return { sent: 1, failed: 0 };
    }

    const tokens = await this.getTokensForUser(payload.recipientId);
    if (tokens.length === 0) {
      return { sent: 0, failed: 0 };
    }

    const clickUrl = `/chat?conversationId=${encodeURIComponent(payload.conversationId)}`;
    const avatar = payload.senderAvatar || 'https://api.dicebear.com/7.x/identicon/svg?seed=olx';

    const message: MulticastMessage = {
      tokens,
      notification: {
        title: payload.senderName || 'New Message',
        body: payload.messageText,
        imageUrl: payload.attachmentUrl || undefined,
      },
      data: {
        type: 'CHAT_MESSAGE',
        conversationId: payload.conversationId,
        senderId: payload.senderId,
        senderName: payload.senderName,
        messageText: payload.messageText,
        messageId: payload.messageId || '',
        clickUrl,
      },
      webpush: {
        headers: {
          Urgency: payload.priority === 'HIGH' ? 'high' : 'normal',
        },
        fcmOptions: {
          link: clickUrl,
        },
        notification: {
          title: payload.senderName || 'New Message',
          body: payload.messageText,
          icon: avatar,
          badge: '/icon-192.svg',
          tag: `chat-${payload.conversationId}`,
        },
      },
    };

    try {
      const response = await this.messaging!.sendEachForMulticast(message);

      response.responses.forEach((res, idx) => {
        if (!res.success && res.error) {
          const code = res.error.code;
          if (
            code === 'messaging/registration-token-not-registered' ||
            code === 'messaging/invalid-registration-token'
          ) {
            void this.removeInvalidToken(tokens[idx], payload.recipientId);
          }
        }
      });

      return { sent: response.successCount, failed: response.failureCount };
    } catch (err: any) {
      console.error('[FCM Worker] Multicast chat push failed:', err.message);
      return { sent: 0, failed: tokens.length };
    }
  }

  /**
   * Dispatches push notification for system & support desk messages.
   */
  async sendNotificationPush(payload: NotificationPushPayload): Promise<{ sent: number; failed: number }> {
    if (!this.isReady()) {
      console.log(`[FCM Worker Simulated] Notification Push to ${payload.recipientId}: "${payload.title}"`);
      return { sent: 1, failed: 0 };
    }

    const tokens = await this.getTokensForUser(payload.recipientId);
    if (tokens.length === 0) {
      return { sent: 0, failed: 0 };
    }

    const clickUrl = payload.clickUrl || '/support';

    const message: MulticastMessage = {
      tokens,
      notification: {
        title: payload.title,
        body: payload.body,
      },
      data: {
        type: payload.type || 'SYSTEM_NOTIFICATION',
        notificationId: payload.notificationId,
        clickUrl,
        ...(payload.data ? Object.fromEntries(Object.entries(payload.data).map(([k, v]) => [k, String(v)])) : {}),
      },
      webpush: {
        headers: {
          Urgency: payload.priority === 'HIGH' ? 'high' : 'normal',
        },
        fcmOptions: {
          link: clickUrl,
        },
        notification: {
          title: payload.title,
          body: payload.body,
          icon: '/icon-192.svg',
          badge: '/icon-192.svg',
          tag: `notif-${payload.notificationId}`,
        },
      },
    };

    try {
      const response = await this.messaging!.sendEachForMulticast(message);

      response.responses.forEach((res, idx) => {
        if (!res.success && res.error) {
          const code = res.error.code;
          if (
            code === 'messaging/registration-token-not-registered' ||
            code === 'messaging/invalid-registration-token'
          ) {
            void this.removeInvalidToken(tokens[idx], payload.recipientId);
          }
        }
      });

      return { sent: response.successCount, failed: response.failureCount };
    } catch (err: any) {
      console.error('[FCM Worker] Multicast notification push failed:', err.message);
      return { sent: 0, failed: tokens.length };
    }
  }

  /**
   * Sends a direct push notification to an individual token (for test push verification).
   */
  async sendDirectTestPush(token: string, userName: string): Promise<boolean> {
    if (!this.isReady()) {
      console.log(`[FCM Worker Simulated] Test push to ${userName} (token: ${token.slice(0, 10)}...)`);
      return true;
    }

    try {
      await this.messaging!.send({
        token,
        notification: {
          title: 'OLX Marketplace — Notification Test',
          body: `Hello ${userName}! Push notifications are operating smoothly via Background Worker.`,
        },
        data: {
          type: 'TEST_PUSH',
          timestamp: new Date().toISOString(),
        },
      });
      return true;
    } catch (err: any) {
      console.error('[FCM Worker] Direct test push failed:', err.message);
      return false;
    }
  }
}

export const fcmService = new FcmService();
