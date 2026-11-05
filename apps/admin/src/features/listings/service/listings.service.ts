import { apiClient } from '../../../lib/api-client';

export type AdStatus = 'ACTIVE' | 'PENDING_REVIEW' | 'REJECTED' | 'EXPIRED' | 'SOLD';

export interface AdImageItem {
  id: string;
  adId?: string;
  mediaId?: string | null;
  originalUrl: string;
  displayUrl: string;
  thumbnailUrl: string;
  isCover: boolean;
  sortOrder: number;
}

export interface AdItem {
  id: string;
  title: string;
  slug: string;
  description: string;
  price: number;
  isNegotiable: boolean;
  status: AdStatus;
  rejectionReason?: string | null;
  viewCount: number;
  chatCount: number;
  favouriteCount: number;
  createdAt: string;
  expiresAt: string;
  category?: {
    id: string;
    name: string;
    slug: string;
  };
  location?: {
    id: string;
    name: string;
    slug: string;
  };
  user?: {
    id: string;
    phoneNumber?: string;
    email?: string;
    role: string;
    profile?: {
      name?: string;
      isIdentityVerified?: boolean;
      isVerified?: boolean;
      avatarUrl?: string;
    };
  };
  images?: AdImageItem[];
}

export interface GetAdsParams {
  page?: number;
  limit?: number;
  status?: string;
  category?: string;
  q?: string;
}

export interface GetAdsResponse {
  ads: AdItem[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface UpdateAdStatusPayload {
  id: string;
  status: AdStatus;
  rejectionReason?: string;
}

export const listingsService = {
  // Fetch paginated admin classified ads
  async getAds(params: GetAdsParams): Promise<GetAdsResponse> {
    const res = await apiClient.get('/admin/ads', {
      params: {
        page: params.page ?? 1,
        limit: params.limit ?? 20,
        status: params.status && params.status !== 'ALL' ? params.status : undefined,
        category: params.category && params.category !== 'ALL' ? params.category : undefined,
        q: params.q?.trim() || undefined,
      },
    });
    return (res.data?.data || { ads: [], pagination: { total: 0, page: 1, limit: 20, totalPages: 1 } }) as GetAdsResponse;
  },

  // Update status (Approve, Reject, Take Down, Reinstate)
  async updateStatus({ id, status, rejectionReason }: UpdateAdStatusPayload): Promise<AdItem> {
    const res = await apiClient.patch(`/admin/ads/${id}/status`, {
      status,
      rejectionReason,
    });
    return res.data?.data;
  },

  // Soft-delete ad
  async deleteAd(id: string): Promise<{ success: boolean }> {
    const res = await apiClient.delete(`/admin/ads/${id}`);
    return res.data;
  },
};

