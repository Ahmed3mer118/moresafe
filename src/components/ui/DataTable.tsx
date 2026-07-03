import type { ReactNode } from 'react';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import { Button } from './Button';
import { Pagination } from './Pagination';
import { exportTableToCsv, exportTablePdf, getExportColumns } from '../../utils/exportTable';
import { showToast } from '../../utils/toast';
import { PageLoader } from './PageLoader';

export interface Column<T> {
  key: string;
  header: ReactNode;
  /** Translated label used in CSV/PDF export */
  exportHeader?: string;
  render: (row: T) => ReactNode;
  className?: string;
  exportValue?: (row: T) => string;
  /** Set false to exclude from Excel export (e.g. action buttons). Default: true */
  exportable?: boolean;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  query?: string;
  onQueryChange?: (q: string) => void;
  statusFilter?: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[] };
  onReset?: () => void;
  /** Reload data from API when ↺ is clicked (also clears filters if onReset is set) */
  onRefresh?: () => void;
  shown?: number;
  total?: number;
  emptyText?: string;
  searchPlaceholder?: string;
  toolbarExtra?: ReactNode;
  exportFilename?: string;
  /** PDF/print title — defaults to exportFilename */
  exportTitle?: string;
  exportLang?: string;
  /** Label after row count in PDF subtitle, e.g. "فاتورة" */
  exportRowLabel?: string;
  /** Custom PDF export (e.g. invoices with images). Default: table-only PDF from columns */
  onExportPdf?: () => void;
  exportPdfLabel?: string;
  exportExcelLabel?: string;
  pagination?: {
    page: number;
    totalPages: number;
    total: number;
    pageSize: number;
    onPageChange: (page: number) => void;
  };
  /** داخل Card — بدون إطار خارجي مزدوج */
  embedded?: boolean;
  /** Show spinner until data is fetched */
  loading?: boolean;
}

export function DataTable<T extends { _id?: string; id?: string }>({
  columns,
  data,
  query,
  onQueryChange,
  statusFilter,
  onReset,
  onRefresh,
  shown,
  total,
  emptyText = 'لا توجد نتائج',
  searchPlaceholder = 'بحث...',
  toolbarExtra,
  exportFilename,
  exportTitle,
  exportLang,
  exportRowLabel,
  onExportPdf,
  exportPdfLabel,
  exportExcelLabel,
  pagination,
  embedded,
  loading,
}: DataTableProps<T>) {
  const { t, i18n } = useTranslation();
  const lang = exportLang ?? i18n.language;
  const pdfLabel = exportPdfLabel ?? t('common.exportPdf');
  const excelLabel = exportExcelLabel ?? t('common.exportExcel');

  const exportCols = getExportColumns(columns);
  const canExport = Boolean(exportFilename) && exportCols.length > 0;
  const hasToolbar = onQueryChange || statusFilter || toolbarExtra || canExport || onExportPdf;

  const handleExportExcel = () => {
    if (!exportFilename) return;
    if (!data.length) {
      showToast(t('common.noData'), 'error');
      return;
    }
    if (!exportTableToCsv(exportFilename, columns, data)) {
      showToast(t('common.exportFailed'), 'error');
    }
  };

  const handleExportPdf = () => {
    if (onExportPdf) {
      onExportPdf();
      return;
    }
    if (!exportFilename || !exportCols.length) return;
    if (!data.length) {
      showToast(t('common.noData'), 'error');
      return;
    }
    exportTablePdf({
      title: exportTitle ?? exportFilename,
      filename: exportFilename,
      columns: exportCols,
      rows: data,
      lang,
      rowLabel: exportRowLabel,
    }).catch(() => showToast(t('common.exportFailed'), 'error'));
  };

  const showPdfButton = Boolean(onExportPdf) || canExport;

  return (
    <div className={clsx(
      embedded
        ? 'overflow-hidden bg-white'
        : 'rounded-xl border border-[#e3e9f2] overflow-hidden bg-white shadow-[0_1px_3px_rgba(15,36,64,0.04)]'
    )}>
      {hasToolbar && (
        <div className="flex flex-wrap items-center gap-2 px-4 py-2.5 border-b border-[#e8edf4] bg-gradient-to-r from-[#f8fafc] to-[#f4f7fb]">
          {onQueryChange && (
            <div className="flex items-center gap-1.5 bg-white border border-[#e3e9f2] rounded-lg px-2.5 py-1.5 min-w-[160px] flex-1 max-w-xs">
              <span className="text-muted text-sm">🔍</span>
              <input
                value={query || ''}
                onChange={(e) => onQueryChange(e.target.value)}
                placeholder={searchPlaceholder}
                className="border-none outline-none bg-transparent text-xs w-full font-[inherit]"
              />
            </div>
          )}
          {statusFilter && (
            <select
              value={statusFilter.value}
              onChange={(e) => statusFilter.onChange(e.target.value)}
              className="text-xs border border-[#e3e9f2] rounded-lg px-2.5 py-1.5 bg-white"
            >
              {statusFilter.options.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          )}
          {(onRefresh || onReset) && (
            <button
              type="button"
              onClick={() => {
                onReset?.();
                onRefresh?.();
              }}
              className="w-8 h-8 border border-[#e3e9f2] rounded-lg bg-white text-muted hover:text-brand-500 text-sm"
              title={onRefresh ? 'Refresh' : 'Reset'}
            >
              ↺
            </button>
          )}
          {shown !== undefined && total !== undefined && (
            <span className="text-[11px] text-muted font-bold ms-auto">{shown} / {total}</span>
          )}
          {toolbarExtra}
          {canExport && (
            <Button size="sm" variant="ghost" onClick={handleExportExcel}>⬇ {excelLabel}</Button>
          )}
          {showPdfButton && (
            <Button size="sm" variant="ghost" onClick={handleExportPdf}>⬇ {pdfLabel}</Button>
          )}
        </div>
      )}
      <div className="overflow-x-auto">
        {loading ? (
          <PageLoader compact />
        ) : (
        <table className="w-full text-sm border-collapse min-w-[520px]">
          <thead>
            <tr className="bg-gradient-to-r from-[#eef2f7] to-[#f4f7fb] border-b border-[#dde4ee]">
              {columns.map((col) => (
                <th key={col.key} className={clsx('text-start px-3.5 py-3 text-[#64748b] font-extrabold text-xs uppercase tracking-wide whitespace-nowrap', col.className)}>
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="text-center py-10 text-muted">{emptyText}</td>
              </tr>
            ) : (
              data.map((row, i) => (
                <tr
                  key={row._id || row.id || i}
                  className={clsx(
                    'border-t border-[#eef1f6] transition-colors hover:bg-brand-50/40',
                    i % 2 === 1 && 'bg-[#fafbfd]'
                  )}
                >
                  {columns.map((col) => (
                    <td key={col.key} className={clsx('px-3.5 py-3 align-middle text-[#334155] text-[13px]', col.className)}>{col.render(row)}</td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
        )}
      </div>
      {pagination && (
        <Pagination
          page={pagination.page}
          totalPages={pagination.totalPages}
          total={pagination.total}
          pageSize={pagination.pageSize}
          onPageChange={pagination.onPageChange}
        />
      )}
    </div>
  );
}
