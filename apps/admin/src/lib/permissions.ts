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
    badgeColor: 'text-amber-400 bg-amber-400/10 border-amber-400/30',
  },
  ADMIN: {
    role: 'ADMIN',
    label: 'Admin',
    subtitle: 'Platform Operations',
    icon: ShieldCheck,
    badgeColor: 'text-blue-400 bg-blue-400/10 border-blue-400/30',
  },
  MODERATOR: {
    role: 'MODERATOR',
    label: 'Moderator',
    subtitle: 'Listing & User Moderation',
    icon: ShieldAlert,
    badgeColor: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/30',
  },
  CUSTOMER_SUPPORT: {
    role: 'CUSTOMER_SUPPORT',
    label: 'Support',
    subtitle: 'Tickets & Customer Care',
    icon: Headphones,
    badgeColor: 'text-purple-400 bg-purple-400/10 border-purple-400/30',
  },
  FINANCE_ADMIN: {
    role: 'FINANCE_ADMIN',
    label: 'Finance Admin',
    subtitle: 'Transactions & Payouts',
    icon: DollarSign,
    badgeColor: 'text-teal-400 bg-teal-400/10 border-teal-400/30',
  },
  CONTENT_MANAGER: {
    role: 'CONTENT_MANAGER',
    label: 'Content Manager',
    subtitle: 'Banners, Categories & CMS',
    icon: Megaphone,
    badgeColor: 'text-pink-400 bg-pink-400/10 border-pink-400/30',
  },
  ANALYST: {
    role: 'ANALYST',
    label: 'Analyst',
    subtitle: 'Business Intelligence',
    icon: BarChart3,
    badgeColor: 'text-cyan-400 bg-cyan-400/10 border-cyan-400/30',
  },
};

// Role-specific sidebar menus matching the visual blueprint exactly
export const ROLE_NAVIGATION: Record<AdminRole, NavItem[]> = {
  SUPER_ADMIN: [
    { title: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { title: 'Users', href: '/users', icon: Users },
    { title: 'Listings', href: '/listings', icon: ShoppingBag },
    { title: 'Moderation', href: '/reports', icon: ShieldAlert, badge: '24', badgeVariant: 'danger' },
    { title: 'Reports & Complaints', href: '/reports', icon: AlertTriangle, badge: '8', badgeVariant: 'warning' },
    { title: 'Categories', href: '/categories', icon: FolderTree },
    { title: 'Media Library', href: '/media', icon: Image },
    { title: 'Payments & Revenue', href: '/payments', icon: CreditCard },
    { title: 'Promotions', href: '/promotions', icon: Megaphone },
    { title: 'Analytics', href: '/analytics', icon: BarChart3 },
    { title: 'System Settings', href: '/settings', icon: Settings },
    { title: 'Roles & Permissions', href: '/roles-permissions', icon: KeyRound },
    { title: 'Audit Logs', href: '/audit-logs', icon: FileText },
  ],
  ADMIN: [
    { title: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { title: 'Users', href: '/users', icon: Users },
    { title: 'Listings', href: '/listings', icon: ShoppingBag },
    { title: 'Categories', href: '/categories', icon: FolderTree },
    { title: 'Reports', href: '/reports', icon: ShieldAlert, badge: '8', badgeVariant: 'warning' },
    { title: 'Media Library', href: '/media', icon: Image },
  ],
  MODERATOR: [
    { title: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { title: 'Review Queue', href: '/reports', icon: CheckSquare, badge: '24', badgeVariant: 'danger' },
    { title: 'Reported Items', href: '/reports', icon: ShieldAlert, badge: '8', badgeVariant: 'warning' },
    { title: 'Listings', href: '/listings', icon: ShoppingBag },
    { title: 'User Actions', href: '/users', icon: Users },
  ],
  CUSTOMER_SUPPORT: [
    { title: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { title: 'Tickets', href: '/support', icon: Headphones, badge: '14', badgeVariant: 'warning' },
    { title: 'User Complaints', href: '/reports', icon: AlertTriangle },
    { title: 'Chats', href: '/support', icon: FileText },
    { title: 'Account Help', href: '/users', icon: Users },
  ],
  FINANCE_ADMIN: [
    { title: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { title: 'Transactions', href: '/payments', icon: CreditCard },
    { title: 'Payouts', href: '/payments', icon: DollarSign },
    { title: 'Refunds', href: '/payments', icon: Receipt },
    { title: 'Invoices', href: '/payments', icon: FileText },
    { title: 'Revenue', href: '/analytics', icon: BarChart3 },
  ],
  CONTENT_MANAGER: [
    { title: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { title: 'Banners', href: '/promotions', icon: Image },
    { title: 'Categories', href: '/categories', icon: FolderTree },
    { title: 'Content', href: '/promotions', icon: FileCode },
    { title: 'Announcements', href: '/promotions', icon: Megaphone },
    { title: 'CMS', href: '/settings', icon: Settings },
  ],
  ANALYST: [
    { title: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { title: 'Analytics', href: '/analytics', icon: BarChart3 },
    { title: 'Reports', href: '/reports', icon: FileText },
    { title: 'User Insights', href: '/users', icon: Users },
    { title: 'Listing Insights (Read-only)', href: '/listings', icon: ShoppingBag },
  ],
};

// Retrieve menu items configured specifically for the active role
export function filterNavForRole(role: AdminRole): NavItem[] {
  return ROLE_NAVIGATION[role] || ROLE_NAVIGATION.SUPER_ADMIN;
}
