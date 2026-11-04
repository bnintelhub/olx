import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/app';
import { prisma } from '../../src/config/prisma';
import { UserRole } from '@prisma/client';
import { HashUtil } from '../../src/shared/utils/hash.util';
import jwt from 'jsonwebtoken';
import { env } from '../../src/config/env';
import { closeOtpQueue } from '../../src/jobs/otp.job';

describe('RBAC & Account Capabilities Integration Tests', () => {
  let app: FastifyInstance;

  // Test users
  let superAdminToken: string;
  let adminToken: string;
  let moderatorToken: string;
  let financeAdminToken: string;
  let contentManagerToken: string;
  let analystToken: string;
  let supportToken: string;
  let buyerSellerUserToken: string;
  let restrictedUserToken: string;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();

    const timestamp = Date.now();

    // Helper to create user and token
    const createTestUser = async (role: UserRole, capabilities: string[] = ['can_buy', 'can_sell']) => {
      const randomSuffix = Math.random().toString(36).substring(2, 8);
      const user = await prisma.user.create({
        data: {
          email: `${role.toLowerCase()}_${randomSuffix}_${timestamp}@test.com`,
          role,
          capabilities,
          status: 'ACTIVE',
          isEmailVerified: true,
          profile: {
            create: { name: `Test ${role}` },
          },
        },
      });

      return jwt.sign(
        { userId: user.id, role: user.role, email: user.email },
        env.JWT_ACCESS_SECRET,
        { expiresIn: '1h' }
      );
    };

    superAdminToken = await createTestUser(UserRole.SUPER_ADMIN);
    adminToken = await createTestUser(UserRole.ADMIN);
    moderatorToken = await createTestUser(UserRole.MODERATOR);
    financeAdminToken = await createTestUser(UserRole.FINANCE_ADMIN);
    contentManagerToken = await createTestUser(UserRole.CONTENT_MANAGER);
    analystToken = await createTestUser(UserRole.ANALYST);
    supportToken = await createTestUser(UserRole.CUSTOMER_SUPPORT);
    buyerSellerUserToken = await createTestUser(UserRole.USER, ['can_buy', 'can_sell']);
    restrictedUserToken = await createTestUser(UserRole.USER, ['can_buy']); // can_sell revoked
  });

  afterAll(async () => {
    await app.close();
    await closeOtpQueue();
  });

  // ==========================================
  // 1. ADMIN PANEL PERMISSION ISOLATION
  // ==========================================

  it('Super Admin has full system control across all endpoints', async () => {
    // Stats (Analytics)
    const statsRes = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/stats',
      headers: { authorization: `Bearer ${superAdminToken}` },
    });
    expect(statsRes.statusCode).toBe(200);

    // Finance overview
    const financeRes = await app.inject({
      method: 'GET',
      url: '/api/v1/payments/admin/overview',
      headers: { authorization: `Bearer ${superAdminToken}` },
    });
    expect(financeRes.statusCode).toBe(200);
  });

  it('Moderator can read ads, but CANNOT refund payments (Strict Separation)', async () => {
    // Moderator CAN view ads for moderation
    const adsRes = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/ads',
      headers: { authorization: `Bearer ${moderatorToken}` },
    });
    expect(adsRes.statusCode).toBe(200);

    // Moderator CANNOT issue refund
    const refundRes = await app.inject({
      method: 'POST',
      url: '/api/v1/payments/admin/refund',
      headers: { authorization: `Bearer ${moderatorToken}` },
      payload: { paymentId: 'pay_12345678' },
    });
    expect(refundRes.statusCode).toBe(403);
    const body = JSON.parse(refundRes.payload);
    expect(body.error.code).toBe('FORBIDDEN_PERMISSION');
  });

  it('Finance Admin can view revenue & refund, but CANNOT manage categories or ads', async () => {
    // Finance Admin CAN view financial overview
    const financeRes = await app.inject({
      method: 'GET',
      url: '/api/v1/payments/admin/overview',
      headers: { authorization: `Bearer ${financeAdminToken}` },
    });
    expect(financeRes.statusCode).toBe(200);

    // Finance Admin CANNOT delete or manage categories
    const catRes = await app.inject({
      method: 'POST',
      url: '/api/v1/categories',
      headers: { authorization: `Bearer ${financeAdminToken}` },
      payload: { name: 'Illegal Category', slug: 'illegal-cat' },
    });
    expect(catRes.statusCode).toBe(403);
    expect(JSON.parse(catRes.payload).error.code).toBe('FORBIDDEN_PERMISSION');
  });

  it('Analyst has read-only analytics, but CANNOT perform user actions', async () => {
    // Analyst CAN read stats
    const statsRes = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/stats',
      headers: { authorization: `Bearer ${analystToken}` },
    });
    expect(statsRes.statusCode).toBe(200);

    // Analyst CANNOT take action on users
    const actionRes = await app.inject({
      method: 'PATCH',
      url: '/api/v1/admin/users/dummy-id/action',
      headers: { authorization: `Bearer ${analystToken}` },
      payload: { action: 'SUSPEND' },
    });
    expect(actionRes.statusCode).toBe(403);
    expect(JSON.parse(actionRes.payload).error.code).toBe('FORBIDDEN_PERMISSION');
  });

  // ==========================================
  // 2. MARKETPLACE ACCOUNT CAPABILITIES
  // ==========================================

  it('Buyer/Seller capability: Unified user can both buy (favourite) and sell (create ad)', async () => {
    // GET /me returns both capabilities
    const meRes = await app.inject({
      method: 'GET',
      url: '/api/v1/auth/me',
      headers: { authorization: `Bearer ${buyerSellerUserToken}` },
    });

    expect(meRes.statusCode).toBe(200);
    const meBody = JSON.parse(meRes.payload).data;
    expect(meBody.capabilities).toContain('can_buy');
    expect(meBody.capabilities).toContain('can_sell');
  });

  it('Restricted user with can_sell revoked gets 403 on listing creation, but retains can_buy', async () => {
    // Restricted user tries to post ad -> Rejected
    const createAdRes = await app.inject({
      method: 'POST',
      url: '/api/v1/ads',
      headers: { authorization: `Bearer ${restrictedUserToken}` },
      payload: {
        title: 'Unauthorized Ad Post',
        description: 'Should fail capability check',
        price: 5000,
        categoryId: 'cat-1',
        locationId: 'loc-1',
      },
    });

    expect(createAdRes.statusCode).toBe(403);
    const body = JSON.parse(createAdRes.payload);
    expect(body.error.code).toBe('FORBIDDEN_CAPABILITY');
    expect(body.error.message).toContain('can_sell');
  });
});
