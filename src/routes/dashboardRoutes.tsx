import type { ReactNode } from 'react';
import { DashboardLayoutFactory } from '../components/layout/DashboardLayout';
import { RouteSuspense } from '../components/ui/RouteSuspense';
import {
  AdminHomePage,
  AdminUsersPage,
  AdminProjectsPage,
  AdminRolesPage,
  AdminCyclePage,
  AdminSettingsPage,
  AdminLogsPage,
  AdminAnalyticsPage,
  AdminNotificationsPage,
  AdminDisbursementPage,
  AdminCustodyDetailPage,
  AdminReportsPage,
  AdminVouchersPage,
  FinanceHomePage,
  FinanceReviewPage,
  FinanceEntriesPage,
  FinanceBudgetsPage,
  FinanceArchivePage,
  FinanceTaxPage,
  FinanceReportsPage,
  FinanceSuppliersPage,
  PMHomePage,
  PMProjectsPage,
  PMEngineersPage,
  PMEmergencyPage,
  PMReportsPage,
  PMCustodyApprovalsPage,
  PMCustodyArchivePage,
  PMCustodyArchiveDetailPage,
  PAApprovalLogPage,
  PAHomePage,
  PANewCustodyPage,
  PAInvoicesPage,
  PARejectedPage,
  PACustodyListPage,
  PACustodyDetailPage,
  PATransactionsPage,
  NotificationsPage,
} from './lazyPages';

const lazy = (page: ReactNode) => <RouteSuspense>{page}</RouteSuspense>;

const PM_BASE = '/dashboard/project-manager';

export const AdminLayout = DashboardLayoutFactory.create({
  subtitle: 'System Admin',
  basePath: '/dashboard/admin',
  breadcrumbMap: {
    admin: [{ labelKey: 'nav.home', to: '/dashboard/admin' }],
    home: [{ labelKey: 'nav.home', to: '/dashboard/admin' }],
    users: [{ labelKey: 'nav.home', to: '/dashboard/admin' }, { labelKey: 'nav.users' }],
    projects: [{ labelKey: 'nav.home', to: '/dashboard/admin' }, { labelKey: 'nav.projects' }],
    cycle: [{ labelKey: 'nav.home', to: '/dashboard/admin' }, { labelKey: 'nav.cycle' }],
    disbursement: [{ labelKey: 'nav.home', to: '/dashboard/admin' }, { labelKey: 'admin.disbursement' }],
    vouchers: [{ labelKey: 'nav.home', to: '/dashboard/admin' }, { labelKey: 'nav.vouchers' }],
    reports: [{ labelKey: 'nav.home', to: '/dashboard/admin' }, { labelKey: 'admin.reports' }],
    'disbursement/:custodyId': [
      { labelKey: 'nav.home', to: '/dashboard/admin' },
      { labelKey: 'admin.disbursement', to: '/dashboard/admin/disbursement' },
      { labelKey: 'pa.custodyDetail' },
    ],
    settings: [{ labelKey: 'nav.home', to: '/dashboard/admin' }, { labelKey: 'nav.settings' }],
    logs: [{ labelKey: 'nav.home', to: '/dashboard/admin' }, { labelKey: 'nav.logs' }],
    notifications: [{ labelKey: 'nav.home', to: '/dashboard/admin' }, { labelKey: 'nav.notifications' }],
  },
  navGroups: [
    {
      items: [
        { to: '/dashboard/admin', labelKey: 'nav.home', icon: '▦', end: true },
        { to: '/dashboard/admin/users', labelKey: 'nav.users', icon: '👥' },
        { to: '/dashboard/admin/projects', labelKey: 'nav.projects', icon: '🏗' },
        // { to: '/dashboard/admin/analytics', labelKey: 'nav.analytics', icon: '📊' },
        { to: '/dashboard/admin/cycle', labelKey: 'nav.cycle', icon: '🔁' },
        { to: '/dashboard/admin/disbursement', labelKey: 'admin.disbursement', icon: '🏦' },
        { to: '/dashboard/admin/vouchers', labelKey: 'nav.vouchers', icon: '🧾' },
        { to: '/dashboard/admin/reports', labelKey: 'admin.reports', icon: '📊' },
        { to: '/dashboard/admin/notifications', labelKey: 'nav.notifications', icon: '🔔' },
      ],
    },
    {
      titleKey: 'nav.settings',
      items: [
        { to: '/dashboard/admin/settings', labelKey: 'nav.settings', icon: '⚙' },
        // { to: '/dashboard/admin/roles', labelKey: 'nav.roles', icon: '🛡' },
        { to: '/dashboard/admin/logs', labelKey: 'nav.logs', icon: '🗒' },
      ],
    },
  ],
  titleMap: {
    home: { titleKey: 'nav.home' },
    admin: { titleKey: 'nav.home' },
    users: { titleKey: 'nav.users' },
    roles: { titleKey: 'nav.roles' },
    projects: { titleKey: 'nav.projects' },
    analytics: { titleKey: 'nav.analytics' },
    cycle: { titleKey: 'nav.cycle' },
    disbursement: { titleKey: 'admin.disbursement' },
    vouchers: { titleKey: 'nav.vouchers' },
    reports: { titleKey: 'admin.reports' },
    notifications: { titleKey: 'nav.notifications' },
    settings: { titleKey: 'nav.settings' },
    logs: { titleKey: 'nav.logs' },
  },
});

export const FinanceLayout = DashboardLayoutFactory.create({
  subtitle: 'Finance & Accounts',
  basePath: '/dashboard/finance',
  breadcrumbMap: {
    finance: [{ labelKey: 'nav.home', to: '/dashboard/finance' }],
    home: [{ labelKey: 'nav.home', to: '/dashboard/finance' }],
    review: [{ labelKey: 'nav.home', to: '/dashboard/finance' }, { labelKey: 'nav.review' }],
    vouchers: [{ labelKey: 'nav.home', to: '/dashboard/finance' }, { labelKey: 'nav.vouchers' }],
    budgets: [{ labelKey: 'nav.home', to: '/dashboard/finance' }, { labelKey: 'nav.budgets' }],
    entries: [{ labelKey: 'nav.home', to: '/dashboard/finance' }, { labelKey: 'nav.entries' }],
    suppliers: [{ labelKey: 'nav.home', to: '/dashboard/finance' }, { labelKey: 'nav.suppliers' }],
    archive: [{ labelKey: 'nav.home', to: '/dashboard/finance' }, { labelKey: 'nav.archive' }],
    reports: [{ labelKey: 'nav.home', to: '/dashboard/finance' }, { labelKey: 'nav.reports' }],
    tax: [{ labelKey: 'nav.home', to: '/dashboard/finance' }, { labelKey: 'nav.tax' }],
    notifications: [{ labelKey: 'nav.home', to: '/dashboard/finance' }, { labelKey: 'nav.notifications' }],
  },
  navGroups: [
    {
      items: [
        { to: '/dashboard/finance', labelKey: 'nav.home', icon: '▦', end: true },
        { to: '/dashboard/finance/entries', labelKey: 'nav.entries', icon: '📒' },
        // { to: '/dashboard/finance/review', labelKey: 'nav.review', icon: '🧾' },
        { to: '/dashboard/finance/budgets', labelKey: 'nav.budgets', icon: '📊' },
        { to: '/dashboard/finance/suppliers', labelKey: 'nav.suppliers', icon: '🏪' },
        { to: '/dashboard/finance/archive', labelKey: 'nav.archive', icon: '🗄️' },
        // { to: '/dashboard/finance/reports', labelKey: 'nav.reports', icon: '📁' },
        // { to: '/dashboard/finance/tax', labelKey: 'nav.tax', icon: '%' },
        { to: '/dashboard/finance/notifications', labelKey: 'nav.notifications', icon: '🔔' },
      ],
    },
  ],
  titleMap: {
    finance: { titleKey: 'nav.home' },
    home: { titleKey: 'nav.home' },
    review: { titleKey: 'nav.review' },
    vouchers: { titleKey: 'nav.vouchers' },
    budgets: { titleKey: 'nav.budgets' },
    entries: { titleKey: 'nav.entries' },
    suppliers: { titleKey: 'nav.suppliers' },
    archive: { titleKey: 'nav.archive' },
    reports: { titleKey: 'nav.reports' },
    tax: { titleKey: 'nav.tax' },
    notifications: { titleKey: 'nav.notifications' },
  },
});

export const PMLayout = DashboardLayoutFactory.create({
  subtitleKey: 'pm.subtitle',
  basePath: '/dashboard/project-accountant',
  breadcrumbMap: {
    'project-accountant': [{ labelKey: 'nav.home', to: '/dashboard/project-accountant' }],
    home: [{ labelKey: 'nav.home', to: '/dashboard/project-accountant' }],
    approvals: [{ labelKey: 'nav.home', to: '/dashboard/project-accountant' }, { labelKey: 'nav.approvals' }],
    'approval-log': [{ labelKey: 'nav.home', to: '/dashboard/project-accountant' }, { labelKey: 'pa.approvalLog' }],
    'custody-archive': [{ labelKey: 'nav.home', to: '/dashboard/project-accountant' }, { labelKey: 'nav.custodyArchive' }],
    'custody-archive/:custodyId': [
      { labelKey: 'nav.home', to: '/dashboard/project-accountant' },
      { labelKey: 'nav.custodyArchive', to: '/dashboard/project-accountant/custody-archive' },
      { labelKey: 'pa.custodyDetail' },
    ],
    emergency: [{ labelKey: 'nav.home', to: '/dashboard/project-accountant' }, { labelKey: 'nav.emergency' }],
    engineers: [{ labelKey: 'nav.home', to: '/dashboard/project-accountant' }, { labelKey: 'nav.engineers' }],
    projects: [{ labelKey: 'nav.home', to: '/dashboard/project-accountant' }, { labelKey: 'nav.projects' }],
    reports: [{ labelKey: 'nav.home', to: '/dashboard/project-accountant' }, { labelKey: 'nav.reports' }],
    notifications: [{ labelKey: 'nav.home', to: '/dashboard/project-accountant' }, { labelKey: 'nav.notifications' }],
  },
  navGroups: [
    {
      items: [
        { to: '/dashboard/project-accountant', labelKey: 'nav.home', icon: '▦', end: true },
        { to: '/dashboard/project-accountant/approvals', labelKey: 'nav.approvals', icon: '✔' },
        { to: '/dashboard/project-accountant/approval-log', labelKey: 'pa.approvalLog', icon: '📋' },
        { to: '/dashboard/project-accountant/custody-archive', labelKey: 'nav.custodyArchive', icon: '📦' },
        // { to: '/dashboard/project-accountant/emergency', labelKey: 'nav.emergency', icon: '⚡' },
        // { to: '/dashboard/project-accountant/engineers', labelKey: 'nav.engineers', icon: '👷' },
        { to: '/dashboard/project-accountant/projects', labelKey: 'nav.projects', icon: '🏗' },
        // { to: '/dashboard/project-accountant/reports', labelKey: 'nav.reports', icon: '📊' },
        // { to: '/dashboard/project-accountant/notifications', labelKey: 'nav.notifications', icon: '🔔' },
      ],
    },
  ],
  titleMap: {
    'project-accountant': { titleKey: 'nav.home' },
    home: { titleKey: 'nav.home' },
    approvals: { titleKey: 'nav.approvals' },
    'approval-log': { titleKey: 'pa.approvalLog' },
    'custody-archive': { titleKey: 'nav.custodyArchive' },
    archive: { titleKey: 'nav.custodyApprovals' },
    emergency: { titleKey: 'nav.emergency' },
    engineers: { titleKey: 'nav.engineers' },
    projects: { titleKey: 'nav.projects' },
    reports: { titleKey: 'nav.reports' },
    notifications: { titleKey: 'nav.notifications' },
  },
});

export const PALayout = DashboardLayoutFactory.create({
  subtitleKey: 'pa.subtitle',
  basePath: PM_BASE,
  breadcrumbMap: {
    'project-manager': [{ labelKey: 'nav.home', to: PM_BASE }],
    home: [{ labelKey: 'nav.home', to: PM_BASE }],
    'new-custody': [
      { labelKey: 'nav.home', to: PM_BASE },
      { labelKey: 'nav.myCustody', to: `${PM_BASE}/custody` },
      { labelKey: 'nav.newCustody' },
    ],
    invoices: [
      { labelKey: 'nav.home', to: PM_BASE },
      { labelKey: 'nav.invoices' },
    ],
    transactions: [
      { labelKey: 'nav.home', to: PM_BASE },
      { labelKey: 'nav.transactions' },
    ],
    custody: [
      { labelKey: 'nav.home', to: PM_BASE },
      { labelKey: 'nav.myCustody' },
    ],
    'custody/:custodyId': [
      { labelKey: 'nav.home', to: PM_BASE },
      { labelKey: 'nav.myCustody', to: `${PM_BASE}/custody` },
      { labelKey: 'pa.custodyDetail' },
    ],
    'custody/:custodyId/invoices': [
      { labelKey: 'nav.home', to: PM_BASE },
      { labelKey: 'nav.myCustody', to: `${PM_BASE}/custody` },
      { labelKey: 'pa.custodyDetail', to: `${PM_BASE}/custody/:custodyId` },
      { labelKey: 'pa.custodyInvoices' },
    ],
    rejected: [
      { labelKey: 'nav.home', to: PM_BASE },
      { labelKey: 'nav.invoices', to: `${PM_BASE}/invoices` },
      { labelKey: 'nav.rejected' },
    ],
    notifications: [{ labelKey: 'nav.home', to: PM_BASE }, { labelKey: 'nav.notifications' }],
  },
  navGroups: [
    {
      items: [
        { to: `${PM_BASE}`, labelKey: 'nav.home', icon: '⌂', end: true },
        { to: `${PM_BASE}/custody`, labelKey: 'nav.myCustody', icon: '💼' },
        { to: `${PM_BASE}/invoices`, labelKey: 'nav.invoices', icon: '📄' },
        { to: `${PM_BASE}/transactions`, labelKey: 'nav.transactions', icon: '📒' },
        { to: `${PM_BASE}/rejected`, labelKey: 'nav.rejected', icon: '⊘' },
        { to: `${PM_BASE}/notifications`, labelKey: 'nav.notifications', icon: '🔔' },
      ],
    },
  ],
  titleMap: {
    'project-manager': { titleKey: 'nav.home' },
    home: { titleKey: 'nav.home' },
    'new-custody': { titleKey: 'nav.newCustody' },
    invoices: { titleKey: 'nav.invoices' },
    transactions: { titleKey: 'nav.transactions' },
    custody: { titleKey: 'nav.myCustody' },
    approvals: { titleKey: 'nav.approvals' },
    rejected: { titleKey: 'nav.rejected' },
    notifications: { titleKey: 'nav.notifications' },
  },
});

export const adminRoutes = [
  { index: true, element: lazy(<AdminHomePage />) },
  { path: 'users', element: lazy(<AdminUsersPage />) },
  { path: 'roles', element: lazy(<AdminRolesPage />) },
  { path: 'projects', element: lazy(<AdminProjectsPage />) },
  { path: 'analytics', element: lazy(<AdminAnalyticsPage />) },
  { path: 'cycle', element: lazy(<AdminCyclePage />) },
  { path: 'disbursement', element: lazy(<AdminDisbursementPage />) },
  { path: 'disbursement/:custodyId', element: lazy(<AdminCustodyDetailPage />) },
  { path: 'vouchers', element: lazy(<AdminVouchersPage />) },
  { path: 'reports', element: lazy(<AdminReportsPage />) },
  { path: 'settings', element: lazy(<AdminSettingsPage />) },
  { path: 'logs', element: lazy(<AdminLogsPage />) },
  { path: 'notifications', element: lazy(<AdminNotificationsPage />) },
];

export const financeRoutes = [
  { index: true, element: lazy(<FinanceHomePage />) },
  { path: 'review', element: lazy(<FinanceReviewPage />) },
  { path: 'budgets', element: lazy(<FinanceBudgetsPage />) },
  { path: 'entries', element: lazy(<FinanceEntriesPage />) },
  { path: 'suppliers', element: lazy(<FinanceSuppliersPage />) },
  { path: 'archive', element: lazy(<FinanceArchivePage />) },
  { path: 'reports', element: lazy(<FinanceReportsPage />) },
  { path: 'tax', element: lazy(<FinanceTaxPage />) },
  { path: 'notifications', element: lazy(<NotificationsPage />) },
];

export const pmRoutes = [
  { index: true, element: lazy(<PMHomePage />) },
  { path: 'approvals', element: lazy(<PMCustodyApprovalsPage />) },
  { path: 'approval-log', element: lazy(<PAApprovalLogPage />) },
  { path: 'custody-archive', element: lazy(<PMCustodyArchivePage />) },
  { path: 'custody-archive/:custodyId', element: lazy(<PMCustodyArchiveDetailPage />) },
  { path: 'emergency', element: lazy(<PMEmergencyPage />) },
  { path: 'engineers', element: lazy(<PMEngineersPage />) },
  { path: 'projects', element: lazy(<PMProjectsPage />) },
  { path: 'reports', element: lazy(<PMReportsPage />) },
  { path: 'notifications', element: lazy(<NotificationsPage />) },
];

export const paRoutes = [
  { index: true, element: lazy(<PAHomePage />) },
  { path: 'new-custody', element: lazy(<PANewCustodyPage />) },
  { path: 'invoices', element: lazy(<PAInvoicesPage />) },
  { path: 'transactions', element: lazy(<PATransactionsPage />) },
  { path: 'custody', element: lazy(<PACustodyListPage />) },
  { path: 'custody/:custodyId/invoices', element: lazy(<PAInvoicesPage />) },
  { path: 'custody/:custodyId', element: lazy(<PACustodyDetailPage />) },
  { path: 'rejected', element: lazy(<PARejectedPage />) },
  { path: 'notifications', element: lazy(<NotificationsPage />) },
];
