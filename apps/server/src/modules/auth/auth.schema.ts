import { z } from 'zod';
import { OtpPurpose } from '@prisma/client';

export const registerSchema = z.object({
  email: z.string().email('Valid email address required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  name: z.string().min(2, 'Name must be at least 2 characters').optional(),
});

export const loginSchema = z.object({
  email: z.string().email('Valid email address required'),
  password: z.string().min(1, 'Password is required'),
});

export const verifyEmailOtpSchema = z.object({
  email: z.string().email('Valid email address required'),
  sessionId: z.string().uuid('Valid sessionId required'),
  otp: z.string().length(6, 'OTP must be 6 digits'),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email('Valid email address required'),
});

export const resetPasswordSchema = z.object({
  email: z.string().email('Valid email address required'),
  sessionId: z.string().uuid('Valid sessionId required'),
  otp: z.string().length(6, 'OTP must be 6 digits'),
  newPassword: z.string().min(6, 'New password must be at least 6 characters'),
});

export const resendOtpBaseSchema = z.object({
  email: z.string().email('Valid email address required').optional(),
  phoneNumber: z.string().min(10, 'Valid 10-digit phone number').optional(),
  purpose: z.nativeEnum(OtpPurpose).optional(),
});

export const resendOtpSchema = resendOtpBaseSchema.refine((data) => data.email || data.phoneNumber, {
  message: 'Either email or phoneNumber must be provided to resend OTP',
});

// Existing mobile OTP & Admin schemas
export const sendOtpSchema = z.preprocess((val: any) => {
  if (val && typeof val === 'object') {
    const phone = val.phoneNumber || val.target || val.phone;
    return { ...val, phoneNumber: phone };
  }
  return val;
}, z.object({
  phoneNumber: z.string().min(10, 'Valid 10-digit mobile number required'),
}));

export const verifyOtpSchema = z.preprocess((val: any) => {
  if (val && typeof val === 'object') {
    const phone = val.phoneNumber || val.target || val.phone;
    const otpCode = val.otp || val.code;
    return {
      ...val,
      phoneNumber: phone,
      otp: otpCode,
    };
  }
  return val;
}, z.object({
  phoneNumber: z.string().min(10, 'Valid mobile number required').optional(),
  sessionId: z.string().uuid('Valid sessionId required').optional(),
  otp: z.string().length(6, 'OTP must be 6 digits'),
}).refine((data) => data.sessionId || data.phoneNumber, {
  message: 'Either sessionId or phoneNumber must be provided',
}));

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(10, 'Refresh token required'),
});

export const adminLoginSchema = z.object({
  username: z.string().min(1, 'Username or email is required'),
  password: z.string().min(1, 'Password is required'),
  role: z.string().optional(),
});

export const acceptInvitationSchema = z.object({
  token: z.string().min(10, 'Invitation token is required'),
  name: z.string().min(2, 'Full name must be at least 2 characters'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  phoneNumber: z.string().optional(),
});

export type AcceptInvitationInput = z.infer<typeof acceptInvitationSchema>;

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type VerifyEmailOtpInput = z.infer<typeof verifyEmailOtpSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type ResendOtpInput = z.infer<typeof resendOtpBaseSchema>;
export type SendOtpInput = z.infer<typeof sendOtpSchema>;
export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>;
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;
export type AdminLoginInput = z.infer<typeof adminLoginSchema>;
