import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

export const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  REDIS_URL: process.env.REDIS_URL || 'redis://127.0.0.1:6379',
  STORAGE_DRIVER: process.env.STORAGE_DRIVER || 'disk',
  S3_ENDPOINT: process.env.S3_ENDPOINT || 'http://localhost:9000',
  S3_REGION: process.env.S3_REGION || 'us-east-1',
  S3_BUCKET: process.env.S3_BUCKET || 'olx-media',
  S3_ACCESS_KEY: process.env.S3_ACCESS_KEY || 'admin_olx',
  S3_SECRET_KEY: process.env.S3_SECRET_KEY || 'SuperSecurePassword123',
  S3_FORCE_PATH_STYLE: process.env.S3_FORCE_PATH_STYLE !== 'false',
  S3_PUBLIC_URL: process.env.S3_PUBLIC_URL || 'http://localhost:9000/olx-media',
};

