import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/app';
import { prisma } from '../../src/config/prisma';
import { UserRole } from '@prisma/client';
import jwt from 'jsonwebtoken';
import { env } from '../../src/config/env';
import { closeOtpQueue } from '../../src/jobs/otp.job';
import { writeAuditLog } from '../../src/shared/utils/audit.util';

describe('Audit Logging & Forensic Compliance Integration Tests', () => {
  let app: FastifyInstance;
  let superAdminToken: string;
  let superAdminId: string;
  let moderatorToken: string;
  let targetUserId: string;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();

    const timestamp = Date.now();

    // Create Super Admin test user
    const superAdmin = await prisma.user.create({
      data: {
        email: `audit_superadmin_${timestamp}@test.com`,
        role: UserRole.SUPER_ADMIN,
        capabilities: ['can_buy', 'can_sell'],
        status: 'ACTIVE',
        isEmailVerified: true,
        profile: { create: { name: 'Audit Super Admin' } },
      },
    });
    superAdminId = superAdmin.id;
    superAdminToken = jwt.sign(
      { userId: superAdmin.id, role: superAdmin.role, email: superAdmin.email },
      env.JWT_ACCESS_SECRET,
      { expiresIn: '1h' }
    );

    // Create Moderator test user (unauthorized for audit:read)
    const moderator = await prisma.user.create({
      data: {
        email: `audit_moderator_${timestamp}@test.com`,
        role: UserRole.MODERATOR,
        capabilities: ['can_buy', 'can_sell'],
        status: 'ACTIVE',
        isEmailVerified: true,
        profile: { create: { name: 'Audit Moderator' } },
      },
    });
    moderatorToken = jwt.sign(
      { userId: moderator.id, role: moderator.role, email: moderator.email },
      env.JWT_ACCESS_SECRET,
      { expiresIn: '1h' }
    );

    // Create Target User for role modification tests
    const targetUser = await prisma.user.create({
      data: {
        email: `target_operator_${timestamp}@test.com`,
        role: UserRole.USER,
        capabilities: ['can_buy', 'can_sell'],
        status: 'ACTIVE',
        isEmailVerified: true,
        profile: { create: { name: 'Target Operator' } },
      },
    });
    targetUserId = targetUser.id;
  });

  afterAll(async () => {
    await app.close();
    await closeOtpQueue();
  });

  it('records comprehensive role change audit entry with actor, target, old/new role, reason, and ticket', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/v1/admin/users/${targetUserId}/action`,
      headers: {
        authorization: `Bearer ${superAdminToken}`,
        'x-request-id': 'req-audit-test-101',
      },
      payload: {
        action: 'CHANGE_ROLE',
        role: UserRole.MODERATOR,
        reason: 'Promoted to trust and safety moderation queue',
        ticketReference: 'SEC-8821',
      },
    });

    expect(res.statusCode).toBe(200);

    // Query database directly to verify forensic audit log persistence
    const auditRecord = await prisma.auditLog.findFirst({
      where: {
        entityId: targetUserId,
        action: 'USER_ROLE_CHANGE',
      },
      orderBy: { createdAt: 'desc' },
    });

    expect(auditRecord).not.toBeNull();
    expect(auditRecord!.userId).toBe(superAdminId);
    expect(auditRecord!.entityType).toBe('USER');
    expect(auditRecord!.entityId).toBe(targetUserId);

    const oldData = auditRecord!.oldData as any;
    const newData = auditRecord!.newData as any;

    expect(oldData.role).toBe('USER');
    expect(newData.role).toBe('MODERATOR');
    expect(newData.status).toBe('SUCCESS');
    expect(newData.reason).toBe('Promoted to trust and safety moderation queue');
    expect(newData.ticketReference).toBe('SEC-8821');
    expect(newData.requestId).toBe('req-audit-test-101');
    expect(newData.timestampUtc).toBeDefined();
    expect(auditRecord!.createdAt).toBeInstanceOf(Date);
  });

  it('records failed administrative role change attempts with status FAILED and reason', async () => {
    const fakeUserId = '00000000-0000-0000-0000-000000000000';
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/v1/admin/users/${fakeUserId}/action`,
      headers: {
        authorization: `Bearer ${superAdminToken}`,
        'x-request-id': 'req-failed-action-test',
      },
      payload: {
        action: 'CHANGE_ROLE',
        role: UserRole.ADMIN,
        reason: 'Attempted promotion on invalid account',
        ticketReference: 'INCIDENT-99',
      },
    });

    expect(res.statusCode).toBe(404);

    const failedAuditRecord = await prisma.auditLog.findFirst({
      where: {
        entityId: fakeUserId,
        action: 'USER_ROLE_CHANGE_FAILED',
      },
      orderBy: { createdAt: 'desc' },
    });

    expect(failedAuditRecord).not.toBeNull();
    const newData = failedAuditRecord!.newData as any;
    expect(newData.status).toBe('FAILED');
    expect(newData.attemptedRole).toBe('ADMIN');
    expect(newData.requestId).toBe('req-failed-action-test');
  });

  it('triggers high-severity privilege escalation alert on Super Admin role assignment', async () => {
    await writeAuditLog({
      userId: superAdminId,
      action: 'USER_ROLE_CHANGE',
      entityType: 'USER',
      entityId: targetUserId,
      status: 'SUCCESS',
      oldData: { role: 'ADMIN' },
      newData: { role: 'SUPER_ADMIN' },
      reason: 'Emergency root elevation',
      ticketReference: 'BREAKGLASS-01',
    });

    const alertRecord = await prisma.auditLog.findFirst({
      where: {
        entityId: targetUserId,
        action: 'USER_ROLE_CHANGE',
      },
      orderBy: { createdAt: 'desc' },
    });

    expect(alertRecord).not.toBeNull();
    const newData = alertRecord!.newData as any;
    expect(newData._alert).toBe('HIGH_SEVERITY_SUPER_ADMIN_CHANGE');
    expect(newData.ticketReference).toBe('BREAKGLASS-01');
  });

  it('sanitizes and redacts credentials, password hashes, and tokens from audit data', async () => {
    await writeAuditLog({
      userId: superAdminId,
      action: 'USER_CREDENTIAL_CHANGE',
      entityType: 'USER',
      entityId: targetUserId,
      oldData: { passwordHash: '$2b$12$eX4mpL3h4shD0n0tL34k' },
      newData: { passwordHash: '$2b$12$n3wH4shD0n0tL34k', token: 'eyJhbGciOiJIUzI1Ni...' },
    });

    const sanitizedRecord = await prisma.auditLog.findFirst({
      where: {
        entityId: targetUserId,
        action: 'USER_CREDENTIAL_CHANGE',
      },
      orderBy: { createdAt: 'desc' },
    });

    expect(sanitizedRecord).not.toBeNull();
    const oldData = sanitizedRecord!.oldData as any;
    const newData = sanitizedRecord!.newData as any;
    expect(oldData.passwordHash).toBe('[REDACTED]');
    expect(newData.passwordHash).toBe('[REDACTED]');
    expect(newData.token).toBe('[REDACTED]');
  });

  it('enforces RBAC access control on GET /api/v1/admin/audit-logs', async () => {
    // 1. Super Admin with wildcard / audit:read permission -> 200 OK
    const resAllowed = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/audit-logs',
      headers: { authorization: `Bearer ${superAdminToken}` },
    });
    expect(resAllowed.statusCode).toBe(200);
    const body = JSON.parse(resAllowed.body);
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data.logs)).toBe(true);

    // 2. Moderator without audit:read permission -> 403 Forbidden
    const resForbidden = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/audit-logs',
      headers: { authorization: `Bearer ${moderatorToken}` },
    });
    expect(resForbidden.statusCode).toBe(403);

    // 3. Unauthenticated guest -> 401 Unauthorized
    const resUnauthorized = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/audit-logs',
    });
    expect(resUnauthorized.statusCode).toBe(401);
  });

  it('safeguards audit log immutability by rejecting create/edit/delete endpoints', async () => {
    // Attempt to DELETE an audit record -> 404 Route Not Found (immutable)
    const resDelete = await app.inject({
      method: 'DELETE',
      url: '/api/v1/admin/audit-logs/some-log-id',
      headers: { authorization: `Bearer ${superAdminToken}` },
    });
    expect(resDelete.statusCode).toBe(404);

    // Attempt to PUT an audit record -> 404 Route Not Found (immutable)
    const resPut = await app.inject({
      method: 'PUT',
      url: '/api/v1/admin/audit-logs/some-log-id',
      headers: { authorization: `Bearer ${superAdminToken}` },
      payload: { action: 'TAMPERED_ACTION' },
    });
    expect(resPut.statusCode).toBe(404);
  });
});

