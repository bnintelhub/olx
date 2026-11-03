import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/app';

describe('Auth Flow Integration Tests', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

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
    // 1. Send OTP
    const sendRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/otp/send',
      payload: { phoneNumber: '9876500002' },
    });
    const { sessionId, mockOtp } = JSON.parse(sendRes.payload).data;

    // 2. Verify OTP
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

  it('GET /api/v1/auth/me requires valid bearer token', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/auth/me',
    });

    expect(res.statusCode).toBe(401);
  });
});

