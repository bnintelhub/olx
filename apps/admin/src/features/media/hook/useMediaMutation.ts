import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { mediaService, UpdateMediaMetadataPayload } from '../service/media.service';
import { MEDIA_QUERY_KEYS } from './useMediaQuery';

export function useDeleteMediaMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => mediaService.deleteMedia(id),
    onSuccess: (data) => {
      toast.success(
        data?.freedFormatted
          ? `Media deleted & reclaimed ${data.freedFormatted} of storage.`
          : 'Media deleted and storage reclaimed successfully.'
      );
      queryClient.invalidateQueries({ queryKey: MEDIA_QUERY_KEYS.all });
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || err.message || 'Failed to delete media';
      toast.error(msg);
    },
  });
}

export function useUpdateMediaMetadataMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateMediaMetadataPayload }) =>
      mediaService.updateMediaMetadata(id, payload),
    onSuccess: () => {
      toast.success('Media metadata updated successfully.');
      queryClient.invalidateQueries({ queryKey: MEDIA_QUERY_KEYS.all });
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || err.message || 'Failed to update media metadata';
      toast.error(msg);
    },
  });
}

export function useReplaceMediaFileMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, file }: { id: string; file: File }) =>
      mediaService.replaceMediaFile(id, file),
    onSuccess: () => {
      toast.success('Old file purged and new replacement image uploaded for processing.');
      queryClient.invalidateQueries({ queryKey: MEDIA_QUERY_KEYS.all });
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || err.message || 'Failed to replace image file';
      toast.error(msg);
    },
  });
}

export function useCleanupOrphansMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (hours?: number) => mediaService.cleanupOrphans(hours),
    onSuccess: (data) => {
      toast.success(
        `Orphan cleanup completed: ${data.deletedCount} files deleted, ${data.freedFormatted} reclaimed.`
      );
      queryClient.invalidateQueries({ queryKey: MEDIA_QUERY_KEYS.all });
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || err.message || 'Orphan cleanup failed';
      toast.error(msg);
    },
  });
}

