import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  clientSupportService,
  CreateTicketPayload,
} from '../services/support.service';

export function useUserTicketsQuery(params?: { status?: string; page?: number; limit?: number }) {
  return useQuery({
    queryKey: ['client', 'support', 'tickets', params],
    queryFn: () => clientSupportService.getUserTickets(params),
  });
}

export function useUserTicketDetailQuery(id: string | null) {
  return useQuery({
    queryKey: ['client', 'support', 'ticket', id],
    queryFn: () => (id ? clientSupportService.getUserTicketById(id) : null),
    enabled: Boolean(id),
    staleTime: 0,
    refetchInterval: id ? 4000 : false,
    refetchOnWindowFocus: true,
  });
}

export function useCreateTicketMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateTicketPayload) => clientSupportService.createTicket(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client', 'support', 'tickets'] });
      toast.success('Your support ticket has been submitted. A specialist will assist you.');
    },
    onError: (error: any) => {
      const msg = error.response?.data?.message || 'Failed to submit support ticket. Please try again.';
      toast.error(msg);
    },
  });
}

export function useReplyTicketMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, message }: { id: string; message: string }) =>
      clientSupportService.replyTicket(id, message),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['client', 'support', 'tickets'] });
      queryClient.invalidateQueries({ queryKey: ['client', 'support', 'ticket', variables.id] });
      toast.success('Your reply has been sent.');
    },
    onError: (error: any) => {
      const msg = error.response?.data?.message || 'Failed to send reply.';
      toast.error(msg);
    },
  });
}
