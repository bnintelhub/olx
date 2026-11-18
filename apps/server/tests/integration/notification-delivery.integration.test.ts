import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/app';
import { prisma } from '../../src/config/prisma';
import { UserRole, NotificationType } from '@prisma/client';
import jwt from 'jsonwebtoken';
import { env } from '../../src/config/env';

describe('Notification Delivery Architecture — Integration & Security Test Suite', () => {
  let app: FastifyInstance;
  let regularUserToken: string;
  let regularUserId: string;
  let supportStaffToken: string;
  let supportStaffId: string;
  let adminToken: string;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();

    const timestamp = Date.now();

    // 1. Create standard customer user
    const regularUser = await prisma.user.create({
      data: {
        email: `cust_${timestamp}@test.com`,
        role: UserRole.USER,
        status: 'ACTIVE',
        isEmailVerified: true,
        profile: { create: { name: 'Regular Customer' } },
      },
    });
    regularUserId = regularUser.id;
    regularUserToken = jwt.sign(
      { userId: regularUser.id, role: regularUser.role, email: regularUser.email },
      env.JWT_ACCESS_SECRET,
      { expiresIn: '1h' }
    );

    // 2. Create customer support staff user
    const supportUser = await prisma.user.create({
      data: {
        email: `support_${timestamp}@test.com`,
        role: UserRole.CUSTOMER_SUPPORT,
        status: 'ACTIVE',
        isEmailVerified: true,
        profile: { create: { name: 'Support Specialist' } },
      },
    });
    supportStaffId = supportUser.id;
    supportStaffToken = jwt.sign(
      { userId: supportUser.id, role: supportUser.role, email: supportUser.email },
      env.JWT_ACCESS_SECRET,
      { expiresIn: '1h' }
    );

    // 3. Create administrator user
    const adminUser = await prisma.user.create({
      data: {
        email: `admin_${timestamp}@test.com`,
        role: UserRole.ADMIN,
        status: 'ACTIVE',
        isEmailVerified: true,
        profile: { create: { name: 'Platform Admin' } },
      },
    });
    adminToken = jwt.sign(
      { userId: adminUser.id, role: adminUser.role, email: adminUser.email },
      env.JWT_ACCESS_SECRET,
      { expiresIn: '1h' }
    );
  });

  afterAll(async () => {
    // Cleanup created test records
    const ids = [regularUserId, supportStaffId].filter(Boolean);
    if (ids.length > 0) {
      await prisma.notification.deleteMany({
        where: { userId: { in: ids } },
      }).catch(() => {});
      await prisma.user.deleteMany({
        where: { id: { in: ids } },
      }).catch(() => {});
    }
    if (app) {
      await app.close();
    }
  });

  // =========================================================================
  // 1. SMOKE & SANITY ENDPOINT TESTS
  // =========================================================================
  describe('1. Endpoint Smoke & Sanity', () => {
    it('GET /api/v1/notifications/unread-count returns 200 and unread badge count', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/notifications/unread-count',
        headers: { authorization: `Bearer ${regularUserToken}` },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.success).toBe(true);
      expect(typeof body.count).toBe('number');
    });

    it('GET /api/v1/notifications/status returns connection status and tab count', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/notifications/status',
        headers: { authorization: `Bearer ${regularUserToken}` },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.success).toBe(true);
      expect(body.userId).toBe(regularUserId);
      expect(body.isConnected).toBe(false); // No active SSE socket in headless inject
      expect(body.activeTabs).toBe(0);
    });
  });

  // =========================================================================
  // 2. SECURITY & AUTHORIZATION TESTS
  // =========================================================================
  describe('2. Security & Role Guard Enforcement', () => {
    it('Rejects unauthenticated request to SSE stream with 401', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/notifications/stream',
      });
      expect(res.statusCode).toBe(401);
    });

    it('Rejects unauthenticated request to dispatch endpoint with 401', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/notifications/dispatch',
        payload: {
          recipientId: regularUserId,
          title: 'Unauthorized Alert',
          body: 'Should fail',
        },
      });
      expect(res.statusCode).toBe(401);
    });

    it('Rejects regular customer (USER role) from dispatching notifications with 403 Forbidden', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/notifications/dispatch',
        headers: {
          authorization: `Bearer ${regularUserToken}`,
          'X-App-Context': 'client',
        },
        payload: {
          recipientId: regularUserId,
          title: 'Malicious Push Attempt',
          body: 'Attempting to trigger notification without permission',
        },
      });

      expect(res.statusCode).toBe(403);
    });

    it('Allows authorized Admin to trigger notification dispatch with 200 OK', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/notifications/dispatch',
        headers: {
          authorization: `Bearer ${adminToken}`,
          'X-App-Context': 'admin',
        },
        payload: {
          recipientId: regularUserId,
          title: 'Account Verification Completed',
          body: 'Your identity document has been verified by the desk.',
          priority: 'NORMAL',
          data: { type: 'support_message' },
        },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.success).toBe(true);
      expect(body.data.notificationId).toBeTruthy();
      expect(body.data.deliveredVia).toBe('PUSH'); // Offline user receives Push fallback
    });
  });

  // =========================================================================
  // 3. BOUNDARY & NEGATIVE TESTS
  // =========================================================================
  describe('3. Boundary & Input Validation', () => {
    it('POST /dispatch returns 400 when title or body is missing', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/notifications/dispatch',
        headers: {
          authorization: `Bearer ${adminToken}`,
          'X-App-Context': 'admin',
        },
        payload: {
          recipientId: regularUserId,
          title: '',
          body: '',
        },
      });

      expect(res.statusCode).toBe(400);
    });

    it('POST /push-token returns 400 when token string is missing', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/notifications/push-token',
        headers: { authorization: `Bearer ${regularUserToken}` },
        payload: {},
      });

      expect(res.statusCode).toBe(400);
    });
  });

  // =========================================================================
  // 4. REGRESSION & PERSISTENCE TESTS
  // =========================================================================
  describe('4. Regression & State Lifecycle', () => {
    it('PATCH /read-all marks all unread notifications as read and resets count to 0', async () => {
      // 1. Create an unread notification directly
      await prisma.notification.create({
        data: {
          userId: regularUserId,
          type: NotificationType.SYSTEM_ALERT,
          title: 'Test Notification',
          body: 'Testing read-all',
          isRead: false,
        },
      });

      // 2. Call read-all endpoint
      const patchRes = await app.inject({
        method: 'PATCH',
        url: '/api/v1/notifications/read-all',
        headers: { authorization: `Bearer ${regularUserToken}` },
      });

      expect(patchRes.statusCode).toBe(200);

      // 3. Verify unread count is now 0
      const countRes = await app.inject({
        method: 'GET',
        url: '/api/v1/notifications/unread-count',
        headers: { authorization: `Bearer ${regularUserToken}` },
      });

      const countBody = JSON.parse(countRes.payload);
      expect(countBody.count).toBe(0);
    });
  });
});
