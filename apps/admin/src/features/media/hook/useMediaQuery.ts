import { useQuery } from '@tanstack/react-query';
import {
  mediaService,
  GetMediaParams,
  GetMediaResponse,
  MediaOverviewResponse,
  MediaItem,
} from '../service/media.service';

export const MEDIA_QUERY_KEYS = {
  all: ['admin-media'] as const,
  overview: ['admin-media', 'overview'] as const,
  list: (params: GetMediaParams) => [
    'admin-media',
    'list',
    params.page ?? 1,
    params.limit ?? 20,
    params.status ?? 'ALL',
    params.scope ?? 'ALL',
    params.search ?? '',
    params.sortBy ?? 'createdAt',
    params.sortOrder ?? 'desc',
  ] as const,
  detail: (id: string) => ['admin-media', 'detail', id] as const,
};

export function useMediaOverviewQuery() {
  return useQuery<MediaOverviewResponse>({
    queryKey: MEDIA_QUERY_KEYS.overview,
    queryFn: () => mediaService.getOverview(),
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });
}

export function useMediaListQuery(params: GetMediaParams) {
  return useQuery<GetMediaResponse>({
    queryKey: MEDIA_QUERY_KEYS.list(params),
    queryFn: () => mediaService.getMediaList(params),
    staleTime: 5000,
    refetchOnWindowFocus: false,
    refetchInterval: (query) => {
      const hasProcessing = query.state.data?.items?.some((item) => item.status === 'PROCESSING');
      return hasProcessing ? 1500 : false;
    },
  });
}

export function useMediaDetailQuery(id: string | null) {
  return useQuery<MediaItem>({
    queryKey: MEDIA_QUERY_KEYS.detail(id || ''),
    queryFn: () => mediaService.getMediaDetail(id!),
    enabled: Boolean(id),
    staleTime: 2000,
    refetchInterval: (query) => {
      const item = query.state.data;
      return item?.status === 'PROCESSING' ? 1500 : false;
    },
  });
}

