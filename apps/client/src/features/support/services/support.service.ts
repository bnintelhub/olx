import { apiClient } from '@/lib/api-client';

export type TicketPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
export type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'WAITING_ON_CUSTOMER' | 'RESOLVED' | 'CLOSED';

export interface SupportTicketEntry {
  id: string;
  ticketId: string;
  authorId?: string | null;
  body: string;
  isInternal: boolean;
  createdAt: string;
  author?: {
    id: string;
    role: string;
    profile?: {
      name?: string;
      avatarUrl?: string;
    } | null;
  } | null;
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
  entries?: SupportTicketEntry[];
}

export interface UserTicketsResponse {
  tickets: SupportTicket[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CreateTicketPayload {
  subject: string;
  category: string;
  priority?: TicketPriority;
  message: string;
}

export const clientSupportService = {
  createTicket: async (payload: CreateTicketPayload): Promise<SupportTicket> => {
    const res = await apiClient.post('/support/tickets', payload);
    return res.data?.data;
  },

  getUserTickets: async (params?: { status?: string; page?: number; limit?: number }): Promise<UserTicketsResponse> => {
    const res = await apiClient.get('/support/tickets', { params });
    return res.data?.data;
  },

  getUserTicketById: async (id: string): Promise<SupportTicket> => {
    const res = await apiClient.get(`/support/tickets/${id}`);
    return res.data?.data;
  },

  replyTicket: async (id: string, message: string): Promise<SupportTicketEntry> => {
    const res = await apiClient.post(`/support/tickets/${id}/reply`, { message });
    return res.data?.data;
  },
};
