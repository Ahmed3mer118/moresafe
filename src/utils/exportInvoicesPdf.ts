import type { Invoice } from '../types';
import { assetUrl, formatMoney, projectName, statusLabel } from './format';
import { exportTablePdf, getExportColumns, type ExportCol } from './exportTable';
import type { Column } from '../components/ui/DataTable';

async function imageToDataUrl(url: string): Promise<string | null> {
  if (url.startsWith('data:')) return url;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    if (!blob.type.startsWith('image/')) return null;
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

async function buildInvoiceImageSections(
  rows: Invoice[],
  lang: string,
  t: (key: string, opts?: { defaultValue?: string }) => string,
): Promise<string> {
  const sections: string[] = [];

  for (const inv of rows) {
    const images = inv.attachments?.length
      ? inv.attachments.filter((a) => !a.mimeType?.includes('pdf'))
      : inv.attachmentUrl
        ? [{ url: inv.attachmentUrl, filename: inv.referenceNumber, mimeType: 'image/jpeg' }]
        : [];

    if (!images.length) continue;

    const blocks: string[] = [];
    for (const img of images) {
      const dataUrl = await imageToDataUrl(assetUrl(img.url));
      if (dataUrl) {
        blocks.push(`<img src="${dataUrl}" alt="${escapeHtml(img.filename || inv.referenceNumber)}" />`);
      }
    }

    if (blocks.length) {
      sections.push(`
        <section>
          <h3>${escapeHtml(inv.referenceNumber)} — ${escapeHtml(projectName(inv.project, lang))}</h3>
          <p class="meta">${escapeHtml(inv.supplier || '—')} · ${escapeHtml(formatMoney(inv.total, lang))} · ${escapeHtml(statusLabel(inv.status, t))}</p>
          <div class="images">${blocks.join('')}</div>
        </section>
      `);
    }
  }

  return sections.join('');
}

export async function exportInvoicesPdf<T extends Invoice>({
  title,
  filename,
  columns,
  rows,
  lang,
  t,
}: {
  title: string;
  filename: string;
  columns: ExportCol<T>[];
  rows: T[];
  lang: string;
  t: (key: string, opts?: { defaultValue?: string }) => string;
}) {
  const extraHtml = await buildInvoiceImageSections(rows, lang, t);
  await exportTablePdf({
    title,
    filename,
    columns,
    rows,
    lang,
    rowLabel: lang === 'ar' ? 'فاتورة' : 'invoices',
    extraHtml,
  });
}

/** Build export columns from DataTable columns + optional invoice image PDF */
export async function exportInvoicesFromTable({
  title,
  filename,
  columns,
  rows,
  lang,
  t,
}: {
  title: string;
  filename: string;
  columns: Column<Invoice>[];
  rows: Invoice[];
  lang: string;
  t: (key: string, opts?: { defaultValue?: string }) => string;
}) {
  const exportCols = getExportColumns(columns);
  await exportInvoicesPdf({ title, filename, columns: exportCols, rows, lang, t });
}
