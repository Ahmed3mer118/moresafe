import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { DataTable } from '../ui/DataTable';
import { StatusChip, Amount } from '../ui/Chip';
import type { Custody, Invoice } from '../../types';
import {
  formatMoney,
  projectName,
  userName,
  invoiceManagerName,
  statusLabel,
  formatDate,
} from '../../utils/format';
import { displayInvoicesTotal } from '../../utils/custodyHelpers';
import { exportInvoicesFromTable } from '../../utils/exportInvoicesPdf';
import { showToast } from '../../utils/toast';

export function custodyInvoiceColumns(
  t: TFunction,
  i18n: { language: string },
  onView: (id: string) => void,
) {
  return [
    {
      key: 'ref',
      header: t('pm.invoice'),
      exportHeader: t('pm.invoice'),
      render: (inv: Invoice) => <span className="font-bold text-navy">{inv.referenceNumber}</span>,
      exportValue: (inv: Invoice) => inv.referenceNumber,
    },
    {
      key: 'mgr',
      header: t('pm.projectManager'),
      exportHeader: t('pm.projectManager'),
      render: (inv: Invoice) => (
        <span className="text-[#475569] font-semibold">{invoiceManagerName(inv, i18n.language)}</span>
      ),
      exportValue: (inv: Invoice) => invoiceManagerName(inv, i18n.language),
    },
    {
      key: 'sup',
      header: t('pm.supplier'),
      exportHeader: t('pm.supplier'),
      render: (inv: Invoice) => <span className="text-[#475569]">{inv.supplier || '—'}</span>,
      exportValue: (inv: Invoice) => inv.supplier || '',
    },
    {
      key: 'cat',
      header: t('pm.category'),
      exportHeader: t('pm.category'),
      render: (inv: Invoice) => <span className="text-[#475569]">{inv.category || '—'}</span>,
      exportValue: (inv: Invoice) => inv.category || '',
    },
    {
      key: 'date',
      header: t('common.date'),
      exportHeader: t('common.date'),
      render: (inv: Invoice) => (
        <span className="text-[#64748b] text-xs">
          {inv.invoiceDate ? formatDate(inv.invoiceDate, i18n.language) : '—'}
        </span>
      ),
      exportValue: (inv: Invoice) => formatDate(inv.invoiceDate, i18n.language),
    },
    {
      key: 'amt',
      header: t('common.amount'),
      exportHeader: t('common.amount'),
      render: (inv: Invoice) => <Amount>{formatMoney(inv.total, i18n.language)}</Amount>,
      exportValue: (inv: Invoice) => String(inv.total),
    },
    {
      key: 'st',
      header: t('common.status'),
      exportHeader: t('common.status'),
      render: (inv: Invoice) => <StatusChip status={inv.status} label={statusLabel(inv.status, t)} />,
      exportValue: (inv: Invoice) => statusLabel(inv.status, t),
    },
    {
      key: 'act',
      header: '',
      exportable: false,
      render: (inv: Invoice) => (
        <Button size="sm" variant="ghost" onClick={() => onView(inv._id)}>
          {t('common.view')}
        </Button>
      ),
    },
  ];
}

type ReviewStatus = 'pending_pm' | 'pending_finance';

export function CustodyReviewCard({
  custody,
  onView,
  selectedInvoiceIds,
  onToggleCustody,
  onToggleInvoice,
  readOnly = false,
  reviewStatus = 'pending_pm',
  invoiceFilter,
}: {
  custody: Custody;
  onView: (id: string) => void;
  selectedInvoiceIds?: Set<string>;
  onToggleCustody?: (custodyId: string, invoiceIds: string[], checked: boolean) => void;
  onToggleInvoice?: (id: string) => void;
  readOnly?: boolean;
  reviewStatus?: ReviewStatus;
  invoiceFilter?: (inv: Invoice) => boolean;
}) {
  const { t, i18n } = useTranslation();
  const visibleInvoices = (custody.invoices ?? []).filter((i) =>
    invoiceFilter ? invoiceFilter(i) : true,
  );
  const pendingInvoices = visibleInvoices.filter((i) => i.status === reviewStatus);
  const pendingIds = pendingInvoices.map((i) => i._id);
  const allPendingSelected = pendingIds.length > 0 && pendingIds.every((id) => selectedInvoiceIds?.has(id));
  const baseColumns = custodyInvoiceColumns(t, i18n, onView);
  const invoiceTotal = displayInvoicesTotal(custody, {
    reviewStatus: readOnly ? undefined : reviewStatus,
    selectedInvoiceIds: readOnly ? undefined : selectedInvoiceIds,
  });

  const columns = readOnly || !selectedInvoiceIds
    ? baseColumns
    : [
        {
          key: 'sel',
          header: pendingIds.length ? (
            <input
              type="checkbox"
              className="w-4 h-4 accent-brand-600 cursor-pointer"
              checked={allPendingSelected}
              onChange={(e) => onToggleCustody?.(custody._id, pendingIds, e.target.checked)}
              aria-label={t('pm.selectAll')}
            />
          ) : '',
          exportable: false,
          className: 'w-10',
          render: (inv: Invoice) =>
            inv.status === reviewStatus ? (
              <input
                type="checkbox"
                className="w-4 h-4 accent-brand-600 cursor-pointer"
                checked={selectedInvoiceIds.has(inv._id)}
                onChange={() => onToggleInvoice?.(inv._id)}
                aria-label={inv.referenceNumber}
              />
            ) : null,
        },
        ...baseColumns,
      ];

  return (
    <Card key={custody._id} noPadding className="overflow-hidden">
      <div className="px-4 py-4 border-b border-[#e8edf4] bg-gradient-to-r from-brand-50/50 to-white">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex items-start gap-3">
            {!readOnly && pendingIds.length > 0 && selectedInvoiceIds && (
              <input
                type="checkbox"
                className="w-4 h-4 accent-brand-600 cursor-pointer mt-1.5"
                checked={allPendingSelected}
                onChange={(e) => onToggleCustody?.(custody._id, pendingIds, e.target.checked)}
                aria-label={custody.custodyNumber}
              />
            )}
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-white border border-brand-200 text-brand-700 text-xs font-bold">
                  {custody.custodyNumber}
                </span>
                <span className="font-extrabold text-navy">{userName(custody.holder, i18n.language)}</span>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                <div>
                  <span className="text-[11px] font-bold text-[#94a3b8] uppercase tracking-wide">{t('common.project')}: </span>
                  <span className="font-extrabold text-navy">{projectName(custody.project, i18n.language)}</span>
                </div>
                {custody.closedAt && (
                  <div>
                    <span className="text-[11px] font-bold text-[#94a3b8] uppercase tracking-wide">{t('common.date')}: </span>
                    <span className="font-bold text-[#475569]">{formatDate(custody.closedAt, i18n.language)}</span>
                  </div>
                )}
                {readOnly && custody.pmApprovedBy && (
                  <div>
                    <span className="text-[11px] font-bold text-[#94a3b8] uppercase tracking-wide">{t('admin.approvedByPa', { name: userName(custody.pmApprovedBy, i18n.language) })}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 sm:gap-5 text-sm shrink-0">
            <div className="text-center min-w-[72px]">
              <div className="text-[10px] text-[#94a3b8] font-bold mb-0.5">{t('pa.custodyAmount')}</div>
              <Amount>{formatMoney(custody.amount ?? 0, i18n.language)}</Amount>
            </div>
            <div className="text-center min-w-[72px]">
              <div className="text-[10px] text-[#94a3b8] font-bold mb-0.5">{t('admin.invoicesTotal')}</div>
              <Amount>{formatMoney(invoiceTotal, i18n.language)}</Amount>
            </div>
            <div className="text-center min-w-[52px]">
              <div className="text-[10px] text-[#94a3b8] font-bold mb-0.5">{t('pm.invoicesLabel')}</div>
              <span className="font-bold text-navy">
                {invoiceFilter ? visibleInvoices.length : (custody.invoices?.length || 0)}
              </span>
            </div>
            <StatusChip
              status={pendingInvoices.length ? reviewStatus : custody.status}
              label={statusLabel(pendingInvoices.length ? reviewStatus : custody.status, t)}
            />
          </div>
        </div>
      </div>

      {(visibleInvoices.length ?? 0) > 0 ? (
        <DataTable
          columns={columns}
          data={visibleInvoices}
          emptyText={t('pm.noInvoices')}
          embedded
          exportFilename={`custody-${custody.custodyNumber}-invoices`}
          exportTitle={`${custody.custodyNumber} — ${t('pm.invoicesLabel')}`}
          exportLang={i18n.language}
          exportRowLabel={i18n.language === 'ar' ? 'فاتورة' : 'invoices'}
          onExportPdf={() => {
            if (!visibleInvoices.length) {
              showToast(t('common.noData'), 'error');
              return;
            }
            exportInvoicesFromTable({
              title: `${custody.custodyNumber} — ${t('pm.invoicesLabel')}`,
              filename: `custody-${custody.custodyNumber}-invoices`,
              columns,
              rows: visibleInvoices,
              lang: i18n.language,
              t,
              project: custody.project,
            }).catch(() => showToast(t('common.exportFailed'), 'error'));
          }}
        />
      ) : (
        <p className="text-center text-[#94a3b8] text-sm py-6">{t('pm.noInvoices')}</p>
      )}
    </Card>
  );
}
