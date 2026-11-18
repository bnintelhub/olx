import { z } from 'zod';

export const createTicketSchema = z.object({
  subject: z.string().min(5, 'Subject must be at least 5 characters').max(200, 'Subject is too long'),
  category: z.string().min(2, 'Category is required').max(80),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']).default('NORMAL'),
  message: z.string().min(10, 'Please describe your inquiry or issue with at least 10 characters'),
});

export const createTicketReplySchema = z.object({
  message: z.string().min(2, 'Message cannot be empty'),
});

export const adminReplyTicketSchema = z.object({
  message: z.string().min(2, 'Message cannot be empty'),
  isInternal: z.boolean().optional().default(false),
  status: z.enum(['OPEN', 'IN_PROGRESS', 'WAITING_ON_CUSTOMER', 'RESOLVED', 'CLOSED']).optional(),
});

export const adminUpdateTicketSchema = z.object({
  status: z.enum(['OPEN', 'IN_PROGRESS', 'WAITING_ON_CUSTOMER', 'RESOLVED', 'CLOSED']).optional(),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']).optional(),
  assignedToId: z.string().nullable().optional(),
});

export const listTicketsQuerySchema = z.object({
  status: z.string().optional(),
  priority: z.string().optional(),
  category: z.string().optional(),
  search: z.string().optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
});

export type CreateTicketInput = z.infer<typeof createTicketSchema>;
export type CreateTicketReplyInput = z.infer<typeof createTicketReplySchema>;
export type AdminReplyTicketInput = z.infer<typeof adminReplyTicketSchema>;
export type AdminUpdateTicketInput = z.infer<typeof adminUpdateTicketSchema>;
export type ListTicketsQuery = z.infer<typeof listTicketsQuerySchema>;
