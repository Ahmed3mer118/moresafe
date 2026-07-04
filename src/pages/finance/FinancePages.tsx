import { useEffect, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { StatCard, StatsGrid } from '../../components/ui/StatCard';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { DataTable } from '../../components/ui/DataTable';
import { Notice } from '../../components/ui/Notice';
import { StatusChip, Amount, Chip } from '../../components/ui/Chip';
import { FormField, inputClass, selectClass } from '../../components/ui/FormField';
import { CustodyArchiveCard, JournalTable } from '../../components/ui/JournalBlock';
import { InvoiceDetailModal } from '../../components/ui/InvoiceDetailModal';
import { RejectReasonModal } from '../../components/ui/RejectReasonModal';
import { InvoiceLineItemsModal } from '../../components/ui/InvoiceLineItemsModal';
import { useFormDraft } from '../../hooks/useFormDraft';
import { useTableFilter } from '../../hooks/useTableFilter';
import { useUi } from '../../context/UiContext';
import { dashboardService, custodyService, invoiceService, projectService, userService } from '../../services';
import type { Custody, Invoice, User, Voucher } from '../../types';
import { displayInvoicesTotal, financeEligibleInvoices } from '../../utils/custodyHelpers';
import { formatMoney, projectName, userName, statusLabel, formatDate, assetUrl } from '../../utils/format';
import { exportToCsv } from '../../utils/exportCsv';
import { showToast } from '../../utils/toast';
import { PageLoader } from '../../components/ui/PageLoader';
import { RefreshButton } from '../../components/ui/RefreshButton';
import { CustodyReviewCard } from '../../components/custody/CustodyReviewCard';
import { BudgetOverview } from '../../components/budget/BudgetOverview';
import { summarizeProjects } from '../../utils/budgetHelpers';

export function FinanceHomePage() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const [stats, setStats] = useState<Awaited<ReturnType<typeof dashboardService.finance>> | null>(null);
  const [budgetData, setBudgetData] = useState<Awaited<ReturnType<typeof projectService.budgets>> | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [s, b] = await Promise.all([
        dashboardService.finance(),
        projectService.budgets(),
      ]);
      setStats(s);
      setBudgetData(b);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const budgetTotals = budgetData?.totals ?? summarizeProjects(budgetData?.projects);

  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <RefreshButton onRefresh={load} loading={loading} />
      </div>
      <StatsGrid>
        <StatCard icon="💼" label={t('finance.stats.openCustodies')} value={stats?.openCustodies ?? 0} color="blue" trend={t('finance.stats.inProgress')} />
        <StatCard icon="📒" label={t('finance.stats.pendingSettlement')} value={stats?.pendingSettlement ?? 0} color="amber" trend={t('finance.stats.afterPmApproval')} trendUp={false} />
        <StatCard icon="🧾" label={t('finance.stats.pendingInvoices')} value={stats?.pendingInvoices ?? 0} color="amber" />
        <StatCard icon="💰" label={t('finance.stats.totalExpense')} value={formatMoney(stats?.totalExpense ?? 0, lang)} color="green" trend={t('common.sar')} trendUp />
      </StatsGrid>

      <Card title={`📊 ${t('budget.overviewTitle')}`}>
        <BudgetOverview
          projects={budgetData?.projects ?? []}
          totals={budgetTotals}
          loading={loading}
          compact
          showSummary={false}
        />
      </Card>
    </div>
  );
}

export function FinanceReviewPage() {
  const { t } = useTranslation();
  const { runAction } = useUi();
  const [custodies, setCustodies] = useState<Custody[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedInvoiceIds, setSelectedInvoiceIds] = useState<Set<string>>(new Set());
  const [detailId, setDetailId] = useState<string | null>(null);
  const [rejectOpen, setRejectOpen] = useState(false);

  const load = () => {
    setLoading(true);
    return custodyService.list().then((all) => {
      const list = all.filter((c) =>
        (c.invoices ?? []).some((i) => i.status === 'pending_finance'),
      );
      setCustodies(list);
      setSelectedInvoiceIds((prev) => {
        const valid = new Set<string>();
        list.forEach((c) =>
          (c.invoices ?? []).forEach((i) => {
            if (i.status === 'pending_finance' && prev.has(i._id)) valid.add(i._id);
          }),
        );
        return valid;
      });
    }).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const toggleCustody = (_custodyId: string, invoiceIds: string[], checked: boolean) => {
    setSelectedInvoiceIds((prev) => {
      const next = new Set(prev);
      invoiceIds.forEach((id) => (checked ? next.add(id) : next.delete(id)));
      return next;
    });
  };

  const toggleInvoice = (id: string) => {
    setSelectedInvoiceIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const batchReview = (approved: boolean) => {
    const ids = [...selectedInvoiceIds];
    if (!ids.length) return showToast(t('finance.selectInvoicesFirst'), 'error');
    if (!approved) {
      setRejectOpen(true);
      return;
    }
    runAction(async () => {
      await invoiceService.batchReview(ids, true);
      setSelectedInvoiceIds(new Set());
      await load();
    }, { success: t('finance.invoicesApproved', { count: ids.length }) });
  };

  const confirmReject = (reason: string) => {
    const ids = [...selectedInvoiceIds];
    runAction(async () => {
      await invoiceService.batchReview(ids, false, reason);
      setSelectedInvoiceIds(new Set());
      setRejectOpen(false);
      await load();
    }, { success: t('finance.invoicesRejected', { count: ids.length }) });
  };

  return (
    <div className="space-y-4">
      <Notice icon="🧾">{t('finance.reviewNotice')}</Notice>

      <Card className="!p-0 overflow-hidden">
        <div className="px-4 py-3 flex flex-wrap items-center justify-between gap-3 border-b border-[#eef1f6] bg-[#fafbfd]">
          <span className="text-[11px] text-muted font-bold">
            {t('finance.selectedCount', { count: selectedInvoiceIds.size })}
          </span>
          <div className="flex flex-wrap items-center gap-2">
            <RefreshButton onRefresh={load} loading={loading} />
            <Button size="sm" disabled={!selectedInvoiceIds.size} onClick={() => batchReview(true)}>
              {t('finance.approveSelected')}
            </Button>
            <Button size="sm" variant="red" disabled={!selectedInvoiceIds.size} onClick={() => batchReview(false)}>
              {t('finance.rejectSelected')}
            </Button>
          </div>
        </div>
      </Card>

      {loading ? (
        <Card><PageLoader compact /></Card>
      ) : custodies.length === 0 ? (
        <Card>
          <p className="text-center text-[#64748b] py-10 text-sm">{t('finance.noPendingInvoices')}</p>
        </Card>
      ) : (
        custodies.map((c) => (
          <CustodyReviewCard
            key={c._id}
            custody={c}
            onView={setDetailId}
            selectedInvoiceIds={selectedInvoiceIds}
            onToggleCustody={toggleCustody}
            onToggleInvoice={toggleInvoice}
            reviewStatus="pending_finance"
            invoiceFilter={(i) => i.status === 'pending_finance'}
          />
        ))
      )}

      <InvoiceDetailModal invoiceId={detailId} onClose={() => setDetailId(null)} />
      <RejectReasonModal open={rejectOpen} onClose={() => setRejectOpen(false)} onConfirm={confirmReject} />
    </div>
  );
}

export function FinanceEntriesPage() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const { runAction } = useUi();
  const [custodies, setCustodies] = useState<Custody[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [detailId, setDetailId] = useState<string | null>(null);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectCustodyId, setRejectCustodyId] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    return custodyService.list()
      .then((all) =>
        setCustodies(
          all.filter(
            (c) =>
              c.status === 'pm_approved'
              || (c.invoices ?? []).some(
                (i) => i.status === 'pending_finance' || i.status === 'pm_approved',
              ),
          ),
        ),
      )
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    if (!query.trim()) return custodies;
    const q = query.toLowerCase();
    return custodies.filter(
      (c) =>
        c.custodyNumber.toLowerCase().includes(q)
        || projectName(c.project, lang).toLowerCase().includes(q)
        || (c.invoices ?? []).some(
          (i) =>
            i.referenceNumber.toLowerCase().includes(q)
            || (i.invoiceNumber || '').toLowerCase().includes(q),
        ),
    );
  }, [custodies, query, lang]);

  const settle = (id: string, approved: boolean) => {
    if (!approved) {
      setRejectCustodyId(id);
      setRejectOpen(true);
      return;
    }
    runAction(async () => {
      await custodyService.settle(id, true);
      load();
    }, { success: t('finance.settledSuccess') });
  };

  const confirmReject = (reason: string) => {
    if (!rejectCustodyId) return;
    runAction(async () => {
      await custodyService.settle(rejectCustodyId, false, reason);
      setRejectOpen(false);
      setRejectCustodyId(null);
      load();
    }, { success: t('finance.settleRejected') });
  };

  return (
    <div className="space-y-4">
      <Notice icon="📒">{t('finance.entriesNotice')}</Notice>

      <Card className="!p-0 overflow-hidden">
        <div className="px-4 py-3.5 border-b border-[#e8edf4] bg-gradient-to-r from-[#f8fafc] to-white flex flex-wrap items-center justify-between gap-2">
          <span className="text-sm font-extrabold text-navy">{t('pm.filterCustody')}</span>
          <RefreshButton onRefresh={load} loading={loading} />
        </div>
        <div className="p-4">
          <FormField label={t('common.search')}>
            <input
              className={inputClass}
              placeholder={t('finance.searchCustodyInvoice')}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </FormField>
          <p className="text-xs text-muted mt-2">{t('finance.expandCustodyHint')}</p>
        </div>
      </Card>

      {loading ? (
        <Card><PageLoader compact /></Card>
      ) : filtered.length === 0 ? (
        <Card><p className="text-muted text-sm text-center py-6">{t('finance.noEntries')}</p></Card>
      ) : (
        filtered.map((c) => {
          const eligible = financeEligibleInvoices(c.invoices);
          const spent = displayInvoicesTotal(c);
          return (
            <details key={c._id} className="group rounded-2xl border border-[#e3e9f2] bg-white shadow-sm overflow-hidden">
              <summary className="px-4 py-4 cursor-pointer list-none hover:bg-[#fafbfd] [&::-webkit-details-marker]:hidden">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2 min-w-0">
                    <span className="inline-flex px-2.5 py-1 rounded-lg bg-brand-50 border border-brand-200 text-brand-700 text-xs font-bold">
                      {c.custodyNumber}
                    </span>
                    <span className="font-extrabold text-navy text-sm">{projectName(c.project, lang)}</span>
                    <StatusChip status={c.status} label={statusLabel(c.status, t)} />
                  </div>
                  <div className="flex flex-wrap items-center gap-4 text-sm">
                    <div className="text-center">
                      <div className="text-[10px] text-muted font-bold">{t('finance.custodyBudget')}</div>
                      <Amount>{formatMoney(c.amount ?? 0, lang)}</Amount>
                    </div>
                    <div className="text-center">
                      <div className="text-[10px] text-muted font-bold">{t('admin.invoicesTotal')}</div>
                      <Amount>{formatMoney(spent, lang)}</Amount>
                    </div>
                    <div className="text-center">
                      <div className="text-[10px] text-muted font-bold">{t('nav.invoices')}</div>
                      <span className="font-bold text-navy">{eligible.length}</span>
                    </div>
                    <span className="text-brand-600 text-xs font-bold">▼ {t('finance.invoiceDetails')}</span>
                  </div>
                </div>
              </summary>

              <div className="border-t border-[#eef1f6] bg-[#fcfdfe] px-4 py-4 space-y-3">
                {eligible.length === 0 ? (
                  <p className="text-center text-muted text-sm py-4">{t('common.noData')}</p>
                ) : (
                  eligible.map((inv) => {
                    const imgUrl = inv.attachments?.[0]?.url || inv.attachmentUrl;
                    const preview = imgUrl ? assetUrl(imgUrl) : null;
                    const isPdf = inv.attachments?.[0]?.mimeType?.includes('pdf');
                    return (
                      <div
                        key={inv._id}
                        className="flex flex-wrap items-center gap-3 p-3 rounded-xl border border-[#e8edf4] bg-white"
                      >
                        {preview && !isPdf ? (
                          <button
                            type="button"
                            className="shrink-0 w-14 h-14 rounded-lg overflow-hidden border border-[#dde4ee] hover:ring-2 hover:ring-brand-300"
                            onClick={() => setDetailId(inv._id)}
                          >
                            <img src={preview} alt="" className="w-full h-full object-cover" />
                          </button>
                        ) : (
                          <div className="w-14 h-14 rounded-lg bg-[#f1f5f9] grid place-items-center text-xl shrink-0">🧾</div>
                        )}
                        <div className="flex-1 min-w-[140px]">
                          <div className="font-bold text-navy">{inv.referenceNumber}</div>
                          <div className="text-xs text-muted">{inv.supplier || '—'} · {inv.category || '—'}</div>
                        </div>
                        <Amount>{formatMoney(inv.total, lang)}</Amount>
                        <StatusChip status={inv.status} label={statusLabel(inv.status, t)} />
                        <Button size="sm" variant="ghost" onClick={() => setDetailId(inv._id)}>
                          {t('finance.viewInvoiceImage')}
                        </Button>
                      </div>
                    );
                  })
                )}
                <div className="flex flex-wrap gap-2 pt-2 border-t border-[#eef1f6]">
                  <Button onClick={() => settle(c._id, true)} disabled={!eligible.length}>
                    {t('finance.postAccrual')}
                  </Button>
                  <Button variant="red" onClick={() => settle(c._id, false)} disabled={!eligible.length}>
                    {t('common.reject')}
                  </Button>
                </div>
              </div>
            </details>
          );
        })
      )}

      <InvoiceDetailModal invoiceId={detailId} onClose={() => setDetailId(null)} />
      <RejectReasonModal open={rejectOpen} onClose={() => { setRejectOpen(false); setRejectCustodyId(null); }} onConfirm={confirmReject} />
    </div>
  );
}

export function FinanceBudgetsPage() {
  const { t } = useTranslation();
  const [budgetData, setBudgetData] = useState<Awaited<ReturnType<typeof projectService.budgets>> | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      setBudgetData(await projectService.budgets());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  return (
    <Card title={`📊 ${t('nav.budgets')}`} action={<RefreshButton onRefresh={load} loading={loading} />}>
      <BudgetOverview
        projects={budgetData?.projects ?? []}
        totals={budgetData?.totals}
        loading={loading}
      />
    </Card>
  );
}

const EMPTY_VOUCHER_FORM = { beneficiaryId: '', amount: 0, method: 'bank_transfer', bankReference: '' };

export function FinanceVouchersPage() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const { runAction } = useUi();
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const { form, setForm, clearDraft } = useFormDraft('admin.vouchers', EMPTY_VOUCHER_FORM);

  const load = () => dashboardService.vouchers().then(setVouchers);
  useEffect(() => {
    load();
    userService.list({ role: 'project_accountant' }).then(setUsers);
  }, []);

  const submit = () => {
    if (!form.beneficiaryId || !form.amount) return showToast('اختر المستفيد والمبلغ', 'error');
    runAction(async () => {
      await dashboardService.createVoucher(form);
      clearDraft();
      load();
    }, { success: 'تم تسجيل سند الصرف' });
  };

  return (
    <div className="space-y-4">
      <Card title="تسجيل سند صرف">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <FormField label="المستفيد">
            <select className={selectClass} value={form.beneficiaryId} onChange={(e) => setForm({ ...form, beneficiaryId: e.target.value })}>
              <option value="">—</option>
              {users.map((u) => <option key={u.id || u._id} value={u.id || u._id}>{u.name}</option>)}
            </select>
          </FormField>
          <FormField label={t('common.amount')}><input className={inputClass} type="number" value={form.amount || ''} onChange={(e) => setForm({ ...form, amount: +e.target.value })} /></FormField>
          <FormField label="طريقة التحويل">
            <select className={selectClass} value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })}>
              <option value="bank_transfer">تحويل بنكي</option>
              <option value="check">شيك</option>
            </select>
          </FormField>
          <FormField label="رقم العملية"><input className={inputClass} value={form.bankReference} onChange={(e) => setForm({ ...form, bankReference: e.target.value })} /></FormField>
        </div>
        <Button className="mt-4" onClick={submit}>تسجيل السند</Button>
      </Card>
      <Card title={t('nav.vouchers')} noPadding>
        <DataTable
          columns={[
            { key: 'num', header: t('nav.vouchers'), exportHeader: t('nav.vouchers'), render: (v) => <b>{v.voucherNumber}</b>, exportValue: (v) => v.voucherNumber },
            { key: 'ben', header: t('roles.project_manager'), exportHeader: t('roles.project_manager'), render: (v) => v.beneficiary?.name, exportValue: (v) => v.beneficiary?.name || '' },
            { key: 'amt', header: t('common.amount'), exportHeader: t('common.amount'), render: (v) => <Amount>{formatMoney(v.amount, i18n.language)}</Amount>, exportValue: (v) => String(v.amount) },
            { key: 'meth', header: lang === 'ar' ? 'الطريقة' : 'Method', exportHeader: lang === 'ar' ? 'الطريقة' : 'Method', render: (v) => (v.method === 'bank_transfer' ? (lang === 'ar' ? 'تحويل بنكي' : 'Bank transfer') : (lang === 'ar' ? 'شيك' : 'Check')), exportValue: (v) => (v.method === 'bank_transfer' ? (lang === 'ar' ? 'تحويل بنكي' : 'Bank transfer') : (lang === 'ar' ? 'شيك' : 'Check')) },
            { key: 'dt', header: t('common.date'), exportHeader: t('common.date'), render: (v) => formatDate(v.voucherDate, i18n.language), exportValue: (v) => formatDate(v.voucherDate, i18n.language) },
          ]}
          data={vouchers}
          onRefresh={load}
          exportFilename="vouchers"
          exportTitle={t('nav.vouchers')}
          exportLang={i18n.language}
          exportRowLabel={i18n.language === 'ar' ? 'سند' : 'vouchers'}
        />
      </Card>
    </div>
  );
}

export function FinanceArchivePage() {
  const { i18n } = useTranslation();
  const [custodies, setCustodies] = useState<Custody[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      setCustodies(await dashboardService.settledArchive());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Notice icon="🗄️">عهد متسوية مؤرشفة — اضغط للمراجعة: قيد الاستحقاق، قيد الصرف، والفواتير.</Notice>
        <RefreshButton onRefresh={load} loading={loading} />
      </div>
      {custodies.map((c) => (
        <CustodyArchiveCard
          key={c._id}
          title={`عهدة: ${userName(c.holder, i18n.language)}`}
          subtitle={`${c.settlementNumber} · ${new Date(c.settledAt || '').toLocaleDateString('ar-SA')} · ${projectName(c.project, i18n.language)}`}
          total={`${formatMoney(c.spent)} ريال`}
          status={<StatusChip status="settled" label="تم الصرف والتعويض" />}
        >
          {c.accrualEntry && <JournalTable title="استحقاق مشتريات الموقع" tag="قيد استحقاق" lines={c.accrualEntry} />}
          {c.disbursementEntry && <JournalTable title="إعادة شحن العهدة بنكياً" tag="قيد الصرف" lines={c.disbursementEntry} />}
        </CustodyArchiveCard>
      ))}
    </div>
  );
}

export function FinanceTaxPage() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      setInvoices(await dashboardService.taxCompliance());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);
  const tf = useTableFilter(invoices, [(i) => i.referenceNumber, (i) => i.supplier || ''], (i) => (i.taxVerified ? 'ok' : 'missing'));

  return (
    <div>
      <Notice variant="warn" icon="%">يتحقق النظام من مطابقة الأرقام الضريبية قبل الاعتماد.</Notice>
      <Card noPadding>
        <DataTable
          columns={[
            { key: 'ref', header: t('finance.invoice'), exportHeader: t('finance.invoice'), render: (i) => i.referenceNumber, exportValue: (i) => i.referenceNumber },
            { key: 'sup', header: t('pa.supplier'), exportHeader: t('pa.supplier'), render: (i) => i.supplier || '—', exportValue: (i) => i.supplier || '' },
            { key: 'tax', header: t('pa.taxNumber'), exportHeader: t('pa.taxNumber'), render: (i) => i.taxNumber || '—', exportValue: (i) => i.taxNumber || '' },
            { key: 'vat', header: t('pa.tax'), exportHeader: t('pa.tax'), render: (i) => String(i.vatAmount ?? ''), exportValue: (i) => String(i.vatAmount ?? '') },
            { key: 'st', header: t('common.status'), exportHeader: t('common.status'), render: (i) => <StatusChip status={i.taxVerified ? 'active' : 'pm_rejected'} label={i.taxVerified ? (lang === 'ar' ? 'مطابق' : 'Verified') : (lang === 'ar' ? 'رقم ناقص' : 'Missing')} />, exportValue: (i) => (i.taxVerified ? (lang === 'ar' ? 'مطابق' : 'Verified') : (lang === 'ar' ? 'رقم ناقص' : 'Missing')) },
          ]}
          data={tf.filtered}
          loading={loading}
          query={tf.query}
          onQueryChange={tf.setQuery}
          onReset={tf.reset}
          onRefresh={load}
          shown={tf.shown}
          total={tf.total}
          exportFilename="tax-compliance"
          exportTitle={t('nav.tax')}
          exportLang={lang}
          exportRowLabel={lang === 'ar' ? 'فاتورة' : 'invoices'}
        />
      </Card>
    </div>
  );
}

export function FinanceReportsPage() {
  const [summary, setSummary] = useState<Awaited<ReturnType<typeof dashboardService.financeReports>> | null>(null);
  const [custodies, setCustodies] = useState<Custody[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [s, c, inv] = await Promise.all([
        dashboardService.financeReports(),
        custodyService.list(),
        invoiceService.list(),
      ]);
      setSummary(s);
      setCustodies(c);
      setInvoices(inv);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const exportOpen = () => {
    exportToCsv('open-custodies', ['العهدة', 'المشروع', 'المبلغ', 'الحالة'],
      custodies.filter((c) => c.status !== 'settled').map((c) => [
        c.custodyNumber, projectName(c.project, 'ar'), String(c.spent), c.status,
      ]));
    showToast('تم تصدير تقرير العهد المفتوحة', 'success');
  };

  const exportSettled = () => {
    exportToCsv('settled-custodies', ['العهدة', 'المشروع', 'المبلغ'],
      custodies.filter((c) => c.status === 'settled').map((c) => [
        c.custodyNumber, projectName(c.project, 'ar'), String(c.spent),
      ]));
    showToast('تم تصدير تقرير العهد المسوّاة', 'success');
  };

  const exportInvoices = () => {
    exportToCsv('invoices-report', ['الفاتورة', 'المورد', 'المبلغ', 'الحالة'],
      invoices.map((i) => [i.referenceNumber, i.supplier || '', String(i.total), i.status]));
    showToast('تم تصدير تقرير الفواتير', 'success');
  };

  const reports = [
    { icon: '📂', title: 'تقرير العهد المفتوحة', desc: `${summary?.openCustodies ?? 0} عهدة جارية`, onExport: exportOpen },
    { icon: '📁', title: 'تقرير العهد المسوّاة', desc: `${summary?.settled ?? 0} عهدة مؤرشفة`, onExport: exportSettled },
    { icon: '📈', title: 'تحليل اتجاهات المصروفات', desc: 'آخر 6 أشهر', onExport: () => {
      const t = summary?.expenseTrend;
      if (t) exportToCsv('expense-trend', ['الشهر', 'المصروف'], t.labels.map((l, i) => [l, String(t.data[i])]));
      showToast('تم التصدير', 'success');
    }},
    { icon: '🧾', title: 'تقرير الفواتير', desc: `${summary?.invoices ?? 0} فاتورة`, onExport: exportInvoices },
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <RefreshButton onRefresh={load} loading={loading} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {reports.map((r) => (
        <Card key={r.title}>
          <div className="text-center py-4">
            <div className="w-14 h-14 rounded-2xl bg-brand-50 text-2xl grid place-items-center mx-auto mb-3">{r.icon}</div>
            <b className="text-navy">{r.title}</b>
            <p className="text-xs text-muted mt-1 mb-4">{r.desc}</p>
            <Button variant="ghost" size="sm" onClick={r.onExport}>⬇ Excel</Button>
          </div>
        </Card>
      ))}
      </div>
    </div>
  );
}

export function FinanceSuppliersPage() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const [suppliers, setSuppliers] = useState<{ _id: string; total: number; count: number }[]>([]);
  const [grandTotal, setGrandTotal] = useState(0);
  const [query, setQuery] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState<string | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  const [lineItemsInvoice, setLineItemsInvoice] = useState<Invoice | null>(null);

  const [loadingSuppliers, setLoadingSuppliers] = useState(true);

  const loadSuppliers = () => {
    setLoadingSuppliers(true);
    return dashboardService.financeSuppliers()
      .then((data) => {
        if (Array.isArray(data)) {
          setSuppliers(data);
          setGrandTotal(data.reduce((sum, s) => sum + (s.total || 0), 0));
        } else {
          setSuppliers(data?.suppliers ?? []);
          setGrandTotal(data?.grandTotal ?? 0);
        }
      })
      .catch(() => {
        setSuppliers([]);
        setGrandTotal(0);
      })
      .finally(() => setLoadingSuppliers(false));
  };

  useEffect(() => {
    loadSuppliers();
  }, []);

  const filteredSuppliers = useMemo(() => {
    const list = suppliers ?? [];
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter((s) => s._id.toLowerCase().includes(q));
  }, [suppliers, query]);

  const selectedTotal = useMemo(
    () => filteredSuppliers.reduce((sum, s) => sum + (s.total || 0), 0),
    [filteredSuppliers],
  );

  const openSupplier = (name: string) => {
    setSelectedSupplier(name);
    setLineItemsInvoice(null);
    setLoadingInvoices(true);
    invoiceService
      .list({ supplier: name })
      .then(setInvoices)
      .finally(() => setLoadingInvoices(false));
  };

  const reloadSupplierInvoices = () => {
    if (!selectedSupplier) return;
    setLoadingInvoices(true);
    invoiceService
      .list({ supplier: selectedSupplier })
      .then(setInvoices)
      .finally(() => setLoadingInvoices(false));
  };

  const invoiceTf = useTableFilter(
    invoices,
    [
      (i) => i.referenceNumber,
      (i) => i.invoiceNumber || '',
      (i) => i.category || '',
      (i) => projectName(i.project, lang),
    ],
    (i) => i.status,
  );

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <RefreshButton onRefresh={loadSuppliers} loading={loadingSuppliers} />
      </div>
      <StatsGrid>
        <StatCard icon="🏪" label={t('finance.supplierCount')} value={(suppliers ?? []).length} color="blue" />
        <StatCard icon="🧾" label={t('finance.invoiceCount')} value={(suppliers ?? []).reduce((s, x) => s + (x.count || 0), 0)} color="green" />
        <StatCard icon="💰" label={t('finance.grandTotal')} value={formatMoney(grandTotal, lang)} color="amber" trend={t('common.sar')} />
        {query && (
          <StatCard icon="🔍" label={t('finance.filteredTotal')} value={formatMoney(selectedTotal, lang)} color="red" trend={`${filteredSuppliers.length} ${t('finance.suppliersShown')}`} trendUp={false} />
        )}
      </StatsGrid>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        <Card className="xl:col-span-4 !p-0 overflow-hidden" title={`🏪 ${t('nav.suppliers')}`}>
          <div className="px-4 py-3 border-b border-[#e8edf4] bg-[#f8fafc] flex gap-2">
            <div className="flex items-center gap-2 bg-white border border-[#e3e9f2] rounded-lg px-3 py-2 flex-1">
              <span className="text-muted text-sm">🔍</span>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t('finance.searchSupplier')}
                className="border-none outline-none bg-transparent text-sm w-full font-[inherit]"
              />
            </div>
            <RefreshButton variant="icon" onRefresh={loadSuppliers} loading={loadingSuppliers} />
          </div>
          <div className="max-h-[520px] overflow-y-auto divide-y divide-[#eef1f6]">
            {filteredSuppliers.length === 0 ? (
              <p className="text-center text-muted text-sm py-10">{t('finance.noSuppliers')}</p>
            ) : (
              filteredSuppliers.map((s) => {
                const active = selectedSupplier === s._id;
                return (
                  <button
                    key={s._id}
                    type="button"
                    onClick={() => openSupplier(s._id)}
                    className={`w-full text-start px-4 py-3.5 transition-colors hover:bg-brand-50/50 ${active ? 'bg-brand-50 border-s-4 border-brand-500' : ''}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-extrabold text-navy truncate">{s._id}</div>
                        <div className="text-xs text-muted mt-0.5">{t('finance.invoiceCountShort', { count: s.count })}</div>
                      </div>
                      <div className="text-end shrink-0">
                        <Amount>{formatMoney(s.total, lang)}</Amount>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </Card>

        <Card className="xl:col-span-8" title={selectedSupplier ? `📄 ${selectedSupplier}` : t('finance.selectSupplierHint')} noPadding>
          {!selectedSupplier ? (
            <p className="text-center text-muted text-sm py-16">{t('finance.selectSupplierHint')}</p>
          ) : loadingInvoices ? (
            <PageLoader compact />
          ) : (
            <>
              <div className="px-4 py-3 border-b border-[#e8edf4] bg-gradient-to-r from-brand-50/40 to-white flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-xs text-muted font-bold">{t('finance.supplierBalance')}</div>
                  <Amount>{formatMoney(invoices.reduce((s, i) => s + i.total, 0), lang)}</Amount>
                </div>
                <Chip variant="blue">{t('finance.invoiceCountShort', { count: invoices.length })}</Chip>
              </div>
              <DataTable
                columns={[
                  { key: 'ref', header: t('finance.invoice'), exportHeader: t('finance.invoice'), render: (i) => <b className="text-brand-600">{i.referenceNumber}</b>, exportValue: (i) => i.referenceNumber },
                  { key: 'proj', header: t('common.project'), exportHeader: t('common.project'), render: (i) => projectName(i.project, lang), exportValue: (i) => projectName(i.project, lang) },
                  { key: 'cat', header: t('pa.category'), exportHeader: t('pa.category'), render: (i) => i.category || '—', exportValue: (i) => i.category || '' },
                  { key: 'date', header: t('common.date'), exportHeader: t('common.date'), render: (i) => (i.invoiceDate ? formatDate(i.invoiceDate, lang) : '—'), exportValue: (i) => formatDate(i.invoiceDate, lang) },
                  { key: 'amt', header: t('common.amount'), exportHeader: t('common.amount'), render: (i) => <Amount>{formatMoney(i.total, lang)}</Amount>, exportValue: (i) => String(i.total) },
                  { key: 'st', header: t('common.status'), exportHeader: t('common.status'), render: (i) => <StatusChip status={i.status} label={statusLabel(i.status, t)} />, exportValue: (i) => statusLabel(i.status, t) },
                  { key: 'act', header: '', exportable: false, render: (i) => (
                    <Button size="sm" variant="ghost" onClick={() => setLineItemsInvoice(i)}>{t('pa.lineItems')}</Button>
                  ) },
                ]}
                data={invoiceTf.filtered}
                query={invoiceTf.query}
                onQueryChange={invoiceTf.setQuery}
                searchPlaceholder={t('finance.searchInvoices')}
                onReset={invoiceTf.reset}
                onRefresh={reloadSupplierInvoices}
                shown={invoiceTf.shown}
                total={invoiceTf.total}
                exportFilename={`supplier-${selectedSupplier}`}
                exportTitle={`${t('nav.suppliers')} — ${selectedSupplier}`}
                exportLang={lang}
                exportRowLabel={lang === 'ar' ? 'فاتورة' : 'invoices'}
                emptyText={t('finance.noSupplierInvoices')}
                embedded
              />
            </>
          )}
        </Card>
      </div>

      <InvoiceLineItemsModal invoice={lineItemsInvoice} onClose={() => setLineItemsInvoice(null)} />
    </div>
  );
}
