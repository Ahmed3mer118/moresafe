import { DashboardLayoutFactory } from '../components/layout/DashboardLayout';
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
} from '../pages/admin/AdminPages';
import {
  FinanceHomePage,
  FinanceReviewPage,
  FinanceEntriesPage,
  FinanceBudgetsPage,
  FinanceVouchersPage,
  FinanceArchivePage,
  FinanceTaxPage,
  FinanceReportsPage,
  FinanceSuppliersPage,
} from '../pages/finance/FinancePages';
import {
  PMHomePage,
  PMApprovalsPage,
  PMInvoiceArchivePage,
  PMProjectsPage,
  PMEngineersPage,
  PMEmergencyPage,
  PMReportsPage,
} from '../pages/project-manager/PMPages';
import {
  PAHomePage,
  PANewCustodyPage,
  PAInvoicesPage,
  PACustodyPage,
  PARejectedPage,
} from '../pages/project-accountant/PAPages';
import { NotificationsPage } from '../components/ui/NotificationsPage';

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
        { to: '/dashboard/finance/review', labelKey: 'nav.review', icon: '🧾' },
        { to: '/dashboard/finance/vouchers', labelKey: 'nav.vouchers', icon: '🏦' },
        { to: '/dashboard/finance/budgets', labelKey: 'nav.budgets', icon: '📊' },
        { to: '/dashboard/finance/entries', labelKey: 'nav.entries', icon: '📒' },
        { to: '/dashboard/finance/suppliers', labelKey: 'nav.suppliers', icon: '🏪' },
        { to: '/dashboard/finance/archive', labelKey: 'nav.archive', icon: '🗄️' },
        { to: '/dashboard/finance/reports', labelKey: 'nav.reports', icon: '📁' },
        { to: '/dashboard/finance/tax', labelKey: 'nav.tax', icon: '%' },
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
    'custody-approvals': [{ labelKey: 'nav.home', to: '/dashboard/project-accountant' }, { labelKey: 'nav.custodyApprovals' }],
    archive: [{ labelKey: 'nav.home', to: '/dashboard/project-accountant' }, { labelKey: 'nav.custodyApprovals' }],
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
        { to: '/dashboard/project-accountant/custody-approvals', labelKey: 'nav.custodyApprovals', icon: '📦' },
        // { to: '/dashboard/project-accountant/emergency', labelKey: 'nav.emergency', icon: '⚡' },
        { to: '/dashboard/project-accountant/engineers', labelKey: 'nav.engineers', icon: '👷' },
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
    'custody-approvals': { titleKey: 'nav.custodyApprovals' },
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
      { labelKey: 'nav.myCustody', to: `${PM_BASE}/custody` },
      { labelKey: 'nav.invoices' },
    ],
    custody: [
      { labelKey: 'nav.home', to: PM_BASE },
      { labelKey: 'nav.myCustody' },
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
        { to: `${PM_BASE}/new-custody`, labelKey: 'nav.newCustody', icon: '✚' },
        { to: `${PM_BASE}/invoices`, labelKey: 'nav.invoices', icon: '📄' },
        { to: `${PM_BASE}/custody`, labelKey: 'nav.myCustody', icon: '💼' },
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
    custody: { titleKey: 'nav.myCustody' },
    rejected: { titleKey: 'nav.rejected' },
    notifications: { titleKey: 'nav.notifications' },
  },
});

export const adminRoutes = [
  { index: true, element: <AdminHomePage /> },
  { path: 'users', element: <AdminUsersPage /> },
  { path: 'roles', element: <AdminRolesPage /> },
  { path: 'projects', element: <AdminProjectsPage /> },
  { path: 'analytics', element: <AdminAnalyticsPage /> },
  { path: 'cycle', element: <AdminCyclePage /> },
  { path: 'settings', element: <AdminSettingsPage /> },
  { path: 'logs', element: <AdminLogsPage /> },
  { path: 'notifications', element: <AdminNotificationsPage /> },
];

export const financeRoutes = [
  { index: true, element: <FinanceHomePage /> },
  { path: 'review', element: <FinanceReviewPage /> },
  { path: 'vouchers', element: <FinanceVouchersPage /> },
  { path: 'budgets', element: <FinanceBudgetsPage /> },
  { path: 'entries', element: <FinanceEntriesPage /> },
  { path: 'suppliers', element: <FinanceSuppliersPage /> },
  { path: 'archive', element: <FinanceArchivePage /> },
  { path: 'reports', element: <FinanceReportsPage /> },
  { path: 'tax', element: <FinanceTaxPage /> },
  { path: 'notifications', element: <NotificationsPage /> },
];

export const pmRoutes = [
  { index: true, element: <PMHomePage /> },
  { path: 'approvals', element: <PMApprovalsPage /> },
  { path: 'custody-approvals', element: <PMInvoiceArchivePage /> },
  { path: 'emergency', element: <PMEmergencyPage /> },
  { path: 'engineers', element: <PMEngineersPage /> },
  { path: 'projects', element: <PMProjectsPage /> },
  { path: 'reports', element: <PMReportsPage /> },
  { path: 'notifications', element: <NotificationsPage /> },
];

export const paRoutes = [
  { index: true, element: <PAHomePage /> },
  { path: 'new-custody', element: <PANewCustodyPage /> },
  { path: 'invoices', element: <PAInvoicesPage /> },
  { path: 'custody', element: <PACustodyPage /> },
  { path: 'rejected', element: <PARejectedPage /> },
  { path: 'notifications', element: <NotificationsPage /> },
];
