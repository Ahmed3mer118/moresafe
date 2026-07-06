import { useEffect, useMemo } from 'react';
import {
  keepPreviousData,
  useQuery,
  useQueryClient,
  type QueryKey,
} from '@tanstack/react-query';
import type { ListQueryParams, PaginatedResponse } from '../types/api';

const EMPTY_ITEMS: never[] = [];

interface UsePaginatedQueryOptions<T> {
  queryKey: QueryKey;
  queryFn: (params: ListQueryParams, signal?: AbortSignal) => Promise<PaginatedResponse<T>>;
  params: ListQueryParams;
  staleTime?: number;
  gcTime?: number;
  enabled?: boolean;
  prefetchNext?: boolean;
}

/** Server-paginated list with TanStack Query caching, dedup, abort, and next-page prefetch */
export function usePaginatedQuery<T>({
  queryKey,
  queryFn,
  params,
  staleTime = 30_000,
  gcTime = 5 * 60_000,
  enabled = true,
  prefetchNext = true,
}: UsePaginatedQueryOptions<T>) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: [...queryKey, params],
    queryFn: ({ signal }) => queryFn(params, signal),
    staleTime,
    gcTime,
    enabled,
    placeholderData: keepPreviousData,
  });

  const page = params.page ?? 1;
  const totalPages = query.data?.totalPages ?? 1;
  const prefetchKey = useMemo(
    () => `${page}|${totalPages}|${params.limit ?? 15}|${params.sort ?? ''}|${params.status ?? ''}`,
    [page, totalPages, params.limit, params.sort, params.status],
  );

  useEffect(() => {
    if (!prefetchNext || !query.data || page >= totalPages) return;
    const nextParams = { ...params, page: page + 1 };
    void queryClient.prefetchQuery({
      queryKey: [...queryKey, nextParams],
      queryFn: ({ signal }) => queryFn(nextParams, signal),
      staleTime,
    });
    // Prefetch next page only — not on every search keystroke
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefetchNext, query.data, prefetchKey, queryKey, staleTime, queryClient]);

  return {
    ...query,
    items: query.data?.items ?? EMPTY_ITEMS,
    total: query.data?.total ?? 0,
    totalPages,
    page: query.data?.page ?? page,
    pageSize: query.data?.limit ?? params.limit ?? 15,
  };
}
