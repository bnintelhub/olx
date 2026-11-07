import { AdminRole } from '../types';
import {
  LayoutDashboard,
  Users,
  ShoppingBag,
  ShieldAlert,
  ShieldCheck,
  FolderTree,
  Image,
  CreditCard,
  Megaphone,
  Headphones,
  BarChart3,
  KeyRound,
  FileText,
  Settings,
  Crown,
  CheckSquare,
  AlertTriangle,
  Receipt,
  FileCode,
  DollarSign,
  LucideIcon,
} from 'lucide-react';

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  badge?: string;
  badgeVariant?: 'danger' | 'warning' | 'primary' | 'neutral';
  group: 'Overview' | 'Operations' | 'Finance & Growth' | 'Administration';
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export interface RoleMeta {
  role: AdminRole;
  label: string;
  subtitle: string;
  icon: LucideIcon;
  badgeColor: string;
}

export const ROLE_CONFIGS: Record<AdminRole, RoleMeta> = {
  SUPER_ADMIN: {
    role: 'SUPER_ADMIN',
    label: 'Super Admin',
    subtitle: 'Full Platform Access',
    icon: Crown,
    badgeColor: 'text-amber-500 bg-amber-500/10 border-amber-500/30',
  },
  ADMIN: {
    role: 'ADMIN',
    label: 'Admin',
    subtitle: 'Platform Operations',
    icon: ShieldCheck,
    badgeColor: 'text-blue-500 bg-blue-500/10 border-blue-500/30',
  },
  MODERATOR: {
    role: 'MODERATOR',
    label: 'Moderator',
    subtitle: 'Listing & User Moderation',
    icon: ShieldAlert,
    badgeColor: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/30',
  },
  CUSTOMER_SUPPORT: {
    role: 'CUSTOMER_SUPPORT',
    label: 'Customer Support',
    subtitle: 'Tickets & Assistance',
    icon: Headphones,
    badgeColor: 'text-purple-500 bg-purple-500/10 border-purple-500/30',
  },
  FINANCE_ADMIN: {
    role: 'FINANCE_ADMIN',
    label: 'Finance Admin',
    subtitle: 'Transactions & Payouts',
    icon: DollarSign,
    badgeColor: 'text-teal-500 bg-teal-500/10 border-teal-500/30',
  },
  CONTENT_MANAGER: {
    role: 'CONTENT_MANAGER',
    label: 'Content Manager',
    subtitle: 'Banners, Categories & CMS',
    icon: Megaphone,
    badgeColor: 'text-pink-500 bg-pink-500/10 border-pink-500/30',
  },
  ANALYST: {
    role: 'ANALYST',
    label: 'Analyst',
    subtitle: 'Business Intelligence',
    icon: BarChart3,
    badgeColor: 'text-cyan-500 bg-cyan-500/10 border-cyan-500/30',
  },
};

export const ROLE_NAVIGATION: Record<AdminRole, NavItem[]> = {
  SUPER_ADMIN: [
    { title: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, group: 'Overview' },
    { title: 'Users & Accounts', href: '/users', icon: Users, group: 'Operations' },
    { title: 'Classified Listings', href: '/listings', icon: ShoppingBag, group: 'Operations' },
    { title: 'Moderation Queue', href: '/moderation', icon: ShieldAlert, badge: '24', badgeVariant: 'danger', group: 'Operations' },
    { title: 'Reports & Safety', href: '/reports', icon: AlertTriangle, badge: '8', badgeVariant: 'warning', group: 'Operations' },
    { title: 'Categories', href: '/categories', icon: FolderTree, group: 'Operations' },
    { title: 'Media Library', href: '/media', icon: Image, group: 'Operations' },
    { title: 'Payments & Escrow', href: '/payments', icon: CreditCard, group: 'Finance & Growth' },
    { title: 'Banners & Promos', href: '/promotions', icon: Megaphone, group: 'Finance & Growth' },
    { title: 'Revenue Policy', href: '/revenue-policy', icon: DollarSign, group: 'Finance & Growth' },
    { title: 'Analytics & BI', href: '/analytics', icon: BarChart3, group: 'Finance & Growth' },
    { title: 'Support Desk', href: '/support', icon: Headphones, badge: '14', badgeVariant: 'warning', group: 'Finance & Growth' },
    { title: 'System Settings', href: '/settings', icon: Settings, group: 'Administration' },
    { title: 'Roles & RBAC', href: '/roles-permissions', icon: KeyRound, group: 'Administration' },
    { title: 'Audit Trail Logs', href: '/audit-logs', icon: FileText, group: 'Administration' },
  ],
  ADMIN: [
    { title: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, group: 'Overview' },
    { title: 'Users Management', href: '/users', icon: Users, group: 'Operations' },
    { title: 'Listings', href: '/listings', icon: ShoppingBag, group: 'Operations' },
    { title: 'Categories', href: '/categories', icon: FolderTree, group: 'Operations' },
    { title: 'Reports Queue', href: '/reports', icon: ShieldAlert, badge: '8', badgeVariant: 'warning', group: 'Operations' },
    { title: 'Media Library', href: '/media', icon: Image, group: 'Operations' },
    { title: 'Revenue Policy', href: '/revenue-policy', icon: DollarSign, group: 'Operations' },
  ],
  MODERATOR: [
    { title: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, group: 'Overview' },
    { title: 'Review Queue', href: '/moderation', icon: CheckSquare, badge: '24', badgeVariant: 'danger', group: 'Operations' },
    { title: 'Reported Items', href: '/reports', icon: ShieldAlert, badge: '8', badgeVariant: 'warning', group: 'Operations' },
    { title: 'Listings', href: '/listings', icon: ShoppingBag, group: 'Operations' },
    { title: 'User Actions', href: '/users', icon: Users, group: 'Operations' },
  ],
  CUSTOMER_SUPPORT: [
    { title: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, group: 'Overview' },
    { title: 'Support Tickets', href: '/support', icon: Headphones, badge: '14', badgeVariant: 'warning', group: 'Operations' },
    { title: 'User Complaints', href: '/reports', icon: AlertTriangle, group: 'Operations' },
    { title: 'Inquiries & Chats', href: '/support?view=inquiries', icon: FileText, group: 'Operations' },
    { title: 'Account Help', href: '/users', icon: Users, group: 'Operations' },
  ],
  FINANCE_ADMIN: [
    { title: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, group: 'Overview' },
    { title: 'Transactions Ledger', href: '/payments', icon: CreditCard, group: 'Finance & Growth' },
    { title: 'Seller Payouts', href: '/payments?view=payouts', icon: DollarSign, group: 'Finance & Growth' },
    { title: 'Refund Inquiries', href: '/payments?view=refunds', icon: Receipt, group: 'Finance & Growth' },
    { title: 'Tax & Invoices', href: '/payments?view=invoices', icon: FileText, group: 'Finance & Growth' },
    { title: 'Revenue Analytics', href: '/analytics', icon: BarChart3, group: 'Finance & Growth' },
    { title: 'Revenue Policy', href: '/revenue-policy', icon: DollarSign, group: 'Finance & Growth' },
  ],
  CONTENT_MANAGER: [
    { title: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, group: 'Overview' },
    { title: 'Marketing Banners', href: '/promotions', icon: Image, group: 'Operations' },
    { title: 'Revenue Policy', href: '/revenue-policy', icon: DollarSign, group: 'Operations' },
    { title: 'Categories Tree', href: '/categories', icon: FolderTree, group: 'Operations' },
    { title: 'Content Articles', href: '/promotions?view=articles', icon: FileCode, group: 'Operations' },
    { title: 'Announcements', href: '/promotions?view=announcements', icon: Megaphone, group: 'Operations' },
    { title: 'CMS Configuration', href: '/settings', icon: Settings, group: 'Administration' },
  ],
  ANALYST: [
    { title: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, group: 'Overview' },
    { title: 'Platform BI Trends', href: '/analytics', icon: BarChart3, group: 'Finance & Growth' },
    { title: 'Performance Reports', href: '/reports', icon: FileText, group: 'Finance & Growth' },
    { title: 'User Conversion', href: '/users', icon: Users, group: 'Operations' },
    { title: 'Listing Funnel (Read-only)', href: '/listings', icon: ShoppingBag, group: 'Operations' },
  ],
};

// Returns grouped navigation items for shadcn SidebarGroup rendering
export function getGroupedNavForRole(role: AdminRole): NavGroup[] {
  const items = ROLE_NAVIGATION[role] || ROLE_NAVIGATION.SUPER_ADMIN;
  const groupsOrder: NavItem['group'][] = ['Overview', 'Operations', 'Finance & Growth', 'Administration'];

  const grouped: NavGroup[] = [];

  for (const groupName of groupsOrder) {
    const groupItems = items.filter((item) => item.group === groupName);
    if (groupItems.length > 0) {
      grouped.push({
        label: groupName,
        items: groupItems,
      });
    }
  }

  return grouped;
}

export function filterNavForRole(role: AdminRole): NavItem[] {
  return ROLE_NAVIGATION[role] || ROLE_NAVIGATION.SUPER_ADMIN;
}
