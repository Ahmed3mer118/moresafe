import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../lib/queryKeys';

/** Invalidate related caches after mutations */
export function useInvalidateQueries() {
  const qc = useQueryClient();

  return {
    users: () => qc.invalidateQueries({ queryKey: queryKeys.users.all }),
    projects: () => qc.invalidateQueries({ queryKey: queryKeys.projects.all }),
    custodies: () => qc.invalidateQueries({ queryKey: queryKeys.custodies.all }),
    invoices: () => qc.invalidateQueries({ queryKey: queryKeys.invoices.all }),
    dashboard: () => qc.invalidateQueries({ queryKey: ['dashboard'] }),
    notifications: () => qc.invalidateQueries({ queryKey: queryKeys.dashboard.notifications() }),
    allLists: () => {
      qc.invalidateQueries({ queryKey: queryKeys.users.all });
      qc.invalidateQueries({ queryKey: queryKeys.projects.all });
      qc.invalidateQueries({ queryKey: queryKeys.custodies.all });
      qc.invalidateQueries({ queryKey: queryKeys.invoices.all });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  };
}
