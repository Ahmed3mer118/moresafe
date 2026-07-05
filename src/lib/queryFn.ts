import type { ListQueryParams, PaginatedResponse } from '../types/api';

/** Bind a paginated service method to TanStack Query's (params, signal) signature */
export function bindPaginatedList<T>(
  fn: (params?: ListQueryParams, init?: RequestInit) => Promise<PaginatedResponse<T>>,
) {
  return (params: ListQueryParams, signal?: AbortSignal) => fn(params, { signal });
}

/** Wrap refetch for RefreshButton / DataTable onRefresh */
export function refetchVoid(refetch: () => unknown) {
  return () => {
    void refetch();
  };
}
