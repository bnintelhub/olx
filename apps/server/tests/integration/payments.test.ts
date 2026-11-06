import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { buildApp } from '../../src/app';
import { env } from '../../src/config/env';
import { prisma } from '../../src/config/prisma';
import { PaymentPurpose } from '../../src/modules/payments/payment.types';

describe('Payment & PayU Integration Tests', () => {
  let app: FastifyInstance;
  let testUser: any;
  let userToken: string;
  let createdOrderId: string;
  let createdTxnId: string;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();

    // Create test user if not existing
    testUser = await prisma.user.findFirst({
      where: { email: 'payu_test_user@example.com' },
      include: { profile: true },
    });
    if (!testUser) {
      testUser = await prisma.user.create({
        data: {
          email: 'payu_test_user@example.com',
          phoneNumber: '+919999988888',
          role: 'USER',
          status: 'ACTIVE',
          profile: {
            create: {
              name: 'PayU Test User',
            },
          },
        },
        include: { profile: true },
      });
    }

    userToken = jwt.sign(
      { userId: testUser.id, role: testUser.role, email: testUser.email },
      env.JWT_ACCESS_SECRET,
      { expiresIn: '1h' }
    );
  });

  afterAll(async () => {
    if (createdOrderId) {
      await prisma.paymentTransaction.deleteMany({ where: { paymentOrderId: createdOrderId } }).catch(() => {});
      await prisma.paymentOrder.delete({ where: { id: createdOrderId } }).catch(() => {});
    }
    await app.close();
  });

  it('POST /api/v1/payments/orders returns 401 Unauthorized without token', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/payments/orders',
      payload: {
        purpose: PaymentPurpose.LISTING_BOOST,
        productId: 'boost_7_days',
      },
    });

    expect(res.statusCode).toBe(401);
  });

  it('POST /api/v1/payments/orders rejects invalid product IDs', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/payments/orders',
      headers: { authorization: `Bearer ${userToken}` },
      payload: {
        purpose: PaymentPurpose.LISTING_BOOST,
        productId: 'non_existent_product',
      },
    });

    expect(res.statusCode).toBe(400);
    const body = JSON.parse(res.payload);
    expect(body.message).toMatch(/Unrecognized or inactive product/);
  });

  it('POST /api/v1/payments/orders ignores any client-supplied amount and uses authoritative price', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/payments/orders',
      headers: { authorization: `Bearer ${userToken}` },
      payload: {
        purpose: PaymentPurpose.LISTING_BOOST,
        productId: 'boost_7_days',
        amount: 1, // Malicious attempt to override server price
      },
    });

    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.payload);
    expect(body.success).toBe(true);
    expect(body.data.amount).toBe(99.0); // Must be ₹99, not ₹1
    expect(body.data.checkoutParams.amount).toBe('99.00');

    createdOrderId = body.data.paymentOrderId;
    createdTxnId = body.data.transactionId;
  });

  it('POST /api/v1/payments/orders returns required PayU checkout parameters and hash', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/payments/orders',
      headers: { authorization: `Bearer ${userToken}` },
      payload: {
        purpose: PaymentPurpose.SELLER_SUBSCRIPTION,
        productId: 'seller_pro_monthly',
      },
    });

    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.payload);
    expect(body.data.checkoutUrl).toContain('/_payment');
    expect(body.data.checkoutParams).toBeDefined();
    expect(body.data.checkoutParams.key).toBe(env.PAYU_MERCHANT_KEY);
    expect(body.data.checkoutParams.hash).toHaveLength(128);
    expect(body.data.checkoutParams.surl).toContain('/payu/success');
    expect(body.data.checkoutParams.furl).toContain('/payu/failure');

    // Clean up
    await prisma.paymentTransaction.deleteMany({ where: { paymentOrderId: body.data.paymentOrderId } }).catch(() => {});
    await prisma.paymentOrder.delete({ where: { id: body.data.paymentOrderId } }).catch(() => {});
  });

  it('GET /api/v1/payments/orders/:id retrieves order details for authenticated owner', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/payments/orders/${createdOrderId}`,
      headers: { authorization: `Bearer ${userToken}` },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.data.id).toBe(createdOrderId);
    expect(body.data.amount).toBe(99);
    expect(body.data.status).toBe('CREATED');
  });

  it('POST /api/v1/payments/webhooks/payu rejects webhook with invalid signature', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/payments/webhooks/payu',
      payload: {
        txnid: createdTxnId,
        amount: '99.00',
        status: 'success',
        hash: 'invalid_tampered_hash_signature',
      },
    });

    expect(res.statusCode).toBe(400);
    const body = JSON.parse(res.payload);
    expect(body.message).toMatch(/signature validation failed/i);
  });

  it('POST /api/v1/payments/webhooks/payu processes authentic webhook idempotently', async () => {
    // Generate valid reverse hash
    const salt = env.PAYU_MERCHANT_SALT;
    const key = env.PAYU_MERCHANT_KEY;
    const userName = testUser.profile?.name || 'Customer';
    const reverseSequence = `${salt}|success||||||${testUser.id}|boost_7_days|LISTING_BOOST||${createdOrderId}|${testUser.email}|${userName}|7 Days Standard Boost|99.00|${createdTxnId}|${key}`;
    const validHash = crypto.createHash('sha512').update(reverseSequence).digest('hex').toLowerCase();

    const webhookPayload = {
      key,
      txnid: createdTxnId,
      amount: '99.00',
      productinfo: '7 Days Standard Boost',
      firstname: userName,
      email: testUser.email,
      status: 'success',
      mode: 'UPI',
      mihpayid: '1234567890',
      udf1: createdOrderId,
      udf2: '',
      udf3: 'LISTING_BOOST',
      udf4: 'boost_7_days',
      udf5: testUser.id,
      hash: validHash,
    };

    // First delivery
    const res1 = await app.inject({
      method: 'POST',
      url: '/api/v1/payments/webhooks/payu',
      payload: webhookPayload,
    });

    expect(res1.statusCode).toBe(200);

    // Verify order updated to SUCCESS
    const updatedOrder = await prisma.paymentOrder.findUnique({ where: { id: createdOrderId } });
    expect(updatedOrder?.status).toBe('SUCCESS');

    // Duplicate webhook delivery (Idempotency test)
    const res2 = await app.inject({
      method: 'POST',
      url: '/api/v1/payments/webhooks/payu',
      payload: webhookPayload,
    });

    expect(res2.statusCode).toBe(200);
    const body2 = JSON.parse(res2.payload);
    expect(body2.message).toContain('idempotent');
  });
});
