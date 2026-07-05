/** Standard paginated API response */
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ListQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  sort?: string;
  [key: string]: string | number | undefined;
}

export function toSearchParams(params?: ListQueryParams): string {
  if (!params) return '';
  const q = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '' && value !== null) {
      q.set(key, String(value));
    }
  }
  const s = q.toString();
  return s ? `?${s}` : '';
}

/** Normalize legacy array responses during migration */
export function normalizePaginated<T>(
  raw: T[] | PaginatedResponse<T>,
  fallbackPage = 1,
  fallbackLimit = 15,
): PaginatedResponse<T> {
  if (Array.isArray(raw)) {
    return {
      items: raw,
      total: raw.length,
      page: fallbackPage,
      limit: fallbackLimit,
      totalPages: Math.max(1, Math.ceil(raw.length / fallbackLimit)),
    };
  }
  return raw;
}
