import { FastifyRequest } from 'fastify';
import { prisma } from '../../config/prisma';

interface AuditInput {
  userId?: string;
  action: string;
  entityType: string;
  entityId: string;
  oldData?: unknown;
  newData?: unknown;
  request?: FastifyRequest | any;
}

export async function writeAuditLog(input: AuditInput): Promise<void> {
  try {
    const ipAddress = input.request?.ip || input.request?.socket?.remoteAddress;
    const userAgent = input.request?.headers?.['user-agent']?.slice(0, 500);

    await prisma.auditLog.create({
      data: {
        userId: input.userId,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId,
        oldData: input.oldData === undefined ? undefined : JSON.parse(JSON.stringify(input.oldData)),
        newData: input.newData === undefined ? undefined : JSON.parse(JSON.stringify(input.newData)),
        ipAddress,
        userAgent,
      },
    });
  } catch (err: any) {
    console.error('Failed to write audit log:', err.message);
  }
}

