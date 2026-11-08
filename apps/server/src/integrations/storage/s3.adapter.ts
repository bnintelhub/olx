import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { pipeline } from 'stream/promises';
import { Writable } from 'stream';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
  HeadBucketCommand,
  CreateBucketCommand,
  PutBucketPolicyCommand,
} from '@aws-sdk/client-s3';
import { IStorageAdapter, StorageResult, resolveUploadDir } from './storage.adapter';

export class S3StorageAdapter implements IStorageAdapter {
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly publicUrl: string;
  private readonly uploadDir: string;
  private readonly tempDir: string;
  private bucketChecked = false;

  constructor() {
    this.bucket = process.env.S3_BUCKET || 'olx-media';
    const endpoint = process.env.S3_ENDPOINT || 'http://localhost:9000';
    const region = process.env.S3_REGION || 'us-east-1';
    const accessKeyId = process.env.S3_ACCESS_KEY || 'admin_olx';
    const secretAccessKey = process.env.S3_SECRET_KEY || 'SuperSecurePassword123';
    const forcePathStyle = process.env.S3_FORCE_PATH_STYLE !== 'false';

    this.publicUrl = (process.env.S3_PUBLIC_URL || `${endpoint}/${this.bucket}`).replace(/\/+$/, '');

    this.client = new S3Client({
      endpoint,
      region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
      forcePathStyle,
    });

    this.uploadDir = resolveUploadDir();
    this.tempDir = path.join(this.uploadDir, 'temp');
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
  }

  getUploadDir(): string {
    return this.uploadDir;
  }

  getTempDir(): string {
    return this.tempDir;
  }

  getVariantsDir(): string {
    return `s3://${this.bucket}/variants`;
  }

  getVariantSubpath(mediaId: string): string {
    const hash = crypto.createHash('md5').update(mediaId).digest('hex');
    const level1 = hash.slice(0, 2);
    const level2 = hash.slice(2, 4);
    return `${level1}/${level2}/${mediaId}`;
  }

  getVariantDirectory(mediaId: string): string {
    return `s3://${this.bucket}/variants/${this.getVariantSubpath(mediaId)}`;
  }

  async saveTemporaryFile(stream: NodeJS.ReadableStream, tempFileName: string): Promise<StorageResult> {
    const safeName = path.basename(tempFileName);
    const tempPath = path.join(this.tempDir, safeName);

    if (!path.resolve(tempPath).startsWith(path.resolve(this.tempDir))) {
      throw new Error('Invalid temporary path detected');
    }

    const initialChunks: Buffer[] = [];
    let initialBytesRead = 0;
    let totalSize = 0;

    const fileWriteStream = fs.createWriteStream(tempPath);

    const inspectingStream = new Writable({
      write(chunk: Buffer, _encoding, callback) {
        totalSize += chunk.length;
        if (initialBytesRead < 4096) {
          const slice = chunk.slice(0, 4096 - initialBytesRead);
          initialChunks.push(slice);
          initialBytesRead += slice.length;
        }
        fileWriteStream.write(chunk, callback);
      },
      final(callback) {
        fileWriteStream.end(callback);
      },
    });

    try {
      await pipeline(stream, inspectingStream);
    } catch (err) {
      if (fs.existsSync(tempPath)) {
        await fs.promises.unlink(tempPath).catch(() => {});
      }
      throw err;
    }

    return {
      tempPath,
      size: totalSize,
      initialBuffer: Buffer.concat(initialChunks),
    };
  }

  private async ensureBucket(): Promise<void> {
    if (this.bucketChecked) return;
    try {
      await this.client.send(new HeadBucketCommand({ Bucket: this.bucket }));
    } catch {
      try {
        await this.client.send(new CreateBucketCommand({ Bucket: this.bucket }));
      } catch {
        // Bucket might have already been created concurrently
      }
    }

    try {
      const publicReadPolicy = JSON.stringify({
        Version: '2012-10-17',
        Statement: [
          {
            Sid: 'PublicReadVariants',
            Effect: 'Allow',
            Principal: '*',
            Action: ['s3:GetObject'],
            Resource: [`arn:aws:s3:::${this.bucket}/*`],
          },
        ],
      });
      await this.client.send(
        new PutBucketPolicyCommand({
          Bucket: this.bucket,
          Policy: publicReadPolicy,
        })
      );
    } catch {
      // Bucket policy might already exist or restricted
    }
    this.bucketChecked = true;
  }

  async writeVariantFile(
    targetPathOrMediaId: string,
    variantNameOrBuffer: string | Buffer,
    maybeBuffer?: Buffer
  ): Promise<string> {
    await this.ensureBucket();

    let key: string;
    let buffer: Buffer;

    if (Buffer.isBuffer(variantNameOrBuffer)) {
      key = targetPathOrMediaId.replace(/^[/\\]+/, '');
      buffer = variantNameOrBuffer;
    } else {
      const safeFilename = path.basename(variantNameOrBuffer);
      key = `variants/${this.getVariantSubpath(targetPathOrMediaId)}/${safeFilename}`;
      buffer = maybeBuffer!;
    }

    // Mirror to local uploads directory for immediate availability
    try {
      const localFilePath = path.join(this.uploadDir, key);
      const localDir = path.dirname(localFilePath);
      if (!fs.existsSync(localDir)) {
        fs.mkdirSync(localDir, { recursive: true });
      }
      await fs.promises.writeFile(localFilePath, buffer);
    } catch {}

    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: 'image/webp',
        CacheControl: 'public, max-age=31536000, immutable',
      })
    );

    return key;
  }

  async deleteMediaFiles(mediaId: string): Promise<void> {
    const prefix = `variants/${this.getVariantSubpath(mediaId)}/`;
    await this.deleteMediaDirectory(prefix);
  }

  async deleteMediaDirectory(dirPath: string): Promise<void> {
    const cleanPrefix = dirPath.replace(/^s3:\/\/[^/]+\//, '').replace(/^[/\\]+/, '');
    const prefix = cleanPrefix.endsWith('/') ? cleanPrefix : `${cleanPrefix}/`;

    try {
      const listCommand = new ListObjectsV2Command({
        Bucket: this.bucket,
        Prefix: prefix,
      });
      const listedObjects = await this.client.send(listCommand);

      if (listedObjects.Contents && listedObjects.Contents.length > 0) {
        await Promise.all(
          listedObjects.Contents.map((item) =>
            this.client.send(
              new DeleteObjectCommand({
                Bucket: this.bucket,
                Key: item.Key,
              })
            )
          )
        );
      }
    } catch (err) {
      console.error(`Failed to delete S3 objects for prefix ${prefix}:`, err);
    }
  }

  async deleteFile(filePath: string): Promise<void> {
    if (fs.existsSync(filePath)) {
      await fs.promises.unlink(filePath).catch(() => {});
    }
  }

  buildPublicUrl(subPath: string, _baseUrl?: string): string {
    const cleanSubPath = subPath.startsWith('/') ? subPath.slice(1) : subPath;
    return `${this.publicUrl}/${cleanSubPath}`;
  }
}

