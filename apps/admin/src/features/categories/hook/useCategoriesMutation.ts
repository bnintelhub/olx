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

export function useAddCategoryAttributeMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      categoryId,
      payload,
    }: {
      categoryId: string;
      payload: any;
    }) => categoriesService.addAttribute(categoryId, payload),
    onSuccess: (_, variables) => {
      toast.success('Dynamic specification attribute added successfully');
      queryClient.invalidateQueries({
        queryKey: CATEGORIES_QUERY_KEYS.attributes(variables.categoryId),
      });
      queryClient.invalidateQueries({ queryKey: CATEGORIES_QUERY_KEYS.all });
    },
    onError: (error: any) => {
      const msg =
        error.response?.data?.error?.message ||
        error.response?.data?.message ||
        error.message ||
        'Failed to add attribute';
      toast.error(msg);
    },
  });
}

export function useUpdateCategoryAttributeMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      categoryId,
      attributeId,
      payload,
    }: {
      categoryId: string;
      attributeId: string;
      payload: any;
    }) => categoriesService.updateAttribute(attributeId, payload),
    onSuccess: (_, variables) => {
      toast.success('Dynamic specification attribute updated successfully');
      queryClient.invalidateQueries({
        queryKey: CATEGORIES_QUERY_KEYS.attributes(variables.categoryId),
      });
      queryClient.invalidateQueries({ queryKey: CATEGORIES_QUERY_KEYS.all });
    },
    onError: (error: any) => {
      const msg =
        error.response?.data?.error?.message ||
        error.response?.data?.message ||
        error.message ||
        'Failed to update attribute';
      toast.error(msg);
    },
  });
}

export function useDeleteCategoryAttributeMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      categoryId,
      attributeId,
    }: {
      categoryId: string;
      attributeId: string;
    }) => categoriesService.deleteAttribute(attributeId),
    onSuccess: (_, variables) => {
      toast.success('Attribute deleted successfully');
      queryClient.invalidateQueries({
        queryKey: CATEGORIES_QUERY_KEYS.attributes(variables.categoryId),
      });
      queryClient.invalidateQueries({ queryKey: CATEGORIES_QUERY_KEYS.all });
    },
    onError: (error: any) => {
      const msg =
        error.response?.data?.error?.message ||
        error.response?.data?.message ||
        error.message ||
        'Failed to delete attribute';
      toast.error(msg);
    },
  });
}

