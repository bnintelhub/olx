import { FastifyRequest } from 'fastify';
import { prisma } from '@olx/database';

export interface AuditSecurityContext {
  requestId?: string;
  ipAddress?: string;
  userAgent?: string;
  actorRole?: string;
  actorEmail?: string;
  method?: string;
  route?: string;
}

export interface AuditInput {
  userId?: string;
  action: string;
  entityType: string;
  entityId: string;
  status?: 'SUCCESS' | 'FAILED';
  reason?: string;
  ticketReference?: string;
  oldData?: unknown;
  newData?: unknown;
  securityContext?: AuditSecurityContext;
  request?: FastifyRequest | any;
}

// Redacts passwords, secret hashes, auth tokens, and OTP codes from forensic payloads.
// Prevents sensitive authentication secrets from being stored in plaintext in the database.
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

// Writes an immutable audit entry recording who, what, when, outcome, and security context.
// Non-blocking and resilient to ensure audit capture failures never interrupt user requests.
export async function writeAuditLog(input: AuditInput): Promise<void> {
  try {
    // Extract IP address from request headers or socket with proxy forwarding awareness
    const rawIp =
      input.securityContext?.ipAddress ||
      input.request?.headers?.['x-forwarded-for'] ||
      input.request?.ip ||
      input.request?.socket?.remoteAddress;
    const ipAddress = typeof rawIp === 'string' ? rawIp.split(',')[0].trim().slice(0, 45) : undefined;

    // Extract User Agent string bounded to schema limit
    const rawAgent = input.securityContext?.userAgent || input.request?.headers?.['user-agent'];
    const userAgent = typeof rawAgent === 'string' ? rawAgent.slice(0, 500) : undefined;

    // Extract unique request correlation ID for cross-service forensic tracing
    const requestId =
      input.securityContext?.requestId ||
      input.request?.id ||
      input.request?.reqId ||
      input.request?.headers?.['x-request-id'] ||
      undefined;

    // Extract actor identity from authenticated request context
    const actorRole = input.securityContext?.actorRole || input.request?.user?.role || undefined;
    const actorEmail = input.securityContext?.actorEmail || input.request?.user?.email || undefined;
    const status = input.status || 'SUCCESS';

    // Truncate fields to match PostgreSQL schema constraints
    const action = String(input.action).slice(0, 100);
    const entityType = String(input.entityType).slice(0, 50);
    const entityId = String(input.entityId).slice(0, 50);

    const oldData = input.oldData !== undefined ? sanitizeAuditData(input.oldData) : undefined;
    const rawNewData = input.newData !== undefined ? sanitizeAuditData(input.newData) : undefined;

    // Assemble structured payload with security context, reason, and outcome metadata
    const structuredNewData: Record<string, any> = {
      ...(typeof rawNewData === 'object' && rawNewData !== null ? rawNewData : { value: rawNewData }),
      status,
      requestId,
      timestampUtc: new Date().toISOString(),
    };

    if (input.reason) structuredNewData.reason = input.reason;
    if (input.ticketReference) structuredNewData.ticketReference = input.ticketReference;
    if (actorRole || actorEmail) {
      structuredNewData.actor = { role: actorRole, email: actorEmail };
    }

    // Flag high-severity privilege escalation alerts for Super Admin modifications
    const isSuperAdminEscalation =
      action.includes('ROLE') &&
      (JSON.stringify(input.newData || {}).includes('SUPER_ADMIN') ||
        JSON.stringify(input.oldData || {}).includes('SUPER_ADMIN'));

    if (isSuperAdminEscalation) {
      structuredNewData._alert = 'HIGH_SEVERITY_SUPER_ADMIN_CHANGE';
    }

    try {
      await prisma.auditLog.create({
        data: {
          userId: input.userId || null,
          action,
          entityType,
          entityId,
          oldData: oldData ? JSON.parse(JSON.stringify(oldData)) : undefined,
          newData: JSON.parse(JSON.stringify(structuredNewData)),
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
              ...structuredNewData,
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
