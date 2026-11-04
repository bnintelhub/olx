import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/app';

describe('Marketplace Full E2E Flow', () => {
  let app: FastifyInstance;
  let token: string;
  let testUserId: string;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();

    // 1. Authenticate user
    const sendRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/otp/send',
      payload: { phoneNumber: '9998887776' },
    });
    const { sessionId, mockOtp } = JSON.parse(sendRes.payload).data;

    const verifyRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/otp/verify',
      payload: {
        phoneNumber: '9998887776',
        sessionId,
        otp: mockOtp,
      },
    });

    const verifyData = JSON.parse(verifyRes.payload).data;
    token = verifyData.tokens.accessToken;
    testUserId = verifyData.user.id;
  });

  afterAll(async () => {
    await app.close();
  });

  it('1. GET /api/v1/auth/me returns authenticated user profile', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/auth/me',
      headers: { authorization: `Bearer ${token}` },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.success).toBe(true);
    expect(body.data.id).toBe(testUserId);
  });

  it('2. GET /api/v1/locations/cities returns available cities', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/locations/cities',
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.success).toBe(true);
  });

  it('3. GET /api/v1/ads searches and returns active listings', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/ads?limit=10',
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.success).toBe(true);
    expect(body.data.ads).toBeDefined();
    expect(body.data.pagination).toBeDefined();
  });

  it('4. GET /api/v1/ads/suggestions returns autocomplete suggestions', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/ads/suggestions?q=car',
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
  });
});

