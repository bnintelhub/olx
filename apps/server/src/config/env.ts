import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

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
    // Storage configuration
    STORAGE_DRIVER: z.enum(['disk', 's3']).default('disk'),
    S3_ENDPOINT: z.string().optional(),
    S3_REGION: z.string().default('us-east-1'),
    S3_BUCKET: z.string().default('olx-media'),
    S3_ACCESS_KEY: z.string().optional(),
    S3_SECRET_KEY: z.string().optional(),
    S3_FORCE_PATH_STYLE: z.string().transform((v) => v === 'true').default('true'),
    S3_PUBLIC_URL: z.string().optional(),
    // PayU Hosted Checkout configuration
    PAYU_MERCHANT_KEY: z.string().default(process.env.PAYUKEY || process.env.PAYU_MERCHANT_KEY || 'payu_merchant_key_placeholder'),
    PAYU_MERCHANT_SALT: z.string().default(process.env.PAYUSALT || process.env.PAYU_MERCHANT_SALT || 'payu_merchant_salt_placeholder'),
    PAYU_BASE_URL: z.string().default('https://test.payu.in'),
    PAYU_WEBHOOK_SECRET: z.string().optional(),
    PAYU_ENVIRONMENT: z.enum(['test', 'production']).default('test'),
    PAYU_SUCCESS_URL: z.string().optional(),
    PAYU_FAILURE_URL: z.string().optional(),
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
