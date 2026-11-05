import { useMutation, useQueryClient } from '@tanstack/react-query';
import { listingsService, UpdateAdStatusPayload, AdStatus } from '../service/listings.service';
import { LISTINGS_QUERY_KEYS } from './useListingsQuery';
import { toast } from 'sonner';

export function useUpdateAdStatusMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpdateAdStatusPayload) => listingsService.updateStatus(payload),
    onSuccess: (data, variables) => {
      const actionLabel =
        variables.status === 'ACTIVE'
          ? 'approved / reinstated'
          : variables.status === 'REJECTED'
          ? 'rejected / taken down'
          : variables.status.toLowerCase();
      toast.success(`Listing "${data.title || variables.id}" marked as ${actionLabel}`);
      queryClient.invalidateQueries({ queryKey: LISTINGS_QUERY_KEYS.all });
    },
    onError: (error: any) => {
      const msg = error.response?.data?.message || error.message || 'Failed to update listing status';
      toast.error(msg);
    },
  });
}

export function useDeleteAdMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => listingsService.deleteAd(id),
    onSuccess: () => {
      toast.success('Listing deleted successfully');
      queryClient.invalidateQueries({ queryKey: LISTINGS_QUERY_KEYS.all });
    },
    onError: (error: any) => {
      const msg = error.response?.data?.message || error.message || 'Failed to delete listing';
      toast.error(msg);
    },
  });
}

