import { apiClient } from '@/lib/api-client';
import { AdItem } from '@/types';
import { autoSafeScaleImage } from '@/lib/image-utils';

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
  brand?: string;
  year?: string;
  owner?: string;
  fuel_type?: string;
  transmission?: string;
  bhk?: string;
  furnishing?: string;
  storage?: string;
  [key: string]: any;
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
  async getMyAds(status?: string): Promise<{ ads: any[]; counts: Record<string, number>; total: number }> {
    const params = status && status !== 'ALL' ? { status } : {};
    const { data } = await apiClient.get('/user/my-ads', { params });
    if (data.success && data.data) {
      return {
        ads: Array.isArray(data.data.ads) ? data.data.ads : (Array.isArray(data.data) ? data.data : []),
        counts: data.data.counts || { ACTIVE: 0, PENDING_REVIEW: 0, SOLD: 0, EXPIRED: 0, ARCHIVED: 0 },
        total: data.data.total ?? (Array.isArray(data.data.ads) ? data.data.ads.length : 0),
      };
    }
    return { ads: [], counts: { ACTIVE: 0, PENDING_REVIEW: 0, SOLD: 0, EXPIRED: 0, ARCHIVED: 0 }, total: 0 };
  },

  // Update listing status (e.g. SOLD, ACTIVE)
  async updateAdStatus(id: string, status: string): Promise<any> {
    const { data } = await apiClient.patch(`/ads/${id}/status`, { status });
    return data.data;
  },

  // Upload listing photos (up to 8 images)
  async uploadImages(files: File[]): Promise<Array<{
    mediaId: string;
    url: string;
    displayUrl?: string;
    thumbnailUrl?: string;
    variants?: any;
  }>> {
    // Failsafe: Ensure no file exceeds server 5000x5000px limit
    const safeFiles = await Promise.all(
      files.map((file) => autoSafeScaleImage(file, 4000))
    );

    const formData = new FormData();
    safeFiles.forEach((file) => {
      formData.append('images', file);
    });

    const { data } = await apiClient.post('/ads/upload-images?resource=ads', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return data.success && Array.isArray(data.data) ? data.data : [];
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

