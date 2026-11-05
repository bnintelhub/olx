import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  categoriesService,
  CreateCategoryPayload,
  UpdateCategoryPayload,
  ReorderCategoryItem,
} from '../service/categories.service';
import { CATEGORIES_QUERY_KEYS } from './useCategoriesQuery';
import { toast } from 'sonner';

export function useCreateCategoryMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      payload,
      imageFile,
    }: {
      payload: CreateCategoryPayload;
      imageFile?: File | null;
    }) => categoriesService.create(payload, imageFile),
    onSuccess: (data) => {
      toast.success(`Category "${data.name}" created successfully`);
      queryClient.invalidateQueries({ queryKey: CATEGORIES_QUERY_KEYS.all });
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: CATEGORIES_QUERY_KEYS.all });
      }, 1000);
    },
    onError: (error: any) => {
      const msg = error.response?.data?.message || error.message || 'Failed to create category';
      toast.error(msg);
    },
  });
}

export function useUpdateCategoryMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      payload,
      imageFile,
      removeImage,
    }: {
      id: string;
      payload: UpdateCategoryPayload;
      imageFile?: File | null;
      removeImage?: boolean;
    }) => categoriesService.update(id, payload, imageFile, removeImage),
    onSuccess: (data) => {
      toast.success(`Category "${data.name}" updated successfully`);
      queryClient.invalidateQueries({ queryKey: CATEGORIES_QUERY_KEYS.all });
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: CATEGORIES_QUERY_KEYS.all });
      }, 1000);
    },
    onError: (error: any) => {
      const msg = error.response?.data?.message || error.message || 'Failed to update category';
      toast.error(msg);
    },
  });
}

export function useToggleCategoryStatusMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      categoriesService.toggleStatus(id, isActive),
    onSuccess: (data) => {
      const state = data.isActive ? 'activated' : 'deactivated';
      toast.success(`Category "${data.name}" ${state}`);
      queryClient.invalidateQueries({ queryKey: CATEGORIES_QUERY_KEYS.all });
    },
    onError: (error: any) => {
      const msg = error.response?.data?.message || error.message || 'Failed to toggle category status';
      toast.error(msg);
    },
  });
}

export function useReorderCategoriesMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (items: ReorderCategoryItem[]) => categoriesService.reorder(items),
    onSuccess: () => {
      toast.success('Categories reordered successfully');
      queryClient.invalidateQueries({ queryKey: CATEGORIES_QUERY_KEYS.all });
    },
    onError: (error: any) => {
      const msg = error.response?.data?.message || error.message || 'Failed to reorder categories';
      toast.error(msg);
    },
  });
}

export function useDeleteCategoryMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => categoriesService.delete(id),
    onSuccess: () => {
      toast.success('Category deleted successfully');
      queryClient.invalidateQueries({ queryKey: CATEGORIES_QUERY_KEYS.all });
    },
    onError: (error: any) => {
      const msg = error.response?.data?.message || error.message || 'Failed to delete category';
      toast.error(msg);
    },
  });
}

