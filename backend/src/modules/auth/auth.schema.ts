import { z } from 'zod';

export const sendOtpSchema = z.object({
  phoneNumber: z.string().min(10, 'Valid 10-digit mobile number required'),
});

export const verifyOtpSchema = z.object({
  phoneNumber: z.string().min(10, 'Valid mobile number required'),
  sessionId: z.string().uuid('Valid sessionId required'),
  otp: z.string().length(6, 'OTP must be 6 digits'),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(10, 'Refresh token required'),
});

export const adminLoginSchema = z.object({
  username: z.string().min(1, 'Username or email is required'),
  password: z.string().min(1, 'Password is required'),
});

export type SendOtpInput = z.infer<typeof sendOtpSchema>;
export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>;
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;
export type AdminLoginInput = z.infer<typeof adminLoginSchema>;
