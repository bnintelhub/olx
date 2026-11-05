import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import fs from 'fs';
import path from 'path';
import jwt from 'jsonwebtoken';
import { buildApp } from '../../src/app';
import { prisma } from '../../src/config/prisma';
import { env } from '../../src/config/env';
import { UserRole } from '@prisma/client';
import { defaultStorage } from '../../src/integrations/storage/storage.adapter';

describe('Admin Media Overview & CRUD Integration Tests', () => {
  let app: FastifyInstance;
  let superAdminToken: string;
  let adminToken: string;
  let regularUserToken: string;
  let superAdminUser: any;
  let regularUser: any;
  let createdMediaId: string;
  let createdDiskDir: string;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();

    // 1. Create or retrieve Super Admin
    superAdminUser = await prisma.user.upsert({
      where: { email: 'superadmin_media_test@bharatmarket.in' },
      update: { role: UserRole.SUPER_ADMIN, status: 'ACTIVE' },
      create: {
        email: 'superadmin_media_test@bharatmarket.in',
        role: UserRole.SUPER_ADMIN,
        status: 'ACTIVE',
      },
    });

    // 2. Create or retrieve Admin
    const adminUser = await prisma.user.upsert({
      where: { email: 'admin_media_test@bharatmarket.in' },
      update: { role: UserRole.ADMIN, status: 'ACTIVE' },
      create: {
        email: 'admin_media_test@bharatmarket.in',
        role: UserRole.ADMIN,
        status: 'ACTIVE',
      },
    });

    // 3. Create or retrieve Regular User
    regularUser = await prisma.user.upsert({
      where: { email: 'regular_media_test@bharatmarket.in' },
      update: { role: UserRole.BUYER, status: 'ACTIVE' },
      create: {
        email: 'regular_media_test@bharatmarket.in',
        role: UserRole.BUYER,
        status: 'ACTIVE',
      },
    });

    superAdminToken = jwt.sign(
      { userId: superAdminUser.id, role: superAdminUser.role, email: superAdminUser.email },
      env.JWT_ACCESS_SECRET,
      { expiresIn: '1h' }
    );

    adminToken = jwt.sign(
      { userId: adminUser.id, role: adminUser.role, email: adminUser.email },
      env.JWT_ACCESS_SECRET,
      { expiresIn: '1h' }
    );

    regularUserToken = jwt.sign(
      { userId: regularUser.id, role: regularUser.role, email: regularUser.email },
      env.JWT_ACCESS_SECRET,
      { expiresIn: '1h' }
    );

    // Create a mock media record with real physical files on disk
    createdMediaId = `med_test_${Date.now()}`;
    createdDiskDir = path.join(defaultStorage.getUploadDir(), 'ads', 'drafts', 'images', createdMediaId);
    if (!fs.existsSync(createdDiskDir)) {
      fs.mkdirSync(createdDiskDir, { recursive: true });
    }
    fs.writeFileSync(path.join(createdDiskDir, 'thumbnail.webp'), 'mock-webp-thumb-content');
    fs.writeFileSync(path.join(createdDiskDir, 'large.webp'), 'mock-webp-large-content');

    await prisma.media.create({
      data: {
        id: createdMediaId,
        userId: regularUser.id,
        type: 'IMAGE',
        status: 'READY',
        scope: 'UNATTACHED',
        originalName: 'car_photo.jpg',
        mimeType: 'image/jpeg',
        fileSize: 1024 * 1024 * 2, // 2MB
        diskPath: `ads/drafts/images/${createdMediaId}`,
        variants: {
          thumbnail: `/uploads/ads/drafts/images/${createdMediaId}/thumbnail.webp`,
          large: `/uploads/ads/drafts/images/${createdMediaId}/large.webp`,
        },
      },
    });
  });

  afterAll(async () => {
    // Cleanup any lingering records
    await prisma.media.deleteMany({
      where: { id: { startsWith: 'med_test_' } },
    }).catch(() => {});

    if (createdDiskDir && fs.existsSync(createdDiskDir)) {
      await fs.promises.rm(createdDiskDir, { recursive: true, force: true }).catch(() => {});
    }

    await app.close();
  });

  describe('RBAC Security Enforcement', () => {
    it('rejects unauthenticated requests with 401', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/admin/media/overview',
      });
      expect(res.statusCode).toBe(401);
    });

    it('rejects regular users with 403', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/admin/media/overview',
        headers: {
          authorization: `Bearer ${regularUserToken}`,
        },
      });
      expect(res.statusCode).toBe(403);
    });

    it('allows Admin to access overview', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/admin/media/overview',
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
      });
      expect(res.statusCode).toBe(200);
    });

    it('allows Super Admin to access overview', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/admin/media/overview',
        headers: {
          authorization: `Bearer ${superAdminToken}`,
        },
      });
      expect(res.statusCode).toBe(200);
    });
  });

  describe('GET /api/v1/admin/media/overview', () => {
    it('returns accurate aggregated media and storage metrics', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/admin/media/overview',
        headers: {
          authorization: `Bearer ${superAdminToken}`,
        },
      });

      expect(res.statusCode).toBe(200);
      const json = JSON.parse(res.payload);
      expect(json.success).toBe(true);
      expect(json.data.totalFiles).toBeGreaterThanOrEqual(1);
      expect(json.data.totalFilesFormatted).toBeDefined();
      expect(json.data.storageConsumed.formatted).toBeDefined();
      expect(json.data.storageInfrastructure).toBeDefined();
      expect(json.data.storageInfrastructure.driver).toBeDefined();
      expect(json.data.optimizationTier.tier).toBe('WebP optimized tier');
      expect(json.data.statusBreakdown).toBeDefined();
      expect(json.data.scopeBreakdown).toBeDefined();
      expect(json.data.recentUploads).toBeInstanceOf(Array);
    });
  });

  describe('GET /api/v1/admin/media (List & Filter)', () => {
    it('returns paginated media with uploader associations', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/admin/media?page=1&limit=10',
        headers: {
          authorization: `Bearer ${superAdminToken}`,
        },
      });

      expect(res.statusCode).toBe(200);
      const json = JSON.parse(res.payload);
      expect(json.success).toBe(true);
      expect(json.data).toBeInstanceOf(Array);
      expect(json.pagination).toBeDefined();
      expect(json.pagination.page).toBe(1);

      const target = json.data.find((m: any) => m.id === createdMediaId);
      expect(target).toBeDefined();
      expect(target.originalName).toBe('car_photo.jpg');
      expect(target.uploader.email).toBe(regularUser.email);
      expect(target.thumbnailUrl).toBeDefined();
    });

    it('filters by status and scope', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/admin/media?status=READY&scope=UNATTACHED',
        headers: {
          authorization: `Bearer ${superAdminToken}`,
        },
      });

      expect(res.statusCode).toBe(200);
      const json = JSON.parse(res.payload);
      for (const item of json.data) {
        expect(item.status).toBe('READY');
        expect(item.scope).toBe('UNATTACHED');
      }
    });

    it('searches by originalName and id', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/admin/media?search=${createdMediaId}`,
        headers: {
          authorization: `Bearer ${superAdminToken}`,
        },
      });

      expect(res.statusCode).toBe(200);
      const json = JSON.parse(res.payload);
      expect(json.data.length).toBeGreaterThanOrEqual(1);
      expect(json.data[0].id).toBe(createdMediaId);
    });
  });

  describe('GET /api/v1/admin/media/:id', () => {
    it('returns full single media item details', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/admin/media/${createdMediaId}`,
        headers: {
          authorization: `Bearer ${superAdminToken}`,
        },
      });

      expect(res.statusCode).toBe(200);
      const json = JSON.parse(res.payload);
      expect(json.data.id).toBe(createdMediaId);
      expect(json.data.originalName).toBe('car_photo.jpg');
      expect(json.data.fileSizeFormatted).toBe('2 MB');
      expect(json.data.uploader.id).toBe(regularUser.id);
    });

    it('returns 404 for non-existent media id', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/admin/media/non-existent-id-12345',
        headers: {
          authorization: `Bearer ${superAdminToken}`,
        },
      });

      expect(res.statusCode).toBe(404);
    });
  });

  describe('PATCH /api/v1/admin/media/:id (Update Metadata)', () => {
    it('updates metadata fields successfully', async () => {
      const res = await app.inject({
        method: 'PATCH',
        url: `/api/v1/admin/media/${createdMediaId}`,
        headers: {
          authorization: `Bearer ${superAdminToken}`,
          'content-type': 'application/json',
        },
        payload: {
          originalName: 'renamed_car_photo.jpg',
          scope: 'LISTING_IMAGE',
        },
      });

      expect(res.statusCode).toBe(200);
      const json = JSON.parse(res.payload);
      expect(json.data.originalName).toBe('renamed_car_photo.jpg');
      expect(json.data.scope).toBe('LISTING_IMAGE');

      // Verify in DB
      const dbMedia = await prisma.media.findUnique({ where: { id: createdMediaId } });
      expect(dbMedia?.originalName).toBe('renamed_car_photo.jpg');
      expect(dbMedia?.scope).toBe('LISTING_IMAGE');
    });
  });

  describe('DELETE /api/v1/admin/media/:id & Physical Disk Space Reclamation', () => {
    it('deletes database record AND physically purges files from disk', async () => {
      // 1. Verify files exist on disk BEFORE deletion
      expect(fs.existsSync(createdDiskDir)).toBe(true);
      expect(fs.existsSync(path.join(createdDiskDir, 'thumbnail.webp'))).toBe(true);

      // 2. Perform admin DELETE call
      const res = await app.inject({
        method: 'DELETE',
        url: `/api/v1/admin/media/${createdMediaId}`,
        headers: {
          authorization: `Bearer ${superAdminToken}`,
        },
      });

      expect(res.statusCode).toBe(200);
      const json = JSON.parse(res.payload);
      expect(json.success).toBe(true);
      expect(json.freedBytes).toBe(1024 * 1024 * 2);

      // 3. Verify record is removed from database
      const dbMedia = await prisma.media.findUnique({ where: { id: createdMediaId } });
      expect(dbMedia).toBeNull();

      // 4. CRUCIAL TEST: Verify physical files and folder were DELETED from disk
      expect(fs.existsSync(path.join(createdDiskDir, 'thumbnail.webp'))).toBe(false);
      expect(fs.existsSync(createdDiskDir)).toBe(false);
    });
  });

  describe('POST /api/v1/admin/media/cleanup-orphans', () => {
    it('reclaims disk space by purging orphaned unattached files older than grace period', async () => {
      // Create a test orphan with 48 hours old createdAt and physical files
      const orphanId = `med_test_orphan_${Date.now()}`;
      const orphanDir = path.join(defaultStorage.getUploadDir(), 'ads', 'drafts', 'images', orphanId);
      fs.mkdirSync(orphanDir, { recursive: true });
      fs.writeFileSync(path.join(orphanDir, 'test.webp'), 'orphan-content');

      const oldDate = new Date(Date.now() - 48 * 3600 * 1000);
      await prisma.media.create({
        data: {
          id: orphanId,
          userId: regularUser.id,
          type: 'IMAGE',
          status: 'READY',
          scope: 'UNATTACHED',
          originalName: 'old_orphan.jpg',
          mimeType: 'image/jpeg',
          fileSize: 500000,
          diskPath: `ads/drafts/images/${orphanId}`,
          isAttached: false,
          createdAt: oldDate,
        },
      });

      expect(fs.existsSync(orphanDir)).toBe(true);

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/admin/media/cleanup-orphans?hours=24',
        headers: {
          authorization: `Bearer ${superAdminToken}`,
        },
      });

      expect(res.statusCode).toBe(200);
      const json = JSON.parse(res.payload);
      expect(json.success).toBe(true);
      expect(json.deletedCount).toBeGreaterThanOrEqual(1);

      // Verify physical directory was purged from disk
      expect(fs.existsSync(orphanDir)).toBe(false);

      // Verify DB record is gone
      const dbOrphan = await prisma.media.findUnique({ where: { id: orphanId } });
      expect(dbOrphan).toBeNull();
    });
  });
});
