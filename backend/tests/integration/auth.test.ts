import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/app';
import { closeOtpQueue } from '../../src/jobs/otp.job';

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

  it('GET /api/v1/auth/me requires valid bearer token', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/auth/me',
    });

    expect(res.statusCode).toBe(401);
  });
});
