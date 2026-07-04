import { exportToCsv } from './exportCsv';
import type { Column } from '../components/ui/DataTable';

export type ExportCol<T> = { header: string; value: (row: T) => string };

export function getExportColumns<T>(columns: Column<T>[]): ExportCol<T>[] {
  return columns
    .filter(
      (c) =>
        c.exportable !== false &&
        c.key !== 'act' &&
        c.key !== 'sel' &&
        c.exportValue,
    )
    .map((c) => ({
      header: c.exportHeader ?? (typeof c.header === 'string' ? c.header : c.key),
      value: (row: T) => c.exportValue!(row),
    }));
}

export function exportTableToCsv<T>(
  filename: string,
  columns: Column<T>[],
  data: T[],
): boolean {
  const exportCols = getExportColumns(columns);
  if (!exportCols.length || !data.length) return false;
  const headers = exportCols.map((c) => c.header);
  const rows = data.map((row) => exportCols.map((c) => c.value(row)));
  exportToCsv(filename, headers, rows);
  return true;
}

function escapeHtml(value: unknown) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export async function exportTablePdf<T>({
  title,
  filename,
  columns,
  rows,
  lang = 'ar',
  rowLabel,
  extraHtml = '',
}: {
  title: string;
  filename: string;
  columns: ExportCol<T>[];
  rows: T[];
  lang?: string;
  rowLabel?: string;
  extraHtml?: string;
}) {
  const dir = lang === 'ar' ? 'rtl' : 'ltr';
  const dateLocale = lang === 'ar' ? 'ar-SA' : 'en-SA';
  const generatedAt = new Date().toLocaleString(dateLocale);
  const countLabel = rowLabel ?? (lang === 'ar' ? 'سجل' : 'rows');

  const tableHead = columns.map((c) => `<th>${escapeHtml(c.header)}</th>`).join('');
  const tableBody = rows
    .map((row) => {
      const cells = columns.map((c) => `<td>${escapeHtml(c.value(row))}</td>`).join('');
      return `<tr>${cells}</tr>`;
    })
    .join('');

  const html = `<!DOCTYPE html>
<html lang="${lang}" dir="${dir}">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)}</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: Segoe UI, Tahoma, Arial, sans-serif; margin: 24px; color: #1e293b; }
    h1 { font-size: 20px; margin: 0 0 6px; color: #0f2440; }
    .sub { color: #64748b; font-size: 12px; margin-bottom: 18px; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 28px; }
    th, td { border: 1px solid #dde4ee; padding: 8px 10px; text-align: ${dir === 'rtl' ? 'right' : 'left'}; }
    th { background: #eef2f7; font-weight: 700; color: #475569; }
    tr:nth-child(even) td { background: #fafbfd; }
    .extra { margin-top: 8px; }
    .extra section { page-break-inside: avoid; margin: 24px 0 32px; padding-top: 12px; border-top: 2px solid #e2e8f0; }
    .extra h3 { margin: 0 0 4px; font-size: 14px; color: #0f2440; }
    .extra .meta { margin: 0 0 12px; font-size: 11px; color: #64748b; }
    .extra .images { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 12px; }
    .extra img { width: 100%; max-height: 320px; object-fit: contain; border: 1px solid #e2e8f0; border-radius: 8px; background: #fff; }
    .extra .pdf-note { font-size: 12px; color: #64748b; padding: 8px; border: 1px dashed #cbd5e1; border-radius: 8px; }
    @media print { body { margin: 12mm; } }
  </style>
</head>
<body>
  <h1>${escapeHtml(title)}</h1>
  <p class="sub">${escapeHtml(generatedAt)} · ${escapeHtml(filename)} · ${rows.length} ${escapeHtml(countLabel)}</p>
  <table>
    <thead><tr>${tableHead}</tr></thead>
    <tbody>${tableBody || `<tr><td colspan="${columns.length}">${lang === 'ar' ? 'لا بيانات' : 'No data'}</td></tr>`}</tbody>
  </table>
  ${extraHtml ? `<div class="extra">${extraHtml}</div>` : ''}
</body>
</html>`;

  await openPrintDocument(html);
}

function openPrintDocument(html: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const iframe = document.createElement('iframe');
    iframe.setAttribute(
      'style',
      'position:fixed;top:0;left:0;width:0;height:0;border:0;visibility:hidden',
    );
    document.body.appendChild(iframe);

    let done = false;
    const finish = (err?: Error) => {
      if (done) return;
      done = true;
      setTimeout(() => {
        if (iframe.parentNode) document.body.removeChild(iframe);
      }, 3000);
      if (err) reject(err);
      else resolve();
    };

    const printFrame = () => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        finish();
      } catch (err) {
        finish(err instanceof Error ? err : new Error('Export failed'));
      }
    };

    iframe.onload = () => setTimeout(printFrame, 200);
    iframe.onerror = () => finish(new Error('Export failed'));

    iframe.srcdoc = html;

    setTimeout(() => {
      if (!done) printFrame();
    }, 1200);
  });
}
