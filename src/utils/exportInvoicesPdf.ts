import type { Invoice } from '../types';
import { apiClient } from '../core/ApiClient';
import { assetUrl, formatMoney, projectName, statusLabel } from './format';
import { exportTablePdf, getExportColumns, type ExportCol } from './exportTable';
import type { Column } from '../components/ui/DataTable';

function escapeHtml(value: unknown) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Prefer same-origin /api path (Vite proxy) so fetch avoids cross-origin issues in dev */
function imageFetchUrl(relativePath: string): string {
  if (!relativePath) return '';
  if (relativePath.startsWith('data:') || relativePath.startsWith('blob:') || relativePath.startsWith('http')) {
    return relativePath;
  }
  if (relativePath.startsWith('/api/')) return relativePath;
  const path = relativePath.startsWith('/') ? relativePath : `/${relativePath}`;
  return path;
}

function isImageBlob(blob: Blob, url: string) {
  if (blob.type.startsWith('image/')) return true;
  if (blob.type && blob.type !== 'application/octet-stream') return false;
  return /\.(jpe?g|png|gif|webp|bmp)$/i.test(url);
}

async function imageToDataUrl(url: string): Promise<string | null> {
  if (!url) return null;
  if (url.startsWith('data:')) return url;
  try {
    const token = apiClient.getToken() || localStorage.getItem('token');
    const headers: Record<string, string> = {};
    if (token) headers.Authorization = `Bearer ${token}`;

    const res = await fetch(url, { headers, credentials: 'include' });
    if (!res.ok) return null;
    const blob = await res.blob();
    if (!isImageBlob(blob, url)) return null;
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

function resolveInvoiceProjectName(
  inv: Invoice,
  lang: string,
  fallbackProject?: { name: string; nameEn?: string } | string | null,
) {
  if (inv.project && typeof inv.project === 'object' && 'name' in inv.project) {
    return projectName(inv.project, lang);
  }
  return projectName(fallbackProject, lang);
}

async function buildInvoiceImageSections(
  rows: Invoice[],
  lang: string,
  t: (key: string, opts?: { defaultValue?: string }) => string,
  fallbackProject?: { name: string; nameEn?: string } | string | null,
): Promise<string> {
  const sections: string[] = [];

  for (const inv of rows) {
    const attachments = inv.attachments?.length
      ? inv.attachments
      : inv.attachmentUrl
        ? [{ url: inv.attachmentUrl, filename: inv.referenceNumber, mimeType: 'image/jpeg' }]
        : [];

    if (!attachments.length) continue;

    const blocks: string[] = [];
    for (const att of attachments) {
      if (att.mimeType?.includes('pdf')) {
        blocks.push(`<p class="pdf-note">📄 ${escapeHtml(att.filename || inv.referenceNumber)} (PDF)</p>`);
        continue;
      }
      const fetchUrl = imageFetchUrl(att.url);
      const dataUrl = await imageToDataUrl(fetchUrl);
      const alt = escapeHtml(att.filename || inv.referenceNumber);
      if (dataUrl) {
        blocks.push(`<img src="${dataUrl}" alt="${alt}" />`);
      } else {
        const directUrl = escapeHtml(assetUrl(att.url));
        blocks.push(
          `<img src="${directUrl}" alt="${alt}" onerror="this.replaceWith(Object.assign(document.createElement('p'),{className:'pdf-note',textContent:'🖼 ${alt} — ${lang === 'ar' ? 'تعذّر تحميل الصورة' : 'Image unavailable'}'}))" />`,
        );
      }
    }

    if (blocks.length) {
      sections.push(`
        <section>
          <h3>${escapeHtml(inv.referenceNumber)} — ${escapeHtml(resolveInvoiceProjectName(inv, lang, fallbackProject))}</h3>
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
  project,
}: {
  title: string;
  filename: string;
  columns: ExportCol<T>[];
  rows: T[];
  lang: string;
  t: (key: string, opts?: { defaultValue?: string }) => string;
  project?: { name: string; nameEn?: string } | string | null;
}) {
  if (!columns.length) {
    throw new Error('No export columns');
  }
  const extraHtml = await buildInvoiceImageSections(rows, lang, t, project);
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

/** Build export columns from DataTable columns + invoice images in PDF */
export async function exportInvoicesFromTable({
  title,
  filename,
  columns,
  rows,
  lang,
  t,
  project,
}: {
  title: string;
  filename: string;
  columns: Column<Invoice>[];
  rows: Invoice[];
  lang: string;
  t: (key: string, opts?: { defaultValue?: string }) => string;
  project?: { name: string; nameEn?: string } | string | null;
}) {
  const exportCols = getExportColumns(columns);
  if (!exportCols.length) {
    throw new Error('No export columns');
  }
  await exportInvoicesPdf({ title, filename, columns: exportCols, rows, lang, t, project });
}
