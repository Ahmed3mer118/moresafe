/** TanStack Query cache policies by data category */

export const CACHE = {
  /** Reference data: users, projects for dropdowns */
  reference: {
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  },
  /** Transactional lists: custodies, invoices, transactions */
  transactional: {
    staleTime: 90 * 1000,
    gcTime: 15 * 60 * 1000,
  },
  /** Dashboard aggregates and stats */
  dashboard: {
    staleTime: 2 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
  },
  /** Activity logs, approval logs */
  logs: {
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  },
  /** Notifications */
  notifications: {
    staleTime: 15 * 1000,
    gcTime: 3 * 60 * 1000,
  },
  /** Settings — rarely changes */
  settings: {
    staleTime: 10 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  },
} as const;
