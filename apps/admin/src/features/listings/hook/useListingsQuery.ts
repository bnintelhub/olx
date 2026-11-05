import { useQuery } from '@tanstack/react-query';
import { listingsService, GetAdsParams, GetAdsResponse } from '../service/listings.service';

export const LISTINGS_QUERY_KEYS = {
  all: ['admin-ads'] as const,
  list: (params: GetAdsParams) => ['admin-ads', 'list', params] as const,
};

export function useAdminListings(params: GetAdsParams) {
  return useQuery<GetAdsResponse>({
    queryKey: LISTINGS_QUERY_KEYS.list(params),
    queryFn: () => listingsService.getAds(params),
    placeholderData: (prev) => prev,
    staleTime: 30000,
  });
}

