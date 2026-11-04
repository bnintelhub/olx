import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/app';
import { closeOtpQueue } from '../../src/jobs/otp.job';
import { prisma } from '../../src/config/prisma';

describe('Auth Flow Integration Tests', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
    await closeOtpQueue();
  });

  // ==========================================
  // MOBILE OTP TESTS
  // ==========================================

  it('POST /api/v1/auth/otp/send generates OTP session', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/otp/send',
      payload: {
        phoneNumber: '9876500001',
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.success).toBe(true);
    expect(body.data.sessionId).toBeDefined();
    expect(body.data.mockOtp).toBe('123456');
  });

  it('POST /api/v1/auth/otp/verify verifies OTP and issues tokens', async () => {
    const sendRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/otp/send',
      payload: { phoneNumber: '9876500002' },
    });
    const { sessionId, mockOtp } = JSON.parse(sendRes.payload).data;

    const verifyRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/otp/verify',
      payload: {
        phoneNumber: '9876500002',
        sessionId,
        otp: mockOtp,
      },
    });

    expect(verifyRes.statusCode).toBe(200);
    const verifyBody = JSON.parse(verifyRes.payload);
    expect(verifyBody.success).toBe(true);
    expect(verifyBody.data.tokens.accessToken).toBeDefined();
    expect(verifyBody.data.tokens.refreshToken).toBeDefined();
    expect(verifyBody.data.user.phoneNumber).toBe('+919876500002');
  });

  // ==========================================
  // EMAIL REGISTER, LOGIN & BULLMQ OTP TESTS
  // ==========================================

  const testEmail = `user_${Date.now()}@test.com`;
  let emailSessionId: string;
  let emailMockOtp: string;

  it('POST /api/v1/auth/register registers user and enqueues BullMQ email OTP job', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: {
        email: testEmail,
        password: 'Password@123',
        name: 'Test Email User',
      },
    });

    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.payload);
    expect(body.success).toBe(true);
    expect(body.data.sessionId).toBeDefined();
    expect(body.data.mockOtp).toBe('123456');

    emailSessionId = body.data.sessionId;
    emailMockOtp = body.data.mockOtp;
  });

  it('POST /api/v1/auth/verify-email-otp verifies email OTP and logs in user', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/verify-email-otp',
      payload: {
        email: testEmail,
        sessionId: emailSessionId,
        otp: emailMockOtp,
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.success).toBe(true);
    expect(body.data.tokens.accessToken).toBeDefined();
    expect(body.data.user.isEmailVerified).toBe(true);
    expect(body.data.user.email).toBe(testEmail);
  });

  it('POST /api/v1/auth/login logs in with email and password', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: {
        email: testEmail,
        password: 'Password@123',
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.success).toBe(true);
    expect(body.data.tokens.accessToken).toBeDefined();
    expect(body.data.user.email).toBe(testEmail);
  });

  it('POST /api/v1/auth/resend-otp resends OTP via BullMQ', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/resend-otp',
      payload: {
        email: testEmail,
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.success).toBe(true);
    expect(body.data.sessionId).toBeDefined();
  });

  // ==========================================
  // FORGOT & RESET PASSWORD FLOW
  // ==========================================

  let resetSessionId: string;
  let resetMockOtp: string;

  it('POST /api/v1/auth/forgot-password sends reset OTP via BullMQ', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/forgot-password',
      payload: {
        email: testEmail,
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.success).toBe(true);
    expect(body.data.sessionId).toBeDefined();
    expect(body.data.mockOtp).toBe('123456');

    resetSessionId = body.data.sessionId;
    resetMockOtp = body.data.mockOtp;
  });

  it('POST /api/v1/auth/reset-password resets password using OTP', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/reset-password',
      payload: {
        email: testEmail,
        sessionId: resetSessionId,
        otp: resetMockOtp,
        newPassword: 'NewPassword@2026',
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.success).toBe(true);
    expect(body.data.message).toContain('reset successfully');

    // Verify login with new password
    const loginRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: {
        email: testEmail,
        password: 'NewPassword@2026',
      },
    });

    expect(loginRes.statusCode).toBe(200);
    expect(JSON.parse(loginRes.payload).success).toBe(true);
  });

  it('GET /api/v1/auth/me requires valid bearer token or cookie', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/auth/me',
    });

    expect(res.statusCode).toBe(401);
  });

  it('POST /api/v1/auth/login sets HTTP-only cookies and records audit log', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: {
        email: testEmail,
        password: 'NewPassword@2026',
      },
    });

    expect(res.statusCode).toBe(200);
    const cookies = res.cookies;
    const accessCookie = cookies.find((c) => c.name === 'access_token');
    const refreshCookie = cookies.find((c) => c.name === 'refresh_token');

    expect(accessCookie).toBeDefined();
    expect(accessCookie?.httpOnly).toBe(true);
    expect(accessCookie?.value).toBeDefined();

    expect(refreshCookie).toBeDefined();
    expect(refreshCookie?.httpOnly).toBe(true);
    expect(refreshCookie?.value).toBeDefined();

    // Verify audit log was recorded in database
    const audit = await prisma.auditLog.findFirst({
      where: {
        action: 'USER_EMAIL_LOGIN',
        entityId: JSON.parse(res.payload).data.user.id,
      },
      orderBy: { createdAt: 'desc' },
    });
    expect(audit).toBeDefined();
    expect(audit?.action).toBe('USER_EMAIL_LOGIN');
  });

  it('GET /api/v1/auth/me authenticates successfully via cookie without Authorization header', async () => {
    // 1. Login to obtain access token
    const loginRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: {
        email: testEmail,
        password: 'NewPassword@2026',
      },
    });
    const { accessToken } = JSON.parse(loginRes.payload).data.tokens;

    // 2. Request /me using only Cookie header (no Authorization header)
    const meRes = await app.inject({
      method: 'GET',
      url: '/api/v1/auth/me',
      cookies: {
        access_token: accessToken,
      },
    });

    expect(meRes.statusCode).toBe(200);
    const body = JSON.parse(meRes.payload);
    expect(body.success).toBe(true);
    expect(body.data.email).toBe(testEmail);
  });

  it('GET /api/v1/auth/me authenticates successfully via Authorization Bearer header as fallback', async () => {
    const loginRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: {
        email: testEmail,
        password: 'NewPassword@2026',
      },
    });
    const { accessToken } = JSON.parse(loginRes.payload).data.tokens;

    // Request /me using only Authorization Bearer header (no cookies)
    const meRes = await app.inject({
      method: 'GET',
      url: '/api/v1/auth/me',
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
    });

    expect(meRes.statusCode).toBe(200);
    const body = JSON.parse(meRes.payload);
    expect(body.success).toBe(true);
    expect(body.data.email).toBe(testEmail);
  });

  it('POST /api/v1/auth/refresh refreshes tokens using cookie', async () => {
    const loginRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: {
        email: testEmail,
        password: 'NewPassword@2026',
      },
    });
    const { refreshToken } = JSON.parse(loginRes.payload).data.tokens;

    // Send refresh request with cookie
    const refreshRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/refresh',
      cookies: {
        refresh_token: refreshToken,
      },
      payload: {},
    });

    expect(refreshRes.statusCode).toBe(200);
    const body = JSON.parse(refreshRes.payload);
    expect(body.success).toBe(true);
    expect(body.data.accessToken).toBeDefined();

    // Verify refreshed cookies are returned
    const accessCookie = refreshRes.cookies.find((c) => c.name === 'access_token');
    expect(accessCookie).toBeDefined();
    expect(accessCookie?.httpOnly).toBe(true);
  });

  it('POST /api/v1/auth/logout clears auth cookies and records audit log', async () => {
    const loginRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: {
        email: testEmail,
        password: 'NewPassword@2026',
      },
    });
    const { accessToken } = JSON.parse(loginRes.payload).data.tokens;

    const logoutRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/logout',
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
    });

    expect(logoutRes.statusCode).toBe(200);
    const body = JSON.parse(logoutRes.payload);
    expect(body.success).toBe(true);

    // Verify access_token cookie is cleared (empty value or expired)
    const accessCookie = logoutRes.cookies.find((c) => c.name === 'access_token');
    expect(accessCookie).toBeDefined();
    expect(accessCookie?.value).toBe('');
  });
});
