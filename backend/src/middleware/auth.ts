import { Request, Response, NextFunction } from 'express';
import { JwtService } from '../services/jwt.service';
import { prisma } from '../prisma';
import { AppError } from './errorHandler';
import { UserRole } from '@prisma/client';
import { writeAuditLog } from '../utils/audit';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    role: UserRole;
    phoneNumber?: string;
  };
}

export async function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new AppError(401, 'UNAUTHORIZED', 'Authentication token is required'));
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = JwtService.verifyAccessToken(token);

    // Verify user exists and is active
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, role: true, status: true, phoneNumber: true },
    });

    if (!user || user.status !== 'ACTIVE') {
      return next(new AppError(401, 'USER_INACTIVE', 'User account is inactive or suspended'));
    }

    req.user = {
      id: user.id,
      role: user.role,
      phoneNumber: user.phoneNumber || undefined,
    };

    next();
  } catch (err: any) {
    if (err.name === 'TokenExpiredError') {
      return next(new AppError(401, 'TOKEN_EXPIRED', 'Access token expired'));
    }
    return next(new AppError(401, 'INVALID_TOKEN', 'Invalid authentication token'));
  }
}

export function requireRole(...roles: UserRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      if (req.user) {
        void writeAuditLog({
          userId: req.user.id,
          action: 'AUTHORIZATION_DENIED',
          entityType: 'ROUTE',
          entityId: `${req.method} ${req.baseUrl}${req.path}`.slice(0, 50),
          request: req,
          newData: { requiredRoles: roles, actualRole: req.user.role },
        }).catch((error: unknown) => {
          console.error('Failed to write authorization audit log:', error);
        });
      }
      return next(new AppError(403, 'FORBIDDEN', 'You do not have permission to access this resource'));
    }
    next();
  };
}
