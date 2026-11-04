import { AdminRole } from '../types';
import {
  LayoutDashboard,
  Users,
  ShoppingBag,
  ShieldAlert,
  FolderTree,
  Image,
  CreditCard,
  Megaphone,
  Headphones,
  BarChart3,
  KeyRound,
  FileText,
  Settings,
  LucideIcon,
} from 'lucide-react';

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  badge?: string;
  allowedRoles: AdminRole[];
}

export const NAVIGATION_ITEMS: NavItem[] = [
  {
    title: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
    allowedRoles: [
      'SUPER_ADMIN',
      'ADMIN',
      'MODERATOR',
      'CUSTOMER_SUPPORT',
      'FINANCE_ADMIN',
      'CONTENT_MANAGER',
      'ANALYST',
    ],
  },
  {
    title: 'Users & Accounts',
    href: '/users',
    icon: Users,
    allowedRoles: ['SUPER_ADMIN', 'ADMIN', 'MODERATOR', 'CUSTOMER_SUPPORT'],
  },
  {
    title: 'Listings',
    href: '/listings',
    icon: ShoppingBag,
    allowedRoles: ['SUPER_ADMIN', 'ADMIN', 'MODERATOR'],
  },
  {
    title: 'Review Queue & Reports',
    href: '/reports',
    icon: ShieldAlert,
    allowedRoles: ['SUPER_ADMIN', 'ADMIN', 'MODERATOR', 'CUSTOMER_SUPPORT'],
  },
  {
    title: 'Categories & Taxonomy',
    href: '/categories',
    icon: FolderTree,
    allowedRoles: ['SUPER_ADMIN', 'ADMIN', 'CONTENT_MANAGER'],
  },
  {
    title: 'Media & Gallery',
    href: '/media',
    icon: Image,
    allowedRoles: ['SUPER_ADMIN', 'ADMIN'],
  },
  {
    title: 'Payments & Refunds',
    href: '/payments',
    icon: CreditCard,
    allowedRoles: ['SUPER_ADMIN', 'FINANCE_ADMIN'],
  },
  {
    title: 'Banners & Promotions',
    href: '/promotions',
    icon: Megaphone,
    allowedRoles: ['SUPER_ADMIN', 'CONTENT_MANAGER'],
  },
  {
    title: 'Customer Support',
    href: '/support',
    icon: Headphones,
    allowedRoles: ['SUPER_ADMIN', 'CUSTOMER_SUPPORT'],
  },
  {
    title: 'Analytics & Growth',
    href: '/analytics',
    icon: BarChart3,
    allowedRoles: ['SUPER_ADMIN', 'ANALYST'],
  },
  {
    title: 'Roles & Permissions',
    href: '/roles-permissions',
    icon: KeyRound,
    allowedRoles: ['SUPER_ADMIN'],
  },
  {
    title: 'Audit Logs',
    href: '/audit-logs',
    icon: FileText,
    allowedRoles: ['SUPER_ADMIN'],
  },
  {
    title: 'Settings',
    href: '/settings',
    icon: Settings,
    allowedRoles: ['SUPER_ADMIN'],
  },
];

export function canAccessNav(item: NavItem, role: AdminRole): boolean {
  if (role === 'SUPER_ADMIN') return true;
  return item.allowedRoles.includes(role);
}

export function filterNavForRole(role: AdminRole): NavItem[] {
  return NAVIGATION_ITEMS.filter((item) => canAccessNav(item, role));
}
