import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { resolveMediaRoot } from '@olx/shared';

// Load environment variables from root environment files (.env.development / .env.production / .env)
const isProd = process.env.NODE_ENV === 'production';
const envFileNames = isProd
  ? ['.env.production', 'env.production', '.env']
  : ['.env.development', 'env.development', '.env'];

const candidateDirs = [
  process.cwd(),
  path.resolve(process.cwd(), '..'),
  path.resolve(process.cwd(), '../..'),
  path.resolve(__dirname, '../../..'),
  path.resolve(__dirname, '../../../..'),
];

for (const dir of candidateDirs) {
  for (const envName of envFileNames) {
    const fullPath = path.join(dir, envName);
    if (fs.existsSync(fullPath)) {
      dotenv.config({ path: fullPath });
    }
  }
}
dotenv.config();

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
