import { apiClient } from '../../../lib/api-client';

export type TicketPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
export type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'WAITING_ON_CUSTOMER' | 'RESOLVED' | 'CLOSED';

export interface SupportTicketAuthor {
  id: string;
  phoneNumber?: string;
  email?: string;
  role: string;
  profile?: {
    name?: string;
    avatarUrl?: string;
  } | null;
}

export interface SupportTicketEntry {
  id: string;
  ticketId: string;
  authorId?: string | null;
  body: string;
  isInternal: boolean;
  createdAt: string;
  author?: SupportTicketAuthor | null;
}

export interface SupportTicket {
  id: string;
  requesterId: string;
  category: string;
  subject: string;
  priority: TicketPriority;
  status: TicketStatus;
  assignedToId?: string | null;
  slaTargetAt?: string | null;
  resolvedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  requester?: {
    id: string;
    phoneNumber?: string;
    email?: string;
    profile?: { name?: string; avatarUrl?: string } | null;
  };
  assignedTo?: {
    id: string;
    phoneNumber?: string;
    email?: string;
    profile?: { name?: string; avatarUrl?: string } | null;
  } | null;
  entries?: SupportTicketEntry[];
}

export interface SupportStats {
  openTickets: number;
  inProgressTickets: number;
  urgentTickets: number;
  waitingTickets: number;
  resolvedToday: number;
  total: number;
}

export interface SupportTicketsResponse {
  tickets: SupportTicket[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ListSupportTicketsParams {
  search?: string;
  status?: string;
  priority?: string;
  category?: string;
  page?: number;
  limit?: number;
}

export interface UpdateSupportTicketPayload {
  status?: TicketStatus;
  priority?: TicketPriority;
  assignedToId?: string | null;
}

export interface ReplySupportTicketPayload {
  message: string;
  isInternal?: boolean;
  status?: TicketStatus;
}

export const supportService = {
  getStats: async (): Promise<SupportStats> => {
    const res = await apiClient.get('/admin/support/stats');
    return res.data?.data;
  },

  getTickets: async (params?: ListSupportTicketsParams): Promise<SupportTicketsResponse> => {
    const res = await apiClient.get('/admin/support/tickets', { params });
    return res.data?.data;
  },

  getTicketById: async (id: string): Promise<SupportTicket> => {
    const res = await apiClient.get(`/admin/support/tickets/${id}`);
    return res.data?.data;
  },

  updateTicket: async (id: string, payload: UpdateSupportTicketPayload): Promise<SupportTicket> => {
    const res = await apiClient.patch(`/admin/support/tickets/${id}`, payload);
    return res.data?.data;
  },

  replyTicket: async (id: string, payload: ReplySupportTicketPayload): Promise<SupportTicketEntry> => {
    const res = await apiClient.post(`/admin/support/tickets/${id}/reply`, payload);
    return res.data?.data;
  },
};
