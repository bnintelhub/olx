import { useQuery } from '@tanstack/react-query';
import { categoriesService, CategoryItem } from '../service/categories.service';

export const CATEGORIES_QUERY_KEYS = {
  all: ['categories'] as const,
  tree: (includeInactive: boolean) => ['categories', 'tree', includeInactive] as const,
  attributes: (categoryId: string) => ['categories', 'attributes', categoryId] as const,
};

export function useCategoryTree(includeInactive: boolean = true) {
  return useQuery<CategoryItem[]>({
    queryKey: CATEGORIES_QUERY_KEYS.tree(includeInactive),
    queryFn: () => categoriesService.getTree(includeInactive),
    staleTime: 60000,
  });
}

export function useCategoryAttributesQuery(categoryId: string | null) {
  return useQuery({
    queryKey: CATEGORIES_QUERY_KEYS.attributes(categoryId || ''),
    queryFn: () => categoriesService.getAttributes(categoryId!),
    enabled: Boolean(categoryId),
  });
}

