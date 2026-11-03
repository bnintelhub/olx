import { Request } from 'express';
import { prisma } from '../prisma';

interface AuditInput {
  userId?: string;
  action: string;
  entityType: string;
  entityId: string;
  oldData?: unknown;
  newData?: unknown;
  request?: Request;
}

export async function writeAuditLog(input: AuditInput): Promise<void> {
  await prisma.auditLog.create({
    data: {
      userId: input.userId,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      oldData: input.oldData === undefined ? undefined : JSON.parse(JSON.stringify(input.oldData)),
      newData: input.newData === undefined ? undefined : JSON.parse(JSON.stringify(input.newData)),
      ipAddress: input.request?.ip,
      userAgent: input.request?.get('user-agent')?.slice(0, 500),
    },
  });
}
