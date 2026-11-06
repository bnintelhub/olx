import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { adsService } from '../service/ads.service';
import { ADS_QUERY_KEYS } from './useAdsQuery';
import { useAuthStore } from '@/features/auth/stores/useAuthStore';

export function useToggleFavouriteMutation() {
  const queryClient = useQueryClient();
  const { isAuthenticated, openAuthModal } = useAuthStore();

  return useMutation({
    mutationFn: async (adId: string) => {
      if (!isAuthenticated) {
        openAuthModal();
        throw new Error('AUTH_REQUIRED');
      }
      return adsService.toggleFavourite(adId);
    },
    onSuccess: (data, adId) => {
      toast.success(data.message || (data.isWishlisted ? 'Saved to Wishlist' : 'Removed from Wishlist'));
      queryClient.invalidateQueries({ queryKey: ADS_QUERY_KEYS.all });
      queryClient.invalidateQueries({ queryKey: ADS_QUERY_KEYS.detail(adId) });
    },
    onError: (err: any) => {
      if (err.message !== 'AUTH_REQUIRED') {
        toast.error('Could not update wishlist. Please try again.');
      }
    },
  });
}

export function useDeleteAdMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (adId: string) => adsService.deleteAd(adId),
    onSuccess: () => {
      toast.success('Listing deleted successfully');
      queryClient.invalidateQueries({ queryKey: ADS_QUERY_KEYS.myAds() });
      queryClient.invalidateQueries({ queryKey: ADS_QUERY_KEYS.all });
    },
    onError: () => {
      toast.error('Failed to delete ad');
    },
  });
}

