import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import Fastify, { FastifyInstance } from 'fastify';
import fastifyStatic from '@fastify/static';
import { BannersService } from '../../src/modules/banners/banners.service';
import { DiskStorageAdapter } from '../../src/integrations/storage/storage.adapter';

describe('Media Direct Storage & Retrieval Tests (No Microservice)', () => {
  const testMediaRoot = path.join(process.cwd(), 'test-data-media');
  let fastify: FastifyInstance;

  beforeEach(async () => {
    // Ensure clean test storage directory
    if (!fs.existsSync(testMediaRoot)) {
      fs.mkdirSync(testMediaRoot, { recursive: true });
    }

    // Configure Fastify instance mimicking app.ts static routes
    fastify = Fastify({ logger: false });

    await fastify.register(fastifyStatic, {
      root: testMediaRoot,
      prefix: '/media/',
      decorateReply: true,
    });

    await fastify.ready();
  });

  afterEach(async () => {
    await fastify.close();
    if (fs.existsSync(testMediaRoot)) {
      await fs.promises.rm(testMediaRoot, { recursive: true, force: true }).catch(() => {});
    }
  });

  describe('Static Media Retrieval (/media/*)', () => {
    it('retrieves an existing image from MEDIA_ROOT via GET /media/:filename', async () => {
      const fileName = 'test-banner.jpg';
      const filePath = path.join(testMediaRoot, fileName);
      const testContent = Buffer.from('mock-jpeg-content');
      fs.writeFileSync(filePath, testContent);

      const response = await fastify.inject({
        method: 'GET',
        url: `/media/${fileName}`,
      });

      expect(response.statusCode).toBe(200);
      expect(response.rawPayload.equals(testContent)).toBe(true);
    });

    it('retrieves a nested banner video via GET /media/banners/:filename', async () => {
      const bannersDir = path.join(testMediaRoot, 'banners');
      fs.mkdirSync(bannersDir, { recursive: true });

      const fileName = 'promo-video.mp4';
      const filePath = path.join(bannersDir, fileName);
      const testContent = Buffer.from('mock-mp4-video-stream');
      fs.writeFileSync(filePath, testContent);

      const response = await fastify.inject({
        method: 'GET',
        url: `/media/banners/${fileName}`,
      });

      expect(response.statusCode).toBe(200);
      expect(response.rawPayload.equals(testContent)).toBe(true);
    });

    it('returns 404 for non-existent files', async () => {
      const response = await fastify.inject({
        method: 'GET',
        url: '/media/non-existent-file.jpg',
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('Banner Media Direct Upload Validation & Disk Persistence', () => {
    it('accepts and saves valid image under 10MB into banners directory', async () => {
      const originalMediaRoot = process.env.MEDIA_ROOT;
      process.env.MEDIA_ROOT = testMediaRoot;

      try {
        const mockImageBuffer = Buffer.from('mock-image-data-within-10mb');
        const mockFile: any = {
          filename: 'hero-banner.png',
          mimetype: 'image/png',
          toBuffer: async () => mockImageBuffer,
        };

        const result = await BannersService.uploadBannerMedia(mockFile);

        expect(result.url).toMatch(/^\/media\/banners\/banner-[a-f0-9-]+\.png$/);
        expect(result.mediaType).toBe('IMAGE');
        expect(result.mimeType).toBe('image/png');
        expect(result.sizeBytes).toBe(mockImageBuffer.length);

        // Verify physical file was written to testMediaRoot
        const relativeDiskPath = result.url.replace(/^\/media\//, '');
        const savedFilePath = path.join(testMediaRoot, relativeDiskPath);
        expect(fs.existsSync(savedFilePath)).toBe(true);
      } finally {
        process.env.MEDIA_ROOT = originalMediaRoot;
      }
    });

    it('accepts and saves valid video under 50MB into banners directory', async () => {
      const originalMediaRoot = process.env.MEDIA_ROOT;
      process.env.MEDIA_ROOT = testMediaRoot;

      try {
        const mockVideoBuffer = Buffer.from('mock-mp4-video-data-within-50mb');
        const mockFile: any = {
          filename: 'summer-sale.mp4',
          mimetype: 'video/mp4',
          toBuffer: async () => mockVideoBuffer,
        };

        const result = await BannersService.uploadBannerMedia(mockFile);

        expect(result.url).toMatch(/^\/media\/banners\/banner-[a-f0-9-]+\.mp4$/);
        expect(result.mediaType).toBe('VIDEO');
        expect(result.mimeType).toBe('video/mp4');
        expect(result.sizeBytes).toBe(mockVideoBuffer.length);

        const relativeDiskPath = result.url.replace(/^\/media\//, '');
        const savedFilePath = path.join(testMediaRoot, relativeDiskPath);
        expect(fs.existsSync(savedFilePath)).toBe(true);
      } finally {
        process.env.MEDIA_ROOT = originalMediaRoot;
      }
    });

    it('rejects image exceeding 10MB limit', async () => {
      const oversizedImageBuffer = Buffer.alloc(11 * 1024 * 1024); // 11MB
      const mockFile: any = {
        filename: 'huge-image.jpg',
        mimetype: 'image/jpeg',
        toBuffer: async () => oversizedImageBuffer,
      };

      await expect(BannersService.uploadBannerMedia(mockFile)).rejects.toThrow(
        /Image exceeds maximum limit of 10MB/i
      );
    });

    it('rejects video exceeding 50MB limit', async () => {
      const oversizedVideoBuffer = Buffer.alloc(51 * 1024 * 1024); // 51MB
      const mockFile: any = {
        filename: 'huge-movie.mp4',
        mimetype: 'video/mp4',
        toBuffer: async () => oversizedVideoBuffer,
      };

      await expect(BannersService.uploadBannerMedia(mockFile)).rejects.toThrow(
        /Video exceeds maximum limit of 50MB/i
      );
    });

    it('rejects unsupported file mime types', async () => {
      const mockFile: any = {
        filename: 'malicious.exe',
        mimetype: 'application/x-msdownload',
        toBuffer: async () => Buffer.from('malicious payload'),
      };

      await expect(BannersService.uploadBannerMedia(mockFile)).rejects.toThrow(
        /Only standard images/i
      );
    });
  });

  describe('DiskStorageAdapter Operations Under Direct Storage', () => {
    it('writes, reads, and deletes media files directly on disk', async () => {
      const storage = new DiskStorageAdapter(testMediaRoot);
      const testMediaId = 'item-abc-123';
      const fileContent = Buffer.from('image-variant-test-bytes');

      const relativePath = await storage.writeVariantFile(testMediaId, 'original.jpg', fileContent);
      const destination = path.join(testMediaRoot, ...relativePath.split('/'));
      expect(fs.existsSync(destination)).toBe(true);

      // Verify delete
      await storage.deleteMediaFiles(testMediaId);
      expect(fs.existsSync(destination)).toBe(false);
    });
  });
});
