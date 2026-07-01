import { useMemo, useState } from 'react';

export function useTableFilter<T>(
  rows: T[],
  searchKeys: ((row: T) => string)[],
  statusKey?: (row: T) => string
) {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('');

  const filtered = useMemo(() => {
    let result = rows;
    if (query.trim()) {
      const q = query.toLowerCase();
      result = result.filter((row) => searchKeys.some((fn) => fn(row).toLowerCase().includes(q)));
    }
    if (status && statusKey) {
      result = result.filter((row) => statusKey(row) === status);
    }
    return result;
  }, [rows, query, status, searchKeys, statusKey]);

  const reset = () => {
    setQuery('');
    setStatus('');
  };

  return { query, setQuery, status, setStatus, filtered, reset, total: rows.length, shown: filtered.length };
}
