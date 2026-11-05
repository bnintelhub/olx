import { apiClient } from '../../../lib/api-client';

export interface CategoryItem {
  id: string;
  parentId: string | null;
  name: string;
  slug: string;
  description?: string | null;
  sortOrder: number;
  level: number;
  isActive: boolean;
  imageMediaId?: string | null;
  image?: {
    mediaId?: string | null;
    url?: string | null;
    thumbnailUrl?: string | null;
    displayUrl?: string | null;
    variants?: {
      thumbnail?: string;
      card?: string;
      medium?: string;
      large?: string;
      [key: string]: string | undefined;
    } | null;
  } | null;
  adsCount?: number;
  children?: CategoryItem[];
  attributes?: any[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateCategoryPayload {
  name: string;
  slug?: string;
  parentId?: string | null;
  description?: string;
  sortOrder?: number;
  imageMediaId?: string | null;
  isActive?: boolean;
}

export interface UpdateCategoryPayload {
  name?: string;
  slug?: string;
  parentId?: string | null;
  description?: string | null;
  sortOrder?: number;
  imageMediaId?: string | null;
  isActive?: boolean;
}

export interface ReorderCategoryItem {
  id: string;
  sortOrder: number;
}

export const categoriesService = {
  // Fetch full category tree including inactive items for admin
  async getTree(includeInactive: boolean = true): Promise<CategoryItem[]> {
    const res = await apiClient.get('/categories/tree', {
      params: { includeInactive: String(includeInactive) },
    });
    return (res.data?.data || []) as CategoryItem[];
  },

  // Create new category (supports direct file upload or JSON)
  async create(payload: CreateCategoryPayload, imageFile?: File | null): Promise<CategoryItem> {
    if (imageFile) {
      const formData = new FormData();
      formData.append('image', imageFile);
      formData.append('name', payload.name);
      if (payload.slug) formData.append('slug', payload.slug);
      if (payload.parentId) formData.append('parentId', payload.parentId);
      if (payload.description) formData.append('description', payload.description);
      if (payload.sortOrder !== undefined) formData.append('sortOrder', String(payload.sortOrder));
      if (payload.isActive !== undefined) formData.append('isActive', String(payload.isActive));

      const res = await apiClient.post('/categories', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return res.data?.data;
    }

    const res = await apiClient.post('/categories', payload);
    return res.data?.data;
  },

  // Update category (supports direct file upload / replacement / removal or JSON)
  async update(
    id: string,
    payload: UpdateCategoryPayload,
    imageFile?: File | null,
    removeImage?: boolean
  ): Promise<CategoryItem> {
    if (imageFile || removeImage) {
      const formData = new FormData();
      if (imageFile) formData.append('image', imageFile);
      if (removeImage) formData.append('removeImage', 'true');
      if (payload.name !== undefined) formData.append('name', payload.name);
      if (payload.slug !== undefined) formData.append('slug', payload.slug);
      if (payload.parentId !== undefined) formData.append('parentId', payload.parentId ?? '');
      if (payload.description !== undefined) formData.append('description', payload.description ?? '');
      if (payload.sortOrder !== undefined) formData.append('sortOrder', String(payload.sortOrder));
      if (payload.isActive !== undefined) formData.append('isActive', String(payload.isActive));

      const res = await apiClient.put(`/categories/${id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return res.data?.data;
    }

    const res = await apiClient.put(`/categories/${id}`, payload);
    return res.data?.data;
  },

  // Toggle category active status
  async toggleStatus(id: string, isActive: boolean): Promise<CategoryItem> {
    const res = await apiClient.patch(`/categories/${id}/status`, { isActive });
    return res.data?.data;
  },

  // Transactionally reorder categories
  async reorder(items: ReorderCategoryItem[]): Promise<{ success: boolean; count: number }> {
    const res = await apiClient.patch('/categories/reorder', { items });
    return res.data?.data;
  },

  // Delete category
  async delete(id: string): Promise<{ success: boolean; message: string }> {
    const res = await apiClient.delete(`/categories/${id}`);
    return res.data?.data;
  },
};

