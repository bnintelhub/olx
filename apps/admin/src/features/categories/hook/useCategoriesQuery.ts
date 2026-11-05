import { useQuery } from '@tanstack/react-query';
import { categoriesService, CategoryItem } from '../service/categories.service';

export const CATEGORIES_QUERY_KEYS = {
  all: ['categories'] as const,
  tree: (includeInactive: boolean) => ['categories', 'tree', includeInactive] as const,
};

export function useCategoryTree(includeInactive: boolean = true) {
  return useQuery<CategoryItem[]>({
    queryKey: CATEGORIES_QUERY_KEYS.tree(includeInactive),
    queryFn: () => categoriesService.getTree(includeInactive),
    staleTime: 60000,
  });
}

