import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { useQuery } from '@tanstack/react-query';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { DataTable } from '../../components/ui/DataTable';
import { StatusChip, Amount, Chip } from '../../components/ui/Chip';
import { FormField, inputClass, selectClass } from '../../components/ui/FormField';
import { PageLoader } from '../../components/ui/PageLoader';
import { Pagination } from '../../components/ui/Pagination';
import { InvoiceDetailModal } from '../../components/ui/InvoiceDetailModal';
import { Modal } from '../../components/ui/Modal';
import { ImageLightbox } from '../../components/ui/ImageLightbox';
import { useUi } from '../../context/UiContext';
import { useServerDataTable } from '../../hooks/useServerDataTable';
import { useInvalidateQueries } from '../../hooks/useInvalidateQueries';
import { useServerTable } from '../../hooks/useServerTable';
import { queryKeys } from '../../lib/queryKeys';
import { CACHE } from '../../lib/cachePolicy';
import { custodyService, projectService, dashboardService, userService } from '../../services';
import { CustodyArchiveCard, JournalTable, JournalCrossBalance } from '../../components/ui/JournalBlock';
import { custodyTotals, proofPayloadFromFile, displayInvoicesTotal, disbursementTotal, disbursementEligibleInvoices, disbursementPreviewForCustody, compareAccrualDisbursement, type JournalCompareStatus } from '../../utils/custodyHelpers';
import { JournalTransactionsList } from '../../components/custody/JournalTransactionsList';
import type { Custody, CustodyTransaction, Project, User, Voucher } from '../../types';
import { formatMoney, projectName, statusLabel, formatDate, entityId, userName, assetUrl } from '../../utils/format';
import { StatCard, StatsGrid } from '../../components/ui/StatCard';
import { Notice } from '../../components/ui/Notice';
import { RefreshButton } from '../../components/ui/RefreshButton';
import { showToast } from '../../utils/toast';

const ADMIN_BASE = '/dashboard/admin/disbursement';

function BalanceIndicator({ custody, lang, t }: { custody: Custody; lang: string; t: TFunction }) {
  const { amount, spent, remaining, over } = custodyTotals(custody);
  if (over) {
    return (
      <Chip variant="red">
        {t('admin.overBy', { amount: formatMoney(Math.abs(remaining), lang) })}
      </Chip>
    );
  }
  return (
    <Chip variant="green">
      {t('admin.withinBudget', { remaining: formatMoney(remaining, lang), spent: formatMoney(spent, lang), amount: formatMoney(amount, lang) })}
    </Chip>
  );
}

export function AdminDisbursementPage() {
  const { t, i18n } = useTranslation();
  const { runAction } = useUi();
  const invalidate = useInvalidateQueries();
  const lang = i18n.language;
  const navigate = useNavigate();
  const [tab, setTab] = useState<'custodies' | 'transactions'>('custodies');
  const [form, setForm] = useState({ projectId: '', holderId: '', amount: 0, purpose: '' });
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [editCustody, setEditCustody] = useState<Custody | null>(null);
  const [editForm, setEditForm] = useState({ projectId: '', holderId: '', amount: 0, purpose: '' });
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  const custodyTable = useServerDataTable<Custody>({
    queryKey: queryKeys.custodies.list(),
    queryFn: (params, signal) => custodyService.list({ ...params, view: 'table' }, { signal }),
    staleTime: CACHE.transactional.staleTime,
    gcTime: CACHE.transactional.gcTime,
    enabled: tab === 'custodies',
  });

  const txTable = useServerDataTable<CustodyTransaction & { custodyNumber?: string; project?: Project; holder?: User }>({
    queryKey: queryKeys.custodies.adminTransactions(),
    queryFn: (params, signal) => custodyService.adminTransactions(params, { signal }),
    staleTime: CACHE.transactional.staleTime,
    gcTime: CACHE.transactional.gcTime,
    enabled: tab === 'transactions',
  });

  const { data: projectsData } = useQuery({
    queryKey: queryKeys.projects.list({ limit: 200, page: 1 }),
    queryFn: ({ signal }) => projectService.list({ limit: 200, page: 1 }, { signal }),
    staleTime: CACHE.reference.staleTime,
    gcTime: CACHE.reference.gcTime,
  });
  const projects = projectsData?.items ?? [];

  const { data: managersData } = useQuery({
    queryKey: queryKeys.users.list({ role: 'project_manager', limit: 200, page: 1 }),
    queryFn: ({ signal }) => userService.list({ role: 'project_manager', limit: 200, page: 1 }, { signal }),
    staleTime: CACHE.reference.staleTime,
    gcTime: CACHE.reference.gcTime,
  });
  const managers = managersData?.items ?? [];

  const selectedProject = projects.find((p) => entityId(p) === form.projectId);
  const defaultManagerId = selectedProject?.manager
    ? entityId(selectedProject.manager as User)
    : '';

  const filtered = custodyTable.items;

  const createCustody = () => {
    if (!form.projectId) return showToast(t('admin.pickProject'), 'error');
    const holderId = form.holderId || defaultManagerId;
    if (!holderId) return showToast(t('admin.pickManager'), 'error');
    runAction(async () => {
      setCreating(true);
      try {
        await custodyService.create({
          projectId: form.projectId,
          holderId,
          amount: form.amount,
          purpose: form.purpose,
          type: 'operational',
        });
        setForm({ projectId: '', holderId: '', amount: 0, purpose: '' });
        setCreateOpen(false);
        await invalidate.custodies();
      } finally {
        setCreating(false);
      }
    }, { success: t('admin.custodyCreated') });
  };

  const openEdit = (c: Custody) => {
    setEditCustody(c);
    setEditForm({
      projectId: entityId(c.project),
      holderId: entityId(c.holder),
      amount: c.amount || 0,
      purpose: c.purpose || '',
    });
  };

  const saveEdit = () => {
    if (!editCustody) return;
    runAction(async () => {
      await custodyService.update(editCustody._id, {
        projectId: editForm.projectId,
        holderId: editForm.holderId,
        amount: editForm.amount,
        purpose: editForm.purpose,
      });
      setEditCustody(null);
      await invalidate.custodies();
    }, { success: t('admin.custodyUpdated') });
  };

  const editProject = projects.find((p) => entityId(p) === editForm.projectId);
  const editManagerOptions = useMemo(() => {
    const map = new Map<string, User>();
    managers.forEach((m) => map.set(entityId(m), m));
    if (editProject?.manager && typeof editProject.manager === 'object') {
      map.set(entityId(editProject.manager), editProject.manager);
    }
    return [...map.values()];
  }, [managers, editProject]);

  const columns = useMemo(
    () => [
      {
        key: 'num',
        header: '#',
        render: (c: Custody) => <b className="text-brand-600">{c.custodyNumber}</b>,
        exportValue: (c: Custody) => c.custodyNumber,
      },
      {
        key: 'mgr',
        header: t('pm.projectManager'),
        render: (c: Custody) => <span className="font-semibold">{userName(c.holder, lang)}</span>,
        exportValue: (c: Custody) => userName(c.holder, lang),
      },
      {
        key: 'proj',
        header: t('common.project'),
        render: (c: Custody) => projectName(c.project, lang),
        exportValue: (c: Custody) => projectName(c.project, lang),
      },
      {
        key: 'amt',
        header: t('pa.custodyAmount'),
        render: (c: Custody) => <Amount>{formatMoney(c.amount, lang)}</Amount>,
        exportValue: (c: Custody) => String(c.amount),
      },
      {
        key: 'spent',
        header: t('admin.invoicesTotal'),
        render: (c: Custody) => <Amount>{formatMoney(displayInvoicesTotal(c), lang)}</Amount>,
        exportValue: (c: Custody) => String(displayInvoicesTotal(c)),
      },
      {
        key: 'bal',
        header: t('admin.balanceCheck'),
        exportable: false,
        render: (c: Custody) => <BalanceIndicator custody={c} lang={lang} t={t} />,
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
          <div className="flex flex-wrap gap-1">
            <Button size="sm" variant="ghost" onClick={() => navigate(`${ADMIN_BASE}/${c._id}`)}>
              {t('common.view')}
            </Button>
            {c.status === 'open' && (
              <Button size="sm" variant="ghost" onClick={() => openEdit(c)}>
                {t('common.edit')}
              </Button>
            )}
          </div>
        ),
      },
    ],
    [t, lang, navigate],
  );

  return (
    <div className="space-y-4">
      <Notice icon="🏦">{t('admin.disbursementNotice')}</Notice>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant={tab === 'custodies' ? 'primary' : 'ghost'} onClick={() => setTab('custodies')}>
            🏦 {t('admin.allCustodies')}
          </Button>
          <Button size="sm" variant={tab === 'transactions' ? 'primary' : 'ghost'} onClick={() => setTab('transactions')}>
            📒 {t('admin.transactions')}
          </Button>
        </div>
        <RefreshButton
          onRefresh={() => {
            if (tab === 'transactions') void txTable.refetch();
            else void custodyTable.refetch();
          }}
          loading={tab === 'transactions' ? txTable.isFetching : custodyTable.isFetching}
        />
      </div>

      {tab === 'custodies' ? (
      <Card
        title={`🏦 ${t('admin.allCustodies')}`}
        action={
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            ＋ {t('admin.createCustody')}
          </Button>
        }
        noPadding
      >
        <div className="px-4 py-3 border-b border-[#eef1f6] flex flex-wrap gap-2">
          {(['all', 'active', 'done'] as const).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => custodyTable.table.setFilter('group', key === 'all' ? '' : key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                (key === 'all' && !custodyTable.table.filters.group) || custodyTable.table.filters.group === key
                  ? 'bg-brand-500 text-white'
                  : 'bg-[#f7f9fc] text-muted hover:bg-brand-50'
              }`}
            >
              {t(`admin.filter.${key}`)}
            </button>
          ))}
        </div>
        <DataTable
          columns={columns}
          data={filtered}
          loading={custodyTable.isLoading}
          fetching={custodyTable.isFetching}
          error={custodyTable.isError}
          query={custodyTable.table.query}
          onQueryChange={custodyTable.table.setQuery}
          searchPlaceholder={t('common.search')}
          onReset={custodyTable.table.reset}
          onRefresh={() => { void custodyTable.refetch(); }}
          shown={filtered.length}
          total={custodyTable.total}
          pagination={{
            page: custodyTable.page,
            totalPages: custodyTable.totalPages,
            total: custodyTable.total,
            pageSize: custodyTable.pageSize,
            onPageChange: custodyTable.table.setPage,
          }}
          emptyText={custodyTable.isLoading ? t('common.loading') : t('common.noData')}
          exportFilename="admin-custodies"
          exportTitle={t('admin.allCustodies')}
        />
      </Card>
      ) : (
      <JournalTransactionsList
        rows={txTable.items}
        loading={txTable.isLoading}
        fetching={txTable.isFetching}
        onRefresh={() => { void txTable.refetch(); }}
        showProject
        showManager
        pagination={{
          page: txTable.page,
          totalPages: txTable.totalPages,
          total: txTable.total,
          pageSize: txTable.pageSize,
          onPageChange: txTable.table.setPage,
        }}
      />
      )}

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title={t('admin.createCustody')}
        footer={
          <>
            <Button onClick={createCustody} loading={creating} disabled={!form.projectId || !(form.holderId || defaultManagerId)}>
              {t('admin.createCustody')}
            </Button>
            <Button variant="ghost" onClick={() => setCreateOpen(false)}>{t('common.cancel')}</Button>
          </>
        }
      >
        <p className="text-sm text-muted mb-4">{t('admin.createCustodyHint')}</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label={t('common.project')} full>
            <select
              className={selectClass}
              value={form.projectId}
              onChange={(e) => {
                const projectId = e.target.value;
                const project = projects.find((p) => entityId(p) === projectId);
                const suggested = project?.manager ? entityId(project.manager as User) : '';
                setForm((prev) => ({
                  ...prev,
                  projectId,
                  holderId: prev.holderId && managers.some((m) => entityId(m) === prev.holderId)
                    ? prev.holderId
                    : suggested,
                }));
              }}
            >
              <option value="">{t('admin.pickProject')}</option>
              {projects.map((p) => (
                <option key={entityId(p)} value={entityId(p)}>{projectName(p, lang)}</option>
              ))}
            </select>
          </FormField>
          <FormField label={t('pm.projectManager')}>
            <select
              className={selectClass}
              value={form.holderId || defaultManagerId}
              onChange={(e) => setForm({ ...form, holderId: e.target.value })}
            >
              <option value="">{t('admin.pickManager')}</option>
              {managers.map((m) => (
                <option key={entityId(m)} value={entityId(m)}>{userName(m, lang)}</option>
              ))}
            </select>
          </FormField>
          <FormField label={t('pa.custodyAmount')}>
            <input
              className={inputClass}
              type="number"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: +e.target.value })}
            />
          </FormField>
          <FormField label={t('pa.purpose')} full>
            <input className={inputClass} value={form.purpose} onChange={(e) => setForm({ ...form, purpose: e.target.value })} />
          </FormField>
        </div>
      </Modal>

      <Modal
        open={!!editCustody}
        onClose={() => setEditCustody(null)}
        title={t('admin.editCustody')}
        footer={
          <>
            <Button onClick={saveEdit}>{t('common.save')}</Button>
            <Button variant="ghost" onClick={() => setEditCustody(null)}>{t('common.cancel')}</Button>
          </>
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label={t('common.project')}>
            <select
              className={selectClass}
              value={editForm.projectId}
              onChange={(e) => setEditForm({ ...editForm, projectId: e.target.value })}
            >
              {projects.map((p) => (
                <option key={entityId(p)} value={entityId(p)}>{projectName(p, lang)}</option>
              ))}
            </select>
          </FormField>
          <FormField label={t('pm.projectManager')}>
            <select
              className={selectClass}
              value={editForm.holderId}
              onChange={(e) => setEditForm({ ...editForm, holderId: e.target.value })}
            >
              {editManagerOptions.map((m) => (
                <option key={entityId(m)} value={entityId(m)}>{userName(m, lang)}</option>
              ))}
            </select>
          </FormField>
          <FormField label={t('pa.custodyAmount')}>
            <input
              className={inputClass}
              type="number"
              min={editCustody?.spent || 0}
              value={editForm.amount || ''}
              onChange={(e) => setEditForm({ ...editForm, amount: Number(e.target.value) })}
            />
          </FormField>
          <FormField label={t('admin.custodyPurpose')} full>
            <input
              className={inputClass}
              value={editForm.purpose}
              onChange={(e) => setEditForm({ ...editForm, purpose: e.target.value })}
            />
          </FormField>
        </div>
      </Modal>

      {lightboxUrl && (
        <ImageLightbox
          images={[{ url: assetUrl(lightboxUrl), alt: t('admin.paymentProof') }]}
          index={0}
          onClose={() => setLightboxUrl(null)}
          onIndexChange={() => {}}
        />
      )}
    </div>
  );
}

export function AdminCustodyDetailPage() {
  const { custodyId } = useParams<{ custodyId: string }>();
  const { t, i18n } = useTranslation();
  const { runAction } = useUi();
  const lang = i18n.language;
  const navigate = useNavigate();
  const [custody, setCustody] = useState<Custody | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [topUpAmount, setTopUpAmount] = useState('');
  const [disburseAmount, setDisburseAmount] = useState('');
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [disburseMethod, setDisburseMethod] = useState('bank_transfer');
  const [bankReference, setBankReference] = useState('');

  const load = async () => {
    if (!custodyId) return;
    setLoading(true);
    try {
      setCustody(await custodyService.get(custodyId));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [custodyId]);

  if (loading) {
    return <Card><PageLoader compact /></Card>;
  }

  if (!custody) {
    return <Card><p className="text-center text-muted py-8">{t('common.noData')}</p></Card>;
  }

  const { amount, spent } = custodyTotals(custody);
  const invoices = custody.invoices ?? [];
  const approvedTotal = spent;

  const recordDisbursement = () => {
    const amt = disburseAmount ? Number(disburseAmount) : approvedTotal;
    if (!amt || amt <= 0) return showToast(t('admin.disburseAmountRequired'), 'error');
    if (!proofFile) return showToast(t('admin.proofRequired'), 'error');
    runAction(async () => {
      const proof = await proofPayloadFromFile(proofFile);
      await custodyService.disburse(custody._id, {
        proof,
        amount: amt,
        method: disburseMethod,
        bankReference: bankReference || undefined,
      });
      setDisburseAmount('');
      setProofFile(null);
      setBankReference('');
      await load();
    }, { success: t('admin.disbursedSuccess') });
  };

  const topUp = () => {
    const amt = Number(topUpAmount);
    if (!amt || amt <= 0) return showToast(t('admin.topUpAmount'), 'error');
    runAction(async () => {
      await custodyService.topUp(custody._id, { amount: amt });
      setTopUpAmount('');
      await load();
    }, { success: t('admin.topUpSuccess') });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button variant="ghost" size="sm" onClick={() => navigate(ADMIN_BASE)}>
          ← {t('admin.backToDisbursement')}
        </Button>
        <RefreshButton onRefresh={load} loading={loading} />
      </div>

      <Card className="!p-0 overflow-hidden">
        <div className="px-4 py-4 border-b border-[#e8edf4] bg-gradient-to-r from-brand-50/50 to-white">
          <h2 className="text-lg font-extrabold text-navy">{custody.custodyNumber}</h2>
          <p className="text-sm text-muted mt-1">{projectName(custody.project, lang)}</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4 text-sm">
            <div>
              <div className="text-[11px] text-muted font-bold">{t('pm.projectManager')}</div>
              <div className="font-bold">{userName(custody.holder, lang)}</div>
            </div>
            <div>
              <div className="text-[11px] text-muted font-bold">{t('pa.custodyAmount')}</div>
              <div className="font-bold">{formatMoney(amount, lang)}</div>
            </div>
            <div>
              <div className="text-[11px] text-muted font-bold">{t('admin.invoicesTotal')}</div>
              <div className="font-bold text-emerald-700">{formatMoney(spent, lang)}</div>
            </div>
            <div>
              <div className="text-[11px] text-muted font-bold">{t('admin.balanceCheck')}</div>
              <BalanceIndicator custody={custody} lang={lang} t={t} />
            </div>
          </div>
          <div className="mt-3">
            <StatusChip status={custody.status} label={statusLabel(custody.status, t)} />
          </div>
        </div>

        {(custody.status === 'finance_pending' || custody.status === 'open') && (
          <div className="px-4 py-4 border-b border-[#eef1f6] bg-[#f8fafc] space-y-4">
            {custody.status === 'finance_pending' && (
              <div className="space-y-3">
                <div className="text-sm font-bold text-navy">{t('admin.disburseStepCombined')}</div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <FormField label={t('admin.disburseAmountLabel')}>
                    <input
                      className={inputClass}
                      type="number"
                      placeholder={formatMoney(approvedTotal, lang)}
                      value={disburseAmount}
                      onChange={(e) => setDisburseAmount(e.target.value)}
                    />
                  </FormField>
                  <FormField label={lang === 'ar' ? 'طريقة التحويل' : 'Method'}>
                    <select
                      className={selectClass}
                      value={disburseMethod}
                      onChange={(e) => setDisburseMethod(e.target.value)}
                    >
                      <option value="bank_transfer">{lang === 'ar' ? 'تحويل بنكي' : 'Bank transfer'}</option>
                      <option value="check">{lang === 'ar' ? 'شيك' : 'Check'}</option>
                    </select>
                  </FormField>
                  <FormField label={lang === 'ar' ? 'رقم العملية' : 'Reference'}>
                    <input
                      className={inputClass}
                      value={bankReference}
                      onChange={(e) => setBankReference(e.target.value)}
                    />
                  </FormField>
                  <FormField label={t('admin.proofFile')} hint={t('admin.proofFileHint')}>
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      className={inputClass}
                      onChange={(e) => setProofFile(e.target.files?.[0] || null)}
                    />
                  </FormField>
                </div>
                {proofFile && <p className="text-xs text-muted">📎 {proofFile.name}</p>}
                <Button onClick={recordDisbursement}>{t('admin.registerDisbursement')}</Button>
                <p className="text-xs text-muted">{t('admin.disburseStepCombinedHint')}</p>
              </div>
            )}

            {custody.status === 'open' && (
              <div className="flex flex-wrap gap-2 items-center">
                <input
                  className={`${inputClass} !w-40`}
                  type="number"
                  placeholder={t('admin.topUpAmount')}
                  value={topUpAmount}
                  onChange={(e) => setTopUpAmount(e.target.value)}
                />
                <Button variant="ghost" onClick={topUp}>{t('admin.topUp')}</Button>
              </div>
            )}
          </div>
        )}
      </Card>

      <Card title={t('pa.custodyInvoices')} noPadding>
        <DataTable
          columns={[
            { key: 'ref', header: '#', render: (i) => <b>{i.referenceNumber}</b>, exportValue: (i) => i.referenceNumber },
            { key: 'sup', header: t('pa.supplier'), render: (i) => i.supplier || '—', exportValue: (i) => i.supplier || '' },
            { key: 'amt', header: t('common.amount'), render: (i) => <Amount>{formatMoney(i.total, lang)}</Amount>, exportValue: (i) => String(i.total) },
            { key: 'date', header: t('common.date'), render: (i) => formatDate(i.invoiceDate, lang), exportValue: (i) => formatDate(i.invoiceDate, lang) },
            { key: 'st', header: t('common.status'), render: (i) => <StatusChip status={i.status} label={statusLabel(i.status, t)} />, exportValue: (i) => statusLabel(i.status, t) },
            {
              key: 'act',
              header: '',
              exportable: false,
              render: (i) => <Button size="sm" variant="ghost" onClick={() => setDetailId(i._id)}>{t('common.view')}</Button>,
            },
          ]}
          data={invoices}
          loading={loading}
          onRefresh={load}
          emptyText={t('pa.noInvoicesInCustody')}
        />
      </Card>

      {custody.status === 'settled' && (custody.accrualEntry?.length || custody.disbursementEntry?.length) ? (
        <Card title={lang === 'ar' ? 'القيود المحاسبية' : 'Journal entries'} className="!p-4">
          {custody.accrualEntry && custody.accrualEntry.length > 0 && (
            <JournalTable
              lang={lang}
              title={lang === 'ar' ? 'استحقاق مشتريات الموقع' : 'Site purchases accrual'}
              tag={lang === 'ar' ? 'قيد استحقاق' : 'Accrual'}
              lines={custody.accrualEntry}
            />
          )}
          {custody.disbursementEntry && custody.disbursementEntry.length > 0 && (
            <JournalTable
              lang={lang}
              title={lang === 'ar' ? 'إعادة شحن العهدة بنكياً' : 'Bank disbursement'}
              tag={lang === 'ar' ? 'قيد الصرف' : 'Disbursement'}
              lines={custody.disbursementEntry}
            />
          )}
          {(custody.accrualEntry?.length || custody.disbursementEntry?.length) ? (
            <JournalCrossBalance
              accrualLines={custody.accrualEntry ?? []}
              disbursementLines={custody.disbursementEntry ?? []}
              lang={lang}
            />
          ) : null}
        </Card>
      ) : null}

      <InvoiceDetailModal invoiceId={detailId} onClose={() => setDetailId(null)} />
    </div>
  );
}

type ReportTab = 'manager' | 'accountant' | 'chief' | 'project';

type AdminReportData = Awaited<ReturnType<typeof dashboardService.adminReports>>;

export function AdminReportsPage() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const [projectId, setProjectId] = useState('');
  const [tab, setTab] = useState<ReportTab>('manager');

  const { data: projectsData } = useQuery({
    queryKey: queryKeys.projects.list({ limit: 200, page: 1 }),
    queryFn: ({ signal }) => projectService.list({ limit: 200, page: 1 }, { signal }),
    staleTime: CACHE.reference.staleTime,
    gcTime: CACHE.reference.gcTime,
  });
  const projects = projectsData?.items ?? [];

  const { data, isLoading, isFetching, isError, refetch } = useQuery({
    queryKey: queryKeys.dashboard.adminReports(projectId),
    queryFn: ({ signal }) => dashboardService.adminReports(projectId || undefined, { signal }),
    staleTime: CACHE.dashboard.staleTime,
    gcTime: CACHE.dashboard.gcTime,
  });

  const table = useServerTable();

  const nameOf = (row: { name?: string; nameEn?: string }) =>
    lang === 'ar' ? (row.name || row.nameEn || '—') : (row.nameEn || row.name || '—');

  useEffect(() => {
    table.setPage(1);
  }, [tab, projectId]);

  const tableRows = useMemo(() => {
    if (!data) return [];
    let rows: AdminReportData['byManager'] | AdminReportData['byAccountant'] | AdminReportData['byChief'] | AdminReportData['byProject'];
    if (tab === 'manager') rows = data.byManager;
    else if (tab === 'accountant') rows = data.byAccountant;
    else if (tab === 'chief') rows = data.byChief;
    else rows = data.byProject;

    const q = table.debouncedQuery.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => nameOf(r).toLowerCase().includes(q));
  }, [data, tab, table.debouncedQuery, lang]);

  const totalPages = Math.max(1, Math.ceil(tableRows.length / table.pageSize) || 1);
  const paginatedRows = useMemo(() => {
    const start = (table.page - 1) * table.pageSize;
    return tableRows.slice(start, start + table.pageSize);
  }, [tableRows, table.page, table.pageSize]);

  const tabs: { id: ReportTab; label: string }[] = [
    { id: 'manager', label: t('admin.reportManagers') },
    { id: 'accountant', label: t('admin.reportAccountants') },
    { id: 'chief', label: t('admin.reportChief') },
    { id: 'project', label: t('admin.reportProjects') },
  ];

  const columns = useMemo(() => {
    if (tab === 'manager') {
      return [
        { key: 'name', header: t('pm.projectManager'), render: (r: AdminReportData['byManager'][0]) => nameOf(r), exportValue: (r: AdminReportData['byManager'][0]) => nameOf(r) },
        { key: 'count', header: t('admin.custodiesCount'), render: (r: AdminReportData['byManager'][0]) => r.custodiesCount, exportValue: (r: AdminReportData['byManager'][0]) => String(r.custodiesCount) },
        { key: 'alloc', header: t('admin.totalAllocated'), render: (r: AdminReportData['byManager'][0]) => <Amount>{formatMoney(r.totalAllocated, lang)}</Amount>, exportValue: (r: AdminReportData['byManager'][0]) => String(r.totalAllocated) },
        { key: 'spent', header: t('admin.totalSpent'), render: (r: AdminReportData['byManager'][0]) => <Amount>{formatMoney(r.totalSpent, lang)}</Amount>, exportValue: (r: AdminReportData['byManager'][0]) => String(r.totalSpent) },
        { key: 'settled', header: t('admin.settledCount'), render: (r: AdminReportData['byManager'][0]) => r.settledCount, exportValue: (r: AdminReportData['byManager'][0]) => String(r.settledCount) },
        { key: 'over', header: t('admin.overBudgetCount'), render: (r: AdminReportData['byManager'][0]) => r.overBudgetCount, exportValue: (r: AdminReportData['byManager'][0]) => String(r.overBudgetCount) },
      ];
    }
    if (tab === 'accountant') {
      return [
        { key: 'name', header: t('admin.reportAccountants'), render: (r: AdminReportData['byAccountant'][0]) => nameOf(r), exportValue: (r: AdminReportData['byAccountant'][0]) => nameOf(r) },
        { key: 'rev', header: t('admin.reviewedCount'), render: (r: AdminReportData['byAccountant'][0]) => r.reviewedCount, exportValue: (r: AdminReportData['byAccountant'][0]) => String(r.reviewedCount) },
        { key: 'app', header: t('admin.approvedCount'), render: (r: AdminReportData['byAccountant'][0]) => r.approvedCount, exportValue: (r: AdminReportData['byAccountant'][0]) => String(r.approvedCount) },
        { key: 'rej', header: t('admin.rejectedCount'), render: (r: AdminReportData['byAccountant'][0]) => r.rejectedCount, exportValue: (r: AdminReportData['byAccountant'][0]) => String(r.rejectedCount) },
        { key: 'amt', header: t('admin.totalReviewedAmount'), render: (r: AdminReportData['byAccountant'][0]) => <Amount>{formatMoney(r.totalReviewedAmount, lang)}</Amount>, exportValue: (r: AdminReportData['byAccountant'][0]) => String(r.totalReviewedAmount) },
      ];
    }
    if (tab === 'chief') {
      return [
        { key: 'name', header: t('admin.reportChief'), render: (r: AdminReportData['byChief'][0]) => nameOf(r), exportValue: (r: AdminReportData['byChief'][0]) => nameOf(r) },
        { key: 'settled', header: t('admin.settledCount'), render: (r: AdminReportData['byChief'][0]) => r.settledCount, exportValue: (r: AdminReportData['byChief'][0]) => String(r.settledCount) },
        { key: 'rej', header: t('admin.rejectedCount'), render: (r: AdminReportData['byChief'][0]) => r.rejectedCount, exportValue: (r: AdminReportData['byChief'][0]) => String(r.rejectedCount) },
      ];
    }
    return [
      { key: 'name', header: t('common.project'), render: (r: AdminReportData['byProject'][0]) => nameOf(r), exportValue: (r: AdminReportData['byProject'][0]) => nameOf(r) },
      { key: 'count', header: t('admin.custodiesCount'), render: (r: AdminReportData['byProject'][0]) => r.custodiesCount, exportValue: (r: AdminReportData['byProject'][0]) => String(r.custodiesCount) },
      { key: 'budget', header: t('admin.projectBudget'), render: (r: AdminReportData['byProject'][0]) => formatMoney(r.budget || 0, lang), exportValue: (r: AdminReportData['byProject'][0]) => String(r.budget || 0) },
      { key: 'spent', header: t('admin.totalSpent'), render: (r: AdminReportData['byProject'][0]) => <Amount>{formatMoney(r.totalSpent, lang)}</Amount>, exportValue: (r: AdminReportData['byProject'][0]) => String(r.totalSpent) },
      { key: 'settled', header: t('admin.settledCount'), render: (r: AdminReportData['byProject'][0]) => r.settledCount, exportValue: (r: AdminReportData['byProject'][0]) => String(r.settledCount) },
      { key: 'over', header: t('admin.overBudgetCount'), render: (r: AdminReportData['byProject'][0]) => r.overBudgetCount, exportValue: (r: AdminReportData['byProject'][0]) => String(r.overBudgetCount) },
    ];
  }, [tab, lang, t]);

  const totals = data?.totals;

  return (
    <div className="space-y-4">
      <Notice icon="📊">{t('admin.reportsNotice')}</Notice>

      <Card className="!p-0 overflow-hidden">
        <div className="p-4 flex flex-wrap gap-3 items-end">
          <FormField label={t('common.project')} className="min-w-[240px] flex-1">
            <select className={selectClass} value={projectId} onChange={(e) => setProjectId(e.target.value)}>
              <option value="">{t('admin.allProjects')}</option>
              {projects.map((p) => (
                <option key={entityId(p)} value={entityId(p)}>{projectName(p, lang)}</option>
              ))}
            </select>
          </FormField>
        </div>
      </Card>

      {totals && (
        <StatsGrid>
          <StatCard icon="📦" label={t('admin.custodiesCount')} value={totals.custodiesCount} color="blue" />
          <StatCard icon="💰" label={t('admin.totalSpent')} value={formatMoney(totals.totalSpent, lang)} color="green" />
          <StatCard icon="✔" label={t('admin.settledCount')} value={totals.settledCount} color="amber" />
          <StatCard icon="🧾" label={t('admin.invoiceCount')} value={totals.invoiceCount} color="red" />
        </StatsGrid>
      )}

      <div className="flex flex-wrap gap-2">
        {tabs.map((item) => (
          <Button
            key={item.id}
            size="sm"
            variant={tab === item.id ? 'primary' : 'ghost'}
            onClick={() => setTab(item.id)}
          >
            {item.label}
          </Button>
        ))}
      </div>

      <Card title={tabs.find((x) => x.id === tab)?.label} noPadding>
        <DataTable
          columns={columns as never}
          data={paginatedRows as never}
          loading={isLoading}
          fetching={isFetching}
          error={isError}
          query={table.query}
          onQueryChange={table.setQuery}
          searchPlaceholder={t('common.search')}
          onReset={table.reset}
          onRefresh={() => { void refetch(); }}
          shown={paginatedRows.length}
          total={tableRows.length}
          pagination={{
            page: table.page,
            totalPages,
            total: tableRows.length,
            pageSize: table.pageSize,
            onPageChange: table.setPage,
          }}
          exportFilename={`admin-report-${tab}`}
          exportTitle={tabs.find((x) => x.id === tab)?.label || t('admin.reports')}
          exportLang={lang}
          emptyText={t('common.noData')}
        />
      </Card>
    </div>
  );
}

const BALANCE_CHIP: Record<JournalCompareStatus, { ar: string; en: string; variant: 'green' | 'amber' | 'red' }> = {
  balanced: { ar: 'متوازن ✓', en: 'Balanced ✓', variant: 'green' },
  surplus: { ar: 'فائض', en: 'Surplus', variant: 'amber' },
  deficit: { ar: 'عجز', en: 'Deficit', variant: 'red' },
};

export function AdminVouchersPage() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const { runAction } = useUi();
  const invalidate = useInvalidateQueries();
  const [proofFiles, setProofFiles] = useState<Record<string, File | null>>({});
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [methods, setMethods] = useState<Record<string, string>>({});
  const [bankRefs, setBankRefs] = useState<Record<string, string>>({});
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [pendingQuery, setPendingQuery] = useState('');
  const [pendingProjectId, setPendingProjectId] = useState('');
  const [pendingBalance, setPendingBalance] = useState<'all' | JournalCompareStatus>('all');

  const {
    data: pending = [],
    isLoading: pendingLoading,
    isFetching: pendingFetching,
    refetch: refetchPending,
  } = useQuery({
    queryKey: queryKeys.custodies.disbursementQueue(),
    queryFn: () => custodyService.disbursementQueue(),
    staleTime: CACHE.transactional.staleTime,
    gcTime: CACHE.transactional.gcTime,
  });

  const vouchersTable = useServerDataTable<Voucher>({
    queryKey: queryKeys.dashboard.vouchers(),
    queryFn: (params, signal) => dashboardService.vouchers(params, { signal }),
    staleTime: CACHE.transactional.staleTime,
    gcTime: CACHE.transactional.gcTime,
  });

  const loading = pendingLoading || vouchersTable.isLoading;
  const refreshAll = async () => {
    await Promise.all([refetchPending(), vouchersTable.refetch()]);
  };

  const pendingProjects = useMemo(() => {
    const map = new Map<string, Project>();
    pending.forEach((c) => map.set(entityId(c.project), c.project as Project));
    return [...map.values()];
  }, [pending]);

  const filteredPending = useMemo(() => {
    const q = pendingQuery.trim().toLowerCase();
    return pending.filter((c) => {
      const disburseAmt = amounts[c._id] ? Number(amounts[c._id]) : disbursementTotal(c);
      const cmp = compareAccrualDisbursement(
        c.accrualEntry ?? [],
        disbursementPreviewForCustody(c, disburseAmt),
      );
      if (pendingProjectId && entityId(c.project) !== pendingProjectId) return false;
      if (pendingBalance !== 'all' && cmp.status !== pendingBalance) return false;
      if (!q) return true;
      return (
        c.custodyNumber.toLowerCase().includes(q)
        || userName(c.holder, lang).toLowerCase().includes(q)
        || projectName(c.project, lang).toLowerCase().includes(q)
      );
    });
  }, [pending, pendingQuery, pendingProjectId, pendingBalance, amounts, lang]);

  const registerDisbursement = (custody: Custody) => {
    const proofFile = proofFiles[custody._id];
    const defaultAmt = disbursementTotal(custody);
    const amt = amounts[custody._id] ? Number(amounts[custody._id]) : defaultAmt;
    if (!amt || amt <= 0) return showToast(t('admin.disburseAmountRequired'), 'error');
    if (!proofFile) return showToast(t('admin.proofRequired'), 'error');
    runAction(async () => {
      const proof = await proofPayloadFromFile(proofFile);
      await custodyService.disburse(custody._id, {
        proof,
        amount: amt,
        method: methods[custody._id] || 'bank_transfer',
        bankReference: bankRefs[custody._id] || undefined,
      });
      setProofFiles((prev) => ({ ...prev, [custody._id]: null }));
      await invalidate.custodies();
      await invalidate.dashboard();
    }, { success: t('admin.voucherRegistered') });
  };

  const methodLabel = (method: string) =>
    method === 'bank_transfer'
      ? (lang === 'ar' ? 'تحويل بنكي' : 'Bank transfer')
      : (lang === 'ar' ? 'شيك' : 'Check');

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Notice icon="🧾">{t('admin.vouchersNotice')}</Notice>
        <RefreshButton onRefresh={refreshAll} loading={loading || pendingFetching || vouchersTable.isFetching} />
      </div>

      <Card title={`⏳ ${t('admin.pendingDisbursement')}`} className="!p-0 overflow-hidden">
        <div className="px-4 py-3 border-b border-[#eef1f6] bg-[#f8fafc] flex flex-wrap gap-3 items-end">
          <FormField label={t('common.search')} className="min-w-[200px] flex-1">
            <input
              className={inputClass}
              placeholder={lang === 'ar' ? 'رقم العهدة، مدير، مشروع...' : 'Custody, manager, project...'}
              value={pendingQuery}
              onChange={(e) => setPendingQuery(e.target.value)}
            />
          </FormField>
          <FormField label={t('common.project')} className="min-w-[180px]">
            <select className={selectClass} value={pendingProjectId} onChange={(e) => setPendingProjectId(e.target.value)}>
              <option value="">{t('admin.allProjects')}</option>
              {pendingProjects.map((p) => (
                <option key={entityId(p)} value={entityId(p)}>{projectName(p, lang)}</option>
              ))}
            </select>
          </FormField>
          <FormField label={lang === 'ar' ? 'حالة التوازن' : 'Balance'} className="min-w-[160px]">
            <select
              className={selectClass}
              value={pendingBalance}
              onChange={(e) => setPendingBalance(e.target.value as typeof pendingBalance)}
            >
              <option value="all">{t('common.all')}</option>
              <option value="balanced">{lang === 'ar' ? 'متوازن ✓' : 'Balanced'}</option>
              <option value="surplus">{lang === 'ar' ? 'فائض' : 'Surplus'}</option>
              <option value="deficit">{lang === 'ar' ? 'عجز' : 'Deficit'}</option>
            </select>
          </FormField>
          <span className="text-[11px] text-muted font-bold pb-2">
            {filteredPending.length} / {pending.length}
          </span>
        </div>

        {loading ? (
          <div className="p-4"><PageLoader compact /></div>
        ) : pending.length === 0 ? (
          <p className="text-sm text-muted text-center py-6">{t('admin.noPendingDisbursement')}</p>
        ) : filteredPending.length === 0 ? (
          <p className="text-sm text-muted text-center py-6">{t('common.noData')}</p>
        ) : (
          <div className="p-4 space-y-3">
            {filteredPending.map((c) => {
              const pendingInvoices = disbursementEligibleInvoices(c.invoices);
              const disburseAmt = amounts[c._id] ? Number(amounts[c._id]) : disbursementTotal(c);
              const accrualLines = c.accrualEntry ?? [];
              const disburseLines = disbursementPreviewForCustody(c, disburseAmt);
              const cmp = compareAccrualDisbursement(accrualLines, disburseLines);
              const balanceLabel = BALANCE_CHIP[cmp.status];

              return (
                <details
                  key={c._id}
                  className="group rounded-xl border border-[#e3e9f2] bg-white shadow-sm overflow-hidden"
                >
                  <summary className="flex flex-wrap items-center gap-3 p-4 cursor-pointer list-none hover:bg-[#f9fbfe] [&::-webkit-details-marker]:hidden">
                    <span className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 grid place-items-center font-bold shrink-0">⏳</span>
                    <div className="flex-1 min-w-[180px]">
                      <div className="font-extrabold text-navy">{c.custodyNumber}</div>
                      <div className="text-xs text-muted mt-0.5">
                        {userName(c.holder, lang)} · {projectName(c.project, lang)}
                      </div>
                    </div>
                    <Chip variant={balanceLabel.variant}>
                      {lang === 'ar' ? balanceLabel.ar : balanceLabel.en}
                      {cmp.status !== 'balanced' && ` · ${formatMoney(cmp.diff, lang)}`}
                    </Chip>
                    <Amount>{formatMoney(disburseAmt, lang)}</Amount>
                    <span className="text-muted group-open:rotate-180 transition-transform">▾</span>
                  </summary>

                  <div className="px-4 pb-4 border-t border-[#eef1f6] pt-4 space-y-3 bg-[#fcfdfe]">
                    {pendingInvoices.length > 0 && (
                      <div className="text-xs text-brand-700 font-bold">
                        {pendingInvoices.map((i) => `${i.referenceNumber} (${formatMoney(i.total, lang)})`).join(' · ')}
                      </div>
                    )}

                    {accrualLines.length > 0 && (
                      <JournalTable
                        lang={lang}
                        title={lang === 'ar' ? 'استحقاق مشتريات الموقع' : 'Site purchases accrual'}
                        tag={lang === 'ar' ? 'قيد استحقاق مسجل' : 'Posted accrual'}
                        lines={accrualLines}
                      />
                    )}
                    {disburseLines.length > 0 && (
                      <JournalTable
                        lang={lang}
                        title={lang === 'ar' ? 'إعادة شحن العهدة بنكياً' : 'Bank disbursement'}
                        tag={lang === 'ar' ? 'معاينة قيد الصرف' : 'Disbursement preview'}
                        lines={disburseLines}
                      />
                    )}
                    <JournalCrossBalance accrualLines={accrualLines} disbursementLines={disburseLines} lang={lang} />

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                      <FormField label={t('admin.disburseAmountLabel')}>
                        <input
                          className={inputClass}
                          type="number"
                          placeholder={formatMoney(disbursementTotal(c), lang)}
                          value={amounts[c._id] || ''}
                          onChange={(e) => setAmounts((prev) => ({ ...prev, [c._id]: e.target.value }))}
                        />
                      </FormField>
                      <FormField label={t('admin.proofFile')} hint={t('admin.proofFileHint')}>
                        <input
                          type="file"
                          accept="image/*,application/pdf"
                          className={inputClass}
                          onChange={(e) =>
                            setProofFiles((prev) => ({ ...prev, [c._id]: e.target.files?.[0] || null }))
                          }
                        />
                      </FormField>
                      <FormField label={lang === 'ar' ? 'طريقة التحويل' : 'Method'}>
                        <select
                          className={selectClass}
                          value={methods[c._id] || 'bank_transfer'}
                          onChange={(e) => setMethods((prev) => ({ ...prev, [c._id]: e.target.value }))}
                        >
                          <option value="bank_transfer">{lang === 'ar' ? 'تحويل بنكي' : 'Bank transfer'}</option>
                          <option value="check">{lang === 'ar' ? 'شيك' : 'Check'}</option>
                        </select>
                      </FormField>
                      <FormField label={lang === 'ar' ? 'رقم العملية' : 'Reference'}>
                        <input
                          className={inputClass}
                          value={bankRefs[c._id] || ''}
                          onChange={(e) => setBankRefs((prev) => ({ ...prev, [c._id]: e.target.value }))}
                        />
                      </FormField>
                    </div>
                    {proofFiles[c._id] && (
                      <p className="text-xs text-muted">📎 {proofFiles[c._id]!.name}</p>
                    )}
                    <Button onClick={() => registerDisbursement(c)}>{t('admin.registerVoucher')}</Button>
                  </div>
                </details>
              );
            })}
          </div>
        )}
      </Card>

      <Card title={`🗄️ ${t('admin.vouchersArchive')}`}>
        <div className="px-4 py-3 border-b border-[#eef1f6] bg-[#f8fafc]">
          <FormField label={t('common.search')} className="max-w-md">
            <input
              className={inputClass}
              value={vouchersTable.table.query}
              onChange={(e) => vouchersTable.table.setQuery(e.target.value)}
              placeholder={lang === 'ar' ? 'رقم السند · المرجع البنكي' : 'Voucher # · bank reference'}
            />
          </FormField>
        </div>
        {vouchersTable.isLoading ? (
          <PageLoader compact />
        ) : vouchersTable.items.length === 0 ? (
          <p className="text-sm text-muted text-center py-6">{t('common.noData')}</p>
        ) : (
          <div className="space-y-3">
            {vouchersTable.items.map((v) => {
              const linked = v.custody;
              const proof = v.proofUrl || linked?.disbursementProof;
              return (
                <CustodyArchiveCard
                  key={v._id}
                  title={`${v.voucherNumber} — ${userName(v.beneficiary, lang)}`}
                  subtitle={[
                    formatDate(v.voucherDate || v.createdAt, lang),
                    linked?.custodyNumber,
                    projectName(v.project || linked?.project, lang),
                    methodLabel(v.method),
                  ].filter(Boolean).join(' · ')}
                  total={`${formatMoney(v.amount, lang)} ${t('common.sar')}`}
                  status={<StatusChip status="settled" label={t('nav.vouchers')} />}
                >
                  {proof && (
                    <div className="mb-3">
                      <Button size="sm" variant="ghost" onClick={() => setLightboxUrl(proof)}>
                        📎 {t('admin.paymentProof')}
                      </Button>
                    </div>
                  )}
                  {v.accrualEntry && v.accrualEntry.length > 0 && (
                    <JournalTable
                      lang={lang}
                      title={lang === 'ar' ? 'استحقاق مشتريات الموقع' : 'Site purchases accrual'}
                      tag={lang === 'ar' ? 'قيد استحقاق' : 'Accrual'}
                      lines={v.accrualEntry}
                    />
                  )}
                  {v.disbursementEntry && v.disbursementEntry.length > 0 && (
                    <JournalTable
                      lang={lang}
                      title={lang === 'ar' ? 'إعادة شحن العهدة بنكياً' : 'Bank disbursement'}
                      tag={lang === 'ar' ? 'قيد الصرف' : 'Disbursement'}
                      lines={v.disbursementEntry}
                    />
                  )}
                  {v.accrualEntry?.length && v.disbursementEntry?.length ? (
                    <JournalCrossBalance
                      accrualLines={v.accrualEntry}
                      disbursementLines={v.disbursementEntry}
                      lang={lang}
                    />
                  ) : null}
                </CustodyArchiveCard>
              );
            })}
          </div>
        )}
        {!vouchersTable.isLoading && vouchersTable.total > vouchersTable.pageSize && (
          <Pagination
            page={vouchersTable.page}
            totalPages={vouchersTable.totalPages}
            total={vouchersTable.total}
            pageSize={vouchersTable.pageSize}
            onPageChange={vouchersTable.table.setPage}
          />
        )}
      </Card>

      {lightboxUrl && (
        <ImageLightbox
          images={[{ url: assetUrl(lightboxUrl), alt: t('admin.paymentProof') }]}
          index={0}
          onClose={() => setLightboxUrl(null)}
          onIndexChange={() => {}}
        />
      )}
    </div>
  );
}
