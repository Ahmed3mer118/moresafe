import { useServerTable } from './useServerTable';
import { usePaginatedQuery } from './usePaginatedQuery';
import type { ListQueryParams, PaginatedResponse } from '../types/api';
import type { QueryKey } from '@tanstack/react-query';

interface UseServerDataTableOptions<T> {
  queryKey: QueryKey;
  queryFn: (params: ListQueryParams, signal?: AbortSignal) => Promise<PaginatedResponse<T>>;
  pageSize?: number;
  defaultSort?: string;
  debounceMs?: number;
  extraFilters?: Record<string, string>;
  staleTime?: number;
  gcTime?: number;
  enabled?: boolean;
}

/** Combines server table state + TanStack Query paginated fetch */
export function useServerDataTable<T>({
  queryKey,
  queryFn,
  pageSize = 15,
  defaultSort = '-createdAt',
  debounceMs = 400,
  extraFilters,
  staleTime,
  gcTime,
  enabled = true,
}: UseServerDataTableOptions<T>) {
  const table = useServerTable({ pageSize, defaultSort, debounceMs, extraFilters });

  const query = usePaginatedQuery<T>({
    queryKey,
    queryFn,
    params: table.listParams,
    staleTime,
    gcTime,
    enabled,
    prefetchNext: true,
  });

  return {
    table,
    ...query,
    refetch: query.refetch,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,
  };
}
