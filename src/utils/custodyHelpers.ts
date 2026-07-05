import type { Custody, Invoice, JournalLine } from '../types';

export function canUploadToCustody(_status: string) {
  return true;
}

export function canSubmitCustodyInvoices(_status: string) {
  return true;
}

/** Invoice left the PM draft queue and was sent into the approval workflow */
export function isInvoiceSubmittedForApproval(status: string) {
  return status !== 'accumulated' && status !== 'draft';
}

const FINANCE_ELIGIBLE_STATUSES = new Set(['pending_finance', 'finance_approved', 'settled']);
const POST_PM_CUSTODY_STATUSES = new Set(['pm_approved', 'finance_pending', 'settled']);

export function financeEligibleInvoices(invoices: Invoice[] = []) {
  return invoices.filter((i) => FINANCE_ELIGIBLE_STATUSES.has(i.status));
}

export function disbursementEligibleInvoices(invoices: Invoice[] = []) {
  return invoices.filter((i) => i.status === 'finance_approved');
}

export function disbursementTotal(custody: Custody) {
  const approved = disbursementEligibleInvoices(custody.invoices);
  if (approved.length) {
    return approved.reduce((sum, i) => sum + (i.total || 0), 0);
  }
  return custody.disbursementAmount || custody.approvedSpent || 0;
}

const REJECTED_INVOICE_STATUSES = new Set(['pm_rejected', 'finance_rejected']);

export function isRejectedInvoice(status: string) {
  return REJECTED_INVOICE_STATUSES.has(status);
}

/** Derive workflow status from invoices when DB status is stale (e.g. after repair glitch) */
export function effectiveCustodyStatus(custody: Custody): string {
  const invoices = custody.invoices ?? [];
  const hasPendingPm = invoices.some((i) => i.status === 'pending_pm');
  const hasPendingFinance = invoices.some((i) => i.status === 'pending_finance');
  const hasFinanceApproved = invoices.some((i) => i.status === 'finance_approved');
  const hasSettledInv = invoices.some((i) => i.status === 'settled');

  if (hasFinanceApproved && !hasPendingFinance) return 'finance_pending';
  if (custody.settledAt || custody.disbursementProof) return 'settled';
  if (hasPendingFinance) return 'pm_approved';
  if (hasSettledInv && !hasPendingPm) return 'settled';
  if (hasSettledInv && hasPendingPm) return 'settled';

  return custody.status;
}

export function partitionCustodyInvoices(invoices: Invoice[] = []) {
  const rejected = invoices.filter((i) => isRejectedInvoice(i.status));
  const active = invoices.filter((i) => !isRejectedInvoice(i.status));
  return { active, rejected };
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

/** Preview accrual journal lines for selected invoices (mirrors backend buildAccrualEntry) */
export function buildAccrualEntryPreview(invoices: Invoice[], holderName: string): JournalLine[] {
  const lines: JournalLine[] = [];
  let total = 0;

  for (const inv of invoices) {
    total += inv.total || 0;
    lines.push({
      accountCode: '12011',
      accountName: `Purchases - ${inv.category || 'Materials'} · ${inv.referenceNumber || inv.invoiceNumber || ''}`.trim(),
      debit: inv.total || 0,
      credit: 0,
    });
  }

  if (total > 0) {
    lines.push({
      accountCode: '23041',
      accountName: `Engineer custody - ${holderName}`,
      debit: 0,
      credit: total,
    });
  }

  return lines;
}

/** Preview disbursement journal lines (mirrors backend buildDisbursementEntry) */
export function buildDisbursementEntryPreview(total: number, holderName: string): JournalLine[] {
  if (!total || total <= 0) return [];
  return [
    {
      accountCode: '23041',
      accountName: `Engineer custody - ${holderName}`,
      debit: total,
      credit: 0,
    },
    {
      accountCode: '11010',
      accountName: 'Bank',
      debit: 0,
      credit: total,
    },
  ];
}

export function accrualPreviewForCustody(
  custody: Custody,
  selectedInvoiceIds?: Set<string>,
  status: string = 'pending_finance',
) {
  const holderName = typeof custody.holder === 'object' ? (custody.holder.name || custody.holder.nameEn || '') : '';
  const invoices = (custody.invoices ?? []).filter((i) => i.status === status);
  const selected = selectedInvoiceIds?.size
    ? invoices.filter((i) => selectedInvoiceIds.has(i._id))
    : invoices;
  return buildAccrualEntryPreview(selected, holderName);
}

export function disbursementPreviewForCustody(custody: Custody, amount?: number) {
  const holderName = typeof custody.holder === 'object' ? (custody.holder.name || custody.holder.nameEn || '') : '';
  const total = amount ?? disbursementTotal(custody);
  return buildDisbursementEntryPreview(total, holderName);
}

/** Business amount represented by a balanced journal entry (e.g. invoice total or disbursement amount) */
export function journalEntryAmount(lines: JournalLine[] = []) {
  const debit = lines.reduce((s, l) => s + (l.debit || 0), 0);
  const credit = lines.reduce((s, l) => s + (l.credit || 0), 0);
  return Math.max(debit, credit);
}

export type JournalCompareStatus = 'balanced' | 'surplus' | 'deficit';

export function compareAccrualDisbursement(accrual: JournalLine[] = [], disbursement: JournalLine[] = []) {
  const accrualTotal = journalEntryAmount(accrual);
  const disburseTotal = journalEntryAmount(disbursement);
  const delta = accrualTotal - disburseTotal;
  let status: JournalCompareStatus = 'balanced';
  if (Math.abs(delta) >= 0.01) {
    status = delta > 0 ? 'surplus' : 'deficit';
  }
  return { accrualTotal, disburseTotal, delta, diff: Math.abs(delta), status };
}
