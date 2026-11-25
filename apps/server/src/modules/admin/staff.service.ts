import crypto from 'crypto';
import { FastifyRequest } from 'fastify';
import { UserRole, UserStatus } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { AppError } from '../../shared/errors/app-error';
import { HashUtil } from '../../shared/utils/hash.util';
import { writeAuditLog } from '../../shared/utils/audit.util';
import { getAdminBaseUrl } from '../../shared/utils/url.util';
import { CreateDirectStaffInput, CreateInvitationInput } from './admin.schema';

export class StaffService {
  // Directly provisions permanent staff accounts with an assigned administrative role and password.
  // Immediate activation allows staff to log into the console without needing an onboarding invite token.
  static async createDirectStaff(input: CreateDirectStaffInput, createdById: string, request?: FastifyRequest) {
    const email = input.email.trim().toLowerCase();
    const cleanPassword = input.password.trim();

    // 1. Role validation: Only administrative roles can be created
    const allowedRoles: UserRole[] = [
      UserRole.SUPER_ADMIN,
      UserRole.ADMIN,
      UserRole.MODERATOR,
      UserRole.CUSTOMER_SUPPORT,
      UserRole.FINANCE_ADMIN,
      UserRole.CONTENT_MANAGER,
      UserRole.ANALYST,
    ];

    if (!allowedRoles.includes(input.role)) {
      throw new AppError(400, 'INVALID_ROLE', 'Only administrative staff roles can be provisioned');
    }

    // Role Hierarchy: Non-SuperAdmins cannot provision SuperAdmins
    const creator = await prisma.user.findUnique({ where: { id: createdById } });
    if (creator && creator.role !== UserRole.SUPER_ADMIN && input.role === UserRole.SUPER_ADMIN) {
      throw new AppError(403, 'FORBIDDEN', 'Only Super Administrators can provision Super Admin accounts');
    }

    // 2. Check for duplicate accounts by email
    const existingUser = await prisma.user.findFirst({
      where: { email },
      include: { profile: true },
    });

    if (existingUser) {
      // If user exists as customer, upgrade them to the assigned staff role
      if (existingUser.role === UserRole.USER) {
        const passwordHash = await HashUtil.hashPassword(cleanPassword);
        const updated = await prisma.user.update({
          where: { id: existingUser.id },
          data: {
            role: input.role,
            status: UserStatus.ACTIVE,
            passwordHash,
            isEmailVerified: true,
            profile: {
              upsert: {
                create: { name: input.name.trim() },
                update: { name: input.name.trim() },
              },
            },
          },
          include: { profile: true },
        });

        if (request) {
          await writeAuditLog({
            userId: createdById,
            action: 'USER_UPGRADED_TO_STAFF',
            entityType: 'USER',
            entityId: updated.id,
            newData: { email: updated.email, role: updated.role, name: input.name },
            request,
          });
        }

        return {
          user: {
            id: updated.id,
            email: updated.email,
            name: updated.profile?.name || input.name,
            role: updated.role,
            status: updated.status,
          },
          message: `User ${email} upgraded to permanent staff role ${input.role}`,
        };
      }

      throw new AppError(409, 'STAFF_ALREADY_EXISTS', `A staff account with email ${email} already exists`);
    }

    // 3. Hash password and persist permanent staff record
    const passwordHash = await HashUtil.hashPassword(cleanPassword);
    const newStaff = await prisma.user.create({
      data: {
        email,
        phoneNumber: input.phoneNumber?.trim() || null,
        passwordHash,
        role: input.role,
        status: UserStatus.ACTIVE,
        isEmailVerified: true,
        profile: {
          create: {
            name: input.name.trim(),
            bio: `${input.role.replace(/_/g, ' ')} at BLX Orbit`,
            isIdentityVerified: true,
          },
        },
      },
      include: { profile: true },
    });

    if (request) {
      await writeAuditLog({
        userId: createdById,
        action: 'DIRECT_STAFF_CREATED',
        entityType: 'USER',
        entityId: newStaff.id,
        newData: { email: newStaff.email, role: newStaff.role, name: input.name },
        request,
      });
    }

    return {
      user: {
        id: newStaff.id,
        email: newStaff.email,
        name: newStaff.profile?.name || input.name,
        role: newStaff.role,
        status: newStaff.status,
      },
      message: `Staff member ${newStaff.email} created successfully`,
    };
  }

  // Creates short-term or token-based onboarding invitations with dynamic URL derivation.
  static async createStaffInvitation(
    input: CreateInvitationInput,
    invitedById: string,
    request?: FastifyRequest
  ) {
    const email = input.email.trim().toLowerCase();
    const token = crypto.randomBytes(32).toString('hex');

    // Calculate expiration date
    let expiresAt: Date | null = null;
    if (input.expiryType === '2_DAYS') {
      expiresAt = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
    } else if (input.expiryType === '3_DAYS') {
      expiresAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
    } else if (input.expiryType === '7_DAYS') {
      expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    } else if (input.expiryType === 'CUSTOM' && input.customExpiresAt) {
      expiresAt = new Date(input.customExpiresAt);
    }

    // Invalidate prior pending invites for this email
    await (prisma as any).staffInvitation.updateMany({
      where: { email, status: 'PENDING' },
      data: { status: 'REVOKED' },
    });

    const invitation = await (prisma as any).staffInvitation.create({
      data: {
        email,
        role: input.role,
        token,
        status: 'PENDING',
        expiresAt,
        invitedById,
      },
      include: {
        invitedBy: {
          select: { id: true, email: true, profile: { select: { name: true } } },
        },
      },
    });

    const adminBase = getAdminBaseUrl(request);
    const inviteLink = `${adminBase}/accept-invite?token=${token}`;

    if (request) {
      await writeAuditLog({
        userId: invitedById,
        action: 'STAFF_INVITATION_SENT',
        entityType: 'INVITATION',
        entityId: invitation.id,
        newData: { email, role: input.role, expiresAt },
        request,
      });
    }

    return {
      invitation,
      inviteLink,
    };
  }

  // Returns all staff accounts & pending invites with dynamic URLs and zero hardcoded values.
  static async getStaffList(request?: FastifyRequest) {
    const list = await (prisma as any).staffInvitation.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        invitedBy: {
          select: { id: true, email: true, profile: { select: { name: true } } },
        },
      },
    });

    const adminBase = getAdminBaseUrl(request);

    // Fetch existing staff accounts from DB
    const staffRoles: UserRole[] = [
      UserRole.SUPER_ADMIN,
      UserRole.ADMIN,
      UserRole.MODERATOR,
      UserRole.CUSTOMER_SUPPORT,
      UserRole.FINANCE_ADMIN,
      UserRole.CONTENT_MANAGER,
      UserRole.ANALYST,
    ];

    const staffUsers = await prisma.user.findMany({
      where: { role: { in: staffRoles } },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        lastLoginAt: true,
        createdAt: true,
        profile: { select: { name: true, bio: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const staffUserByEmail = new Map<string, any>();
    for (const u of staffUsers) {
      if (u.email) staffUserByEmail.set(u.email.toLowerCase(), u);
    }

    const processedEmails = new Set<string>();

    const enrichedInvitations = list.map((inv: any) => {
      const isLifetime = inv.expiresAt ? new Date(inv.expiresAt).getFullYear() >= 2099 : true;
      const isExpired = inv.expiresAt && !isLifetime ? new Date() > new Date(inv.expiresAt) : false;
      const user = inv.email ? staffUserByEmail.get(inv.email.toLowerCase()) : null;
      if (inv.email) processedEmails.add(inv.email.toLowerCase());

      return {
        ...inv,
        inviteLink: `${adminBase}/accept-invite?token=${inv.token}`,
        isLifetime,
        isExpired,
        user: user
          ? {
              id: user.id,
              email: user.email,
              role: user.role,
              status: user.status,
              name: user.profile?.name,
              lastLoginAt: user.lastLoginAt,
            }
          : null,
      };
    });

    // Append direct permanent staff members not in the invitation table
    const directStaffRows = staffUsers
      .filter((u) => u.email && !processedEmails.has(u.email.toLowerCase()))
      .map((u) => ({
        id: `direct-${u.id}`,
        email: u.email!,
        role: u.role,
        token: '',
        status: 'ACCEPTED',
        expiresAt: null,
        acceptedAt: u.createdAt,
        createdAt: u.createdAt,
        isLifetime: true,
        isExpired: false,
        inviteLink: '',
        isDirectStaff: true,
        invitedBy: null,
        user: {
          id: u.id,
          email: u.email!,
          role: u.role,
          status: u.status,
          name: u.profile?.name || 'Staff Member',
          lastLoginAt: u.lastLoginAt,
        },
      }));

    return [...enrichedInvitations, ...directStaffRows];
  }
}
