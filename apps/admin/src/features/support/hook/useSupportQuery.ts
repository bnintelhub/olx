import { useQuery } from '@tanstack/react-query';
import { supportService, ListSupportTicketsParams } from '../service/support.service';

export function useSupportStatsQuery() {
  return useQuery({
    queryKey: ['admin', 'support', 'stats'],
    queryFn: () => supportService.getStats(),
    refetchInterval: 30000,
  });
}

export function useSupportTicketsQuery(params?: ListSupportTicketsParams) {
  return useQuery({
    queryKey: ['admin', 'support', 'tickets', params],
    queryFn: () => supportService.getTickets(params),
  });
}

export function useSupportTicketDetailQuery(id: string | null) {
  return useQuery({
    queryKey: ['admin', 'support', 'ticket', id],
    queryFn: () => (id ? supportService.getTicketById(id) : null),
    enabled: Boolean(id),
    staleTime: 0,
    refetchInterval: id ? 4000 : false,
    refetchOnWindowFocus: true,
  });
}
