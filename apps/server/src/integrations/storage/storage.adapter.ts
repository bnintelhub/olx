import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { pipeline } from 'stream/promises';
import { Writable } from 'stream';
import { S3StorageAdapter } from './s3.adapter';

export interface StorageResult {
  tempPath: string;
  size: number;
  initialBuffer: Buffer;
}

export interface IStorageAdapter {
  getUploadDir(): string;
  getTempDir(): string;
  getVariantsDir(): string;
  saveTemporaryFile(stream: NodeJS.ReadableStream, tempFileName: string): Promise<StorageResult>;
  getVariantSubpath(mediaId: string): string;
  getVariantDirectory(mediaId: string): string;
  writeVariantFile(targetPathOrMediaId: string, variantNameOrBuffer: string | Buffer, maybeBuffer?: Buffer): Promise<string>;
  deleteMediaFiles(mediaId: string): Promise<void>;
  deleteMediaDirectory(dirPath: string): Promise<void>;
  deleteFile(filePath: string): Promise<void>;
  buildPublicUrl(subPath: string, baseUrl?: string): string;
}

// Resolves shared monorepo root uploads/ directory so server and background workers use the exact same storage
export function resolveUploadDir(): string {
  if (process.env.UPLOAD_DIR) {
    return path.resolve(process.env.UPLOAD_DIR);
  }
  let current = process.cwd();
  while (current !== path.dirname(current)) {
    if (fs.existsSync(path.join(current, 'pnpm-workspace.yaml'))) {
      return path.join(current, 'uploads');
    }
    current = path.dirname(current);
  }
  return path.resolve(process.cwd(), 'uploads');
}

export class DiskStorageAdapter implements IStorageAdapter {
  private readonly uploadDir: string;
  private readonly tempDir: string;
  private readonly variantsDir: string;

  constructor(customUploadDir?: string) {
    this.uploadDir = customUploadDir || resolveUploadDir();
    this.tempDir = path.join(this.uploadDir, 'temp');
    this.variantsDir = path.join(this.uploadDir, 'variants');
    this.ensureDirectories();
  }

  private ensureDirectories(): void {
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
    if (!fs.existsSync(this.variantsDir)) {
      fs.mkdirSync(this.variantsDir, { recursive: true });
    }
  }

  getUploadDir(): string {
    return this.uploadDir;
  }

  getTempDir(): string {
    return this.tempDir;
  }

  getVariantsDir(): string {
    return this.variantsDir;
  }

  // Two-level MD5 hex sharding (e.g. /ab/cd/med_01JXYZ) to prevent directory inode exhaustion
  getVariantSubpath(mediaId: string): string {
    const hash = crypto.createHash('md5').update(mediaId).digest('hex');
    const level1 = hash.slice(0, 2);
    const level2 = hash.slice(2, 4);
    return `${level1}/${level2}/${mediaId}`;
  }

  getVariantDirectory(mediaId: string): string {
    const subpath = this.getVariantSubpath(mediaId);
    return path.join(this.variantsDir, ...subpath.split('/'));
  }

  // Saves an incoming file stream to the temporary storage while extracting initial magic bytes
  async saveTemporaryFile(stream: NodeJS.ReadableStream, tempFileName: string): Promise<StorageResult> {
    const safeName = path.basename(tempFileName);
    const tempPath = path.join(this.tempDir, safeName);

    // Prevent directory traversal
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

  async writeVariantFile(
    targetPathOrMediaId: string,
    variantNameOrBuffer: string | Buffer,
    maybeBuffer?: Buffer
  ): Promise<string> {
    let destination: string;
    let relativePath: string;
    let buffer: Buffer;

    if (Buffer.isBuffer(variantNameOrBuffer)) {
      relativePath = targetPathOrMediaId.replace(/^[/\\]+/, '');
      destination = path.join(this.uploadDir, ...relativePath.split('/'));
      buffer = variantNameOrBuffer;
    } else {
      const safeFilename = path.basename(variantNameOrBuffer);
      const targetDir = this.getVariantDirectory(targetPathOrMediaId);
      destination = path.join(targetDir, safeFilename);
      relativePath = path.posix.join('variants', this.getVariantSubpath(targetPathOrMediaId), safeFilename);
      buffer = maybeBuffer!;
    }

    const targetDir = path.dirname(destination);
    if (!fs.existsSync(targetDir)) {
      await fs.promises.mkdir(targetDir, { recursive: true });
    }

    await fs.promises.writeFile(destination, buffer);
    return relativePath;
  }

  async deleteMediaFiles(mediaId: string): Promise<void> {
    const dir = this.getVariantDirectory(mediaId);
    if (fs.existsSync(dir)) {
      await fs.promises.rm(dir, { recursive: true, force: true }).catch(() => {});
    }
  }

  async deleteMediaDirectory(dirPath: string): Promise<void> {
    const fullDir = path.join(this.uploadDir, ...dirPath.replace(/^[/\\]+/, '').split('/'));
    if (fs.existsSync(fullDir)) {
      await fs.promises.rm(fullDir, { recursive: true, force: true }).catch(() => {});
    }
  }

  async deleteFile(filePath: string): Promise<void> {
    if (fs.existsSync(filePath)) {
      await fs.promises.unlink(filePath).catch(() => {});
    }
  }

  buildPublicUrl(subPath: string, baseUrl?: string): string {
    const cleanSubPath = subPath.startsWith('/') ? subPath.slice(1) : subPath;
    const host = baseUrl || process.env.MEDIA_CDN_URL || 'http://localhost:5000';
    const trimmedHost = host.endsWith('/') ? host.slice(0, -1) : host;
    if (cleanSubPath.startsWith('uploads/')) {
      return `${trimmedHost}/${cleanSubPath}`;
    }
    const domainPrefixes = ['ads/', 'users/', 'categories/', 'brands/', 'chats/', 'verification/', 'system/', 'variants/'];
    if (domainPrefixes.some((p) => cleanSubPath.startsWith(p))) {
      return `${trimmedHost}/uploads/${cleanSubPath}`;
    }
    return `${trimmedHost}/uploads/variants/${cleanSubPath}`;
  }
}

let storageInstance: IStorageAdapter | null = null;

export function getStorageAdapter(): IStorageAdapter {
  if (!storageInstance) {
    if (process.env.STORAGE_DRIVER === 's3') {
      storageInstance = new S3StorageAdapter();
    } else {
      storageInstance = new DiskStorageAdapter();
    }
  }
  return storageInstance;
}

export const defaultStorage: IStorageAdapter = new Proxy({} as IStorageAdapter, {
  get(_target, prop) {
    const adapter = getStorageAdapter();
    const val = (adapter as any)[prop];
    return typeof val === 'function' ? val.bind(adapter) : val;
  },
});

