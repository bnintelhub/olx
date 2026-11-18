import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { sseConnectionManager } from '../../src/modules/notifications/sse-connection.manager';
import { NotificationDeliveryService } from '../../src/modules/notifications/notification-delivery.service';
import { prisma } from '../../src/config/prisma';
import { PushService } from '../../src/integrations/push/push.service';
import { UserRole, NotificationType } from '@prisma/client';
import { AppError } from '../../src/shared/errors/app-error';

// Mock dependencies
vi.mock('../../src/config/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
    notification: {
      create: vi.fn(),
      count: vi.fn(),
      findMany: vi.fn(),
      updateMany: vi.fn(),
    },
  },
}));

vi.mock('../../src/integrations/push/push.service', () => ({
  PushService: {
    sendPushNotification: vi.fn(),
  },
}));

vi.mock('../../src/config/redis', () => ({
  redis: {
    set: vi.fn().mockResolvedValue('OK'),
    del: vi.fn().mockResolvedValue(1),
  },
  getCache: vi.fn().mockResolvedValue(null),
  setCache: vi.fn().mockResolvedValue(true),
}));

describe('Notification Delivery Architecture — SSE + Push Test Suite', () => {
  const customerUserId = 'cust-uuid-1001';
  const staffUserId = 'staff-uuid-2002';
  const superAdminUserId = 'super-uuid-3003';

  beforeEach(() => {
    vi.clearAllMocks();
    // Clear in-memory active connections
    (sseConnectionManager as any).connections.clear();
  });

  afterEach(() => {
    (sseConnectionManager as any).connections.clear();
  });

  // Helper to create mock SSE reply object
  function createMockSSEReply(connected = true) {
    let isAlive = connected;
    const sentEvents: any[] = [];
    const closeCallbacks: Array<() => void> = [];

    return {
      isConnected: isAlive,
      send: vi.fn().mockImplementation(async (payload) => {
        if (!isAlive) throw new Error('Client disconnected');
        sentEvents.push(payload);
      }),
      onClose: vi.fn().mockImplementation((cb) => {
        closeCallbacks.push(cb);
      }),
      keepAlive: vi.fn(),
      close: vi.fn().mockImplementation(() => {
        isAlive = false;
        closeCallbacks.forEach((cb) => cb());
      }),
      _simulateDisconnect: () => {
        isAlive = false;
        closeCallbacks.forEach((cb) => cb());
      },
      _sentEvents: sentEvents,
    };
  }

  // =========================================================================
  // 1. SMOKE & SANITY TESTS
  // =========================================================================
  describe('1. Smoke & Sanity Tests', () => {
    it('[Sanity] SSE Stream Registration: registers user and accurately reports connection state', () => {
      const mockReply = createMockSSEReply(true);
      const cleanup = sseConnectionManager.register(customerUserId, 'USER', mockReply as any, 'conn-tab-1');

      expect(sseConnectionManager.isUserConnected(customerUserId)).toBe(true);
      expect(sseConnectionManager.getUserConnectionCount(customerUserId)).toBe(1);

      cleanup();
      expect(sseConnectionManager.isUserConnected(customerUserId)).toBe(false);
      expect(sseConnectionManager.getUserConnectionCount(customerUserId)).toBe(0);
    });

    it('[Sanity] Active User Delivery: sends in-app SSE and skips push notification', async () => {
      const mockReply = createMockSSEReply(true);
      sseConnectionManager.register(customerUserId, 'USER', mockReply as any, 'conn-tab-1');

      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({
        id: customerUserId,
        role: UserRole.USER,
      } as any);

      vi.mocked(prisma.notification.create).mockResolvedValueOnce({
        id: 'notif-101',
        userId: customerUserId,
        type: NotificationType.SYSTEM_ALERT,
        title: 'Support Update',
        body: 'Your ticket has been replied to.',
        data: { ticketId: 'tick-55' },
        createdAt: new Date(),
      } as any);

      vi.mocked(prisma.notification.count).mockResolvedValueOnce(1);

      const result = await NotificationDeliveryService.dispatch({
        recipientId: customerUserId,
        senderId: staffUserId,
        title: 'Support Update',
        body: 'Your ticket has been replied to.',
        data: { ticketId: 'tick-55' },
      });

      // Assertions
      expect(result.deliveredVia).toBe('SSE');
      expect(result.sseConnected).toBe(true);
      expect(result.success).toBe(true);
      expect(mockReply.send).toHaveBeenCalledTimes(1);
      // Critical check: Push was NOT invoked because SSE delivered successfully
      expect(PushService.sendPushNotification).not.toHaveBeenCalled();
    });

    it('[Sanity] Inactive/Disconnected User: falls back to Push Notification', async () => {
      // Ensure user is not registered in SSE connection manager
      expect(sseConnectionManager.isUserConnected(customerUserId)).toBe(false);

      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({
        id: customerUserId,
        role: UserRole.USER,
      } as any);

      vi.mocked(prisma.notification.create).mockResolvedValueOnce({
        id: 'notif-102',
        userId: customerUserId,
        type: NotificationType.SYSTEM_ALERT,
        title: 'Support Response',
        body: 'Please check your email.',
        data: {},
        createdAt: new Date(),
      } as any);

      vi.mocked(prisma.notification.count).mockResolvedValueOnce(3);
      vi.mocked(PushService.sendPushNotification).mockResolvedValueOnce(true);

      const result = await NotificationDeliveryService.dispatch({
        recipientId: customerUserId,
        title: 'Support Response',
        body: 'Please check your email.',
      });

      expect(result.deliveredVia).toBe('PUSH');
      expect(result.sseConnected).toBe(false);
      expect(result.success).toBe(true);
      expect(PushService.sendPushNotification).toHaveBeenCalledWith(
        customerUserId,
        'Support Response',
        'Please check your email.',
        expect.objectContaining({ notificationId: 'notif-102' }),
        expect.any(Object)
      );
    });

    it('[Sanity] Staff Role Delivery Rule: Admin & Support desk receive notifications via SSE ONLY', async () => {
      // Offline staff user
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({
        id: staffUserId,
        role: UserRole.CUSTOMER_SUPPORT,
      } as any);

      vi.mocked(prisma.notification.create).mockResolvedValueOnce({
        id: 'notif-staff-1',
        userId: staffUserId,
        type: NotificationType.SYSTEM_ALERT,
        title: 'New Escalation',
        body: 'Urgent inquiry received.',
        data: {},
        createdAt: new Date(),
      } as any);

      vi.mocked(prisma.notification.count).mockResolvedValueOnce(1);

      const result = await NotificationDeliveryService.dispatch({
        recipientId: staffUserId,
        title: 'New Escalation',
        body: 'Urgent inquiry received.',
      });

      expect(result.deliveredVia).toBe('SSE');
      expect(result.success).toBe(true);
      // Push should NEVER be sent to staff role
      expect(PushService.sendPushNotification).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // 2. REGRESSION TESTS
  // =========================================================================
  describe('2. Regression Tests', () => {
    it('[Regression] Persistence First: Database record created before any delivery attempt', async () => {
      let dbCreated = false;
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({
        id: customerUserId,
        role: UserRole.USER,
      } as any);

      vi.mocked(prisma.notification.create).mockImplementationOnce(async () => {
        dbCreated = true;
        return {
          id: 'notif-persist-1',
          userId: customerUserId,
          title: 'Order Delivered',
          body: 'Your item was received.',
          createdAt: new Date(),
        } as any;
      });

      vi.mocked(PushService.sendPushNotification).mockImplementationOnce(async () => {
        // Verify database persistence happened before push attempt
        expect(dbCreated).toBe(true);
        return true;
      });

      await NotificationDeliveryService.dispatch({
        recipientId: customerUserId,
        title: 'Order Delivered',
        body: 'Your item was received.',
      });

      expect(dbCreated).toBe(true);
    });

    it('[Regression] Notification Payload Parity: preserves metadata, priority and clickUrl', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({
        id: customerUserId,
        role: UserRole.USER,
      } as any);

      vi.mocked(prisma.notification.create).mockResolvedValueOnce({
        id: 'notif-metadata-1',
        userId: customerUserId,
        type: NotificationType.SYSTEM_ALERT,
        title: 'Urgent Security Alert',
        body: 'New login detected.',
        data: { priority: 'HIGH', clickUrl: '/settings/security', senderId: staffUserId },
        createdAt: new Date(),
      } as any);

      vi.mocked(PushService.sendPushNotification).mockResolvedValueOnce(true);

      await NotificationDeliveryService.dispatch({
        recipientId: customerUserId,
        senderId: staffUserId,
        title: 'Urgent Security Alert',
        body: 'New login detected.',
        priority: 'HIGH',
        clickUrl: '/settings/security',
      });

      expect(prisma.notification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: customerUserId,
          title: 'Urgent Security Alert',
          body: 'New login detected.',
          data: expect.objectContaining({ priority: 'HIGH', senderId: staffUserId }),
        }),
      });
    });
  });

  // =========================================================================
  // 3. BOUNDARY / NEGATIVE TEST CASES
  // =========================================================================
  describe('3. Boundary / Negative Test Cases', () => {
    it('[Boundary] Rejects empty or missing recipientId with 400 AppError', async () => {
      await expect(
        NotificationDeliveryService.dispatch({
          recipientId: '',
          title: 'Hello',
          body: 'World',
        })
      ).rejects.toThrowError(AppError);
    });

    it('[Boundary] Rejects empty, blank, or whitespace title with 400 AppError', async () => {
      await expect(
        NotificationDeliveryService.dispatch({
          recipientId: customerUserId,
          title: '   ',
          body: 'Valid message body',
        })
      ).rejects.toThrowError('Recipient, title, and body are required');
    });

    it('[Boundary] Rejects empty or whitespace body with 400 AppError', async () => {
      await expect(
        NotificationDeliveryService.dispatch({
          recipientId: customerUserId,
          title: 'Valid Title',
          body: '\t\n  ',
        })
      ).rejects.toThrowError('Recipient, title, and body are required');
    });

    it('[Boundary] Rejects non-existent recipient user with 404 AppError', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(null);

      await expect(
        NotificationDeliveryService.dispatch({
          recipientId: 'non-existent-user-id',
          title: 'Hello',
          body: 'Message',
        })
      ).rejects.toThrowError('Recipient user does not exist');
    });

    it('[Boundary/Race Condition] Handles SSE write error by falling back to Push', async () => {
      // Connect an SSE client that throws during transmission (mid-stream disconnect)
      const mockReply = createMockSSEReply(true);
      mockReply.send.mockRejectedValueOnce(new Error('Connection abruptly terminated by client'));
      sseConnectionManager.register(customerUserId, 'USER', mockReply as any, 'tab-failing');

      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({
        id: customerUserId,
        role: UserRole.USER,
      } as any);

      vi.mocked(prisma.notification.create).mockResolvedValueOnce({
        id: 'notif-race-1',
        userId: customerUserId,
        title: 'Payment Confirmed',
        body: 'Your boost plan is active.',
        createdAt: new Date(),
      } as any);

      vi.mocked(PushService.sendPushNotification).mockResolvedValueOnce(true);

      const result = await NotificationDeliveryService.dispatch({
        recipientId: customerUserId,
        title: 'Payment Confirmed',
        body: 'Your boost plan is active.',
      });

      // SSE failed -> successfully fell back to Push
      expect(result.deliveredVia).toBe('PUSH');
      expect(result.success).toBe(true);
      expect(PushService.sendPushNotification).toHaveBeenCalled();
      // Failed connection should now be evicted
      expect(sseConnectionManager.isUserConnected(customerUserId)).toBe(false);
    });
  });

  // =========================================================================
  // 4. PERFORMANCE / MULTI-TAB & LOAD TESTS
  // =========================================================================
  describe('4. Performance & Multi-Tab Tests', () => {
    it('[Multi-Tab] Simultaneously broadcasts to all active tabs of a user', async () => {
      const tab1 = createMockSSEReply(true);
      const tab2 = createMockSSEReply(true);
      const tab3 = createMockSSEReply(true);

      sseConnectionManager.register(customerUserId, 'USER', tab1 as any, 'tab-1');
      sseConnectionManager.register(customerUserId, 'USER', tab2 as any, 'tab-2');
      sseConnectionManager.register(customerUserId, 'USER', tab3 as any, 'tab-3');

      expect(sseConnectionManager.getUserConnectionCount(customerUserId)).toBe(3);

      const delivered = await sseConnectionManager.sendToUser(customerUserId, 'notification', {
        id: 'event-multitab-1',
        title: 'Multi-Tab Test',
        message: 'Sync across tabs',
      });

      expect(delivered).toBe(true);
      expect(tab1.send).toHaveBeenCalledTimes(1);
      expect(tab2.send).toHaveBeenCalledTimes(1);
      expect(tab3.send).toHaveBeenCalledTimes(1);
    });

    it('[Performance] Dispatches 50 rapid events without connection leaks or latency spike', async () => {
      const tab = createMockSSEReply(true);
      sseConnectionManager.register(customerUserId, 'USER', tab as any, 'perf-tab');

      const start = Date.now();
      const promises: Promise<boolean>[] = [];
      for (let i = 0; i < 50; i++) {
        promises.push(
          sseConnectionManager.sendToUser(customerUserId, 'notification', {
            id: `evt-${i}`,
            title: `Batch Test #${i}`,
            message: 'Performance check',
          })
        );
      }

      const results = await Promise.all(promises);
      const elapsedMs = Date.now() - start;

      expect(results.every((r) => r === true)).toBe(true);
      expect(tab.send).toHaveBeenCalledTimes(50);
      expect(elapsedMs).toBeLessThan(1500); // 50 dispatches finish under 1.5s
    });
  });

  // =========================================================================
  // 5. SECURITY & ROLE AUTHORIZATION TESTS
  // =========================================================================
  describe('5. Security & Role Authorization Tests', () => {
    it('[Security] Role Broadcasting restricts events exclusively to authorized staff', async () => {
      const customerReply = createMockSSEReply(true);
      const supportReply = createMockSSEReply(true);
      const adminReply = createMockSSEReply(true);

      sseConnectionManager.register(customerUserId, 'USER', customerReply as any, 'cust');
      sseConnectionManager.register(staffUserId, 'CUSTOMER_SUPPORT', supportReply as any, 'support');
      sseConnectionManager.register(superAdminUserId, 'SUPER_ADMIN', adminReply as any, 'admin');

      await sseConnectionManager.broadcastToRole(
        [UserRole.CUSTOMER_SUPPORT, UserRole.ADMIN, UserRole.SUPER_ADMIN],
        'support_activity',
        { ticketId: 'ticket-sec-99', type: 'TICKET_CREATED' }
      );

      // Customer should NEVER receive staff broadcast
      expect(customerReply.send).not.toHaveBeenCalled();
      // Staff members receive the broadcast
      expect(supportReply.send).toHaveBeenCalledTimes(1);
      expect(adminReply.send).toHaveBeenCalledTimes(1);
    });
  });
});
