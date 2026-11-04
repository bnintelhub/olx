import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  dashboardService,
  ReviewAdPayload,
  UserActionPayload,
  ResolveReportPayload,
} from '../service/dashboard.service';
import { DASHBOARD_QUERY_KEYS } from './useDashboardQuery';

// Review Ad Mutation (Approve or Reject)
export function useReviewAd() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: ReviewAdPayload) => dashboardService.reviewAd(payload),
    onSuccess: (_, variables) => {
      toast.success(
        variables.action === 'APPROVE'
          ? 'Listing approved and published successfully'
          : 'Listing rejected and flagged'
      );
      queryClient.invalidateQueries({ queryKey: DASHBOARD_QUERY_KEYS.pendingAds });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to review listing');
    },
  });
}

// User Action Mutation (Suspend, Activate, Ban, Role Change)
export function useUserAction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UserActionPayload) => dashboardService.userAction(payload),
    onSuccess: (_, variables) => {
      toast.success(`User successfully updated (${variables.action})`);
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to update user action');
    },
  });
}

// Resolve or Dismiss Report Mutation
export function useResolveReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: ResolveReportPayload) => dashboardService.resolveReport(payload),
    onSuccess: () => {
      toast.success('Report resolved successfully');
      queryClient.invalidateQueries({ queryKey: ['moderation-reports'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to resolve report');
    },
  });
}

