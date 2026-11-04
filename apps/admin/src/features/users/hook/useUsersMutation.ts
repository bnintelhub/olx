import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { usersService, UpdateUserStatusPayload } from '../service/users.service';
import { USERS_QUERY_KEYS } from './useUsersQuery';

export function useUpdateUserStatusMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpdateUserStatusPayload) =>
      usersService.updateUserStatus(payload),
    onSuccess: (_, variables) => {
      toast.success(`User status successfully updated to ${variables.status}`);
      queryClient.invalidateQueries({ queryKey: USERS_QUERY_KEYS.all });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || err.message || 'Failed to update user status';
      toast.error(msg);
    },
  });
}

