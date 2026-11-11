import fs from 'fs';
import path from 'path';
import { pipeline } from 'stream/promises';
import { StorageProvider, SaveInput, StoredFile } from './storage.types';

export class LocalStorageProvider implements StorageProvider {
  private readonly rootDir: string;

  constructor(customRoot?: string) {
    this.rootDir = path.resolve(
      customRoot || process.env.MEDIA_ROOT || path.join(process.cwd(), 'data/olx-media')
    );
    this.ensureBaseDirectories();
  }

  getRootDir(): string {
    return this.rootDir;
  }

  private ensureBaseDirectories(): void {
    const subdirs = ['temp', 'quarantine', 'images', 'videos', 'documents', 'failed', 'trash'];
    for (const sub of subdirs) {
      const dirPath = path.join(this.rootDir, sub);
      if (!fs.existsSync(dirPath)) {
        try {
          fs.mkdirSync(dirPath, { recursive: true });
        } catch {}
      }
    }
  }

  /**
   * Path Traversal Protection:
   * Strips dangerous traversal prefixes and ensures the resolved path is strictly inside MEDIA_ROOT.
   */
  getPath(key: string): string {
    const cleanKey = key.replace(/^[/\\]+/, '').replace(/\.\.[/\\]/g, '');
    const resolved = path.resolve(this.rootDir, cleanKey);
    const normalizedRoot = path.normalize(this.rootDir);
    if (!resolved.startsWith(normalizedRoot)) {
      throw new Error(`Security Exception: Path traversal attempt detected for key: "${key}"`);
    }
    return resolved;
  }

  async exists(key: string): Promise<boolean> {
    const fullPath = this.getPath(key);
    try {
      await fs.promises.access(fullPath, fs.constants.F_OK);
      return true;
    } catch {
      return false;
    }
  }

  async read(key: string): Promise<NodeJS.ReadableStream> {
    const fullPath = this.getPath(key);
    if (!fs.existsSync(fullPath)) {
      throw new Error(`Storage error: File not found at key "${key}"`);
    }
    return fs.createReadStream(fullPath);
  }

  /**
   * Atomic File Save:
   * 1. Writes to temporary file ({destinationKey}.{timestamp}.tmp)
   * 2. Uses atomic rename() to place it into final destination
   * Guarantees zero partially-written or corrupted files exposed to HTTP consumers.
   */
  async save(input: SaveInput): Promise<StoredFile> {
    const destinationPath = this.getPath(input.destinationKey);
    const destinationDir = path.dirname(destinationPath);
    if (!fs.existsSync(destinationDir)) {
      await fs.promises.mkdir(destinationDir, { recursive: true });
    }

    const tempPath = `${destinationPath}.${Date.now()}.${Math.random().toString(36).substring(2, 8)}.tmp`;
    let sizeBytes = 0;

    if (Buffer.isBuffer(input.streamOrBuffer)) {
      await fs.promises.writeFile(tempPath, input.streamOrBuffer);
      sizeBytes = input.streamOrBuffer.length;
    } else {
      const writeStream = fs.createWriteStream(tempPath);
      input.streamOrBuffer.on('data', (chunk: Buffer) => {
        sizeBytes += chunk.length;
      });
      await pipeline(input.streamOrBuffer, writeStream);
    }

    // Atomic move to destination
    await fs.promises.rename(tempPath, destinationPath);

    return {
      key: input.destinationKey.replace(/^[/\\]+/, '').replace(/\\/g, '/'),
      fullPath: destinationPath,
      sizeBytes,
    };
  }

  async move(sourceKey: string, destinationKey: string): Promise<void> {
    const srcPath = this.getPath(sourceKey);
    const destPath = this.getPath(destinationKey);
    const destDir = path.dirname(destPath);
    if (!fs.existsSync(destDir)) {
      await fs.promises.mkdir(destDir, { recursive: true });
    }
    await fs.promises.rename(srcPath, destPath);
  }

  async delete(key: string): Promise<void> {
    const fullPath = this.getPath(key);
    if (fs.existsSync(fullPath)) {
      await fs.promises.unlink(fullPath).catch(() => {});
    }
  }

  async moveToTrash(key: string): Promise<string> {
    const srcPath = this.getPath(key);
    if (!fs.existsSync(srcPath)) return '';
    const trashKey = path.posix.join('trash', `${Date.now()}-${path.basename(key)}`);
    await this.move(key, trashKey);
    return trashKey;
  }
}

