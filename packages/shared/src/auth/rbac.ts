import { UserRole } from '@olx/database';

// ============================================================================
// GRANULAR PERMISSIONS
// ============================================================================

export const Permissions = {
  // System & Security Settings (Super Admin / Admin)
  SETTINGS_READ: 'settings:read',
  SETTINGS_MANAGE: 'settings:manage',
  AUDIT_READ: 'audit:read',
  ADMINS_MANAGE: 'admins:manage',

  // Users & Support (Admin / Customer Support)
  USERS_READ: 'users:read',
  USERS_MANAGE: 'users:manage',
  USERS_BAN: 'users:ban',
  SUPPORT_READ: 'support:read',
  SUPPORT_MANAGE: 'support:manage',

  // Listings & Moderation (Admin / Moderator)
  LISTINGS_READ: 'listings:read',
  LISTINGS_APPROVE: 'listings:approve',
  LISTINGS_REJECT: 'listings:reject',
  LISTINGS_DELETE: 'listings:delete',
  REPORTS_READ: 'reports:read',
  REPORTS_INVESTIGATE: 'reports:investigate',

  // Content Management (Content Manager)
  CATEGORIES_MANAGE: 'categories:manage',
  BANNERS_MANAGE: 'banners:manage',
  ANNOUNCEMENTS_MANAGE: 'announcements:manage',

  // Location Hierarchy Management
  LOCATIONS_READ: 'locations:read',
  LOCATIONS_CREATE: 'locations:create',
  LOCATIONS_UPDATE: 'locations:update',
  LOCATIONS_DELETE: 'locations:delete',
  LOCATIONS_ACTIVATE: 'locations:activate',
  LOCATIONS_DEACTIVATE: 'locations:deactivate',
  LOCATIONS_MANAGE: 'locations:manage',

  // Finance & Revenue (Finance Admin)
  PAYMENTS_READ: 'payments:read',
  PAYMENTS_REFUND: 'payments:refund',
  INVOICES_MANAGE: 'invoices:manage',
  REVENUE_READ: 'revenue:read',

  // Analytics & Reports (Analyst / Admin)
  ANALYTICS_READ: 'analytics:read',
} as const;

export type Permission = typeof Permissions[keyof typeof Permissions] | '*';

// ============================================================================
// MARKETPLACE ACCOUNT CAPABILITIES
// (Buyer & Seller handled via capabilities, NOT mutually exclusive roles)
// ============================================================================

export const AccountCapabilities = {
  CAN_BUY: 'can_buy',        // Browse, chat, make offers, save favourites, report ads
  CAN_SELL: 'can_sell',      // Create, edit, promote, and manage listings
  IS_DEALER: 'is_dealer',    // Manage multiple listings, business profile, dealer badges
} as const;

export type AccountCapability = typeof AccountCapabilities[keyof typeof AccountCapabilities];

// ============================================================================
// ROLE TO PERMISSIONS MATRIX
// ============================================================================

export const ROLE_PERMISSIONS: Record<UserRole, readonly Permission[]> = {
  // 1. Super Admin: Full system control
  SUPER_ADMIN: ['*'],

  // 2. Admin: Users, listings, settings, operational management
  // NOTE: Does NOT have payments:refund or admins:manage by default to avoid universal power
  ADMIN: [
    Permissions.SETTINGS_READ,
    Permissions.SETTINGS_MANAGE,
    Permissions.AUDIT_READ,
    Permissions.USERS_READ,
    Permissions.USERS_MANAGE,
    Permissions.USERS_BAN,
    Permissions.LISTINGS_READ,
    Permissions.LISTINGS_APPROVE,
    Permissions.LISTINGS_REJECT,
    Permissions.LISTINGS_DELETE,
    Permissions.REPORTS_READ,
    Permissions.REPORTS_INVESTIGATE,
    Permissions.CATEGORIES_MANAGE,
    Permissions.BANNERS_MANAGE,
    Permissions.ANNOUNCEMENTS_MANAGE,
    Permissions.LOCATIONS_READ,
    Permissions.LOCATIONS_CREATE,
    Permissions.LOCATIONS_UPDATE,
    Permissions.LOCATIONS_DELETE,
    Permissions.LOCATIONS_ACTIVATE,
    Permissions.LOCATIONS_DEACTIVATE,
    Permissions.LOCATIONS_MANAGE,
    Permissions.ANALYTICS_READ,
  ],

  // 3. Moderator: Approve/reject listings, investigate reports
  // NOTE: Cannot issue refunds, cannot alter settings, cannot ban/modify users
  MODERATOR: [
    Permissions.LISTINGS_READ,
    Permissions.LISTINGS_APPROVE,
    Permissions.LISTINGS_REJECT,
    Permissions.REPORTS_READ,
    Permissions.REPORTS_INVESTIGATE,
  ],

  // 4. Customer Support: Tickets, user complaints, limited account actions
  CUSTOMER_SUPPORT: [
    Permissions.SUPPORT_READ,
    Permissions.SUPPORT_MANAGE,
    Permissions.REPORTS_READ,
    Permissions.USERS_READ,
    Permissions.LISTINGS_READ,
  ],

  // 5. Finance Admin: Payments, refunds, invoices, revenue
  // NOTE: Cannot moderate listings, cannot change security settings, cannot ban users
  FINANCE_ADMIN: [
    Permissions.PAYMENTS_READ,
    Permissions.PAYMENTS_REFUND,
    Permissions.INVOICES_MANAGE,
    Permissions.REVENUE_READ,
    Permissions.ANALYTICS_READ,
  ],

  // 6. Content Manager: Categories, banners, announcements
  // NOTE: No finance, no user management, no listing approvals
  CONTENT_MANAGER: [
    Permissions.CATEGORIES_MANAGE,
    Permissions.BANNERS_MANAGE,
    Permissions.ANNOUNCEMENTS_MANAGE,
    Permissions.LOCATIONS_READ,
    Permissions.LOCATIONS_CREATE,
    Permissions.LOCATIONS_UPDATE,
    Permissions.LOCATIONS_ACTIVATE,
    Permissions.LOCATIONS_DEACTIVATE,
    Permissions.LOCATIONS_MANAGE,
    Permissions.LISTINGS_READ,
  ],

  // 7. Analyst: Read-only analytics and reports
  ANALYST: [
    Permissions.ANALYTICS_READ,
    Permissions.REPORTS_READ,
    Permissions.LISTINGS_READ,
  ],

  // Regular Marketplace User
  USER: [],
  GUEST: [],
};

// ============================================================================
// AUTHORIZATION HELPERS
// ============================================================================

export function getRolePermissions(role: UserRole): Permission[] {
  return [...(ROLE_PERMISSIONS[role] || [])];
}

export function hasPermission(
  userRole: UserRole,
  permission: Permission,
  customPermissions?: Permission[]
): boolean {
  if (userRole === UserRole.SUPER_ADMIN) return true;

  const rolePerms = ROLE_PERMISSIONS[userRole] || [];
  if (rolePerms.includes('*') || rolePerms.includes(permission)) {
    return true;
  }

  if (customPermissions && (customPermissions.includes('*') || customPermissions.includes(permission))) {
    return true;
  }

  return false;
}

export function hasCapability(
  userCapabilities: string[] | undefined,
  capability: AccountCapability
): boolean {
  if (!userCapabilities) return false;
  return userCapabilities.includes(capability);
}

export function resolveUserCapabilities(user: {
  role: UserRole;
  capabilities?: string[];
  profile?: { accountType?: string | null } | null;
}): AccountCapability[] {
  const caps = new Set<AccountCapability>();

  // If user has persisted capabilities in DB, load them
  if (user.capabilities && Array.isArray(user.capabilities)) {
    user.capabilities.forEach((c) => caps.add(c as AccountCapability));
  } else {
    // Default capabilities for all standard users
    caps.add(AccountCapabilities.CAN_BUY);
    caps.add(AccountCapabilities.CAN_SELL);
  }

  // If accountType is DEALER or BUSINESS, grant dealer capability
  const accountType = user.profile?.accountType?.toUpperCase();
  if (accountType === 'DEALER' || accountType === 'BUSINESS') {
    caps.add(AccountCapabilities.IS_DEALER);
  }

  return Array.from(caps);
}

