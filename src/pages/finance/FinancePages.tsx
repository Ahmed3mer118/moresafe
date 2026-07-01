import { useEffect, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { StatCard, StatsGrid } from '../../components/ui/StatCard';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { DataTable } from '../../components/ui/DataTable';
import { Notice } from '../../components/ui/Notice';
import { StatusChip, Amount, Chip } from '../../components/ui/Chip';
import { FormField, inputClass, selectClass } from '../../components/ui/FormField';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { CustodyArchiveCard, JournalTable } from '../../components/ui/JournalBlock';
import { InvoiceDetailModal } from '../../components/ui/InvoiceDetailModal';
import { RejectReasonModal } from '../../components/ui/RejectReasonModal';
import { InvoiceLineItemsModal } from '../../components/ui/InvoiceLineItemsModal';
import { useFormDraft } from '../../hooks/useFormDraft';
import { useTableFilter } from '../../hooks/useTableFilter';
import { useUi } from '../../context/UiContext';
import { dashboardService, custodyService, invoiceService, projectService, userService } from '../../services';
import type { Custody, Invoice, Project, User, Voucher } from '../../types';
import { formatMoney, projectName, userName, statusLabel, invoiceManagerName, formatDate } from '../../utils/format';
import { exportToCsv } from '../../utils/exportCsv';
import { showToast } from '../../utils/toast';
import { PageLoader } from '../../components/ui/PageLoader';

function financeReviewColumns(
  t: TFunction,
  i18n: { language: string },
  onView: (id: string) => void,
  selectedIds: Set<string>,
  onToggle: (id: string) => void,
  onToggleAll: (ids: string[], checked: boolean) => void,
  visibleIds: string[],
) {
  const lang = i18n.language;
  const allSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.has(id));

  return [
    {
      key: 'sel',
      header: (
        <input
          type="checkbox"
          className="w-4 h-4 accent-brand-600 cursor-pointer"
          checked={allSelected}
          onChange={(e) => onToggleAll(visibleIds, e.target.checked)}
          aria-label={t('finance.selectAll')}
        />
      ),
      exportable: false,
      className: 'w-10',
      render: (inv: Invoice) => (
        <input
          type="checkbox"
          className="w-4 h-4 accent-brand-600 cursor-pointer"
          checked={selectedIds.has(inv._id)}
          onChange={() => onToggle(inv._id)}
          aria-label={inv.referenceNumber}
        />
      ),
    },
    { key: 'ref', header: t('finance.invoice'), exportHeader: t('finance.invoice'), render: (inv: Invoice) => <b className="text-brand-600">{inv.referenceNumber}</b>, exportValue: (inv: Invoice) => inv.referenceNumber },
    { key: 'proj', header: t('common.project'), exportHeader: t('common.project'), render: (inv: Invoice) => projectName(inv.project, lang), exportValue: (inv: Invoice) => projectName(inv.project, lang) },
    { key: 'sup', header: t('pa.supplier'), exportHeader: t('pa.supplier'), render: (inv: Invoice) => inv.supplier || '—', exportValue: (inv: Invoice) => inv.supplier || '' },
    { key: 'mgr', header: t('pm.projectManager'), exportHeader: t('pm.projectManager'), render: (inv: Invoice) => invoiceManagerName(inv, lang), exportValue: (inv: Invoice) => invoiceManagerName(inv, lang) },
    { key: 'cat', header: t('pa.category'), exportHeader: t('pa.category'), render: (inv: Invoice) => inv.category || '—', exportValue: (inv: Invoice) => inv.category || '' },
    { key: 'amt', header: t('common.amount'), exportHeader: t('common.amount'), render: (inv: Invoice) => <Amount>{formatMoney(inv.total, lang)}</Amount>, exportValue: (inv: Invoice) => String(inv.total) },
    { key: 'st', header: t('common.status'), exportHeader: t('common.status'), render: (inv: Invoice) => <StatusChip status={inv.status} label={statusLabel(inv.status, t)} />, exportValue: (inv: Invoice) => statusLabel(inv.status, t) },
    {
      key: 'act',
      header: '',
      exportable: false,
      render: (inv: Invoice) => (
        <Button size="sm" variant="ghost" onClick={() => onView(inv._id)}>{t('common.view')}</Button>
      ),
    },
  ];
}

export function FinanceHomePage() {
  const [stats, setStats] = useState<Awaited<ReturnType<typeof dashboardService.finance>> | null>(null);
  useEffect(() => { dashboardService.finance().then(setStats); }, []);



  return (
    <div className="space-y-5">
      <StatsGrid>
        <StatCard icon="💼" label="عهد مفتوحة" value={stats?.openCustodies ?? 0} color="blue" trend="قيد المتابعة" />
        <StatCard icon="📒" label="بانتظار التسوية" value={stats?.pendingSettlement ?? 0} color="amber" trend="بعد اعتماد المدير" trendUp={false} />
        <StatCard icon="🧾" label="فواتير بانتظار المراجعة" value={stats?.pendingInvoices ?? 0} color="amber" />
        <StatCard icon="💰" label="إجمالي المصروف" value={formatMoney(stats?.totalExpense ?? 0)} color="green" trend="ريال" trendUp />
      </StatsGrid>

    </div>
  );
}

export function FinanceReviewPage() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const { runAction } = useUi();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [detailId, setDetailId] = useState<string | null>(null);
  const [rejectOpen, setRejectOpen] = useState(false);

  const load = () =>
    invoiceService.pendingFinance().then((list) => {
      setInvoices(list);
      setSelectedIds((prev) => {
        const valid = new Set(list.map((i) => i._id));
        return new Set([...prev].filter((id) => valid.has(id)));
      });
    });

  useEffect(() => { load(); }, []);

  const tf = useTableFilter(
    invoices,
    [
      (i) => i.referenceNumber,
      (i) => i.supplier || '',
      (i) => i.category || '',
      (i) => projectName(i.project, lang),
      (i) => invoiceManagerName(i, lang),
    ],
    (i) => i.status,
  );

  const visibleIds = useMemo(() => tf.filtered.map((i) => i._id), [tf.filtered]);

  const toggleOne = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = (ids: string[], checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => (checked ? next.add(id) : next.delete(id)));
      return next;
    });
  };

  const batchReview = (approved: boolean) => {
    const ids = [...selectedIds];
    if (!ids.length) return showToast(t('finance.selectInvoicesFirst'), 'error');
    if (!approved) {
      setRejectOpen(true);
      return;
    }
    runAction(async () => {
      await invoiceService.batchReview(ids, true);
      setSelectedIds(new Set());
      await load();
    }, { success: t('finance.invoicesApproved', { count: ids.length }) });
  };

  const confirmReject = (reason: string) => {
    const ids = [...selectedIds];
    runAction(async () => {
      await invoiceService.batchReview(ids, false, reason);
      setSelectedIds(new Set());
      setRejectOpen(false);
      await load();
    }, { success: t('finance.invoicesRejected', { count: ids.length }) });
  };

  const columns = financeReviewColumns(t, i18n, setDetailId, selectedIds, toggleOne, toggleAll, visibleIds);

  return (
    <div className="space-y-4">
      <Notice icon="🧾">{t('finance.reviewNotice')}</Notice>
      <Card title={`🧾 ${t('nav.review')}`} noPadding>
        <DataTable
          columns={columns}
          data={tf.filtered}
          query={tf.query}
          onQueryChange={tf.setQuery}
          searchPlaceholder={t('common.search')}
          onReset={tf.reset}
          onRefresh={load}
          shown={tf.shown}
          total={tf.total}
          exportFilename="finance-invoices"
          exportTitle={t('nav.review')}
          exportLang={lang}
          exportRowLabel={lang === 'ar' ? 'فاتورة' : 'invoices'}
          emptyText={t('finance.noPendingInvoices')}
          toolbarExtra={
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] text-muted font-bold">{t('finance.selectedCount', { count: selectedIds.size })}</span>
              <Button size="sm" disabled={!selectedIds.size} onClick={() => batchReview(true)}>{t('finance.approveSelected')}</Button>
              <Button size="sm" variant="red" disabled={!selectedIds.size} onClick={() => batchReview(false)}>{t('finance.rejectSelected')}</Button>
            </div>
          }
        />
      </Card>
      <InvoiceDetailModal invoiceId={detailId} onClose={() => setDetailId(null)} />
      <RejectReasonModal open={rejectOpen} onClose={() => setRejectOpen(false)} onConfirm={confirmReject} />
    </div>
  );
}

export function FinanceEntriesPage() {
  const { t, i18n } = useTranslation();
  const { runAction } = useUi();
  const [custodies, setCustodies] = useState<Custody[]>([]);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectCustodyId, setRejectCustodyId] = useState<string | null>(null);
  const load = () => custodyService.list({ status: 'pm_approved' }).then(setCustodies);
  useEffect(() => { load(); }, []);

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

      {custodies.length > 0 && (
        <Card title={t('nav.entries')} noPadding>
          <DataTable
            columns={[
              { key: 'num', header: '#', exportHeader: '#', render: (c) => <b>{c.custodyNumber}</b>, exportValue: (c) => c.custodyNumber },
              { key: 'proj', header: t('common.project'), exportHeader: t('common.project'), render: (c) => projectName(c.project, i18n.language), exportValue: (c) => projectName(c.project, i18n.language) },
              { key: 'holder', header: t('roles.project_manager'), exportHeader: t('roles.project_manager'), render: (c) => userName(c.holder, i18n.language), exportValue: (c) => userName(c.holder, i18n.language) },
              { key: 'inv', header: t('nav.invoices'), exportHeader: t('nav.invoices'), render: (c) => String(c.invoices?.length || 0), exportValue: (c) => String(c.invoices?.length || 0) },
              { key: 'amt', header: t('common.amount'), exportHeader: t('common.amount'), render: (c) => <Amount>{formatMoney(c.spent, i18n.language)}</Amount>, exportValue: (c) => String(c.spent) },
              { key: 'st', header: t('common.status'), exportHeader: t('common.status'), render: (c) => <StatusChip status={c.status} label={statusLabel(c.status, t)} />, exportValue: (c) => statusLabel(c.status, t) },
            ]}
            data={custodies}
            onRefresh={load}
            exportFilename="finance-entries-custodies"
            exportTitle={t('nav.entries')}
            exportLang={i18n.language}
            exportRowLabel={i18n.language === 'ar' ? 'عهدة' : 'custodies'}
            emptyText={t('finance.noEntries')}
          />
        </Card>
      )}

      {custodies.length === 0 && <Card><p className="text-muted text-sm text-center py-6">{t('finance.noEntries')}</p></Card>}
      {custodies.map((c) => (
        <Card key={c._id} title={`${c.custodyNumber} — ${userName(c.holder, i18n.language)}`} subtitle={`${projectName(c.project, i18n.language)} · ${c.invoices?.length || 0} فاتورة`}>
          <Amount>{formatMoney(c.spent)} ريال</Amount>
          {c.invoices && c.invoices.length > 0 && (
            <div className="mt-3">
              <DataTable
                columns={[
                  { key: 'ref', header: t('finance.invoice'), exportHeader: t('finance.invoice'), render: (inv) => <b>{inv.referenceNumber}</b>, exportValue: (inv) => inv.referenceNumber },
                  {
                    key: 'uploader',
                    header: t('roles.project_manager'),
                    exportHeader: t('roles.project_manager'),
                    render: (inv) => userName(inv.uploadedBy || c.holder, i18n.language),
                    exportValue: (inv) => userName(inv.uploadedBy || c.holder, i18n.language),
                  },
                  { key: 'sup', header: t('pa.supplier'), exportHeader: t('pa.supplier'), render: (inv) => inv.supplier || '—', exportValue: (inv) => inv.supplier || '' },
                  {
                    key: 'amt',
                    header: t('common.amount'),
                    exportHeader: t('common.amount'),
                    render: (inv) => <Amount>{formatMoney(inv.total, i18n.language)}</Amount>,
                    exportValue: (inv) => String(inv.total),
                  },
                ]}
                data={c.invoices}
                exportFilename={`custody-${c.custodyNumber}-invoices`}
                exportTitle={`${c.custodyNumber} — ${t('nav.invoices')}`}
                exportLang={i18n.language}
                exportRowLabel={i18n.language === 'ar' ? 'فاتورة' : 'invoices'}
                emptyText={t('common.noData')}
              />
            </div>
          )}
          <div className="flex gap-2 mt-3">
            <Button onClick={() => settle(c._id, true)}>تسوية وإصدار قيد الصرف</Button>
            <Button variant="red" onClick={() => settle(c._id, false)}>{t('common.reject')}</Button>
          </div>
        </Card>
      ))}
      <RejectReasonModal open={rejectOpen} onClose={() => { setRejectOpen(false); setRejectCustodyId(null); }} onConfirm={confirmReject} />
    </div>
  );
}

export function FinanceBudgetsPage() {
  const { t, i18n } = useTranslation();
  const [projects, setProjects] = useState<Project[]>([]);
  useEffect(() => { projectService.budgets().then(setProjects); }, []);

  return (
    <Card title={t('nav.budgets')}>
      <div className="space-y-5">
        {projects.map((p) => {
          const pct = p.budget ? p.spent / p.budget : 0;
          const variant = pct > 0.9 ? 'amber' : pct > 0.75 ? 'default' : 'green';
          return (
            <div key={p._id}>
              <div className="flex justify-between text-sm font-bold mb-2">
                <span className="text-navy">{projectName(p, i18n.language)}</span>
                <span className="text-muted text-xs">{formatMoney(p.spent)} / {formatMoney(p.budget)}</span>
              </div>
              <ProgressBar value={p.spent} max={p.budget} variant={variant} />
            </div>
          );
        })}
      </div>
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
  const { form, setForm, clearDraft } = useFormDraft('finance.vouchers', EMPTY_VOUCHER_FORM);

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
  useEffect(() => { dashboardService.settledArchive().then(setCustodies); }, []);

  return (
    <div className="space-y-4">
      <Notice icon="🗄️">عهد متسوية مؤرشفة — اضغط للمراجعة: قيد الاستحقاق، قيد الصرف، والفواتير.</Notice>
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
  useEffect(() => { dashboardService.taxCompliance().then(setInvoices); }, []);
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
          query={tf.query}
          onQueryChange={tf.setQuery}
          onReset={tf.reset}
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

  useEffect(() => {
    dashboardService.financeReports().then(setSummary);
    custodyService.list().then(setCustodies);
    invoiceService.list().then(setInvoices);
  }, []);

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

  const loadSuppliers = () =>
    dashboardService.financeSuppliers()
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
      });

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
            <button
              type="button"
              onClick={() => { setQuery(''); loadSuppliers(); }}
              className="w-9 h-9 shrink-0 border border-[#e3e9f2] rounded-lg bg-white text-muted hover:text-brand-500 text-sm"
              title={t('common.refresh')}
            >
              ↺
            </button>
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
