import type { ListQueryParams } from '../types/api';

export const queryKeys = {
  users: {
    all: ['users'] as const,
    list: (params?: ListQueryParams) => ['users', 'list', params] as const,
    stats: ['users', 'stats'] as const,
  },
  projects: {
    all: ['projects'] as const,
    list: (params?: ListQueryParams) => ['projects', 'list', params] as const,
    budgets: ['projects', 'budgets'] as const,
    detail: (id: string) => ['projects', id] as const,
  },
  custodies: {
    all: ['custodies'] as const,
    list: (params?: ListQueryParams) => ['custodies', 'list', params] as const,
    detail: (id: string) => ['custodies', id] as const,
    open: ['custodies', 'open'] as const,
    disbursementQueue: (params?: ListQueryParams) => ['custodies', 'disbursement-queue', params] as const,
    adminTransactions: (params?: ListQueryParams) => ['custodies', 'admin-transactions', params] as const,
    myTransactions: (params?: ListQueryParams) => ['custodies', 'my-transactions', params] as const,
    cycleStats: ['custodies', 'cycle-stats'] as const,
  },
  invoices: {
    all: ['invoices'] as const,
    list: (params?: ListQueryParams) => ['invoices', 'list', params] as const,
    detail: (id: string) => ['invoices', id] as const,
    rejected: (params?: ListQueryParams) => ['invoices', 'rejected', params] as const,
    pendingFinance: (params?: ListQueryParams) => ['invoices', 'pending-finance', params] as const,
  },
  dashboard: {
    admin: ['dashboard', 'admin'] as const,
    adminAnalytics: ['dashboard', 'admin-analytics'] as const,
    adminReports: (projectId?: string) => ['dashboard', 'admin-reports', projectId] as const,
    finance: ['dashboard', 'finance'] as const,
    financeReports: ['dashboard', 'finance-reports'] as const,
    financeSuppliers: ['dashboard', 'finance-suppliers'] as const,
    projectManager: ['dashboard', 'project-manager'] as const,
    projectAccountant: ['dashboard', 'project-accountant'] as const,
    paApprovalLog: (params?: ListQueryParams) => ['dashboard', 'pa-approval-log', params] as const,
    activityLogs: (params?: ListQueryParams) => ['dashboard', 'activity-logs', params] as const,
    notifications: (params?: ListQueryParams) => ['dashboard', 'notifications', params] as const,
    vouchers: (params?: ListQueryParams) => ['dashboard', 'vouchers', params] as const,
    settledArchive: (params?: ListQueryParams) => ['dashboard', 'settled-archive', params] as const,
    taxCompliance: (params?: ListQueryParams) => ['dashboard', 'tax-compliance', params] as const,
    settings: ['dashboard', 'settings'] as const,
  },
};
