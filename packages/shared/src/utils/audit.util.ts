import { FastifyRequest } from 'fastify';
import { prisma } from '@olx/database';

export interface AuditInput {
  userId?: string;
  action: string;
  entityType: string;
  entityId: string;
  oldData?: unknown;
  newData?: unknown;
  request?: FastifyRequest | any;
}

// Redact passwords, secrets, tokens, and sensitive credentials from audit logs
function sanitizeAuditData(data: unknown): unknown {
  if (!data || typeof data !== 'object') return data;
  try {
    const clone = JSON.parse(JSON.stringify(data));
    const redactKeys = ['password', 'passwordhash', 'secret', 'token', 'refreshtoken', 'otp'];
    const traverse = (obj: any) => {
      if (!obj || typeof obj !== 'object') return;
      for (const key of Object.keys(obj)) {
        const lower = key.toLowerCase();
        if (redactKeys.some((k) => lower.includes(k))) {
          obj[key] = '[REDACTED]';
        } else if (typeof obj[key] === 'object') {
          traverse(obj[key]);
        }
      }
    };
    traverse(clone);
    return clone;
  } catch {
    return undefined;
  }
}

export async function writeAuditLog(input: AuditInput): Promise<void> {
  try {
    // Extract IP address from request, checking proxy headers first
    const rawIp =
      input.request?.headers?.['x-forwarded-for'] ||
      input.request?.ip ||
      input.request?.socket?.remoteAddress;
    const ipAddress = typeof rawIp === 'string' ? rawIp.split(',')[0].trim().slice(0, 45) : undefined;

    // Safely extract and bound user-agent string
    const rawAgent = input.request?.headers?.['user-agent'];
    const userAgent = typeof rawAgent === 'string' ? rawAgent.slice(0, 500) : undefined;

    // Truncate fields to match PostgreSQL schema constraints
    const action = String(input.action).slice(0, 100);
    const entityType = String(input.entityType).slice(0, 50);
    const entityId = String(input.entityId).slice(0, 50);

    const oldData = input.oldData !== undefined ? sanitizeAuditData(input.oldData) : undefined;
    const newData = input.newData !== undefined ? sanitizeAuditData(input.newData) : undefined;

    try {
      await prisma.auditLog.create({
        data: {
          userId: input.userId || null,
          action,
          entityType,
          entityId,
          oldData: oldData ? JSON.parse(JSON.stringify(oldData)) : undefined,
          newData: newData ? JSON.parse(JSON.stringify(newData)) : undefined,
          ipAddress,
          userAgent,
        },
      });
    } catch (dbErr: any) {
      // If user foreign key fails on unknown userId, log with userId: null to prevent data loss
      if (dbErr.code === 'P2003' && input.userId) {
        await prisma.auditLog.create({
          data: {
            userId: null,
            action,
            entityType,
            entityId,
            oldData: oldData ? JSON.parse(JSON.stringify(oldData)) : undefined,
            newData: {
              ...(typeof newData === 'object' && newData !== null ? (newData as any) : {}),
              originalUserId: input.userId,
            },
            ipAddress,
            userAgent,
          },
        });
      } else {
        throw dbErr;
      }
    }
  } catch (err: any) {
    // Non-blocking catch to ensure audit logging errors never disrupt primary user operations
    console.error('Failed to write audit log:', err.message);
  }
}
