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
      [dbEnv, 'redis.env', 'media.env'].forEach((file) => {
        const fullPath = path.join(secretsDir, file);
        if (fs.existsSync(fullPath)) dotenv.config({ path: fullPath });
      });
    }
    break;
  }
}

export const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  REDIS_URL: process.env.REDIS_URL || 'redis://127.0.0.1:6379',
  MEDIA_ROOT: resolveMediaRoot(process.env.MEDIA_ROOT),
};

export function getRedisBullConnection() {
  try {
    const parsed = new URL(env.REDIS_URL);
    return {
      host: parsed.hostname || '127.0.0.1',
      port: parsed.port ? Number(parsed.port) : 6379,
      password: parsed.password ? decodeURIComponent(parsed.password) : undefined,
      username: parsed.username ? decodeURIComponent(parsed.username) : undefined,
      maxRetriesPerRequest: null,
    };
  } catch {
    return {
      host: '127.0.0.1',
      port: 6379,
      maxRetriesPerRequest: null,
    };
  }
}
