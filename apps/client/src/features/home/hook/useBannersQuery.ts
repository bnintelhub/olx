import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export interface BannerItem {
  id: string;
  title: string;
  subtitle?: string | null;
  ctaText?: string | null;
  targetUrl?: string | null;
  position: string;
  mediaType: 'IMAGE' | 'VIDEO';
  desktopMediaUrl?: string | null;
  mobileMediaUrl?: string | null;
  locationText?: string | null;
  categoryText?: string | null;
  priority: number;
}

export function useBannersQuery(position = 'HOME_HERO') {
  return useQuery<BannerItem[]>({
    queryKey: ['banners', position],
    queryFn: async () => {
      const res = await apiClient.get('/banners', { params: { position } });
      return res.data?.data || [];
    },
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}

export async function recordBannerImpression(bannerId: string) {
  try {
    await apiClient.post(`/banners/${bannerId}/impression`);
  } catch {
    // Fail silently without disrupting user experience
  }
}

export async function recordBannerClick(bannerId: string) {
  try {
    await apiClient.post(`/banners/${bannerId}/click`);
  } catch {
    // Fail silently
  }
}

