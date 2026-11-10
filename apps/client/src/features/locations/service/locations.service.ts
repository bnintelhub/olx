import { apiClient } from '@/lib/api-client';
import { LocationItem } from '@/types';

export const locationsService = {
  // Search locations by keyword with hierarchical breadcrumb information
  async search(q: string, limit: number = 20): Promise<LocationItem[]> {
    if (!q || !q.trim()) return [];
    const { data } = await apiClient.get('/locations/search', {
      params: { q: q.trim(), limit },
    });
    return data.success && Array.isArray(data.data) ? data.data : [];
  },

  // Resolve nearest location using GPS coordinates via Haversine calculation
  async nearby(latitude: number, longitude: number, radiusKm: number = 25): Promise<LocationItem[]> {
    const { data } = await apiClient.get('/locations/nearby', {
      params: { latitude, longitude, radiusKm },
    });
    return data.success && Array.isArray(data.data) ? data.data : [];
  },

  // Fetch top-level countries
  async getRoots(): Promise<LocationItem[]> {
    const { data } = await apiClient.get('/locations');
    return data.success && Array.isArray(data.data) ? data.data : [];
  },

  // Fetch direct children of a given location node
  async getChildren(locationId: string): Promise<LocationItem[]> {
    const { data } = await apiClient.get(`/locations/${locationId}/children`);
    return data.success && Array.isArray(data.data) ? data.data : [];
  },

  // Fetch ancestral path from root down to this location
  async getAncestors(locationId: string): Promise<LocationItem[]> {
    const { data } = await apiClient.get(`/locations/${locationId}/ancestors`);
    return data.success && Array.isArray(data.data) ? data.data : [];
  },

  // Fetch active cities (convenient quick-picker list)
  async getCities(): Promise<LocationItem[]> {
    const { data } = await apiClient.get('/locations/cities');
    return data.success && Array.isArray(data.data) ? data.data : [];
  },

  // Fetch full geographical hierarchy tree
  async getTree(): Promise<LocationItem[]> {
    const { data } = await apiClient.get('/locations/tree');
    return data.success && Array.isArray(data.data) ? data.data : [];
  },
};
