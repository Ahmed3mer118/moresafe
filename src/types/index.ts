export const ROLES = {
  ADMIN: 'admin',
  CHIEF_ACCOUNTANT: 'chief_accountant',
  PROJECT_ACCOUNTANT: 'project_accountant',
  PROJECT_MANAGER: 'project_manager',
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

export const ROLE_DASHBOARD: Record<Role, string> = {
  [ROLES.ADMIN]: '/dashboard/admin',
  [ROLES.CHIEF_ACCOUNTANT]: '/dashboard/finance',
  [ROLES.PROJECT_ACCOUNTANT]: '/dashboard/project-accountant',
  [ROLES.PROJECT_MANAGER]: '/dashboard/project-manager',
};

export interface User {
  id: string;
  _id?: string;
  name: string;
  nameEn?: string;
  email: string;
  role: Role;
  language: 'ar' | 'en';
  isActive: boolean;
  projects?: Project[];
}

export interface Project {
  _id: string;
  id?: string;
  name: string;
  nameEn?: string;
  budget: number;
  spent: number;
  remaining?: number;
  status: string;
  manager?: User;
  accountants?: User[];
}

export interface Invoice {
  _id: string;
  referenceNumber: string;
  invoiceNumber: string;
  project: Project;
  supplier?: string;
  category?: string;
  total: number;
  subtotal?: number;
  vatAmount?: number;
  taxNumber?: string;
  taxVerified?: boolean;
  status: string;
  rejectionReason?: string;
  invoiceDate?: string;
  lineItems?: { description: string; quantity: number; unitPrice: number; total: number }[];
  attachments?: { filename: string; mimeType: string; url: string }[];
  attachmentUrl?: string;
  uploadedBy?: User;
  createdAt?: string;
}

export interface Custody {
  _id: string;
  custodyNumber: string;
  project: Project;
  holder: User;
  amount: number;
  spent: number;
  remaining?: number;
  status: string;
  invoices?: Invoice[];
  closedAt?: string;
  pmApprovedAt?: string;
  settlementNumber?: string;
  pmRejectionReason?: string;
  financeRejectionReason?: string;
  accrualEntry?: JournalLine[];
  disbursementEntry?: JournalLine[];
  settledAt?: string;
}

export interface JournalLine {
  accountCode: string;
  accountName: string;
  debit: number;
  credit: number;
}

export interface Notification {
  _id: string;
  title: string;
  titleEn?: string;
  message: string;
  messageEn?: string;
  type: string;
  isRead: boolean;
  createdAt: string;
}

export interface Voucher {
  _id: string;
  voucherNumber: string;
  beneficiary: User;
  amount: number;
  method: string;
  voucherDate: string;
  project?: Project;
}
