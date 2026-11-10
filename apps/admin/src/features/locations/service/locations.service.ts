import { apiClient } from '../../../lib/api-client';
import {
  LocationItem,
  CreateLocationPayload,
  UpdateLocationPayload,
  LocationSearchParams,
} from '../types';

export const locationsAdminService = {
  // Fetch full nested location tree for admin management
  async getTree(): Promise<LocationItem[]> {
    const { data } = await apiClient.get('/admin/locations/tree');
    return data.success && Array.isArray(data.data) ? data.data : [];
  },

  // Paginated list & search with filters
  async search(params: LocationSearchParams) {
    const { data } = await apiClient.get('/admin/locations/search', { params });
    return data.data;
  },

  // Get single location details with breadcrumb history
  async getById(id: string): Promise<LocationItem> {
    const { data } = await apiClient.get(`/admin/locations/${id}`);
    return data.data;
  },

  // Create new location with hierarchy validation
  async create(payload: CreateLocationPayload): Promise<LocationItem> {
    const { data } = await apiClient.post('/admin/locations', payload);
    return data.data;
  },

  // Update existing location
  async update(id: string, payload: UpdateLocationPayload): Promise<LocationItem> {
    const { data } = await apiClient.patch(`/admin/locations/${id}`, payload);
    return data.data;
  },

  // Activate or deactivate location
  async updateStatus(id: string, isActive: boolean): Promise<LocationItem> {
    const { data } = await apiClient.patch(`/admin/locations/${id}/status`, { isActive });
    return data.data;
  },

  // Delete location (only if zero children and zero active ads)
  async delete(id: string): Promise<void> {
    await apiClient.delete(`/admin/locations/${id}`);
  },

  // Get ancestors / breadcrumbs
  async getAncestors(id: string): Promise<any[]> {
    const { data } = await apiClient.get(`/admin/locations/${id}/ancestors`);
    return data.data || [];
  },
};

