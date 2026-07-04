import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { DataTable } from '../../components/ui/DataTable';
import { StatusChip, Amount, Chip } from '../../components/ui/Chip';
import { FormField, inputClass, selectClass } from '../../components/ui/FormField';
import { PageLoader } from '../../components/ui/PageLoader';
import { InvoiceDetailModal } from '../../components/ui/InvoiceDetailModal';
import { Modal } from '../../components/ui/Modal';
import { ImageLightbox } from '../../components/ui/ImageLightbox';
import { useUi } from '../../context/UiContext';
import { custodyService, projectService, dashboardService, userService } from '../../services';
import { CustodyArchiveCard, JournalTable } from '../../components/ui/JournalBlock';
import { JournalTransactionsList } from '../../components/custody/JournalTransactionsList';
import type { Custody, CustodyTransaction, Project, User, Voucher } from '../../types';
import { formatMoney, projectName, statusLabel, formatDate, entityId, userName } from '../../utils/format';
import { custodyTotals, proofPayloadFromFile, displayInvoicesTotal, disbursementTotal, disbursementEligibleInvoices } from '../../utils/custodyHelpers';
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
  const lang = i18n.language;
  const navigate = useNavigate();
  const [custodies, setCustodies] = useState<Custody[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [managers, setManagers] = useState<User[]>([]);
  const [transactions, setTransactions] = useState<(CustodyTransaction & { custodyNumber?: string; project?: Project; holder?: User })[]>([]);
  const [loading, setLoading] = useState(true);
  const [txLoading, setTxLoading] = useState(false);
  const [tab, setTab] = useState<'custodies' | 'transactions'>('custodies');
  const [filter, setFilter] = useState<'all' | 'active' | 'done'>('all');
  const [form, setForm] = useState({ projectId: '', holderId: '', amount: 0, purpose: '' });
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [editCustody, setEditCustody] = useState<Custody | null>(null);
  const [editForm, setEditForm] = useState({ projectId: '', holderId: '', amount: 0, purpose: '' });
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [c, p, m] = await Promise.all([
        custodyService.list(),
        projectService.list(),
        userService.list({ role: 'project_manager' }),
      ]);
      setCustodies(c);
      setProjects(p);
      setManagers(m);
    } finally {
      setLoading(false);
    }
  };

  const loadTransactions = async () => {
    setTxLoading(true);
    try {
      setTransactions(await custodyService.adminTransactions());
    } catch {
      showToast(t('common.noData'), 'error');
      setTransactions([]);
    } finally {
      setTxLoading(false);
    }
  };

  useEffect(() => { load(); }, []);
  useEffect(() => { if (tab === 'transactions') loadTransactions(); }, [tab]);

  const selectedProject = projects.find((p) => entityId(p) === form.projectId);
  const defaultManagerId = selectedProject?.manager
    ? entityId(selectedProject.manager as User)
    : '';

  const filtered = useMemo(() => {
    if (filter === 'active') {
      return custodies.filter((c) => !['settled', 'pm_rejected', 'finance_rejected'].includes(c.status));
    }
    if (filter === 'done') {
      return custodies.filter((c) => ['settled', 'pm_rejected', 'finance_rejected'].includes(c.status));
    }
    return custodies;
  }, [custodies, filter]);

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
        await load();
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
      await load();
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
          onRefresh={() => (tab === 'transactions' ? loadTransactions() : load())}
          loading={tab === 'transactions' ? txLoading : loading}
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
              onClick={() => setFilter(key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                filter === key ? 'bg-brand-500 text-white' : 'bg-[#f7f9fc] text-muted hover:bg-brand-50'
              }`}
            >
              {t(`admin.filter.${key}`)}
            </button>
          ))}
        </div>
        <DataTable
          columns={columns}
          data={filtered}
          loading={loading}
          onRefresh={load}
          emptyText={loading ? t('common.loading') : t('common.noData')}
          exportFilename="admin-custodies"
          exportTitle={t('admin.allCustodies')}
        />
      </Card>
      ) : (
      <JournalTransactionsList
        rows={transactions}
        loading={txLoading}
        onRefresh={loadTransactions}
        showProject
        showManager
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
          images={[{ url: lightboxUrl, alt: t('admin.paymentProof') }]}
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

      <InvoiceDetailModal invoiceId={detailId} onClose={() => setDetailId(null)} />
    </div>
  );
}

type ReportTab = 'manager' | 'accountant' | 'chief' | 'project';

type AdminReportData = Awaited<ReturnType<typeof dashboardService.adminReports>>;

export function AdminReportsPage() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectId, setProjectId] = useState('');
  const [tab, setTab] = useState<ReportTab>('manager');
  const [data, setData] = useState<AdminReportData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { projectService.list().then(setProjects); }, []);

  const load = () => {
    setLoading(true);
    return dashboardService.adminReports(projectId || undefined)
      .then(setData)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [projectId]);

  const nameOf = (row: { name?: string; nameEn?: string }) =>
    lang === 'ar' ? (row.name || row.nameEn || '—') : (row.nameEn || row.name || '—');

  const tabs: { id: ReportTab; label: string }[] = [
    { id: 'manager', label: t('admin.reportManagers') },
    { id: 'accountant', label: t('admin.reportAccountants') },
    { id: 'chief', label: t('admin.reportChief') },
    { id: 'project', label: t('admin.reportProjects') },
  ];

  const tableRows = useMemo(() => {
    if (!data) return [];
    if (tab === 'manager') return data.byManager;
    if (tab === 'accountant') return data.byAccountant;
    if (tab === 'chief') return data.byChief;
    return data.byProject;
  }, [data, tab]);

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
          data={tableRows as never}
          loading={loading}
          onRefresh={load}
          exportFilename={`admin-report-${tab}`}
          exportTitle={tabs.find((x) => x.id === tab)?.label || t('admin.reports')}
          exportLang={lang}
          emptyText={t('common.noData')}
        />
      </Card>
    </div>
  );
}

export function AdminVouchersPage() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const { runAction } = useUi();
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [pending, setPending] = useState<Custody[]>([]);
  const [loading, setLoading] = useState(true);
  const [proofFiles, setProofFiles] = useState<Record<string, File | null>>({});
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [methods, setMethods] = useState<Record<string, string>>({});
  const [bankRefs, setBankRefs] = useState<Record<string, string>>({});
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [v, queue] = await Promise.all([
        dashboardService.vouchers(),
        custodyService.disbursementQueue(),
      ]);
      setVouchers(v);
      setPending(queue);
    } catch {
      showToast(t('common.noData'), 'error');
      setVouchers([]);
      setPending([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

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
      await load();
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
        <RefreshButton onRefresh={load} loading={loading} />
      </div>

      <Card title={`⏳ ${t('admin.pendingDisbursement')}`}>
        {loading ? (
          <PageLoader compact />
        ) : pending.length === 0 ? (
          <p className="text-sm text-muted text-center py-6">{t('admin.noPendingDisbursement')}</p>
        ) : (
          <div className="space-y-4">
            {pending.map((c) => {
              const pendingInvoices = disbursementEligibleInvoices(c.invoices);
              return (
              <div key={c._id} className="p-4 rounded-xl border border-[#e3e9f2] bg-[#f9fbfe] space-y-3">
                <div className="flex flex-wrap justify-between gap-2">
                  <div>
                    <div className="font-extrabold text-navy">{c.custodyNumber}</div>
                    <div className="text-sm text-muted">
                      {userName(c.holder, lang)} · {projectName(c.project, lang)}
                    </div>
                    {pendingInvoices.length > 0 && (
                      <div className="text-xs text-brand-700 font-bold mt-1">
                        {pendingInvoices.map((i) => `${i.referenceNumber} (${formatMoney(i.total, lang)})`).join(' · ')}
                      </div>
                    )}
                  </div>
                  <Amount>{formatMoney(disbursementTotal(c), lang)}</Amount>
                </div>
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
            );})}
          </div>
        )}
      </Card>

      <Card title={`🗄️ ${t('admin.vouchersArchive')}`}>
        {loading ? (
          <PageLoader compact />
        ) : vouchers.length === 0 ? (
          <p className="text-sm text-muted text-center py-6">{t('common.noData')}</p>
        ) : (
          <div className="space-y-3">
            {vouchers.map((v) => {
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
                      title={lang === 'ar' ? 'استحقاق مشتريات الموقع' : 'Site purchases accrual'}
                      tag={lang === 'ar' ? 'قيد استحقاق' : 'Accrual'}
                      lines={v.accrualEntry}
                    />
                  )}
                  {v.disbursementEntry && v.disbursementEntry.length > 0 && (
                    <JournalTable
                      title={lang === 'ar' ? 'إعادة شحن العهدة بنكياً' : 'Bank disbursement'}
                      tag={lang === 'ar' ? 'قيد الصرف' : 'Disbursement'}
                      lines={v.disbursementEntry}
                    />
                  )}
                </CustodyArchiveCard>
              );
            })}
          </div>
        )}
      </Card>

      {lightboxUrl && (
        <ImageLightbox
          images={[{ url: lightboxUrl, alt: t('admin.paymentProof') }]}
          index={0}
          onClose={() => setLightboxUrl(null)}
          onIndexChange={() => {}}
        />
      )}
    </div>
  );
}
