import { apiClient } from '@/lib/api-client';
import { Category } from '@/types';

export const categoriesService = {
  // Get full nested category tree with subcategories and parent hierarchy
  async getCategoriesTree(): Promise<Category[]> {
    const { data } = await apiClient.get('/categories/tree');
    return data.success ? data.data : [];
  },

  // Get flat list of active categories
  async getCategories(): Promise<Category[]> {
    const { data } = await apiClient.get('/categories');
    return data.success ? data.data : [];
  },

  // Get single category by ID or slug
  async getCategoryBySlug(slug: string): Promise<Category | null> {
    const { data } = await apiClient.get(`/categories/${slug}`);
    return data.success ? data.data : null;
  },

  // Get dynamic category attributes / specifications
  async getCategoryAttributes(categoryId: string): Promise<any[]> {
    const { data } = await apiClient.get(`/categories/${categoryId}/attributes`);
    return data.success && data.data ? data.data.attributes || [] : [];
  },
};

