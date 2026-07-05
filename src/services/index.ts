import { apiClient, ApiError } from '../core/ApiClient';
import type { User, Project, Custody, Invoice, Notification, Voucher, CustodyTransaction } from '../types';
import type { ListQueryParams, PaginatedResponse } from '../types/api';
import { toSearchParams } from '../types/api';

export class AuthService {
  async login(email: string, password: string) {
    return apiClient.post<{ token: string; user: User; dashboard: string }>(
      '/auth/login',
      { email, password }
    );
  }

  async me(init?: RequestInit) {
    return apiClient.get<{ user: User; dashboard: string }>('/auth/me', init);
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
  list(params?: ListQueryParams, init?: RequestInit) {
    return apiClient.get<PaginatedResponse<Project>>(`/projects${toSearchParams(params)}`, init);
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
  list(params?: ListQueryParams, init?: RequestInit) {
    return apiClient.get<PaginatedResponse<Custody>>(`/custodies${toSearchParams(params)}`, init);
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

  myTransactions(params?: ListQueryParams, init?: RequestInit) {
    return apiClient.get<PaginatedResponse<CustodyTransaction & { custodyNumber?: string }>>(
      `/custodies/my-transactions${toSearchParams(params)}`,
      init,
    );
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

  settle(id: string, approved: boolean, reason?: string, invoiceIds?: string[]) {
    return apiClient.post<Custody>(`/custodies/${id}/settle`, { approved, reason, invoiceIds });
  }

  cycleStats() {
    return apiClient.get<{ pm: number; pa: number; chief: number; disbursement: number; settled: number }>(
      '/custodies/cycle-stats'
    );
  }

  update(id: string, data: { amount?: number; purpose?: string; holderId?: string; projectId?: string; type?: string }) {
    return apiClient.patch<Custody>(`/custodies/${id}`, data);
  }

  adminTransactions(params?: ListQueryParams, init?: RequestInit) {
    return apiClient.get<PaginatedResponse<CustodyTransaction & { custodyNumber?: string; project?: Project; holder?: User }>>(
      `/admin/custody-transactions${toSearchParams(params)}`,
      init,
    );
  }

}

export class InvoiceService {
  list(params?: ListQueryParams, init?: RequestInit) {
    return apiClient.get<PaginatedResponse<Invoice>>(`/invoices${toSearchParams(params)}`, init);
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

  rejected(params?: ListQueryParams, init?: RequestInit) {
    return apiClient.get<PaginatedResponse<Invoice>>(`/invoices/rejected${toSearchParams(params)}`, init);
  }

  pendingFinance(params?: ListQueryParams, init?: RequestInit) {
    return apiClient.get<PaginatedResponse<Invoice>>(`/invoices/pending-finance${toSearchParams(params)}`, init);
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
  list(params?: ListQueryParams, init?: RequestInit) {
    return apiClient.get<PaginatedResponse<User>>(`/users${toSearchParams(params)}`, init);
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

  adminReports(projectId?: string, init?: RequestInit) {
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
    }>(`/dashboard/admin/reports${q}`, init);
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

  paApprovalLog(params?: ListQueryParams, init?: RequestInit) {
    return apiClient.get<PaginatedResponse<{
      _id: string;
      action: string;
      actionEn?: string;
      outcome: 'approved' | 'rejected';
      createdAt: string;
      user?: User;
      custody?: Custody | null;
      invoice?: Invoice & { approvedBy?: User } | null;
    }>>(`/dashboard/project-accountant/approval-log${toSearchParams(params)}`, init);
  }

  notifications(params?: ListQueryParams, init?: RequestInit) {
    return apiClient.get<{
      notifications: Notification[];
      unread: number;
      items: Notification[];
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    }>(`/notifications${toSearchParams(params)}`, init);
  }

  markRead(id: string) {
    return apiClient.patch(`/notifications/${id}/read`);
  }

  vouchers(params?: ListQueryParams, init?: RequestInit) {
    return apiClient.get<PaginatedResponse<Voucher>>(`/admin/vouchers${toSearchParams(params)}`, init);
  }

  createVoucher(data: Record<string, unknown>) {
    return apiClient.post<Voucher>('/admin/vouchers', data);
  }

  settledArchive(params?: ListQueryParams, init?: RequestInit) {
    return apiClient.get<PaginatedResponse<Custody>>(`/archive/settled${toSearchParams(params)}`, init);
  }

  taxCompliance(params?: ListQueryParams, init?: RequestInit) {
    return apiClient.get<PaginatedResponse<Invoice>>(`/tax/compliance${toSearchParams(params)}`, init);
  }

  settings() {
    return apiClient.get<{ companyName?: string; taxNumber?: string; primaryColor?: string }>('/settings');
  }

  updateSettings(data: Record<string, unknown>) {
    return apiClient.patch<{ companyName?: string; taxNumber?: string; primaryColor?: string }>('/settings', data);
  }

  activityLogs(params?: ListQueryParams, init?: RequestInit) {
    return apiClient.get<PaginatedResponse<{ action?: string; createdAt?: string }>>(
      `/activity-logs${toSearchParams(params)}`,
      init,
    );
  }
}

export const authService = new AuthService();
export const projectService = new ProjectService();
export const custodyService = new CustodyService();
export const invoiceService = new InvoiceService();
export const userService = new UserService();
export const dashboardService = new DashboardService();
