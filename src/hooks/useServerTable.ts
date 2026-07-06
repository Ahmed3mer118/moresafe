import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDebouncedValue } from './useDebouncedValue';
import type { ListQueryParams } from '../types/api';

export interface ServerTableState {
  page: number;
  pageSize: number;
  query: string;
  debouncedQuery: string;
  sort: string;
  status: string;
  filters: Record<string, string>;
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
  setQuery: (q: string) => void;
  setSort: (sort: string) => void;
  setStatus: (status: string) => void;
  setFilter: (key: string, value: string) => void;
  reset: () => void;
  listParams: ListQueryParams;
}

export function useServerTable(options?: {
  pageSize?: number;
  defaultSort?: string;
  debounceMs?: number;
  extraFilters?: Record<string, string>;
}) {
  const pageSize = options?.pageSize ?? 15;
  const defaultSort = options?.defaultSort ?? '-createdAt';
  const debounceMs = options?.debounceMs ?? 500;

  const [page, setPage] = useState(1);
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState(defaultSort);
  const [status, setStatus] = useState('');
  const [filters, setFilters] = useState<Record<string, string>>(options?.extraFilters ?? {});

  const debouncedQuery = useDebouncedValue(query, debounceMs);
  const filtersKey = useMemo(() => JSON.stringify(filters), [filters]);
  const skipPageReset = useRef(true);

  useEffect(() => {
    if (skipPageReset.current) {
      skipPageReset.current = false;
      return;
    }
    setPage(1);
  }, [debouncedQuery, status, sort, filtersKey]);

  const setFilter = useCallback((key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  const reset = useCallback(() => {
    setQuery('');
    setStatus('');
    setSort(defaultSort);
    setFilters(options?.extraFilters ?? {});
    setPage(1);
  }, [defaultSort, options?.extraFilters]);

  const listParams = useMemo<ListQueryParams>(() => {
    const params: ListQueryParams = {
      page,
      limit: pageSize,
      sort,
    };
    const q = debouncedQuery.trim();
    if (q.length >= 2) params.search = q;
    if (status) params.status = status;
    for (const [key, value] of Object.entries(filters)) {
      if (value) params[key] = value;
    }
    return params;
  }, [page, pageSize, debouncedQuery, sort, status, filters]);

  return {
    page,
    pageSize,
    query,
    debouncedQuery,
    sort,
    status,
    filters,
    setPage,
    setPageSize: (size: number) => {
      setPage(1);
      // pageSize is fixed per hook instance; caller can remount with new option
      void size;
    },
    setQuery,
    setSort,
    setStatus,
    setFilter,
    reset,
    listParams,
  } satisfies ServerTableState;
}
