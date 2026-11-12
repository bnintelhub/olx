import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import jwt from 'jsonwebtoken';
import { buildApp } from '../../src/app';
import { prisma } from '../../src/config/prisma';
import { env } from '../../src/config/env';
import { UserRole } from '@prisma/client';

describe('Promotions & Banners Integration Tests', () => {
  let app: FastifyInstance;
  let adminToken: string;
  let buyerToken: string;
  let testBannerId: string;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();

    // 1. Setup Admin user
    const adminUser = await prisma.user.upsert({
      where: { email: 'banner_admin@bharatmarket.in' },
      update: { role: UserRole.ADMIN, status: 'ACTIVE' },
      create: {
        email: 'banner_admin@bharatmarket.in',
        role: UserRole.ADMIN,
        status: 'ACTIVE',
      },
    });

    // 2. Setup Buyer user
    const buyerUser = await prisma.user.upsert({
      where: { email: 'banner_buyer@bharatmarket.in' },
      update: { role: UserRole.BUYER, status: 'ACTIVE' },
      create: {
        email: 'banner_buyer@bharatmarket.in',
        role: UserRole.BUYER,
        status: 'ACTIVE',
      },
    });

    adminToken = jwt.sign(
      { userId: adminUser.id, role: adminUser.role, email: adminUser.email },
      env.JWT_ACCESS_SECRET,
      { expiresIn: '1h' }
    );

    buyerToken = jwt.sign(
      { userId: buyerUser.id, role: buyerUser.role, email: buyerUser.email },
      env.JWT_ACCESS_SECRET,
      { expiresIn: '1h' }
    );

    // 3. Seed an active test banner
    const banner = await prisma.banner.create({
      data: {
        title: 'Festival Grand Sale 2026',
        subtitle: 'Up to 50% discount across top verified products',
        ctaText: 'Explore Deals',
        targetUrl: '/search?promo=fest2026',
        position: 'HOME_HERO',
        mediaType: 'IMAGE',
        desktopMediaUrl: '/media/banner-desk.webp',
        mobileMediaUrl: '/media/banner-mob.webp',
        priority: 10,
        status: 'ACTIVE',
        isActive: true,
        startsAt: new Date(Date.now() - 3600000), // 1 hour ago
        endsAt: new Date(Date.now() + 86400000), // 24 hours later
      },
    });
    testBannerId = banner.id;
  });

  afterAll(async () => {
    try {
      if (testBannerId) {
        await prisma.banner.deleteMany({ where: { id: testBannerId } });
      }
      await prisma.user.deleteMany({
        where: { email: { in: ['banner_admin@bharatmarket.in', 'banner_buyer@bharatmarket.in'] } },
      });
      await app.close();
    } catch {}
  });

  it('GET /api/v1/banners - should retrieve active banners for home hero', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/banners?position=HOME_HERO',
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
    const match = body.data.find((b: any) => b.id === testBannerId);
    expect(match).toBeDefined();
    expect(match.title).toBe('Festival Grand Sale 2026');
    expect(match.ctaText).toBe('Explore Deals');
  });

  it('POST /api/v1/banners/:id/impression - should increment impression count atomically', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/banners/${testBannerId}/impression`,
    });

    expect(res.statusCode).toBe(200);
    const updated = await prisma.banner.findUnique({ where: { id: testBannerId } });
    expect(updated?.impressions).toBeGreaterThanOrEqual(1);
  });

  it('POST /api/v1/banners/:id/click - should increment click count atomically', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/banners/${testBannerId}/click`,
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.targetUrl).toBe('/search?promo=fest2026');

    const updated = await prisma.banner.findUnique({ where: { id: testBannerId } });
    expect(updated?.clicks).toBeGreaterThanOrEqual(1);
  });

  it('GET /api/v1/banners/admin - should reject regular buyers without admin role', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/banners/admin',
      headers: { authorization: `Bearer ${buyerToken}` },
    });

    expect(res.statusCode).toBe(403);
  });

  it('GET /api/v1/banners/admin - should allow admin and compute CTR correctly', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/banners/admin',
      headers: { authorization: `Bearer ${adminToken}` },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.items.length).toBeGreaterThan(0);
    const match = body.items.find((b: any) => b.id === testBannerId);
    expect(match).toBeDefined();
    expect(typeof match.ctr).toBe('number');
  });

  it('PATCH /api/v1/banners/admin/:id/status - should allow admin to pause/resume banner', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/v1/banners/admin/${testBannerId}/status`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { status: 'PAUSED' },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.data.status).toBe('PAUSED');
    expect(body.data.isActive).toBe(false);
  });

  describe('Banner Media Upload & Size Limit Validation', () => {
    it('should successfully upload valid image under 10MB', async () => {
      const { BannersService } = await import('../../src/modules/banners/banners.service');
      const mockImageFile: any = {
        mimetype: 'image/webp',
        filename: 'promo.webp',
        toBuffer: async () => Buffer.alloc(1024 * 500), // 500KB
      };

      const result = await BannersService.uploadBannerMedia(mockImageFile);
      expect(result.mediaType).toBe('IMAGE');
      expect(result.url).toContain('/media/banners/');
      expect(result.sizeBytes).toBe(1024 * 500);
    });

    it('should reject image exceeding 10MB limit', async () => {
      const { BannersService } = await import('../../src/modules/banners/banners.service');
      const oversizedImage: any = {
        mimetype: 'image/jpeg',
        filename: 'heavy.jpg',
        toBuffer: async () => Buffer.alloc(11 * 1024 * 1024), // 11MB (> 10MB)
      };

      await expect(BannersService.uploadBannerMedia(oversizedImage)).rejects.toThrow(
        /exceeds maximum limit of 10MB/i
      );
    });

    it('should successfully upload valid video under 50MB', async () => {
      const { BannersService } = await import('../../src/modules/banners/banners.service');
      const mockVideoFile: any = {
        mimetype: 'video/mp4',
        filename: 'teaser.mp4',
        toBuffer: async () => Buffer.alloc(5 * 1024 * 1024), // 5MB
      };

      const result = await BannersService.uploadBannerMedia(mockVideoFile);
      expect(result.mediaType).toBe('VIDEO');
      expect(result.url).toContain('/media/banners/');
      expect(result.sizeBytes).toBe(5 * 1024 * 1024);
    });

    it('should reject video exceeding 50MB limit', async () => {
      const { BannersService } = await import('../../src/modules/banners/banners.service');
      const oversizedVideo: any = {
        mimetype: 'video/mp4',
        filename: 'giant.mp4',
        toBuffer: async () => Buffer.alloc(52 * 1024 * 1024), // 52MB (> 50MB)
      };

      await expect(BannersService.uploadBannerMedia(oversizedVideo)).rejects.toThrow(
        /exceeds maximum limit of 50MB/i
      );
    });

    it('should reject non-media file formats', async () => {
      const { BannersService } = await import('../../src/modules/banners/banners.service');
      const invalidFile: any = {
        mimetype: 'application/pdf',
        filename: 'document.pdf',
        toBuffer: async () => Buffer.alloc(100),
      };

      await expect(BannersService.uploadBannerMedia(invalidFile)).rejects.toThrow(
        /Only standard images/i
      );
    });
  });
});

