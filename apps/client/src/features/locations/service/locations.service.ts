import { apiClient } from '@/lib/api-client';
import { LocationItem } from '@/types';

export const locationsService = {
  // Fetch active cities for discovery and listing creation
  async getCities(): Promise<LocationItem[]> {
    const { data } = await apiClient.get('/locations/cities');
    return data.success && Array.isArray(data.data) ? data.data : [];
  },

  // Fetch full geographical hierarchy
  async getTree(): Promise<any[]> {
    const { data } = await apiClient.get('/locations/tree');
    return data.success && Array.isArray(data.data) ? data.data : [];
  },
};

