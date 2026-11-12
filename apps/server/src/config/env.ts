import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { z } from 'zod';

// Load default root .env if present
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
      [dbEnv, 'redis.env', 'jwt.env', 'payment.env', 'firebase.env', 'media.env'].forEach((file) => {
        const fullPath = path.join(secretsDir, file);
        if (fs.existsSync(fullPath)) {
          dotenv.config({ path: fullPath });
        }
      });
    }
    break;
  }
}

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'staging', 'production', 'test']).default('development'),
    PORT: z.string().transform(Number).default('5000'),
    CLIENT_URL: z.string().default('http://localhost:5173'),
    DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
    REDIS_URL: z.string().default('redis://127.0.0.1:6379'),
    JWT_ACCESS_SECRET: z.string().min(10, 'JWT_ACCESS_SECRET must be at least 10 chars'),
    JWT_REFRESH_SECRET: z.string().min(10, 'JWT_REFRESH_SECRET must be at least 10 chars'),
    JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
    JWT_REFRESH_EXPIRES_IN: z.string().default('30d'),
    SMS_PROVIDER: z.enum(['MOCK', 'MSG91', 'TWILIO']).default('MOCK'),
    MOCK_OTP_CODE: z.string().default('123456'),
    OTP_EXPIRY_SECONDS: z.string().transform(Number).default('300'),
    OTP_RESEND_COOLDOWN_SECONDS: z.string().transform(Number).default('45'),
    ADMIN_USERNAME: z.string().default('admin'),
    ADMIN_PASSWORD: z.string().optional(),
    ADMIN_PASSWORD_HASH: z.string().optional(),
    ADMIN_LOGIN_WINDOW_MS: z.string().transform(Number).default('900000'),
    ADMIN_LOGIN_MAX_ATTEMPTS: z.string().transform(Number).default('10'),
    // Media & Storage Configuration
    MEDIA_ROOT: z.string().default('/data/olx-media'),
    MEDIA_PUBLIC_BASE_URL: z.string().default('http://localhost:5000/media'),
    MEDIA_SERVICE_URL: z.string().default('http://localhost:5005'),
    // PayU Hosted Checkout configuration
    PAYU_MERCHANT_KEY: z.string().default(process.env.PAYUKEY || process.env.PAYU_MERCHANT_KEY || 'payu_merchant_key_placeholder'),
    PAYU_MERCHANT_SALT: z.string().default(process.env.PAYUSALT || process.env.PAYU_MERCHANT_SALT || 'payu_merchant_salt_placeholder'),
    PAYU_BASE_URL: z.string().default('https://test.payu.in'),
    PAYU_WEBHOOK_SECRET: z.string().optional(),
    PAYU_ENVIRONMENT: z.enum(['test', 'production']).default('test'),
    PAYU_SUCCESS_URL: z.string().optional(),
    PAYU_FAILURE_URL: z.string().optional(),
    // Firebase Cloud Messaging configuration
    FIREBASE_SERVICE_ACCOUNT_PATH: z.string().default('gen-lang-client-0067863163-firebase-adminsdk-fbsvc-3a9115427b.json'),
    FIREBASE_API_KEY: z.string().optional(),
    FIREBASE_AUTH_DOMAIN: z.string().optional(),
    FIREBASE_PROJECT_ID: z.string().optional(),
    FIREBASE_STORAGE_BUCKET: z.string().optional(),
    FIREBASE_MESSAGING_SENDER_ID: z.string().optional(),
    FIREBASE_APP_ID: z.string().optional(),
    FIREBASE_MEASUREMENT_ID: z.string().optional(),
    // Rate Limiting flexibility (Disabled by default in local dev, enabled in production)
    ENABLE_RATE_LIMIT: z
      .string()
      .transform((v) => v === 'true' || v === '1')
      .default(process.env.NODE_ENV === 'production' ? 'true' : 'false'),
  })
  .superRefine((data, ctx) => {
    if (data.NODE_ENV === 'production' && data.PAYU_ENVIRONMENT === 'production') {
      if (!data.PAYU_MERCHANT_KEY || data.PAYU_MERCHANT_KEY === 'payu_merchant_key_placeholder') {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'PAYU_MERCHANT_KEY must be configured in production',
          path: ['PAYU_MERCHANT_KEY'],
        });
      }
      if (!data.PAYU_MERCHANT_SALT || data.PAYU_MERCHANT_SALT === 'payu_merchant_salt_placeholder') {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'PAYU_MERCHANT_SALT must be configured in production',
          path: ['PAYU_MERCHANT_SALT'],
        });
      }
    }
  });

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment variables:', parsed.error.format());
  process.exit(1);
}

export const env = parsed.data;
