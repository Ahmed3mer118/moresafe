import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { DataTable } from '../../components/ui/DataTable';
import { StatusChip, Chip } from '../../components/ui/Chip';
import { Notice } from '../../components/ui/Notice';
import { PageLoader } from '../../components/ui/PageLoader';
import { InvoiceDetailModal } from '../../components/ui/InvoiceDetailModal';
import { InvoiceUploadModal } from '../../components/invoices/InvoiceUploadModal';
import { useUi } from '../../context/UiContext';
import { custodyService } from '../../services';
import type { Custody, CustodyTransaction, Invoice } from '../../types';
import { formatMoney, projectName, statusLabel, formatDate, userName, entityId } from '../../utils/format';
import { custodyTotals, canUploadToCustody, canSubmitCustodyInvoices, isInvoiceSubmittedForApproval } from '../../utils/custodyHelpers';
import { showToast } from '../../utils/toast';

const PM_BASE = '/dashboard/project-manager';

function ColoredAmount({
  value,
  lang,
  negative,
}: {
  value: number;
  lang: string;
  negative?: boolean;
}) {
  const cls = negative || value < 0 ? 'text-red-600 font-extrabold tabular-nums' : 'text-emerald-700 font-extrabold tabular-nums';
  return <span className={cls}>{formatMoney(value, lang)}</span>;
}

function BalanceBadge({ custody, lang, t }: { custody: Custody; lang: string; t: (k: string, o?: object) => string }) {
  const { remaining, over } = custodyTotals(custody);
  if (over) {
    return <Chip variant="red">{t('admin.overBy', { amount: formatMoney(Math.abs(remaining), lang) })}</Chip>;
  }
  return <Chip variant="green">{t('pa.withinBudget', { remaining: formatMoney(remaining, lang) })}</Chip>;
}

export function PACustodyListPage() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const navigate = useNavigate();
  const [custodies, setCustodies] = useState<Custody[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'active' | 'all'>('active');

  const load = async () => {
    setLoading(true);
    try {
      setCustodies(await custodyService.list());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const rows = useMemo(() => {
    if (filter === 'active') {
      return custodies.filter((c) => c.status === 'open' || c.status === 'closed' || c.status === 'pm_approved' || c.status === 'finance_pending');
    }
    return custodies;
  }, [custodies, filter]);

  const columns = useMemo(
    () => [
      {
        key: 'num',
        header: '#',
        render: (c: Custody) => <span className="font-bold text-brand-600">{c.custodyNumber}</span>,
        exportValue: (c: Custody) => c.custodyNumber,
      },
      {
        key: 'proj',
        header: t('common.project'),
        render: (c: Custody) => projectName(c.project, lang),
        exportValue: (c: Custody) => projectName(c.project, lang),
      },
      {
        key: 'mgr',
        header: t('pm.projectManager'),
        render: (c: Custody) => userName(c.holder, lang),
        exportValue: (c: Custody) => userName(c.holder, lang),
      },
      {
        key: 'amt',
        header: t('pa.custodyAmount'),
        render: (c: Custody) => formatMoney(c.amount, lang),
        exportValue: (c: Custody) => String(c.amount),
      },
      {
        key: 'spent',
        header: t('admin.invoicesTotal'),
        render: (c: Custody) => <ColoredAmount value={c.spent} lang={lang} />,
        exportValue: (c: Custody) => String(c.spent),
      },
      {
        key: 'bal',
        header: t('admin.balanceCheck'),
        exportable: false,
        render: (c: Custody) => <BalanceBadge custody={c} lang={lang} t={t} />,
      },
      {
        key: 'inv',
        header: t('pa.invoicesCount'),
        render: (c: Custody) => c.invoices?.length ?? 0,
        exportValue: (c: Custody) => String(c.invoices?.length ?? 0),
      },
      {
        key: 'st',
        header: t('common.status'),
        render: (c: Custody) => <StatusChip status={c.status} label={statusLabel(c.status, t)} />,
        exportValue: (c: Custody) => statusLabel(c.status, t),
      },
      {
        key: 'act',
        header: '',
        exportable: false,
        render: (c: Custody) => (
          <Button size="sm" variant="ghost" onClick={() => navigate(`${PM_BASE}/custody/${c._id}`)}>
            {t('common.view')}
          </Button>
        ),
      },
    ],
    [t, lang, navigate],
  );

  return (
    <div className="space-y-4">
      <Card title={`💼 ${t('pa.myCustodies')}`} noPadding>
        <div className="px-4 py-3 border-b border-[#eef1f6] flex flex-wrap gap-2">
          {(['active', 'all'] as const).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                filter === key ? 'bg-brand-500 text-white' : 'bg-[#f7f9fc] text-muted hover:bg-brand-50'
              }`}
            >
              {t(`pa.custodyFilter.${key}`)}
            </button>
          ))}
        </div>
        <DataTable
          columns={columns}
          data={rows}
          loading={loading}
          onRefresh={load}
          emptyText={t('common.noData')}
          exportFilename="my-custodies"
          exportTitle={t('pa.myCustodies')}
        />
      </Card>
    </div>
  );
}

export function PACustodyDetailPage() {
  const { custodyId } = useParams<{ custodyId: string }>();
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const dateLocale = lang === 'ar' ? 'ar-SA' : 'en-SA';
  const navigate = useNavigate();
  const { runAction } = useUi();
  const [custody, setCustody] = useState<Custody | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [detailId, setDetailId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);

  const load = async () => {
    if (!custodyId) return;
    setLoading(true);
    try {
      const c = await custodyService.get(custodyId);
      setCustody(c);
      const accumulated = (c.invoices ?? []).filter((i) => i.status === 'accumulated').map((i) => i._id);
      setSelected(new Set(accumulated));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [custodyId]);

  const allInvoices = custody?.invoices ?? [];
  const accumulatedInvoices = useMemo(
    () => allInvoices.filter((i) => i.status === 'accumulated'),
    [allInvoices],
  );
  const selectedTotal = useMemo(
    () => allInvoices.filter((i) => selected.has(i._id)).reduce((s, i) => s + (i.total || 0), 0),
    [allInvoices, selected],
  );
  const { amount, remaining, over } = custody ? custodyTotals(custody) : { amount: 0, remaining: 0, over: false };
  const selectedRemaining = amount - selectedTotal;

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = (ids: string[], checked: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => (checked ? next.add(id) : next.delete(id)));
      return next;
    });
  };

  const submitForApproval = () => {
    if (!custody || !selected.size) {
      showToast(t('pa.selectInvoicesFirst'), 'error');
      return;
    }
    runAction(async () => {
      setSubmitting(true);
      try {
        await custodyService.close(custody._id, [...selected]);
        await load();
      } finally {
        setSubmitting(false);
      }
    }, { success: t('pa.custodySubmitted') });
  };

  if (loading && !uploadOpen) {
    return <Card><PageLoader compact /></Card>;
  }

  if (!custody) {
    return <Card><p className="text-center text-muted py-8">{t('common.noData')}</p></Card>;
  }

  const selectableIds = accumulatedInvoices.map((i) => i._id);
  const canUpload = canUploadToCustody(custody.status);
  const canSubmit = canSubmitCustodyInvoices(custody.status) && selectableIds.length > 0;

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" onClick={() => navigate(`${PM_BASE}/custody`)}>
        ← {t('pa.backToCustodies')}
      </Button>

      <Card className="!p-0 overflow-hidden">
        <div className="px-4 py-4 border-b border-[#e8edf4] bg-gradient-to-r from-brand-50/50 to-white">
          <h2 className="text-lg font-extrabold text-navy">{custody.custodyNumber}</h2>
          <p className="text-sm text-muted mt-1">{projectName(custody.project, lang)}</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4 text-sm">
            <div>
              <div className="text-[11px] text-muted font-bold">{t('pm.projectManager')}</div>
              {/* <div className="font-bold">{userName(custody.holder, lang)}</div> */}
            </div>
            <div>
              <div className="text-[11px] text-muted font-bold">{t('pa.custodyAmount')}</div>
              <div className="font-bold">{formatMoney(amount, lang)}</div>
            </div>
            <div>
              <div className="text-[11px] text-muted font-bold">{t('admin.invoicesTotal')}</div>
              <div className="font-bold text-emerald-700">{formatMoney(custody.spent, lang)}</div>
            </div>
            {/* <div>
              <div className="text-[11px] text-muted font-bold">{t('admin.balanceCheck')}</div>
              <BalanceBadge custody={custody} lang={lang} t={t} />
            </div> */}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <StatusChip status={custody.status} label={statusLabel(custody.status, t)} />
            {custody.pmApprovedBy && (
              <span className="text-xs font-bold text-brand-700">
                {t('admin.approvedByPa', { name: userName(custody.pmApprovedBy, lang) })}
              </span>
            )}
          </div>
        </div>

        {over && (
          <div className="px-4 py-3 bg-red-50 border-b border-red-100">
            <Notice icon="⚠️">{t('pa.overBudgetNotice', { amount: formatMoney(Math.abs(remaining), lang) })}</Notice>
          </div>
        )}

        {canUpload && (
          <div className="px-4 py-3 flex flex-wrap gap-2 border-b border-[#eef1f6]">
            <Button size="sm" onClick={() => setUploadOpen(true)}>
              ⊕ {t('pa.uploadNew')}
            </Button>
          </div>
        )}

        <DataTable
          columns={[
            ...(canSubmit
              ? [{
                  key: 'sel',
                  header: (
                    <input
                      type="checkbox"
                      className="w-4 h-4 accent-brand-600"
                      checked={selectableIds.length > 0 && selectableIds.every((id) => selected.has(id))}
                      onChange={(e) => toggleAll(selectableIds, e.target.checked)}
                    />
                  ),
                  exportable: false,
                  className: 'w-10',
                  render: (inv: Invoice) =>
                    inv.status === 'accumulated' ? (
                      <input
                        type="checkbox"
                        className="w-4 h-4 accent-brand-600"
                        checked={selected.has(inv._id)}
                        onChange={() => toggle(inv._id)}
                      />
                    ) : null,
                }]
              : []),
            {
              key: 'n',
              header: t('pa.rowNumber'),
              render: (inv) => (
                <span className="inline-flex items-center gap-1.5">
                  {isInvoiceSubmittedForApproval(inv.status) && (
                    <span
                      className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 text-xs font-black shrink-0"
                      title={t('pa.invoiceSubmitted')}
                    >
                      ✓
                    </span>
                  )}
                  <span className="font-bold text-brand-600">{inv.referenceNumber}</span>
                </span>
              ),
              exportValue: (inv) => inv.referenceNumber,
            },
            {
              key: 'sup',
              header: t('pa.supplier'),
              render: (i) => i.supplier || '—',
              exportValue: (i) => i.supplier || '',
            },
            {
              key: 'amt',
              header: t('pa.invoiceTotal'),
              render: (i) => <ColoredAmount value={i.total} lang={lang} />,
              exportValue: (i) => String(i.total),
            },
            {
              key: 'date',
              header: t('common.date'),
              render: (i) => (i.invoiceDate ? new Date(i.invoiceDate).toLocaleDateString(dateLocale) : '—'),
              exportValue: (i) => formatDate(i.invoiceDate, lang),
            },
            {
              key: 'st',
              header: t('common.status'),
              render: (i) => <StatusChip status={i.status} label={statusLabel(i.status, t)} />,
              exportValue: (i) => statusLabel(i.status, t),
            },
            {
              key: 'act',
              header: '',
              exportable: false,
              render: (i) => (
                <Button size="sm" variant="ghost" onClick={() => setDetailId(i._id)}>
                  {t('common.view')}
                </Button>
              ),
            },
          ]}
          data={allInvoices}
          loading={false}
          onRefresh={load}
          emptyText={t('pa.noInvoicesInCustody')}
        />

        {canSubmit && (
          <div className="px-4 py-4 border-t border-[#e8edf4] bg-[#f8fafc] flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap gap-6 text-sm">
              <div>
                <div className="text-[11px] text-muted font-bold">{t('pa.selectedTotal')}</div>
                <ColoredAmount value={selectedTotal} lang={lang} />
              </div>
              <div>
                <div className="text-[11px] text-muted font-bold">{t('pa.remaining')}</div>
                <ColoredAmount value={selectedRemaining} lang={lang} negative={selectedRemaining < 0} />
              </div>
            </div>
            <Button onClick={submitForApproval} loading={submitting} disabled={!selected.size}>
              {t('pa.sendForApproval')}
            </Button>
          </div>
        )}
      </Card>

      <InvoiceDetailModal invoiceId={detailId} onClose={() => setDetailId(null)} />
      <InvoiceUploadModal
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        custodyId={custody._id}
        defaultProjectId={entityId(custody.project)}
        onSaved={load}
      />
    </div>
  );
}

export function PATransactionsPage() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const [rows, setRows] = useState<(CustodyTransaction & { custodyNumber?: string })[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      setRows(await custodyService.myTransactions());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  return (
    <Card title={`📒 ${t('pa.transactions')}`} noPadding>
      <DataTable
        columns={[
          {
            key: 'custody',
            header: t('nav.myCustody'),
            render: (tx) => <span className="font-bold text-brand-600">{tx.custodyNumber || '—'}</span>,
            exportValue: (tx) => tx.custodyNumber || '',
          },
          {
            key: 'type',
            header: t('pa.transactionType'),
            render: (tx) => t(`pa.tx.${tx.type}`, { defaultValue: tx.type }),
            exportValue: (tx) => tx.type,
          },
          {
            key: 'amt',
            header: t('common.amount'),
            render: (tx) => <ColoredAmount value={tx.amount} lang={lang} />,
            exportValue: (tx) => String(tx.amount),
          },
          {
            key: 'bal',
            header: t('pa.balanceAfter'),
            render: (tx) => (tx.balanceAfter != null ? formatMoney(tx.balanceAfter, lang) : '—'),
            exportValue: (tx) => String(tx.balanceAfter ?? ''),
          },
          {
            key: 'desc',
            header: t('pa.description'),
            render: (tx) => (lang === 'en' && tx.descriptionEn ? tx.descriptionEn : tx.description) || '—',
            exportValue: (tx) => tx.description || '',
          },
          {
            key: 'date',
            header: t('common.date'),
            render: (tx) => formatDate(tx.createdAt, lang),
            exportValue: (tx) => formatDate(tx.createdAt, lang),
          },
        ]}
        data={rows}
        loading={loading}
        onRefresh={load}
        exportFilename="my-transactions"
        exportTitle={t('pa.transactions')}
        emptyText={t('common.noData')}
      />
    </Card>
  );
}
