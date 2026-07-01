import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Invoice } from '../../types';
import { invoiceService } from '../../services';
import { Modal } from './Modal';
import { StatusChip } from './Chip';
import { PageLoader } from './PageLoader';
import { formatMoney, projectName, statusLabel, assetUrl, invoiceManagerName } from '../../utils/format';

export function InvoiceDetailModal({
  invoiceId,
  onClose,
}: {
  invoiceId: string | null;
  onClose: () => void;
}) {
  const { t, i18n } = useTranslation();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(false);
  const lang = i18n.language;
  const dateLocale = lang === 'ar' ? 'ar-SA' : 'en-SA';

  useEffect(() => {
    if (!invoiceId) {
      setInvoice(null);
      return;
    }
    setLoading(true);
    invoiceService
      .get(invoiceId)
      .then(setInvoice)
      .catch(() => setInvoice(null))
      .finally(() => setLoading(false));
  }, [invoiceId]);

  const images = invoice?.attachments?.length
    ? invoice.attachments
    : invoice?.attachmentUrl
      ? [{ url: invoice.attachmentUrl, filename: t('pa.invoiceDetail'), mimeType: 'image/jpeg' }]
      : [];

  const lineItems = invoice?.lineItems ?? [];

  return (
    <Modal
      open={!!invoiceId}
      onClose={onClose}
      title={invoice ? `${t('pa.invoiceDetail')} ${invoice.referenceNumber}` : t('pa.invoiceDetail')}
      subtitle={invoice?.invoiceNumber ? t('pa.vendorNumber', { number: invoice.invoiceNumber }) : undefined}
      width="xl"
    >
      {loading ? (
        <PageLoader compact />
      ) : !invoice ? (
        <p className="text-muted text-sm text-center py-8">{t('common.noData')}</p>
      ) : (
        <div className="space-y-5">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
            <div className="p-3 rounded-xl bg-[#f7f9fc] border border-[#e3e9f2]">
              <div className="text-[11px] text-muted font-bold mb-1">{t('common.project')}</div>
              <div className="font-bold text-navy">{projectName(invoice.project, lang)}</div>
            </div>
            <div className="p-3 rounded-xl bg-[#f7f9fc] border border-[#e3e9f2]">
              <div className="text-[11px] text-muted font-bold mb-1">{t('pm.projectManager')}</div>
              <div className="font-bold text-navy">{invoiceManagerName(invoice, lang)}</div>
            </div>
            <div className="p-3 rounded-xl bg-[#f7f9fc] border border-[#e3e9f2]">
              <div className="text-[11px] text-muted font-bold mb-1">{t('pa.supplier')}</div>
              <div className="font-bold text-navy">{invoice.supplier || '—'}</div>
            </div>
            <div className="p-3 rounded-xl bg-[#f7f9fc] border border-[#e3e9f2]">
              <div className="text-[11px] text-muted font-bold mb-1">{t('common.date')}</div>
              <div>{invoice.invoiceDate ? new Date(invoice.invoiceDate).toLocaleDateString(dateLocale) : '—'}</div>
            </div>
            <div className="p-3 rounded-xl bg-[#f7f9fc] border border-[#e3e9f2]">
              <div className="text-[11px] text-muted font-bold mb-1">{t('common.status')}</div>
              <StatusChip status={invoice.status} label={statusLabel(invoice.status, t)} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 text-sm">
            <div className="p-3 rounded-xl border border-[#e3e9f2]">
              <div className="text-[11px] text-muted font-bold">{t('pa.beforeTax')}</div>
              <span className="text-slate-600 font-bold">{formatMoney(invoice.subtotal ?? 0, lang)}</span>
            </div>
            <div className="p-3 rounded-xl border border-[#e3e9f2]">
              <div className="text-[11px] text-muted font-bold">{t('pa.tax')}</div>
              <span className="text-amber-600 font-bold">{formatMoney(invoice.vatAmount ?? 0, lang)}</span>
            </div>
            <div className="p-3 rounded-xl border border-brand-200 bg-brand-50/50">
              <div className="text-[11px] text-muted font-bold">{t('pa.total')}</div>
              <span className="text-emerald-700 font-extrabold">{formatMoney(invoice.total, lang)}</span>
            </div>
          </div>

          {invoice.taxNumber && (
            <div className="text-sm">
              <span className="text-muted font-bold">{t('pa.taxNumber')}: </span>
              <span className="font-mono">{invoice.taxNumber}</span>
            </div>
          )}

          {invoice.rejectionReason && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs">
              {t('pa.rejectReason')}: {invoice.rejectionReason}
            </div>
          )}

          <div>
            <div className="text-xs font-bold text-muted mb-2">{t('pa.invoiceAndItems')}</div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div>
                {images.length > 0 ? (
                  <>
                    <div className="text-[11px] text-muted font-bold mb-2">
                      {t('pa.invoiceImages', { count: images.length })}
                    </div>
                    <div className="grid grid-cols-1 gap-3">
                      {images.map((img, i) => (
                        <a
                          key={i}
                          href={assetUrl(img.url)}
                          target="_blank"
                          rel="noreferrer"
                          className="block rounded-xl border border-[#e3e9f2] overflow-hidden bg-[#f7f9fc] hover:border-brand-300 transition-colors"
                        >
                          {img.mimeType?.includes('pdf') ? (
                            <div className="p-8 text-center text-sm text-muted">📄 {img.filename || 'PDF'}</div>
                          ) : (
                            <img
                              src={assetUrl(img.url)}
                              alt={img.filename || `${t('pa.invoiceDetail')} ${i + 1}`}
                              className="w-full max-h-80 object-contain bg-white"
                            />
                          )}
                        </a>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="rounded-xl border border-dashed border-[#e3e9f2] p-8 text-center text-sm text-muted">
                    {t('pa.noInvoiceImages')}
                  </div>
                )}
              </div>

              <div>
                <div className="text-[11px] text-muted font-bold mb-2">
                  {t('pa.lineItems')} ({lineItems.length})
                </div>
                <div className="overflow-x-auto rounded-xl border border-[#e3e9f2]">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-[#f7f9fc]">
                        <th className="p-2.5 text-start font-bold text-muted">#</th>
                        <th className="p-2.5 text-start font-bold text-muted">{t('pa.description')}</th>
                        <th className="p-2.5 font-bold text-muted">{t('pa.quantity')}</th>
                        <th className="p-2.5 font-bold text-muted">{t('pa.unitPrice')}</th>
                        <th className="p-2.5 font-bold text-muted">{t('pa.lineTotal')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lineItems.length > 0 ? (
                        lineItems.map((li, i) => (
                          <tr key={i} className="border-t border-[#eef1f6]">
                            <td className="p-2.5 text-brand-600 font-bold">{i + 1}</td>
                            <td className="p-2.5 font-semibold text-navy">{li.description || '—'}</td>
                            <td className="p-2.5 text-center">{li.quantity ?? 1}</td>
                            <td className="p-2.5 text-center text-slate-600">{formatMoney(li.unitPrice ?? 0, lang)}</td>
                            <td className="p-2.5 text-center font-bold text-emerald-700">{formatMoney(li.total ?? 0, lang)}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="p-4 text-center text-muted">{t('pa.linesEmpty')}</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
