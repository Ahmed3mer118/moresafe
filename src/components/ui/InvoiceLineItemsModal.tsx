import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Invoice } from '../../types';
import { invoiceService } from '../../services';
import { Modal } from './Modal';
import { PageLoader } from './PageLoader';
import { formatMoney, projectName } from '../../utils/format';

export function InvoiceLineItemsModal({
  invoice,
  onClose,
}: {
  invoice: Invoice | null;
  onClose: () => void;
}) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const [detail, setDetail] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!invoice) {
      setDetail(null);
      return;
    }
    if (invoice.lineItems?.length) {
      setDetail(invoice);
      return;
    }
    setLoading(true);
    invoiceService
      .get(invoice._id)
      .then(setDetail)
      .catch(() => setDetail(invoice))
      .finally(() => setLoading(false));
  }, [invoice]);

  const lineItems = detail?.lineItems ?? [];

  return (
    <Modal
      open={!!invoice}
      onClose={onClose}
      title={detail ? `${t('pa.lineItems')} — ${detail.referenceNumber}` : t('pa.lineItems')}
      subtitle={detail ? projectName(detail.project, lang) : undefined}
      width="lg"
    >
      {loading ? (
        <PageLoader compact />
      ) : !detail ? (
        <p className="text-muted text-sm text-center py-8">{t('common.noData')}</p>
      ) : (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-4 text-sm px-1">
            <div>
              <span className="text-muted font-bold">{t('common.amount')}: </span>
              <span className="font-extrabold text-emerald-700">{formatMoney(detail.total, lang)}</span>
            </div>
            {detail.category && (
              <div>
                <span className="text-muted font-bold">{t('pa.category')}: </span>
                <span>{detail.category}</span>
              </div>
            )}
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
      )}
    </Modal>
  );
}
