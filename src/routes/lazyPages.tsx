import { lazy, type ComponentType } from 'react';

function lazyNamed(
  factory: () => Promise<Record<string, ComponentType<object>>>,
  exportName: string,
) {
  return lazy(() =>
    factory().then((module) => ({ default: module[exportName] as ComponentType<object> })),
  );
}

// Admin pages
export const AdminHomePage = lazyNamed(() => import('../pages/admin/AdminPages'), 'AdminHomePage');
export const AdminUsersPage = lazyNamed(() => import('../pages/admin/AdminPages'), 'AdminUsersPage');
export const AdminProjectsPage = lazyNamed(() => import('../pages/admin/AdminPages'), 'AdminProjectsPage');
export const AdminRolesPage = lazyNamed(() => import('../pages/admin/AdminPages'), 'AdminRolesPage');
export const AdminCyclePage = lazyNamed(() => import('../pages/admin/AdminPages'), 'AdminCyclePage');
export const AdminSettingsPage = lazyNamed(() => import('../pages/admin/AdminPages'), 'AdminSettingsPage');
export const AdminLogsPage = lazyNamed(() => import('../pages/admin/AdminPages'), 'AdminLogsPage');
export const AdminAnalyticsPage = lazyNamed(() => import('../pages/admin/AdminPages'), 'AdminAnalyticsPage');
export const AdminNotificationsPage = lazyNamed(
  () => import('../pages/admin/AdminPages'),
  'AdminNotificationsPage',
);

// Admin custody pages
export const AdminDisbursementPage = lazyNamed(
  () => import('../pages/admin/AdminCustodyPages'),
  'AdminDisbursementPage',
);
export const AdminCustodyDetailPage = lazyNamed(
  () => import('../pages/admin/AdminCustodyPages'),
  'AdminCustodyDetailPage',
);
export const AdminReportsPage = lazyNamed(
  () => import('../pages/admin/AdminCustodyPages'),
  'AdminReportsPage',
);
export const AdminVouchersPage = lazyNamed(
  () => import('../pages/admin/AdminCustodyPages'),
  'AdminVouchersPage',
);

// Finance pages
export const FinanceHomePage = lazyNamed(() => import('../pages/finance/FinancePages'), 'FinanceHomePage');
export const FinanceReviewPage = lazyNamed(() => import('../pages/finance/FinancePages'), 'FinanceReviewPage');
export const FinanceEntriesPage = lazyNamed(() => import('../pages/finance/FinancePages'), 'FinanceEntriesPage');
export const FinanceBudgetsPage = lazyNamed(() => import('../pages/finance/FinancePages'), 'FinanceBudgetsPage');
export const FinanceArchivePage = lazyNamed(() => import('../pages/finance/FinancePages'), 'FinanceArchivePage');
export const FinanceTaxPage = lazyNamed(() => import('../pages/finance/FinancePages'), 'FinanceTaxPage');
export const FinanceReportsPage = lazyNamed(() => import('../pages/finance/FinancePages'), 'FinanceReportsPage');
export const FinanceSuppliersPage = lazyNamed(
  () => import('../pages/finance/FinancePages'),
  'FinanceSuppliersPage',
);

// Project accountant (PM dashboard routes) pages
export const PMHomePage = lazyNamed(() => import('../pages/project-manager/PMPages'), 'PMHomePage');
export const PMCustodyApprovalsPage = lazyNamed(
  () => import('../pages/project-manager/PMPages'),
  'PMCustodyApprovalsPage',
);
export const PMApprovalsPage = lazyNamed(
  () => import('../pages/project-manager/PMPages'),
  'PMApprovalsPage',
);
export const PAApprovalLogPage = lazyNamed(() => import('../pages/project-manager/PMPages'), 'PAApprovalLogPage');
export const PMCustodyArchivePage = lazyNamed(
  () => import('../pages/project-manager/PMPages'),
  'PMCustodyArchivePage',
);
export const PMCustodyArchiveDetailPage = lazyNamed(
  () => import('../pages/project-manager/PMPages'),
  'PMCustodyArchiveDetailPage',
);
export const PMEmergencyPage = lazyNamed(() => import('../pages/project-manager/PMPages'), 'PMEmergencyPage');
export const PMEngineersPage = lazyNamed(() => import('../pages/project-manager/PMPages'), 'PMEngineersPage');
export const PMProjectsPage = lazyNamed(() => import('../pages/project-manager/PMPages'), 'PMProjectsPage');
export const PMReportsPage = lazyNamed(() => import('../pages/project-manager/PMPages'), 'PMReportsPage');

// Project manager (PA dashboard routes) pages
export const PAHomePage = lazyNamed(() => import('../pages/project-accountant/PAPages'), 'PAHomePage');
export const PANewCustodyPage = lazyNamed(() => import('../pages/project-accountant/PAPages'), 'PANewCustodyPage');
export const PAInvoicesPage = lazyNamed(() => import('../pages/project-accountant/PAPages'), 'PAInvoicesPage');
export const PARejectedPage = lazyNamed(() => import('../pages/project-accountant/PAPages'), 'PARejectedPage');
export const PATransactionsPage = lazyNamed(
  () => import('../pages/project-accountant/PACustodyPages'),
  'PATransactionsPage',
);
export const PACustodyListPage = lazyNamed(
  () => import('../pages/project-accountant/PACustodyPages'),
  'PACustodyListPage',
);
export const PACustodyDetailPage = lazyNamed(
  () => import('../pages/project-accountant/PACustodyPages'),
  'PACustodyDetailPage',
);

export const NotificationsPage = lazyNamed(
  () => import('../components/ui/NotificationsPage'),
  'NotificationsPage',
);

export const LoginPage = lazyNamed(() => import('../pages/LoginPage'), 'LoginPage');
