export type AdminRole =
  | 'SUPER_ADMIN'
  | 'ADMIN'
  | 'MODERATOR'
  | 'CUSTOMER_SUPPORT'
  | 'FINANCE_ADMIN'
  | 'CONTENT_MANAGER'
  | 'ANALYST';

export interface AdminUser {
  id: string;
  email?: string;
  phoneNumber?: string;
  role: AdminRole;
  name?: string;
  permissions: string[];
}

export interface MetricCardData {
  title: string;
  value: string | number;
  change: string;
  isPositive: boolean;
  description: string;
}

export interface UserItem {
  id: string;
  email?: string;
  phoneNumber?: string;
  role: string;
  status: 'ACTIVE' | 'SUSPENDED' | 'BANNED';
  createdAt: string;
  name?: string;
}

export interface ListingItem {
  id: string;
  title: string;
  price: number;
  category: string;
  status: 'ACTIVE' | 'PENDING' | 'REJECTED' | 'SOLD';
  sellerName: string;
  createdAt: string;
  imagesCount: number;
}

export interface ReportItem {
  id: string;
  reason: string;
  targetType: 'AD' | 'USER';
  targetId: string;
  reporterName: string;
  status: 'PENDING' | 'RESOLVED' | 'DISMISSED';
  createdAt: string;
}

export interface AuditLogItem {
  id: string;
  userId?: string;
  action: string;
  entityType: string;
  entityId: string;
  ipAddress?: string;
  createdAt: string;
}

export interface TransactionItem {
  id: string;
  amount: number;
  status: 'SUCCESS' | 'PENDING' | 'FAILED' | 'REFUNDED';
  userEmail: string;
  packageType: string;
  createdAt: string;
}
