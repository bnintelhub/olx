import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { Readable } from 'stream';
import {
  buildMediaPath,
  buildMediaDirectory,
  isSingleFileResource,
} from '@olx/shared';
import {
  validateImageMagicBytes,
  parseImageDimensions,
} from '../../src/shared/utils/image-validator.util';
import { DiskStorageAdapter } from '../../src/integrations/storage/storage.adapter';
import {
  createListingSchema,
  reorderListingImagesSchema,
} from '../../src/modules/listings/listings.schema';

describe('Media Foundation Unit Tests', () => {
  const testUploadsDir = path.join(process.cwd(), 'uploads_test');
  let storage: DiskStorageAdapter;

  beforeEach(() => {
    storage = new DiskStorageAdapter(testUploadsDir);
  });

  afterEach(async () => {
    if (fs.existsSync(testUploadsDir)) {
      await fs.promises.rm(testUploadsDir, { recursive: true, force: true }).catch(() => {});
    }
  });

  describe('Magic Bytes Validation', () => {
    it('accurately identifies JPEG magic bytes', () => {
      const jpegBuffer = Buffer.from([
        0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
      ]);
      const result = validateImageMagicBytes(jpegBuffer);
      expect(result).not.toBeNull();
      expect(result?.format).toBe('jpeg');
      expect(result?.mimeType).toBe('image/jpeg');
    });

    it('accurately identifies PNG magic bytes', () => {
      const pngBuffer = Buffer.from([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
      ]);
      const result = validateImageMagicBytes(pngBuffer);
      expect(result).not.toBeNull();
      expect(result?.format).toBe('png');
      expect(result?.mimeType).toBe('image/png');
    });

    it('accurately identifies WebP magic bytes', () => {
      const webpBuffer = Buffer.concat([
        Buffer.from('RIFF'),
        Buffer.from([0x00, 0x00, 0x00, 0x00]),
        Buffer.from('WEBP'),
      ]);
      const result = validateImageMagicBytes(webpBuffer);
      expect(result).not.toBeNull();
      expect(result?.format).toBe('webp');
      expect(result?.mimeType).toBe('image/webp');
    });

    it('accurately identifies HEIC magic bytes', () => {
      const heicBuffer = Buffer.concat([
        Buffer.from([0x00, 0x00, 0x00, 0x18]),
        Buffer.from('ftypheic'),
        Buffer.from([0x00, 0x00, 0x00, 0x00]),
      ]);
      const result = validateImageMagicBytes(heicBuffer);
      expect(result).not.toBeNull();
      expect(result?.format).toBe('heic');
      expect(result?.mimeType).toBe('image/heic');
    });

    it('rejects disguised executables, scripts, or text files', () => {
      const exeBuffer = Buffer.from('MZ\x90\x00\x03\x00\x00\x00\x04\x00\x00\x00');
      const scriptBuffer = Buffer.from('#!/bin/bash\necho "exploit"');
      const htmlBuffer = Buffer.from('<!DOCTYPE html><html><body>');

      expect(validateImageMagicBytes(exeBuffer)).toBeNull();
      expect(validateImageMagicBytes(scriptBuffer)).toBeNull();
      expect(validateImageMagicBytes(htmlBuffer)).toBeNull();
    });
  });

  describe('Image Dimensions & Resolution Validation', () => {
    it('accurately parses PNG dimensions', () => {
      const pngBuf = Buffer.alloc(24);
      pngBuf[0] = 0x89; pngBuf[1] = 0x50; pngBuf[2] = 0x4e; pngBuf[3] = 0x47;
      pngBuf.writeUInt32BE(1920, 16);
      pngBuf.writeUInt32BE(1080, 20);

      const dims = parseImageDimensions(pngBuf);
      expect(dims).toEqual({ width: 1920, height: 1080 });
    });

    it('accurately parses JPEG dimensions and identifies 8K resolution', () => {
      const jpeg8kBuf = Buffer.from([
        0xff, 0xd8, // SOI
        0xff, 0xe0, 0x00, 0x10, ...Buffer.alloc(14), // APP0
        0xff, 0xc0, 0x00, 0x11, 0x08, 0x15, 0x58, 0x20, 0x00 // SOF0: height 5464 (0x1558), width 8192 (0x2000)
      ]);

      const dims = parseImageDimensions(jpeg8kBuf);
      expect(dims).toEqual({ width: 8192, height: 5464 });
      expect(dims!.width > 5000 || dims!.height > 5000).toBe(true);
    });

    it('accurately parses standard DSLR portrait dimensions within 5000px limit', () => {
      const dslrBuf = Buffer.from([
        0xff, 0xd8,
        0xff, 0xe0, 0x00, 0x10, ...Buffer.alloc(14),
        0xff, 0xc0, 0x00, 0x11, 0x08, 0x10, 0xc0, 0x0b, 0x20 // height 4288 (0x10c0), width 2848 (0x0b20)
      ]);

      const dims = parseImageDimensions(dslrBuf);
      expect(dims).toEqual({ width: 2848, height: 4288 });
      expect(dims!.width <= 5000 && dims!.height <= 5000).toBe(true);
    });

    it('accurately parses WebP dimensions for standard resolution', () => {
      const webpXBuf = Buffer.alloc(32);
      webpXBuf.write('RIFF', 0, 4, 'ascii');
      webpXBuf.write('WEBP', 8, 4, 'ascii');
      webpXBuf.write('VP8X', 12, 4, 'ascii');
      webpXBuf.writeUIntLE(4096 - 1, 24, 3);
      webpXBuf.writeUIntLE(2732 - 1, 27, 3);

      const dims = parseImageDimensions(webpXBuf);
      expect(dims).toEqual({ width: 4096, height: 2732 });
      expect(dims!.width <= 5000 && dims!.height <= 5000).toBe(true);
    });

    it('accurately parses HEIC ispe box dimensions', () => {
      const heicBuf = Buffer.concat([
        Buffer.from([0, 0, 0, 24]),
        Buffer.from('ftypheic'),
        Buffer.from([0, 0, 0, 0]),
        Buffer.from([0, 0, 0, 20]),
        Buffer.from('ispe'),
        Buffer.from([0, 0, 0, 0]),
        Buffer.from([0, 0, 15, 192]), // width: 4032
        Buffer.from([0, 0, 11, 208]), // height: 3024
      ]);

      const dims = parseImageDimensions(heicBuf);
      expect(dims).toEqual({ width: 4032, height: 3024 });
      expect(dims!.width <= 5000 && dims!.height <= 5000).toBe(true);
    });
  });

  describe('DiskStorageAdapter', () => {
    it('computes deterministic two-level MD5 hex directory sharding', () => {
      const mediaId = 'med_01JXYZ987';
      const subpath = storage.getVariantSubpath(mediaId);
      const parts = subpath.split('/');

      expect(parts).toHaveLength(3);
      expect(parts[0]).toMatch(/^[0-9a-f]{2}$/);
      expect(parts[1]).toMatch(/^[0-9a-f]{2}$/);
      expect(parts[2]).toBe(mediaId);
    });

    it('constructs public variant URLs with custom CDN host or default', () => {
      const subpath = 'ab/cd/med_123/thumb.webp';
      const defaultUrl = storage.buildPublicUrl(subpath);
      expect(defaultUrl).toContain('/uploads/variants/ab/cd/med_123/thumb.webp');

      const cdnUrl = storage.buildPublicUrl(subpath, 'https://cdn.example.com');
      expect(cdnUrl).toBe('https://cdn.example.com/uploads/variants/ab/cd/med_123/thumb.webp');
    });

    it('saves temporary stream and captures initial inspection bytes', async () => {
      const sampleContent = Buffer.from('Hello test world stream buffer');
      const sampleStream = Readable.from(sampleContent);

      const result = await storage.saveTemporaryFile(sampleStream, 'test_temp.tmp');
      expect(result.size).toBe(sampleContent.length);
      expect(result.initialBuffer.toString()).toBe(sampleContent.toString());
      expect(fs.existsSync(result.tempPath)).toBe(true);

      // Clean up
      await storage.deleteFile(result.tempPath);
      expect(fs.existsSync(result.tempPath)).toBe(false);
    });

    it('writes and cleans up variant directories', async () => {
      const mediaId = 'med_test_cleanup_1';
      const buffer = Buffer.from('fake-webp-image-data');

      const savedPath = await storage.writeVariantFile(mediaId, 'thumb.webp', buffer);
      expect(savedPath).toContain('thumb.webp');

      const dir = storage.getVariantDirectory(mediaId);
      expect(fs.existsSync(dir)).toBe(true);
      expect(fs.existsSync(path.join(dir, 'thumb.webp'))).toBe(true);

      await storage.deleteMediaFiles(mediaId);
      expect(fs.existsSync(dir)).toBe(false);
    });
  });

  describe('Listing Schemas with Media IDs', () => {
    it('accepts listing request with mediaId array', () => {
      const payload = {
        title: 'Apple iPhone 15 Pro Max 256GB',
        description: 'Brand new sealed unit with original bill and full 1-year Apple India warranty.',
        price: 98000,
        categoryId: 'mobiles-cat-id',
        locationId: 'delhi-loc-id',
        images: [
          {
            mediaId: 'med_01JXYZ',
            sortOrder: 0,
            isCover: true,
          },
          {
            mediaId: 'med_02JXYZ',
            sortOrder: 1,
            isCover: false,
          },
        ],
      };

      const parsed = createListingSchema.parse(payload);
      expect(parsed.images).toHaveLength(2);
      expect(parsed.images[0].mediaId).toBe('med_01JXYZ');
      expect(parsed.images[0].isCover).toBe(true);
    });

    it('validates reorderListingImagesSchema', () => {
      const payload = {
        images: [
          { mediaId: 'med_02', sortOrder: 0, isCover: true },
          { mediaId: 'med_01', sortOrder: 1, isCover: false },
        ],
      };

      const parsed = reorderListingImagesSchema.parse(payload);
      expect(parsed.images).toHaveLength(2);
      expect(parsed.images[0].mediaId).toBe('med_02');
    });

    it('rejects listing requests exceeding maximum 8 photos', () => {
      const payload = {
        title: 'Apple iPhone 15 Pro Max 256GB',
        description: 'Brand new sealed unit with original bill and full 1-year Apple India warranty.',
        price: 98000,
        categoryId: 'mobiles-cat-id',
        locationId: 'delhi-loc-id',
        images: Array.from({ length: 9 }).map((_, idx) => ({
          mediaId: `med_0${idx}`,
          sortOrder: idx,
        })),
      };

      expect(() => createListingSchema.parse(payload)).toThrow();
    });
  });

  describe('Predictable Media Storage Path Builder', () => {
    it('constructs single-file path for user avatar without mediaId', () => {
      const avatarPath = buildMediaPath({
        resource: 'users',
        resourceId: 'usr_82k91',
        mediaType: 'avatar',
        variant: 'thumbnail',
        format: 'webp',
      });
      expect(avatarPath).toBe('users/usr_82k91/avatar/thumbnail.webp');

      const coverPath = buildMediaPath({
        resource: 'users',
        resourceId: 'usr_123',
        mediaType: 'cover',
        variant: 'large',
        format: 'webp',
      });
      expect(coverPath).toBe('users/usr_123/cover/large.webp');
    });

    it('constructs multi-file paths for ad images isolated by imageId', () => {
      const largePath = buildMediaPath({
        resource: 'ads',
        resourceId: 'ad_43x7p',
        mediaType: 'images',
        mediaId: 'img_mw2z4',
        variant: 'large',
        format: 'webp',
      });
      expect(largePath).toBe('ads/ad_43x7p/images/img_mw2z4/large.webp');

      const mediumPath = buildMediaPath({
        resource: 'ads',
        resourceId: 'ad_43x7p',
        mediaType: 'images',
        mediaId: 'img_mw2z4',
        variant: 'medium',
        format: 'webp',
      });
      expect(mediumPath).toBe('ads/ad_43x7p/images/img_mw2z4/medium.webp');

      const thumbPath = buildMediaPath({
        resource: 'ads',
        resourceId: 'ad_43x7p',
        mediaType: 'images',
        mediaId: 'img_mw2z4',
        variant: 'thumbnail',
        format: 'webp',
      });
      expect(thumbPath).toBe('ads/ad_43x7p/images/img_mw2z4/thumbnail.webp');
    });

    it('constructs direct single-file logo and icon paths', () => {
      const iconPath = buildMediaPath({
        resource: 'categories',
        resourceId: 'cars',
        mediaType: 'icon',
        format: 'webp',
      });
      expect(iconPath).toBe('categories/cars/icon.webp');

      const logoPath = buildMediaPath({
        resource: 'brands',
        resourceId: 'toyota',
        mediaType: 'logo',
        format: 'webp',
      });
      expect(logoPath).toBe('brands/toyota/logo.webp');
    });

    it('constructs chat attachment multi-file paths', () => {
      const chatPath = buildMediaPath({
        resource: 'chats',
        resourceId: 'chat_123',
        mediaType: 'attachments',
        mediaId: 'file_456',
        variant: 'large',
        format: 'webp',
      });
      expect(chatPath).toBe('chats/chat_123/attachments/file_456/large.webp');
    });

    it('throws error when multi-file resource lacks mediaId', () => {
      expect(() =>
        buildMediaPath({
          resource: 'ads',
          resourceId: 'ad_123',
          mediaType: 'images',
          variant: 'large',
        })
      ).toThrowError(/requires a mediaId/);
    });

    it('correctly builds media parent directory', () => {
      const singleDir = buildMediaDirectory({
        resource: 'users',
        resourceId: 'usr_123',
        mediaType: 'avatar',
      });
      expect(singleDir).toBe('users/usr_123/avatar');

      const multiDir = buildMediaDirectory({
        resource: 'ads',
        resourceId: 'ad_456',
        mediaType: 'images',
        mediaId: 'img_789',
      });
      expect(multiDir).toBe('ads/ad_456/images/img_789');
    });
  });
});

