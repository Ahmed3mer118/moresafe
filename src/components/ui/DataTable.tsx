import { memo, useCallback, useRef, type ReactNode } from 'react';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Button } from './Button';
import { Pagination } from './Pagination';
import { exportTableToCsv, exportTablePdf, getExportColumns } from '../../utils/exportTable';
import { showToast } from '../../utils/toast';
import { PageLoader } from './PageLoader';
import { RefreshButton } from './RefreshButton';
import { Notice } from './Notice';

export interface Column<T> {
  key: string;
  header: ReactNode;
  exportHeader?: string;
  render: (row: T) => ReactNode;
  className?: string;
  exportValue?: (row: T) => string;
  exportable?: boolean;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  query?: string;
  onQueryChange?: (q: string) => void;
  statusFilter?: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[] };
  onReset?: () => void;
  onRefresh?: () => void | Promise<void>;
  shown?: number;
  total?: number;
  emptyText?: string;
  errorText?: string;
  searchPlaceholder?: string;
  toolbarExtra?: ReactNode;
  exportFilename?: string;
  exportTitle?: string;
  exportLang?: string;
  exportRowLabel?: string;
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
  embedded?: boolean;
  loading?: boolean;
  fetching?: boolean;
  error?: unknown;
  /** Enable row virtualization when dataset is large */
  virtualize?: boolean;
}

function rowKey<T extends { _id?: string; id?: string }>(row: T, index: number) {
  return row._id || row.id || String(index);
}

function DataTableInner<T extends { _id?: string; id?: string }>({
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
  errorText,
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
  fetching,
  error,
  virtualize,
}: DataTableProps<T>) {
  const { t, i18n } = useTranslation();
  const lang = exportLang ?? i18n.language;
  const pdfLabel = exportPdfLabel ?? t('common.exportPdf');
  const excelLabel = exportExcelLabel ?? t('common.exportExcel');
  const parentRef = useRef<HTMLDivElement>(null);

  const exportCols = getExportColumns(columns);
  const canExport = Boolean(exportFilename) && exportCols.length > 0;
  const hasToolbar = onQueryChange || statusFilter || toolbarExtra || canExport || onExportPdf || onRefresh;
  const useVirtual = Boolean(virtualize && data.length > 20);

  const virtualizer = useVirtualizer({
    count: data.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 52,
    overscan: 8,
    enabled: useVirtual,
  });

  const handleExportExcel = useCallback(() => {
    if (!exportFilename) return;
    if (!data.length) {
      showToast(t('common.noData'), 'error');
      return;
    }
    if (!exportTableToCsv(exportFilename, columns, data)) {
      showToast(t('common.exportFailed'), 'error');
    }
  }, [columns, data, exportFilename, t]);

  const handleExportPdf = useCallback(() => {
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
  }, [columns, data, exportCols, exportFilename, exportRowLabel, exportTitle, lang, onExportPdf, t]);

  const showPdfButton = Boolean(onExportPdf) || canExport;

  const renderRow = (row: T, i: number, style?: React.CSSProperties) => (
    <tr
      key={rowKey(row, i)}
      style={style}
      className={clsx(
        'border-t border-[#eef1f6] transition-colors hover:bg-brand-50/40',
        i % 2 === 1 && 'bg-[#fafbfd]',
      )}
    >
      {columns.map((col) => (
        <td key={col.key} className={clsx('px-3.5 py-3 align-middle text-[#334155] text-[13px]', col.className)}>
          {col.render(row)}
        </td>
      ))}
    </tr>
  );

  return (
    <div
      className={clsx(
        embedded
          ? 'overflow-hidden bg-white'
          : 'rounded-xl border border-[#e3e9f2] overflow-hidden bg-white shadow-[0_1px_3px_rgba(15,36,64,0.04)]',
      )}
    >
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
          {onRefresh && (
            <RefreshButton
              variant="icon"
              loading={loading || fetching}
              onRefresh={async () => {
                onReset?.();
                await onRefresh();
              }}
            />
          )}
          {shown !== undefined && total !== undefined && (
            <span className="text-[11px] text-muted font-bold ms-auto">{shown} / {total}</span>
          )}
          {fetching && !loading && (
            <span className="text-[10px] text-brand-600 font-bold animate-pulse">{t('common.loading')}</span>
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

      {error ? (
        <div className="m-4">
        <Notice variant="error">
          {errorText ?? t('common.loadFailed', { defaultValue: 'تعذّر تحميل البيانات' })}
        </Notice>
        </div>
      ) : (
        <div ref={parentRef} className={clsx('overflow-x-auto', useVirtual && 'max-h-[520px] overflow-y-auto')}>
          {loading ? (
            <PageLoader compact />
          ) : (
            <table className="w-full text-sm border-collapse min-w-[520px]">
              <thead className={useVirtual ? 'sticky top-0 z-10' : undefined}>
                <tr className="bg-gradient-to-r from-[#eef2f7] to-[#f4f7fb] border-b border-[#dde4ee]">
                  {columns.map((col) => (
                    <th
                      key={col.key}
                      className={clsx(
                        'text-start px-3.5 py-3 text-[#64748b] font-extrabold text-xs uppercase tracking-wide whitespace-nowrap',
                        col.className,
                      )}
                    >
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
                ) : useVirtual ? (
                  <>
                    {virtualizer.getVirtualItems().length > 0 && (
                      <tr aria-hidden style={{ height: virtualizer.getVirtualItems()[0]?.start ?? 0 }}>
                        <td colSpan={columns.length} />
                      </tr>
                    )}
                    {virtualizer.getVirtualItems().map((vRow) =>
                      renderRow(data[vRow.index], vRow.index, { height: vRow.size }),
                    )}
                    {virtualizer.getVirtualItems().length > 0 && (
                      <tr
                        aria-hidden
                        style={{
                          height:
                            virtualizer.getTotalSize() -
                            (virtualizer.getVirtualItems().at(-1)?.end ?? 0),
                        }}
                      >
                        <td colSpan={columns.length} />
                      </tr>
                    )}
                  </>
                ) : (
                  data.map((row, i) => renderRow(row, i))
                )}
              </tbody>
            </table>
          )}
        </div>
      )}

      {pagination && pagination.total > 0 && (
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

export const DataTable = memo(DataTableInner) as typeof DataTableInner;
