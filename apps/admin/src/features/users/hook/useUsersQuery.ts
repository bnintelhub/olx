import { useQuery } from '@tanstack/react-query';
import {
  usersService,
  GetUsersParams,
  GetUsersResponse,
} from '../service/users.service';

export const USERS_QUERY_KEYS = {
  all: ['admin-users'] as const,
  list: (params: GetUsersParams) => [
    'admin-users',
    params.page ?? 1,
    params.limit ?? 10,
    params.q ?? '',
    params.status ?? 'ALL',
    params.role ?? 'ALL',
  ] as const,
  detail: (id: string) => ['admin-users', 'detail', id] as const,
};

export function useUsersQuery(params: GetUsersParams) {
  return useQuery<GetUsersResponse>({
    queryKey: USERS_QUERY_KEYS.list(params),
    queryFn: () => usersService.getUsers(params),
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });
}

export function useUserDetailQuery(id: string) {
  return useQuery({
    queryKey: USERS_QUERY_KEYS.detail(id),
    queryFn: () => usersService.getUserDetail(id),
    enabled: Boolean(id),
    staleTime: 60000,
  });
}

