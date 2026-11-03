import { UserRole } from '@prisma/client';

export interface AuthUser {
  id: string;
  role: UserRole;
  phoneNumber?: string;
  email?: string;
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: {
      userId: string;
      role: UserRole;
      phoneNumber?: string;
      email?: string;
    };
    user: AuthUser;
  }
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  meta?: {
    timestamp: string;
    path?: string;
    requestId?: string;
  };
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasMore?: boolean;
}
