import { apiClient } from '@/lib/api-client';
import { AdItem } from '@/types';

export interface AdsQueryParams {
  q?: string;
  category?: string;
  city?: string;
  minPrice?: number;
  maxPrice?: number;
  sort?: string;
  page?: number;
  limit?: number;
  featured?: boolean;
}

export interface AdsListResponse {
  ads: AdItem[];
  total: number;
  page: number;
  totalPages: number;
}

export const adsService = {
  // Search and list ads
  async getAds(params: AdsQueryParams = {}): Promise<AdsListResponse> {
    const { data } = await apiClient.get('/ads', { params });
    if (data.success && data.data) {
      return {
        ads: Array.isArray(data.data) ? data.data : data.data.ads || [],
        total: data.data.total ?? (Array.isArray(data.data) ? data.data.length : 0),
        page: data.data.page ?? 1,
        totalPages: data.data.totalPages ?? 1,
      };
    }
    return { ads: [], total: 0, page: 1, totalPages: 1 };
  },

  // Get ad details by ID
  async getAdById(id: string): Promise<AdItem | null> {
    const { data } = await apiClient.get(`/ads/${id}`);
    return data.success ? data.data : null;
  },

  // Get similar ads
  async getSimilarAds(id: string): Promise<AdItem[]> {
    const { data } = await apiClient.get(`/ads/${id}/similar`);
    if (data.success && Array.isArray(data.data)) {
      return data.data;
    }
    // Fallback to latest ads
    const fallback = await apiClient.get('/ads', { params: { limit: 6 } });
    if (fallback.data?.success && fallback.data.data?.ads) {
      return fallback.data.data.ads.filter((a: AdItem) => a.id !== id).slice(0, 4);
    }
    return [];
  },

  // Reveal seller contact phone number
  async revealContact(id: string): Promise<string | null> {
    const { data } = await apiClient.get(`/ads/${id}/contact`);
    return data.success ? data.data?.phoneNumber || null : null;
  },

  // Toggle favorite / wishlist
  async toggleFavourite(id: string): Promise<{ isWishlisted: boolean; message: string }> {
    const { data } = await apiClient.post(`/ads/${id}/favourite`);
    return {
      isWishlisted: Boolean(data.data?.isFavourited ?? data.data?.favourited),
      message: data.message || 'Updated wishlist',
    };
  },

  // Fetch current user's published ads
  async getMyAds(): Promise<AdItem[]> {
    const { data } = await apiClient.get('/ads/my-ads');
    return data.success ? data.data : [];
  },

  // Create new listing
  async createAd(formData: any): Promise<AdItem> {
    const { data } = await apiClient.post('/ads', formData);
    return data.data;
  },

  // Delete ad
  async deleteAd(id: string): Promise<boolean> {
    const { data } = await apiClient.delete(`/ads/${id}`);
    return Boolean(data.success);
  },
};

