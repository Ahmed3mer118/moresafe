import { apiClient, ApiError } from '../core/ApiClient';
import type { User, Project, Custody, Invoice, Notification, Voucher, CustodyTransaction } from '../types';

export class AuthService {
  async login(email: string, password: string) {
    return apiClient.post<{ token: string; user: User; dashboard: string }>(
      '/auth/login',
      { email, password }
    );
  }

  async me() {
    return apiClient.get<{ user: User; dashboard: string }>('/auth/me');
  }

  async updateProfile(data: Partial<User>) {
    return apiClient.patch<{ user: User }>('/auth/profile', data);
  }
}

type ProjectInput = Omit<Partial<Project>, 'manager' | 'accountants'> & {
  manager?: string;
  accountants?: string[];
};

export interface BudgetSummary {
  projectCount: number;
  budget: number;
  spent: number;
  remaining: number;
  overCount: number;
  nearCount: number;
}

export class ProjectService {
  list() {
    return apiClient.get<Project[]>('/projects');
  }

  get(id: string) {
    return apiClient.get<Project>(`/projects/${id}`);
  }

  create(data: ProjectInput) {
    return apiClient.post<Project>('/projects', data);
  }

  update(id: string, data: ProjectInput) {
    return apiClient.patch<Project>(`/projects/${id}`, data);
  }

  budgets() {
    return apiClient.get<{ projects: Project[]; totals: BudgetSummary }>('/projects/budgets');
  }
}

export class CustodyService {
  list(params?: Record<string, string>) {
    const q = params ? `?${new URLSearchParams(params)}` : '';
    return apiClient.get<Custody[]>(`/custodies${q}`);
  }

  async getOpen() {
    try {
      return await apiClient.get<Custody | null>('/custodies/open');
    } catch (err) {
      if (err instanceof ApiError && (err.status === 403 || err.status === 404)) {
        return null;
      }
      throw err;
    }
  }

  get(id: string) {
    return apiClient.get<Custody>(`/custodies/${id}`);
  }

  create(data: { projectId: string; amount: number; type?: string; purpose?: string; holderId?: string; proof?: { data: string; filename: string; mimeType: string } }) {
    return apiClient.post<Custody>('/custodies', data);
  }

  close(id: string, invoiceIds?: string[]) {
    return apiClient.post<Custody>(`/custodies/${id}/close`, { invoiceIds });
  }

  transactions(id: string) {
    return apiClient.get<CustodyTransaction[]>(`/custodies/${id}/transactions`);
  }

  myTransactions() {
    return apiClient.get<(CustodyTransaction & { custodyNumber?: string })[]>('/custodies/my-transactions');
  }

  disbursementQueue() {
    return apiClient.get<Custody[]>('/custodies/disbursement-queue');
  }

  disburse(id: string, data: { proof?: { data: string; filename: string; mimeType: string }; proofUrl?: string; amount?: number; method?: string; bankReference?: string }) {
    return apiClient.post<Custody>(`/admin/custodies/${id}/disburse`, data);
  }

  topUp(id: string, data: { amount: number; proof?: { data: string; filename: string; mimeType: string }; proofUrl?: string; description?: string }) {
    return apiClient.post<Custody>(`/custodies/${id}/top-up`, data);
  }

  pmApprove(id: string, approved: boolean, reason?: string) {
    return apiClient.post<Custody>(`/custodies/${id}/pm-approve`, { approved, reason });
  }

  settle(id: string, approved: boolean, reason?: string) {
    return apiClient.post<Custody>(`/custodies/${id}/settle`, { approved, reason });
  }

  cycleStats() {
    return apiClient.get<{ pm: number; pa: number; chief: number; disbursement: number; settled: number }>(
      '/custodies/cycle-stats'
    );
  }

  update(id: string, data: { amount?: number; purpose?: string; holderId?: string; projectId?: string; type?: string }) {
    return apiClient.patch<Custody>(`/custodies/${id}`, data);
  }

  adminTransactions() {
    return apiClient.get<(CustodyTransaction & { custodyNumber?: string; project?: Project; holder?: User })[]>(
      '/admin/custody-transactions',
    );
  }
}

export class InvoiceService {
  list(params?: Record<string, string>) {
    const q = params ? `?${new URLSearchParams(params)}` : '';
    return apiClient.get<Invoice[]>(`/invoices${q}`);
  }

  get(id: string) {
    return apiClient.get<Invoice>(`/invoices/${id}`);
  }

  create(data: Record<string, unknown> | FormData) {
    return apiClient.post<Invoice>('/invoices', data);
  }

  upload(data: FormData) {
    return apiClient.post<Invoice>('/invoices/upload', data);
  }

  update(id: string, data: Record<string, unknown>) {
    return apiClient.patch<Invoice>(`/invoices/${id}`, data);
  }

  review(id: string, approved: boolean, reason?: string) {
    return apiClient.post<Invoice>(`/invoices/${id}/review`, { approved, reason });
  }

  pmReview(id: string, approved: boolean, reason?: string) {
    return apiClient.post<Invoice>(`/invoices/${id}/pm-review`, { approved, reason });
  }

  batchPmReview(invoiceIds: string[], approved: boolean, reason?: string) {
    return apiClient.post<{ count: number; invoices: Invoice[] }>('/invoices/batch-pm-review', {
      invoiceIds,
      approved,
      reason,
    });
  }

  batchReview(invoiceIds: string[], approved: boolean, reason?: string) {
    return apiClient.post<{ count: number; invoices: Invoice[] }>('/invoices/batch-review', {
      invoiceIds,
      approved,
      reason,
    });
  }

  rejected() {
    return apiClient.get<Invoice[]>('/invoices/rejected');
  }

  pendingFinance() {
    return apiClient.get<Invoice[]>('/invoices/pending-finance');
  }

  scan(file: File) {
    const form = new FormData();
    form.append('file', file);
    return apiClient.post<{ success: boolean; data: Record<string, unknown> }>(
      '/ocr/scan',
      form
    );
  }
}

export class UserService {
  list(params?: Record<string, string>) {
    const q = params ? `?${new URLSearchParams(params)}` : '';
    return apiClient.get<User[]>(`/users${q}`);
  }

  create(data: Record<string, unknown>) {
    return apiClient.post<User>('/users', data);
  }

  update(id: string, data: Record<string, unknown>) {
    return apiClient.patch<User>(`/users/${id}`, data);
  }

  stats() {
    return apiClient.get<{ _id: string; count: number }[]>('/users/stats');
  }
}

export class DashboardService {
  admin() {
    return apiClient.get<{
      users: number;
      projects: number;
      rolesCount?: number;
      systemStatus?: string;
      activityChart?: { labels: string[]; data: number[] };
      roleChart?: { labels: string[]; data: number[] };
      recentActivity: { action?: string; createdAt?: string }[];
    }>('/dashboard/admin');
  }

  adminAnalytics() {
    return apiClient.get<{
      settledCycles: number;
      totalExpense: number;
      activeSuppliers: number;
      nearBudgetAlerts: number;
      avgSettlementHours: number;
      expenseTrend: { labels: string[]; data: number[] };
      topSuppliers: { _id: string; total: number; count: number }[];
      recentActivity: { action?: string; createdAt?: string; user?: { name: string } }[];
    }>('/dashboard/admin/analytics');
  }

  adminReports(projectId?: string) {
    const q = projectId ? `?projectId=${encodeURIComponent(projectId)}` : '';
    return apiClient.get<{
      byManager: {
        userId: string;
        name: string;
        nameEn?: string;
        custodiesCount: number;
        totalAllocated: number;
        totalSpent: number;
        settledCount: number;
        overBudgetCount: number;
        openCount: number;
      }[];
      byAccountant: {
        userId: string;
        name: string;
        nameEn?: string;
        reviewedCount: number;
        approvedCount: number;
        rejectedCount: number;
        totalReviewedAmount: number;
      }[];
      byChief: {
        userId: string;
        name: string;
        nameEn?: string;
        settledCount: number;
        rejectedCount: number;
      }[];
      byProject: {
        projectId: string;
        name: string;
        nameEn?: string;
        budget?: number;
        custodiesCount: number;
        totalAllocated: number;
        totalSpent: number;
        settledCount: number;
        overBudgetCount: number;
      }[];
      totals: {
        custodiesCount: number;
        totalAllocated: number;
        totalSpent: number;
        settledCount: number;
        overBudgetCount: number;
        invoiceCount: number;
      };
    }>(`/dashboard/admin/reports${q}`);
  }

  finance() {
    return apiClient.get<{
      openCustodies: number;
      pendingSettlement: number;
      settled: number;
      totalExpense: number;
      pendingInvoices: number;
      expenseTrend?: { labels: string[]; data: number[] };
      custodyChart?: { labels: string[]; data: number[] };
    }>('/dashboard/finance');
  }

  financeReports() {
    return apiClient.get<{
      openCustodies: number;
      settled: number;
      invoices: number;
      expenseTrend: { labels: string[]; data: number[] };
    }>('/dashboard/finance/reports');
  }

  financeSuppliers() {
    return apiClient.get<{ suppliers: { _id: string; total: number; count: number }[]; grandTotal: number; supplierCount: number }>(
      '/dashboard/finance/suppliers'
    );
  }

  projectManager() {
    return apiClient.get<{
      projects: number;
      pendingCustodies: number;
      totalSpent: number;
      engineers: number;
      projectList: Project[];
      custodyChart?: { labels: string[]; data: number[] };
      reports?: {
        avgApprovalHours: number;
        budgetCompliance: number;
        rejectedInvoices: number;
        nearBudgetProjects: number;
        expenseTrend: { labels: string[]; data: number[] };
      };
    }>('/dashboard/project-accountant');
  }

  projectAccountant() {
    return apiClient.get<{
      openCount: number;
      rejected: number;
      draftInvoices: number;
      remaining: number;
      amount: number;
      openCustody?: Custody | null;
      invoiceChart?: { labels: string[]; data: number[] };
      expenseTrend?: { labels: string[]; data: number[] };
      recentInvoices?: Invoice[];
    }>('/dashboard/project-manager');
  }

  paApprovalLog(params?: { page?: number; limit?: number }) {
    const q = params ? `?${new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)]))}` : '';
    return apiClient.get<{
      items: {
        _id: string;
        action: string;
        actionEn?: string;
        outcome: 'approved' | 'rejected';
        createdAt: string;
        user?: User;
        custody?: Custody | null;
        invoice?: Invoice & { approvedBy?: User } | null;
      }[];
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    }>(`/dashboard/project-accountant/approval-log${q}`);
  }

  notifications() {
    return apiClient.get<{ notifications: Notification[]; unread: number }>(
      '/notifications'
    );
  }

  markRead(id: string) {
    return apiClient.patch(`/notifications/${id}/read`);
  }

  vouchers() {
    return apiClient.get<Voucher[]>('/admin/vouchers');
  }

  createVoucher(data: Record<string, unknown>) {
    return apiClient.post<Voucher>('/admin/vouchers', data);
  }

  settledArchive() {
    return apiClient.get<Custody[]>('/archive/settled');
  }

  taxCompliance() {
    return apiClient.get<Invoice[]>('/tax/compliance');
  }

  settings() {
    return apiClient.get<{ companyName?: string; taxNumber?: string; primaryColor?: string }>('/settings');
  }

  updateSettings(data: Record<string, unknown>) {
    return apiClient.patch<{ companyName?: string; taxNumber?: string; primaryColor?: string }>('/settings', data);
  }

  activityLogs(params?: { page?: number; limit?: number }) {
    const page = params?.page ?? 1;
    const limit = params?.limit ?? 15;
    const q = new URLSearchParams();
    q.set('page', String(page));
    q.set('limit', String(limit));

    return apiClient
      .get<
        | { action?: string; createdAt?: string }[]
        | {
            items: { action?: string; createdAt?: string }[];
            total: number;
            page: number;
            limit: number;
            totalPages: number;
          }
      >(`/activity-logs?${q}`)
      .then((raw) => {
        if (Array.isArray(raw)) {
          const start = (page - 1) * limit;
          const items = raw.slice(start, start + limit);
          return {
            items,
            total: raw.length,
            page,
            limit,
            totalPages: Math.max(1, Math.ceil(raw.length / limit)),
          };
        }
        return {
          items: raw.items ?? [],
          total: raw.total ?? raw.items?.length ?? 0,
          page: raw.page ?? page,
          limit: raw.limit ?? limit,
          totalPages: raw.totalPages ?? 1,
        };
      });
  }
}

export const authService = new AuthService();
export const projectService = new ProjectService();
export const custodyService = new CustodyService();
export const invoiceService = new InvoiceService();
export const userService = new UserService();
export const dashboardService = new DashboardService();
