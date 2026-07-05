import { useEffect, useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { StatCard, StatsGrid } from '../../components/ui/StatCard';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { DataTable } from '../../components/ui/DataTable';
import { Notice } from '../../components/ui/Notice';
import { StatusChip, Amount, Chip } from '../../components/ui/Chip';
import { FormField, inputClass, selectClass } from '../../components/ui/FormField';
import { CustodyArchiveCard, JournalTable, JournalCrossBalance } from '../../components/ui/JournalBlock';
import { InvoiceDetailModal } from '../../components/ui/InvoiceDetailModal';
import { RejectReasonModal } from '../../components/ui/RejectReasonModal';
import { InvoiceLineItemsModal } from '../../components/ui/InvoiceLineItemsModal';
import { Pagination } from '../../components/ui/Pagination';
import { useFormDraft } from '../../hooks/useFormDraft';
import { useServerDataTable } from '../../hooks/useServerDataTable';
import { usePaginatedQuery } from '../../hooks/usePaginatedQuery';
import { useServerTable } from '../../hooks/useServerTable';
import { useInvalidateQueries } from '../../hooks/useInvalidateQueries';
import { queryKeys } from '../../lib/queryKeys';
import { CACHE } from '../../lib/cachePolicy';
import { refetchVoid } from '../../lib/queryFn';
import { useUi } from '../../context/UiContext';
import { dashboardService, custodyService, invoiceService, projectService, userService } from '../../services';
import type { Custody, Invoice, Voucher } from '../../types';
import { CustodyReviewCard } from '../../components/custody/CustodyReviewCard';
import { formatMoney, projectName, userName, statusLabel, formatDate } from '../../utils/format';
import { exportToCsv } from '../../utils/exportCsv';
import { showToast } from '../../utils/toast';
import { PageLoader } from '../../components/ui/PageLoader';
import { RefreshButton } from '../../components/ui/RefreshButton';
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
  const invalidate = useInvalidateQueries();
  const [selectedInvoiceIds, setSelectedInvoiceIds] = useState<Set<string>>(new Set());
  const [detailId, setDetailId] = useState<string | null>(null);
  const [rejectOpen, setRejectOpen] = useState(false);

  const table = useServerTable({ pageSize: 10, extraFilters: { view: 'card' } });
  const {
    items: custodies,
    isLoading,
    isFetching,
    isError,
    refetch,
    total,
    totalPages,
    page,
    pageSize,
  } = usePaginatedQuery<Custody>({
    queryKey: queryKeys.custodies.list(),
    queryFn: (params, signal) => custodyService.list(params, { signal }),
    params: table.listParams,
    ...CACHE.transactional,
  });

  useEffect(() => {
    setSelectedInvoiceIds((prev) => {
      const valid = new Set<string>();
      custodies.forEach((c) =>
        (c.invoices ?? []).forEach((i) => {
          if (i.status === 'pending_finance' && prev.has(i._id)) valid.add(i._id);
        }),
      );
      if (valid.size === prev.size && [...valid].every((id) => prev.has(id))) return prev;
      return valid;
    });
  }, [custodies]);

  const displayCustodies = useMemo(
    () => custodies.filter((c) => (c.invoices ?? []).some((i) => i.status === 'pending_finance')),
    [custodies],
  );

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
      invalidate.invoices();
      invalidate.custodies();
    }, { success: t('finance.invoicesApproved', { count: ids.length }) });
  };

  const confirmReject = (reason: string) => {
    const ids = [...selectedInvoiceIds];
    runAction(async () => {
      await invoiceService.batchReview(ids, false, reason);
      setSelectedInvoiceIds(new Set());
      setRejectOpen(false);
      invalidate.invoices();
      invalidate.custodies();
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
            <RefreshButton onRefresh={() => { void refetch(); }} loading={isLoading || isFetching} />
            <Button size="sm" disabled={!selectedInvoiceIds.size} onClick={() => batchReview(true)}>
              {t('finance.approveSelected')}
            </Button>
            <Button size="sm" variant="red" disabled={!selectedInvoiceIds.size} onClick={() => batchReview(false)}>
              {t('finance.rejectSelected')}
            </Button>
          </div>
        </div>
      </Card>

      {isError ? (
        <Card><Notice variant="error">{t('common.loadFailed', { defaultValue: 'تعذّر تحميل البيانات' })}</Notice></Card>
      ) : isLoading ? (
        <Card><PageLoader compact /></Card>
      ) : displayCustodies.length === 0 ? (
        <Card>
          <p className="text-center text-[#64748b] py-10 text-sm">{t('finance.noPendingInvoices')}</p>
        </Card>
      ) : (
        <>
          {displayCustodies.map((c) => (
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
          ))}
          {totalPages > 1 && (
            <Pagination
              page={page}
              totalPages={totalPages}
              total={total}
              pageSize={pageSize}
              onPageChange={table.setPage}
            />
          )}
        </>
      )}

      <InvoiceDetailModal invoiceId={detailId} onClose={() => setDetailId(null)} />
      <RejectReasonModal open={rejectOpen} onClose={() => setRejectOpen(false)} onConfirm={confirmReject} />
    </div>
  );
}

export function FinanceEntriesPage() {
  const { t } = useTranslation();
  const { runAction } = useUi();
  const invalidate = useInvalidateQueries();
  const [selectedByCustody, setSelectedByCustody] = useState<Record<string, Set<string>>>({});
  const [detailId, setDetailId] = useState<string | null>(null);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectCustodyId, setRejectCustodyId] = useState<string | null>(null);

  const table = useServerTable({ pageSize: 10, extraFilters: { view: 'card' } });
  const {
    items: custodies,
    isLoading,
    isFetching,
    isError,
    refetch,
    total,
    totalPages,
    page,
    pageSize,
  } = usePaginatedQuery<Custody>({
    queryKey: queryKeys.custodies.list(),
    queryFn: (params, signal) => custodyService.list(params, { signal }),
    params: table.listParams,
    ...CACHE.transactional,
  });

  useEffect(() => {
    setSelectedByCustody((prev) => {
      const next: Record<string, Set<string>> = {};
      custodies.forEach((c) => {
        const pending = (c.invoices ?? [])
          .filter((i) => i.status === 'pending_finance')
          .map((i) => i._id);
        const kept = prev[c._id]
          ? [...prev[c._id]].filter((id) => pending.includes(id))
          : pending;
        if (kept.length) next[c._id] = new Set(kept);
      });
      const prevKeys = Object.keys(prev).sort().join(',');
      const nextKeys = Object.keys(next).sort().join(',');
      const prevSig = Object.entries(prev)
        .map(([k, s]) => `${k}:${[...s].sort().join('|')}`)
        .sort()
        .join(';');
      const nextSig = Object.entries(next)
        .map(([k, s]) => `${k}:${[...s].sort().join('|')}`)
        .sort()
        .join(';');
      if (prevKeys === nextKeys && prevSig === nextSig) return prev;
      return next;
    });
  }, [custodies]);

  const displayCustodies = useMemo(
    () => custodies.filter((c) => (c.invoices ?? []).some((i) => i.status === 'pending_finance')),
    [custodies],
  );

  const toggleCustody = (custodyId: string, invoiceIds: string[], checked: boolean) => {
    setSelectedByCustody((prev) => {
      const next = { ...prev };
      const set = new Set(next[custodyId] || []);
      invoiceIds.forEach((id) => (checked ? set.add(id) : set.delete(id)));
      if (set.size) next[custodyId] = set;
      else delete next[custodyId];
      return next;
    });
  };

  const toggleInvoice = (custodyId: string, id: string) => {
    setSelectedByCustody((prev) => {
      const next = { ...prev };
      const set = new Set(next[custodyId] || []);
      if (set.has(id)) set.delete(id);
      else set.add(id);
      if (set.size) next[custodyId] = set;
      else delete next[custodyId];
      return next;
    });
  };

  const settleCustody = (custodyId: string, approved: boolean) => {
    const ids = [...(selectedByCustody[custodyId] || [])];
    if (!ids.length) return showToast(t('finance.selectInvoicesFirst'), 'error');
    if (!approved) {
      setRejectCustodyId(custodyId);
      setRejectOpen(true);
      return;
    }
    runAction(async () => {
      await custodyService.settle(custodyId, true, undefined, ids);
      setSelectedByCustody((prev) => {
        const next = { ...prev };
        delete next[custodyId];
        return next;
      });
      invalidate.custodies();
      invalidate.invoices();
    }, { success: t('finance.settledSuccess') });
  };

  const confirmReject = (reason: string) => {
    if (!rejectCustodyId) return;
    const ids = [...(selectedByCustody[rejectCustodyId] || [])];
    runAction(async () => {
      await custodyService.settle(rejectCustodyId, false, reason, ids.length ? ids : undefined);
      setSelectedByCustody((prev) => {
        const next = { ...prev };
        delete next[rejectCustodyId];
        return next;
      });
      setRejectOpen(false);
      setRejectCustodyId(null);
      invalidate.custodies();
      invalidate.invoices();
    }, { success: t('finance.settleRejected') });
  };

  return (
    <div className="space-y-4">
      <Notice icon="📒">{t('finance.entriesNotice')}</Notice>

      <Card className="!p-0 overflow-hidden">
        <div className="px-4 py-3.5 border-b border-[#e8edf4] bg-gradient-to-r from-[#f8fafc] to-white flex flex-wrap items-center justify-between gap-2">
          <span className="text-sm font-extrabold text-navy">{t('pm.filterCustody')}</span>
          <RefreshButton onRefresh={() => { void refetch(); }} loading={isLoading || isFetching} />
        </div>
        <div className="p-4">
          <FormField label={t('common.search')}>
            <input
              className={inputClass}
              placeholder={t('finance.searchCustodyInvoice')}
              value={table.query}
              onChange={(e) => table.setQuery(e.target.value)}
            />
          </FormField>
        </div>
      </Card>

      {isError ? (
        <Card><Notice variant="error">{t('common.loadFailed', { defaultValue: 'تعذّر تحميل البيانات' })}</Notice></Card>
      ) : isLoading ? (
        <Card><PageLoader compact /></Card>
      ) : displayCustodies.length === 0 ? (
        <Card><p className="text-muted text-sm text-center py-6">{t('finance.noEntries')}</p></Card>
      ) : (
        <>
          {displayCustodies.map((c) => {
            const custodySelected = selectedByCustody[c._id] || new Set<string>();
            const pendingFinance = (c.invoices ?? []).filter((i) => i.status === 'pending_finance');

            return (
              <div key={c._id} className="space-y-3">
                <CustodyReviewCard
                  custody={c}
                  onView={setDetailId}
                  selectedInvoiceIds={custodySelected}
                  onToggleCustody={toggleCustody}
                  onToggleInvoice={(id) => toggleInvoice(c._id, id)}
                  reviewStatus="pending_finance"
                  invoiceFilter={(i) => i.status === 'pending_finance'}
                />

                {pendingFinance.length > 0 && (
                  <Card className="!p-0 overflow-hidden">
                    <div className="px-4 py-3 flex flex-wrap items-center justify-between gap-3 border-b border-[#eef1f6] bg-[#fafbfd]">
                      <span className="text-[11px] text-muted font-bold">
                        {t('finance.selectedCount', { count: custodySelected.size })}
                      </span>
                      <div className="flex flex-wrap items-center gap-2">
                        <Button
                          size="sm"
                          disabled={!custodySelected.size}
                          onClick={() => settleCustody(c._id, true)}
                        >
                          {t('finance.postAccrual')}
                        </Button>
                        <Button
                          size="sm"
                          variant="red"
                          disabled={!custodySelected.size}
                          onClick={() => settleCustody(c._id, false)}
                        >
                          {t('common.reject')}
                        </Button>
                      </div>
                    </div>
                  </Card>
                )}
              </div>
            );
          })}
          {totalPages > 1 && (
            <Pagination
              page={page}
              totalPages={totalPages}
              total={total}
              pageSize={pageSize}
              onPageChange={table.setPage}
            />
          )}
        </>
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
  const invalidate = useInvalidateQueries();
  const { form, setForm, clearDraft } = useFormDraft('admin.vouchers', EMPTY_VOUCHER_FORM);

  const usersQuery = useQuery({
    queryKey: queryKeys.users.list({ role: 'project_accountant', limit: 100 }),
    queryFn: ({ signal }) => userService.list({ role: 'project_accountant', limit: 100 }, { signal }),
    ...CACHE.reference,
  });
  const users = usersQuery.data?.items ?? [];

  const {
    table,
    items: vouchers,
    total,
    totalPages,
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
  } = useServerDataTable<Voucher>({
    queryKey: queryKeys.dashboard.vouchers(),
    queryFn: (params, signal) => dashboardService.vouchers(params, { signal }),
    ...CACHE.transactional,
  });

  const submit = () => {
    if (!form.beneficiaryId || !form.amount) return showToast('اختر المستفيد والمبلغ', 'error');
    runAction(async () => {
      await dashboardService.createVoucher(form);
      clearDraft();
      invalidate.dashboard();
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
          loading={isLoading}
          fetching={isFetching}
          error={isError ? error : undefined}
          query={table.query}
          onQueryChange={table.setQuery}
          onReset={table.reset}
          onRefresh={() => { void refetch(); }}
          shown={vouchers.length}
          total={total}
          pagination={{
            page: table.page,
            totalPages,
            total,
            pageSize: table.pageSize,
            onPageChange: table.setPage,
          }}
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
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const table = useServerTable({ pageSize: 10, extraFilters: { view: 'card' } });
  const {
    items: custodies,
    isLoading,
    isFetching,
    isError,
    refetch,
    total,
    totalPages,
    page,
    pageSize,
  } = usePaginatedQuery<Custody>({
    queryKey: queryKeys.dashboard.settledArchive(),
    queryFn: (params, signal) => dashboardService.settledArchive(params, { signal }),
    params: table.listParams,
    ...CACHE.transactional,
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Notice icon="🗄️">
          {lang === 'ar'
            ? 'عهد مُسوّاة (قيد الاستحقاق مسجّل) — راجع القيود قبل وبعد الصرف.'
            : 'Settled custodies (accrual posted) — review entries before and after disbursement.'}
        </Notice>
        <RefreshButton onRefresh={refetchVoid(refetch)} loading={isLoading || isFetching} />
      </div>
      {isError ? (
        <Card><Notice variant="error">{t('common.loadFailed', { defaultValue: 'تعذّر تحميل البيانات' })}</Notice></Card>
      ) : isLoading ? (
        <Card><PageLoader compact /></Card>
      ) : custodies.length === 0 ? (
        <Card><p className="text-center text-muted text-sm py-8">{t('common.noData')}</p></Card>
      ) : (
        <>
        {custodies.map((c) => (
          <CustodyArchiveCard
            key={c._id}
            title={`${t('pa.custodyNumber')}: ${c.custodyNumber} — ${userName(c.holder, lang)}`}
            subtitle={`${c.settlementNumber || '—'} · ${formatDate(c.settledAt || c.updatedAt, lang)} · ${projectName(c.project, lang)}`}
            total={`${formatMoney(c.approvedSpent ?? c.spent, lang)} ${t('common.sar')}`}
            status={
              <StatusChip
                status={c.status}
                label={c.status === 'settled' ? (lang === 'ar' ? 'تم الصرف' : 'Disbursed') : (lang === 'ar' ? 'بانتظار الصرف' : 'Awaiting disbursement')}
              />
            }
          >
            {c.accrualEntry && c.accrualEntry.length > 0 && (
              <JournalTable
                lang={lang}
                title={lang === 'ar' ? 'استحقاق مشتريات الموقع' : 'Site purchases accrual'}
                tag={lang === 'ar' ? 'قيد استحقاق مسجل' : 'Posted accrual'}
                lines={c.accrualEntry}
              />
            )}
            {c.disbursementEntry && c.disbursementEntry.length > 0 && (
              <JournalTable
                lang={lang}
                title={lang === 'ar' ? 'إعادة شحن العهدة بنكياً' : 'Bank disbursement'}
                tag={lang === 'ar' ? 'قيد الصرف' : 'Disbursement'}
                lines={c.disbursementEntry}
              />
            )}
            {(c.accrualEntry?.length || c.disbursementEntry?.length) ? (
              <JournalCrossBalance
                accrualLines={c.accrualEntry ?? []}
                disbursementLines={c.disbursementEntry ?? []}
                lang={lang}
              />
            ) : null}
          </CustodyArchiveCard>
        ))}
        {total > pageSize && (
          <Pagination page={page} totalPages={totalPages} total={total} pageSize={pageSize} onPageChange={table.setPage} />
        )}
        </>
      )}
    </div>
  );
}

export function FinanceTaxPage() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;

  const {
    table,
    items: invoices,
    total,
    totalPages,
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
  } = useServerDataTable<Invoice>({
    queryKey: queryKeys.dashboard.taxCompliance(),
    queryFn: (params, signal) => dashboardService.taxCompliance(params, { signal }),
    ...CACHE.transactional,
  });

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
          data={invoices}
          loading={isLoading}
          fetching={isFetching}
          error={isError ? error : undefined}
          query={table.query}
          onQueryChange={table.setQuery}
          onReset={table.reset}
          onRefresh={() => { void refetch(); }}
          shown={invoices.length}
          total={total}
          pagination={{
            page: table.page,
            totalPages,
            total,
            pageSize: table.pageSize,
            onPageChange: table.setPage,
          }}
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
      const [s, cRes, invRes] = await Promise.all([
        dashboardService.financeReports(),
        custodyService.list({ limit: 100 }),
        invoiceService.list({ limit: 100 }),
      ]);
      setSummary(s);
      setCustodies(cRes.items ?? []);
      setInvoices(invRes.items ?? []);
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
  const [query, setQuery] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState<string | null>(null);
  const [lineItemsInvoice, setLineItemsInvoice] = useState<Invoice | null>(null);

  const suppliersQuery = useQuery({
    queryKey: queryKeys.dashboard.financeSuppliers,
    queryFn: () => dashboardService.financeSuppliers(),
    ...CACHE.dashboard,
  });

  const suppliers = suppliersQuery.data?.suppliers ?? [];
  const grandTotal = suppliersQuery.data?.grandTotal ?? 0;
  const loadingSuppliers = suppliersQuery.isLoading || suppliersQuery.isFetching;

  const {
    table: invoiceTable,
    items: invoices,
    total: invoiceTotal,
    totalPages: invoiceTotalPages,
    isLoading: loadingInvoices,
    isFetching: fetchingInvoices,
    isError: invoiceError,
    error: invoiceErr,
    refetch: refetchInvoices,
  } = useServerDataTable<Invoice>({
    queryKey: queryKeys.invoices.list(),
    queryFn: (params, signal) => invoiceService.list(params, { signal }),
    enabled: Boolean(selectedSupplier),
    ...CACHE.transactional,
  });

  useEffect(() => {
    invoiceTable.setFilter('supplier', selectedSupplier || '');
  }, [selectedSupplier, invoiceTable.setFilter]);

  const selectedSupplierMeta = useMemo(
    () => suppliers.find((s) => s._id === selectedSupplier),
    [suppliers, selectedSupplier],
  );

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
    invoiceTable.reset();
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <RefreshButton onRefresh={() => { void suppliersQuery.refetch(); }} loading={loadingSuppliers} />
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
            <RefreshButton variant="icon" onRefresh={() => { void suppliersQuery.refetch(); }} loading={loadingSuppliers} />
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
          ) : loadingInvoices && !invoices.length ? (
            <PageLoader compact />
          ) : (
            <>
              <div className="px-4 py-3 border-b border-[#e8edf4] bg-gradient-to-r from-brand-50/40 to-white flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-xs text-muted font-bold">{t('finance.supplierBalance')}</div>
                  <Amount>{formatMoney(selectedSupplierMeta?.total ?? 0, lang)}</Amount>
                </div>
                <Chip variant="blue">{t('finance.invoiceCountShort', { count: selectedSupplierMeta?.count ?? invoiceTotal })}</Chip>
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
                data={invoices}
                loading={loadingInvoices}
                fetching={fetchingInvoices}
                error={invoiceError ? invoiceErr : undefined}
                query={invoiceTable.query}
                onQueryChange={invoiceTable.setQuery}
                searchPlaceholder={t('finance.searchInvoices')}
                onReset={invoiceTable.reset}
                onRefresh={() => { void refetchInvoices(); }}
                shown={invoices.length}
                total={invoiceTotal}
                pagination={{
                  page: invoiceTable.page,
                  totalPages: invoiceTotalPages,
                  total: invoiceTotal,
                  pageSize: invoiceTable.pageSize,
                  onPageChange: invoiceTable.setPage,
                }}
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
