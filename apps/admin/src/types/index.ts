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
  description?: string;
}

export interface UserItem {
  id: string;
  email?: string;
  phoneNumber?: string;
  role: string;
  status: 'ACTIVE' | 'SUSPENDED' | 'BANNED';
  createdAt: string;
  name?: string;
  listingsCount?: number;
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
  imageUrl?: string;
}

export interface ModerationQueueItem {
  id: string;
  title: string;
  sellerName: string;
  sellerEmail: string;
  category: string;
  price: number;
  flagReason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  thumbnailUrl?: string;
  submittedAt: string;
}

export interface SupportTicketItem {
  id: string;
  ticketNumber: string;
  customerName: string;
  email: string;
  subject: string;
  category: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED';
  createdAt: string;
}

export interface TransactionItem {
  id: string;
  amount: number;
  status: 'SUCCESS' | 'PENDING' | 'FAILED' | 'REFUNDED';
  userEmail: string;
  userName?: string;
  packageType: string;
  createdAt: string;
}

export interface BannerItem {
  id: string;
  title: string;
  placement: string;
  impressions: number;
  clicks: number;
  ctr: string;
  status: 'ACTIVE' | 'SCHEDULED' | 'PAUSED';
  expiryDate: string;
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
