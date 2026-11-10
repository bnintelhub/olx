import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { locationsAdminService } from '../service/locations.service';
import {
  CreateLocationPayload,
  UpdateLocationPayload,
  LocationSearchParams,
} from '../types';

export const LOCATIONS_TREE_KEY = ['admin', 'locations', 'tree'];
export const LOCATIONS_SEARCH_KEY = ['admin', 'locations', 'search'];

export function useLocationsTreeQuery() {
  return useQuery({
    queryKey: LOCATIONS_TREE_KEY,
    queryFn: () => locationsAdminService.getTree(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useLocationsSearchQuery(params: LocationSearchParams) {
  return useQuery({
    queryKey: [...LOCATIONS_SEARCH_KEY, params],
    queryFn: () => locationsAdminService.search(params),
    staleTime: 60 * 1000,
  });
}

export function useLocationsMutation() {
  const queryClient = useQueryClient();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['admin', 'locations'] });
  };

  const createLocation = useMutation({
    mutationFn: (payload: CreateLocationPayload) => locationsAdminService.create(payload),
    onSuccess: (data) => {
      toast.success(`Location "${data.name}" created successfully`);
      invalidate();
    },
    onError: (err: any) => {
      const msg = err.response?.data?.error?.message || err.message || 'Failed to create location';
      toast.error(msg);
    },
  });

  const updateLocation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateLocationPayload }) =>
      locationsAdminService.update(id, payload),
    onSuccess: (data) => {
      toast.success(`Location "${data.name}" updated successfully`);
      invalidate();
    },
    onError: (err: any) => {
      const msg = err.response?.data?.error?.message || err.message || 'Failed to update location';
      toast.error(msg);
    },
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      locationsAdminService.updateStatus(id, isActive),
    onSuccess: (_, variables) => {
      toast.success(`Location ${variables.isActive ? 'activated' : 'deactivated'} successfully`);
      invalidate();
    },
    onError: (err: any) => {
      const msg = err.response?.data?.error?.message || err.message || 'Failed to update status';
      toast.error(msg);
    },
  });

  const deleteLocation = useMutation({
    mutationFn: (id: string) => locationsAdminService.delete(id),
    onSuccess: () => {
      toast.success('Location deleted successfully');
      invalidate();
    },
    onError: (err: any) => {
      const msg = err.response?.data?.error?.message || err.message || 'Failed to delete location';
      toast.error(msg);
    },
  });

  return {
    createLocation,
    updateLocation,
    updateStatus,
    deleteLocation,
  };
}

