import type { Custody, Invoice } from '../types';
import { formatMoney } from './format';

const PM_UPLOAD_CUSTODY_STATUSES = new Set(['open', 'closed', 'pm_rejected']);
const PM_SUBMIT_CUSTODY_STATUSES = new Set(['open', 'closed']);

export function canUploadToCustody(status: string) {
  return PM_UPLOAD_CUSTODY_STATUSES.has(status);
}

export function canSubmitCustodyInvoices(status: string) {
  return PM_SUBMIT_CUSTODY_STATUSES.has(status);
}

/** Invoice left the PM draft queue and was sent into the approval workflow */
export function isInvoiceSubmittedForApproval(status: string) {
  return status !== 'accumulated' && status !== 'draft';
}

const APPROVED_INVOICE_STATUSES = new Set(['pm_approved', 'pending_finance', 'finance_approved', 'settled']);
const FINANCE_ELIGIBLE_STATUSES = new Set(['pending_finance', 'finance_approved', 'settled']);
const POST_PM_CUSTODY_STATUSES = new Set(['pm_approved', 'finance_pending', 'settled']);

export function financeEligibleInvoices(invoices: Invoice[] = []) {
  return invoices.filter((i) => FINANCE_ELIGIBLE_STATUSES.has(i.status));
}

export function custodyTotals(c: Custody) {
  const amount = c.amount || 0;
  const spent = displayInvoicesTotal(c);
  const remaining = amount - spent;
  return { amount, spent, remaining, over: remaining < 0 };
}

export function sumInvoices(invoices: Invoice[], statuses: Set<string>) {
  return invoices
    .filter((i) => statuses.has(i.status))
    .reduce((sum, i) => sum + (i.total || 0), 0);
}

export function displayInvoicesTotal(
  custody: Custody,
  options?: {
    reviewStatus?: 'pending_pm' | 'pending_finance';
    selectedInvoiceIds?: Set<string>;
  },
) {
  const invoices = custody.invoices ?? [];

  if (options?.reviewStatus === 'pending_pm') {
    const relevant = invoices.filter((i) => i.status === 'pending_pm' || i.status === 'pm_approved');
    if (options.selectedInvoiceIds?.size) {
      return relevant
        .filter((i) => i.status === 'pm_approved' || options.selectedInvoiceIds!.has(i._id))
        .reduce((sum, i) => sum + (i.total || 0), 0);
    }
    return relevant.reduce((sum, i) => sum + (i.total || 0), 0);
  }

  if (options?.reviewStatus === 'pending_finance') {
    const pending = invoices.filter((i) => i.status === 'pending_finance');
    if (options.selectedInvoiceIds?.size) {
      return pending
        .filter((i) => options.selectedInvoiceIds!.has(i._id))
        .reduce((sum, i) => sum + (i.total || 0), 0);
    }
    return pending.reduce((sum, i) => sum + (i.total || 0), 0);
  }

  if (POST_PM_CUSTODY_STATUSES.has(custody.status)) {
    if (custody.approvedSpent != null && custody.approvedSpent > 0) return custody.approvedSpent;
    return sumInvoices(invoices, FINANCE_ELIGIBLE_STATUSES);
  }

  if (custody.submittedSpent != null && custody.submittedSpent > 0) return custody.submittedSpent;
  return custody.spent || 0;
}

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export async function proofPayloadFromFile(file: File | null) {
  if (!file) return undefined;
  const data = await fileToBase64(file);
  return { data, filename: file.name, mimeType: file.type || 'application/octet-stream' };
}
