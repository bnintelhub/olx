import { UserRole } from '@prisma/client';

export interface TokenPayload {
  userId: string;
  role: UserRole;
  phoneNumber?: string;
  email?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresInSeconds: number;
}

export interface SendOtpResult {
  sessionId: string;
  expiresInSeconds: number;
  resendCooldownSeconds: number;
  mockOtp?: string;
}
