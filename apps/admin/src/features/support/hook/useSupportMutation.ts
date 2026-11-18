import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  supportService,
  UpdateSupportTicketPayload,
  ReplySupportTicketPayload,
} from '../service/support.service';

export function useUpdateSupportTicketMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateSupportTicketPayload }) =>
      supportService.updateTicket(id, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'support'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'support', 'ticket', variables.id] });
      toast.success('Support ticket updated successfully');
    },
    onError: (error: any) => {
      const msg = error.response?.data?.message || 'Failed to update support ticket';
      toast.error(msg);
    },
  });
}

export function useReplySupportTicketMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: ReplySupportTicketPayload }) =>
      supportService.replyTicket(id, payload),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'support'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'support', 'ticket', variables.id] });
      toast.success(variables.payload.isInternal ? 'Internal note added' : 'Reply sent to customer');
    },
    onError: (error: any) => {
      const msg = error.response?.data?.message || 'Failed to send reply';
      toast.error(msg);
    },
  });
}
