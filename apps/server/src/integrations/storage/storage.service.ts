import path from 'path';
import fs from 'fs';
import { pipeline } from 'stream/promises';

const UPLOAD_DIR = path.join(process.cwd(), 'uploads');

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

export class StorageService {
  static getUploadDir(): string {
    return UPLOAD_DIR;
  }

  static async saveFile(fileStream: NodeJS.ReadableStream, filename: string): Promise<string> {
    const ext = path.extname(filename).toLowerCase() || '.jpg';
    const uniqueName = `media-${Date.now()}-${Math.random().toString(36).substring(2, 8)}${ext}`;
    const destination = path.join(UPLOAD_DIR, uniqueName);

    const writeStream = fs.createWriteStream(destination);
    await pipeline(fileStream, writeStream);

    return uniqueName;
  }

  static async deleteFile(filename: string): Promise<void> {
    const fullPath = path.join(UPLOAD_DIR, filename);
    if (fs.existsSync(fullPath)) {
      await fs.promises.unlink(fullPath);
    }
  }
}
