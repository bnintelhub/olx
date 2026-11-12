import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { resolveMediaRoot } from '@olx/shared';

dotenv.config();

// Auto-discover centralized infrastructure secrets when running outside Docker
const candidateRoots = [
  path.resolve(process.cwd(), 'infrastructure'),
  path.resolve(process.cwd(), '../../infrastructure'),
  path.resolve(__dirname, '../../../../infrastructure'),
];

for (const root of candidateRoots) {
  if (fs.existsSync(root)) {
    const isProd = process.env.NODE_ENV === 'production';
    const mainEnv = isProd ? path.join(root, '.env.production') : path.join(root, '.env.dev');
    if (fs.existsSync(mainEnv)) dotenv.config({ path: mainEnv });

    const secretsDir = path.join(root, 'secrets');
    if (fs.existsSync(secretsDir)) {
      const dbEnv = isProd ? 'database.env' : 'database.dev.env';
      [dbEnv, 'redis.env', 'media.env', 'jwt.env'].forEach((file) => {
        const fullPath = path.join(secretsDir, file);
        if (fs.existsSync(fullPath)) dotenv.config({ path: fullPath });
      });
    }
    break;
  }
}

export const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: Number(process.env.MEDIA_SERVICE_PORT || 5005),
  HOST: process.env.HOST || '0.0.0.0',
  MEDIA_ROOT: resolveMediaRoot(process.env.MEDIA_ROOT),
  MEDIA_PUBLIC_BASE_URL: (
    process.env.MEDIA_PUBLIC_BASE_URL ||
    process.env.MEDIA_CDN_URL ||
    'http://localhost:5000/media'
  ).replace(/\/+$/, ''),
  REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',
  DATABASE_URL: process.env.DATABASE_URL || '',
  JWT_ACCESS_SECRET:
    process.env.JWT_ACCESS_SECRET ||
    'bharatmarket_super_secure_jwt_access_secret_key_2026',
  MAX_FILE_SIZE_BYTES: 15 * 1024 * 1024, // 15MB default
  MAX_VIDEO_SIZE_BYTES: 50 * 1024 * 1024, // 50MB default
};

