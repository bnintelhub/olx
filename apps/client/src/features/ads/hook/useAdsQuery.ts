import { useQuery } from '@tanstack/react-query';
import { adsService, AdsQueryParams } from '../service/ads.service';

export const ADS_QUERY_KEYS = {
  all: ['ads'] as const,
  list: (params: AdsQueryParams) => [...ADS_QUERY_KEYS.all, 'list', params] as const,
  detail: (id: string) => [...ADS_QUERY_KEYS.all, 'detail', id] as const,
  similar: (id: string) => [...ADS_QUERY_KEYS.all, 'similar', id] as const,
  myAds: () => [...ADS_QUERY_KEYS.all, 'my-ads'] as const,
};

export function useAdsQuery(params: AdsQueryParams = {}) {
  return useQuery({
    queryKey: ADS_QUERY_KEYS.list(params),
    queryFn: () => adsService.getAds(params),
  });
}

export function useAdDetailQuery(id: string | null) {
  return useQuery({
    queryKey: ADS_QUERY_KEYS.detail(id || ''),
    queryFn: () => adsService.getAdById(id!),
    enabled: Boolean(id),
  });
}

export function useSimilarAdsQuery(id: string | null) {
  return useQuery({
    queryKey: ADS_QUERY_KEYS.similar(id || ''),
    queryFn: () => adsService.getSimilarAds(id!),
    enabled: Boolean(id),
  });
}

export function useMyAdsQuery(enabled = true) {
  return useQuery({
    queryKey: ADS_QUERY_KEYS.myAds(),
    queryFn: () => adsService.getMyAds(),
    enabled,
  });
}

