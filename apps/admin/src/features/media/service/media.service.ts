import { apiClient } from '../../../lib/api-client';

export type MediaStatus = 'PENDING' | 'PROCESSING' | 'READY' | 'FAILED';
export type MediaEntityScope =
  | 'LISTING_IMAGE'
  | 'USER_AVATAR'
  | 'CATEGORY_BANNER'
  | 'BANNER'
  | 'REVIEW_IMAGE'
  | 'SUPPORT_ATTACHMENT'
  | 'UNATTACHED';

export interface MediaOverviewResponse {
  totalFiles: number;
  totalFilesFormatted: string;
  storageConsumed: {
    bytes: number;
    formatted: string;
    averageSizeBytes: number;
    averageSizeFormatted: string;
  };
  storageInfrastructure: {
    driver: string;
    isS3Synchronized: boolean;
    synchronizedFilesCount: number;
    synchronizedPercentage: number;
    syncStatusText: string;
    bucket: string;
    endpoint: string;
    publicUrl: string;
  };
  optimizationTier: {
    tier: string;
    variantsPerImage: number;
    variantSpecs: string[];
    compressionAlgorithm: string;
    estimatedStorageSaved: string;
  };
  statusBreakdown: Record<string, number>;
  scopeBreakdown: Record<string, number>;
  mimeTypeBreakdown: Record<string, number>;
  orphanedMedia: {
    count: number;
    cleanupRecommended: boolean;
    cleanupEndpoint: string;
  };
  recentUploads: Array<{
    id: string;
    originalName: string;
    mimeType: string;
    fileSize: number;
    fileSizeFormatted: string;
    status: MediaStatus;
    scope: MediaEntityScope;
    thumbnailUrl: string | null;
    createdAt: string;
  }>;
}

export interface MediaItem {
  id: string;
  originalName: string;
  mimeType: string;
  fileSize: number;
  fileSizeFormatted: string;
  width: number | null;
  height: number | null;
  status: MediaStatus;
  scope: MediaEntityScope;
  isAttached: boolean;
  attachedToId: string | null;
  diskPath: string;
  storageLocation: string;
  variants: {
    thumbnail?: string;
    card?: string;
    medium?: string;
    large?: string;
    [key: string]: string | undefined;
  };
  thumbnailUrl: string | null;
  displayUrl: string | null;
  largeUrl: string | null;
  uploader?: {
    id: string;
    email: string;
    name: string | null;
    phoneNumber: string | null;
  };
  attachedAd?: {
    id: string;
    title: string;
    price: number;
    status: string;
  } | null;
  createdAt: string;
  updatedAt: string;
}

export interface GetMediaParams {
  page?: number;
  limit?: number;
  status?: string;
  scope?: string;
  mimeType?: string;
  search?: string;
  userId?: string;
  sortBy?: 'createdAt' | 'fileSize' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
}

export interface GetMediaResponse {
  items: MediaItem[];
  pagination: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface UpdateMediaMetadataPayload {
  originalName?: string;
  scope?: MediaEntityScope;
  isAttached?: boolean;
  attachedToId?: string | null;
  status?: MediaStatus;
}

export const mediaService = {
  // Retrieves high-level media storage KPIs, WebP compression metrics, and S3 status
  async getOverview(): Promise<MediaOverviewResponse> {
    const res = await apiClient.get('/admin/media/overview');
    return res.data?.data;
  },

  // Lists all media records with pagination, searching, and status/scope filters
  async getMediaList(params: GetMediaParams): Promise<GetMediaResponse> {
    const res = await apiClient.get('/admin/media', {
      params: {
        page: params.page ?? 1,
        limit: params.limit ?? 20,
        status: params.status && params.status !== 'ALL' ? params.status : undefined,
        scope: params.scope && params.scope !== 'ALL' ? params.scope : undefined,
        search: params.search && params.search.trim() ? params.search.trim() : undefined,
        sortBy: params.sortBy ?? 'createdAt',
        sortOrder: params.sortOrder ?? 'desc',
      },
    });

    return {
      items: res.data?.data || [],
      pagination: res.data?.pagination || {
        page: 1,
        limit: 20,
        totalItems: 0,
        totalPages: 1,
        hasNext: false,
        hasPrev: false,
      },
    };
  },

  // Retrieves detailed single media metadata
  async getMediaDetail(id: string): Promise<MediaItem> {
    const res = await apiClient.get(`/admin/media/${id}`);
    return res.data?.data;
  },

  // Updates metadata fields (original name, scope, attachment link)
  async updateMediaMetadata(id: string, payload: UpdateMediaMetadataPayload): Promise<any> {
    const res = await apiClient.patch(`/admin/media/${id}`, payload);
    return res.data;
  },

  // Replaces image file on disk & S3 with immediate purge of old files
  async replaceMediaFile(id: string, file: File): Promise<any> {
    const formData = new FormData();
    formData.append('file', file);

    const res = await apiClient.patch(`/admin/media/${id}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return res.data;
  },

  // Permanently deletes media record and purges all physical variants from disk/S3
  async deleteMedia(id: string): Promise<{ success: boolean; freedBytes: number; freedFormatted: string; message: string }> {
    const res = await apiClient.delete(`/admin/media/${id}`);
    return res.data;
  },

  // Batch purges unattached orphan files to reclaim disk and S3 space
  async cleanupOrphans(hours = 24): Promise<{ success: boolean; deletedCount: number; freedBytes: number; freedFormatted: string; message: string }> {
    const res = await apiClient.post(`/admin/media/cleanup-orphans?hours=${hours}`);
    return res.data;
  },
};

