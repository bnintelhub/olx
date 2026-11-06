import { useQuery } from '@tanstack/react-query';
import { categoriesService } from '../service/categories.service';

export const CATEGORIES_QUERY_KEYS = {
  all: ['categories'] as const,
  tree: () => [...CATEGORIES_QUERY_KEYS.all, 'tree'] as const,
  list: () => [...CATEGORIES_QUERY_KEYS.all, 'list'] as const,
  detail: (slug: string) => [...CATEGORIES_QUERY_KEYS.all, 'detail', slug] as const,
};

export function useCategoriesTreeQuery() {
  return useQuery({
    queryKey: CATEGORIES_QUERY_KEYS.tree(),
    queryFn: () => categoriesService.getCategoriesTree(),
    staleTime: 1000 * 60 * 5, // 5 minutes cache
  });
}

export function useCategoriesQuery() {
  return useQuery({
    queryKey: CATEGORIES_QUERY_KEYS.list(),
    queryFn: () => categoriesService.getCategories(),
    staleTime: 1000 * 60 * 5,
  });
}

export function useCategoryDetailQuery(slug: string) {
  return useQuery({
    queryKey: CATEGORIES_QUERY_KEYS.detail(slug),
    queryFn: () => categoriesService.getCategoryBySlug(slug),
    enabled: Boolean(slug),
  });
}

