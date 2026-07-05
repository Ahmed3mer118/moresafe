import { useEffect, useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { StatCard, StatsGrid } from '../../components/ui/StatCard';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { DataTable } from '../../components/ui/DataTable';
import { Notice } from '../../components/ui/Notice';
import { StatusChip, Amount } from '../../components/ui/Chip';
import { FormField, inputClass, selectClass } from '../../components/ui/FormField';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { ProjectBarChart } from '../../components/charts/LazyCharts';
import { dashboardService, custodyService, projectService, userService, invoiceService } from '../../services';
import type { Custody, Project, User, Invoice } from '../../types';
import { useFormDraft } from '../../hooks/useFormDraft';
import { useServerDataTable } from '../../hooks/useServerDataTable';
import { usePaginatedQuery } from '../../hooks/usePaginatedQuery';
import { useServerTable } from '../../hooks/useServerTable';
import { useInvalidateQueries } from '../../hooks/useInvalidateQueries';
import { queryKeys } from '../../lib/queryKeys';
import { CACHE } from '../../lib/cachePolicy';
import { useUi } from '../../context/UiContext';
import { formatMoney, projectName, userName, invoiceManagerName, statusLabel, entityId, formatDate, managersFromProjects } from '../../utils/format';
import { chartOrFallback, formatHours } from '../../utils/chartData';
import { showToast } from '../../utils/toast';
import { InvoiceDetailModal } from '../../components/ui/InvoiceDetailModal';
import { RejectReasonModal } from '../../components/ui/RejectReasonModal';
import { PageLoader } from '../../components/ui/PageLoader';
import { RefreshButton } from '../../components/ui/RefreshButton';
import { Pagination } from '../../components/ui/Pagination';
import { CustodyReviewCard } from '../../components/custody/CustodyReviewCard';
import { displayInvoicesTotal } from '../../utils/custodyHelpers';
import { BudgetOverview } from '../../components/budget/BudgetOverview';
import { summarizeProjects } from '../../utils/budgetHelpers';

const PA_ARCHIVE_OUTCOME_STATUSES = {
  approved: ['pm_approved', 'finance_pending', 'settled'],
  rejected: ['pm_rejected', 'finance_rejected'],
} as const;

function invoiceColumns(
  t: TFunction,
  i18n: { language: string },
  onView: (id: string) => void,
) {
  return [
    {
      key: 'ref',
      header: t('pm.invoice'),
      exportHeader: t('pm.invoice'),
      render: (inv: Invoice) => <span className="font-bold text-navy">{inv.referenceNumber}</span>,
      exportValue: (inv: Invoice) => inv.referenceNumber,
    },
    {
      key: 'mgr',
      header: t('pm.projectManager'),
      exportHeader: t('pm.projectManager'),
      render: (inv: Invoice) => (
        <span className="text-[#475569] font-semibold">{invoiceManagerName(inv, i18n.language)}</span>
      ),
      exportValue: (inv: Invoice) => invoiceManagerName(inv, i18n.language),
    },
    {
      key: 'sup',
      header: t('pm.supplier'),
      exportHeader: t('pm.supplier'),
      render: (inv: Invoice) => <span className="text-[#475569]">{inv.supplier || '—'}</span>,
      exportValue: (inv: Invoice) => inv.supplier || '',
    },
    {
      key: 'cat',
      header: t('pm.category'),
      exportHeader: t('pm.category'),
      render: (inv: Invoice) => <span className="text-[#475569]">{inv.category || '—'}</span>,
      exportValue: (inv: Invoice) => inv.category || '',
    },
    {
      key: 'date',
      header: t('common.date'),
      exportHeader: t('common.date'),
      render: (inv: Invoice) => (
        <span className="text-[#64748b] text-xs">
          {inv.invoiceDate ? formatDate(inv.invoiceDate, i18n.language) : '—'}
        </span>
      ),
      exportValue: (inv: Invoice) => formatDate(inv.invoiceDate, i18n.language),
    },
    {
      key: 'amt',
      header: t('common.amount'),
      exportHeader: t('common.amount'),
      render: (inv: Invoice) => <Amount>{formatMoney(inv.total, i18n.language)}</Amount>,
      exportValue: (inv: Invoice) => String(inv.total),
    },
    {
      key: 'st',
      header: t('common.status'),
      exportHeader: t('common.status'),
      render: (inv: Invoice) => <StatusChip status={inv.status} label={statusLabel(inv.status, t)} />,
      exportValue: (inv: Invoice) => statusLabel(inv.status, t),
    },
    {
      key: 'act',
      header: '',
      exportable: false,
      render: (inv: Invoice) => (
        <Button size="sm" variant="ghost" onClick={() => onView(inv._id)}>
          {t('common.view')}
        </Button>
      ),
    },
  ];
}

function invoiceApprovalColumns(
  t: TFunction,
  i18n: { language: string },
  onView: (id: string) => void,
  selectedIds: Set<string>,
  onToggle: (id: string) => void,
  onToggleAll: (ids: string[], checked: boolean) => void,
  visibleIds: string[],
) {
  const base = invoiceColumns(t, i18n, onView);
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
          aria-label={t('pm.selectAll')}
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
    ...base,
  ];
}

export function PMHomePage() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const [data, setData] = useState<Awaited<ReturnType<typeof dashboardService.projectManager>> | null>(null);
  const [pending, setPending] = useState<Custody[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [d, pRes] = await Promise.all([
        dashboardService.projectManager(),
        custodyService.list({ status: 'closed', view: 'card', limit: 100 }),
      ]);
      setData(d);
      setPending(pRes.items ?? []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const projectList = data?.projectList ?? [];
  const budgetTotals = summarizeProjects(projectList);

  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <RefreshButton onRefresh={load} loading={loading} />
      </div>
      <StatsGrid>
        <StatCard icon="🏗" label={t('pm.stats.assignedProjects')} value={data?.projects ?? 0} color="blue" trend={t('pm.stats.active')} trendUp />
        <StatCard icon="📦" label={t('pm.stats.pendingCustodies')} value={data?.pendingCustodies ?? 0} color="amber" trend={t('pm.stats.forReview')} trendUp={false} />
        <StatCard icon="👷" label={t('pm.stats.projectManagers')} value={data?.engineers ?? 0} color="green" />
        <StatCard icon="💰" label={t('pm.stats.totalSpent')} value={formatMoney(data?.totalSpent ?? 0, lang)} color="red" trend={t('common.sar')} />
      </StatsGrid>

      <Card title={`📊 ${t('budget.overviewTitle')}`}>
        <BudgetOverview
          projects={projectList}
          totals={budgetTotals}
          loading={loading}
          compact
        />
      </Card>

      {pending.length > 0 && (
        <Card title="عهد مغلقة بانتظار مراجعتي" action={<Button size="sm" variant="ghost" onClick={() => window.location.href = '/dashboard/project-accountant/approvals'}>عرض الكل ←</Button>}>
          <div className="space-y-2">
            {pending.slice(0, 3).map((c) => (
              <div key={c._id} className="flex justify-between items-center p-3 bg-[#f7f9fc] rounded-xl text-sm">
                <span><b>{c.custodyNumber}</b> — {userName(c.holder, 'ar')}</span>
                <Amount>{formatMoney(displayInvoicesTotal(c), i18n.language)}</Amount>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

export function PMApprovalsPage() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const { runAction } = useUi();
  const invalidate = useInvalidateQueries();
  const [projectId, setProjectId] = useState('');
  const [managerId, setManagerId] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [detailId, setDetailId] = useState<string | null>(null);
  const [rejectOpen, setRejectOpen] = useState(false);

  const projectsQuery = useQuery({
    queryKey: queryKeys.projects.list({ limit: 200 }),
    queryFn: ({ signal }) => projectService.list({ limit: 200 }, { signal }),
    ...CACHE.reference,
  });
  const projects = projectsQuery.data?.items ?? [];

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
    queryKey: queryKeys.invoices.list(),
    queryFn: (params, signal) => invoiceService.list(params, { signal }),
    extraFilters: { status: 'pending_pm' },
    ...CACHE.transactional,
  });

  useEffect(() => {
    table.setFilter('projectId', projectId);
    table.setFilter('managerId', managerId);
  }, [projectId, managerId, table.setFilter]);

  useEffect(() => {
    setSelectedIds((prev) => {
      const valid = new Set(invoices.map((i) => i._id));
      return new Set([...prev].filter((id) => valid.has(id)));
    });
  }, [invoices]);

  const managers = useMemo(
    () => managersFromProjects(projects, lang, projectId || undefined),
    [projects, projectId, lang],
  );

  const visibleIds = useMemo(() => invoices.map((i) => i._id), [invoices]);

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
    if (!ids.length) return showToast(t('pm.selectInvoicesFirst'), 'error');
    if (!approved) {
      setRejectOpen(true);
      return;
    }
    runAction(async () => {
      await invoiceService.batchPmReview(ids, true);
      setSelectedIds(new Set());
      invalidate.invoices();
      invalidate.custodies();
    }, { success: t('pm.invoicesApproved', { count: ids.length }) });
  };

  const confirmReject = (reason: string) => {
    const ids = [...selectedIds];
    runAction(async () => {
      await invoiceService.batchPmReview(ids, false, reason);
      setSelectedIds(new Set());
      setRejectOpen(false);
      invalidate.invoices();
      invalidate.custodies();
    }, { success: t('pm.invoicesRejected', { count: ids.length }) });
  };

  const columns = invoiceApprovalColumns(
    t,
    i18n,
    setDetailId,
    selectedIds,
    toggleOne,
    toggleAll,
    visibleIds,
  );

  return (
    <div className="space-y-4">
      <Notice icon="✔">{t('pm.approvalsNotice')}</Notice>

      <Card className="!p-0 overflow-hidden">
        <div className="px-4 py-3.5 border-b border-[#e8edf4] bg-gradient-to-r from-[#f8fafc] to-white">
          <span className="text-sm font-extrabold text-navy">{t('pm.filterApprovals')}</span>
        </div>
        <div className="p-4 flex flex-wrap gap-3 items-end">
          <FormField label={t('common.project')} className="min-w-[220px] flex-1">
            <select
              className={selectClass}
              value={projectId}
              onChange={(e) => { setProjectId(e.target.value); setManagerId(''); }}
            >
              <option value="">{t('pm.selectProject')}</option>
              {projects.map((p) => (
                <option key={entityId(p)} value={entityId(p)}>{projectName(p, lang)}</option>
              ))}
            </select>
          </FormField>
          <FormField label={t('pm.projectManager')} className="min-w-[220px] flex-1">
            <select className={selectClass} value={managerId} onChange={(e) => setManagerId(e.target.value)}>
              <option value="">{t('pm.allManagers')}</option>
              {managers.map((m) => (
                <option key={entityId(m)} value={entityId(m)}>{userName(m, lang)}</option>
              ))}
            </select>
          </FormField>
        </div>
      </Card>

      <Card title={`🧾 ${t('pm.pendingInvoices')}`} noPadding>
        <DataTable
          columns={columns}
          data={invoices}
          loading={isLoading}
          fetching={isFetching}
          error={isError ? error : undefined}
          query={table.query}
          onQueryChange={table.setQuery}
          searchPlaceholder={t('common.search')}
          onReset={table.reset}
          onRefresh={() => { void refetch(); }}
          shown={invoices.length}
          total={total}
          pagination={{
            page: table.page,
            totalPages,
            total: total,
            pageSize: table.pageSize,
            onPageChange: table.setPage,
          }}
          exportFilename="pm-pending-invoices"
          exportTitle={t('pm.pendingInvoices')}
          exportLang={lang}
          exportRowLabel={lang === 'ar' ? 'فاتورة' : 'invoices'}
          emptyText={t('pm.noPendingInvoices')}
          toolbarExtra={
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] text-muted font-bold">
                {t('pm.selectedCount', { count: selectedIds.size })}
              </span>
              <Button size="sm" disabled={!selectedIds.size} onClick={() => batchReview(true)}>
                {t('pm.approveSelected')}
              </Button>
              <Button size="sm" variant="red" disabled={!selectedIds.size} onClick={() => batchReview(false)}>
                {t('pm.rejectSelected')}
              </Button>
            </div>
          }
        />
      </Card>

      <InvoiceDetailModal invoiceId={detailId} onClose={() => setDetailId(null)} />
      <RejectReasonModal open={rejectOpen} onClose={() => setRejectOpen(false)} onConfirm={confirmReject} />
    </div>
  );
}

const ARCHIVED_INVOICE_STATUS_OPTIONS = [
  'pm_approved',
  'pm_rejected',
  'pending_finance',
  'finance_approved',
  'finance_rejected',
  'settled',
] as const;

export function PMInvoiceArchivePage() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const [projectId, setProjectId] = useState('');
  const [managerId, setManagerId] = useState('');
  const [detailId, setDetailId] = useState<string | null>(null);

  const projectsQuery = useQuery({
    queryKey: queryKeys.projects.list({ limit: 200 }),
    queryFn: ({ signal }) => projectService.list({ limit: 200 }, { signal }),
    ...CACHE.reference,
  });
  const projects = projectsQuery.data?.items ?? [];

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
    queryKey: queryKeys.invoices.list(),
    queryFn: (params, signal) => invoiceService.list(params, { signal }),
    extraFilters: { archived: 'true' },
    ...CACHE.transactional,
  });

  useEffect(() => {
    table.setFilter('projectId', projectId);
    table.setFilter('managerId', managerId);
  }, [projectId, managerId, table.setFilter]);

  useEffect(() => {
    if (table.status) {
      table.setFilter('archived', '');
    } else {
      table.setFilter('archived', 'true');
    }
  }, [table.status, table.setFilter]);

  const managers = useMemo(
    () => managersFromProjects(projects, lang, projectId || undefined),
    [projects, projectId, lang],
  );

  const statusOptions = useMemo(() => [
    { value: '', label: t('common.all') },
    ...ARCHIVED_INVOICE_STATUS_OPTIONS.map((s) => ({ value: s, label: statusLabel(s, t) })),
  ], [t]);

  const columns = invoiceColumns(t, i18n, setDetailId);

  return (
    <div className="space-y-4">
      <Notice icon="🗄️">{t('pm.archiveNotice')}</Notice>

      <Card className="!p-0 overflow-hidden">
        <div className="px-4 py-3.5 border-b border-[#e8edf4] bg-gradient-to-r from-[#f8fafc] to-white">
          <span className="text-sm font-extrabold text-navy">{t('pm.filterArchive')}</span>
        </div>
        <div className="p-4 flex flex-wrap gap-3 items-end">
          <FormField label={t('common.project')} className="min-w-[220px] flex-1">
            <select
              className={selectClass}
              value={projectId}
              onChange={(e) => { setProjectId(e.target.value); setManagerId(''); }}
            >
              <option value="">{t('pm.selectProject')}</option>
              {projects.map((p) => (
                <option key={entityId(p)} value={entityId(p)}>{projectName(p, lang)}</option>
              ))}
            </select>
          </FormField>
          <FormField label={t('pm.projectManager')} className="min-w-[220px] flex-1">
            <select className={selectClass} value={managerId} onChange={(e) => setManagerId(e.target.value)}>
              <option value="">{t('pm.allManagers')}</option>
              {managers.map((m) => (
                <option key={entityId(m)} value={entityId(m)}>{userName(m, lang)}</option>
              ))}
            </select>
          </FormField>
        </div>
      </Card>

      <Card title={`📄 ${t('pm.invoiceArchive')}`} noPadding>
        <DataTable
          columns={columns}
          data={invoices}
          loading={isLoading}
          fetching={isFetching}
          error={isError ? error : undefined}
          query={table.query}
          onQueryChange={table.setQuery}
          searchPlaceholder={t('common.search')}
          statusFilter={{
            value: table.status,
            onChange: table.setStatus,
            options: statusOptions,
          }}
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
          exportFilename="invoice-archive"
          exportTitle={t('pm.invoiceArchive')}
          exportLang={lang}
          exportRowLabel={lang === 'ar' ? 'فاتورة' : 'invoices'}
          emptyText={t('pm.noArchivedInvoices')}
        />
      </Card>

      <InvoiceDetailModal invoiceId={detailId} onClose={() => setDetailId(null)} />
    </div>
  );
}

export function PMCustodyApprovalsPage() {
  const { t, i18n } = useTranslation();
  const { runAction } = useUi();
  const [projects, setProjects] = useState<Project[]>([]);
  const [custodies, setCustodies] = useState<Custody[]>([]);
  const [loading, setLoading] = useState(true);
  const [projectId, setProjectId] = useState('');
  const [selected, setSelected] = useState('');
  const [selectedInvoiceIds, setSelectedInvoiceIds] = useState<Set<string>>(new Set());
  const [detailId, setDetailId] = useState<string | null>(null);
  const [rejectOpen, setRejectOpen] = useState(false);

  useEffect(() => {
    projectService.list({ limit: 200 }).then((res) => setProjects(res.items ?? []));
  }, []);

  const load = () => {
    const params: Record<string, string> = { queueOnly: 'true', view: 'card' };
    if (projectId) params.projectId = projectId;
    if (selected) params.holderId = selected;
    setLoading(true);
    return custodyService.list(params).then((res) => {
      const list = (res.items ?? []).filter((c) =>
        (c.invoices ?? []).some((i) => i.status === 'pending_pm'),
      );
      setCustodies(list);
      setSelectedInvoiceIds((prev) => {
        const valid = new Set<string>();
        list.forEach((c) =>
          (c.invoices ?? []).forEach((i) => {
            if (i.status === 'pending_pm' && prev.has(i._id)) valid.add(i._id);
          }),
        );
        return valid;
      });
    }).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [projectId, selected]);

  const managers = useMemo(
    () => managersFromProjects(projects, i18n.language, projectId || undefined),
    [projects, projectId, i18n.language],
  );

  const toggleCustody = (custodyId: string, invoiceIds: string[], checked: boolean) => {
    setSelectedInvoiceIds((prev) => {
      const next = new Set(prev);
      invoiceIds.forEach((id) => (checked ? next.add(id) : next.delete(id)));
      return next;
    });
    void custodyId;
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
    if (!ids.length) return showToast(t('pm.selectInvoicesFirst'), 'error');
    if (!approved) {
      setRejectOpen(true);
      return;
    }
    runAction(async () => {
      await invoiceService.batchPmReview(ids, true);
      setSelectedInvoiceIds(new Set());
      await load();
    }, { success: t('pm.invoicesApproved', { count: ids.length }) });
  };

  const confirmReject = (reason: string) => {
    const ids = [...selectedInvoiceIds];
    runAction(async () => {
      await invoiceService.batchPmReview(ids, false, reason);
      setSelectedInvoiceIds(new Set());
      setRejectOpen(false);
      await load();
    }, { success: t('pm.invoicesRejected', { count: ids.length }) });
  };

  return (
    <div className="space-y-4">
      <Notice icon="✔">{t('pm.custodyApprovalsNotice')}</Notice>

      <Card className="!p-0 overflow-hidden">
        <div className="px-4 py-3.5 border-b border-[#e8edf4] bg-gradient-to-r from-[#f8fafc] to-white flex flex-wrap items-center justify-between gap-2">
          <span className="text-sm font-extrabold text-navy">{t('pm.filterCustody')}</span>
          <RefreshButton onRefresh={load} loading={loading} />
        </div>
        <div className="p-4 flex flex-wrap gap-3 items-end">
          <FormField label={t('common.project')} className="min-w-[220px] flex-1">
            <select
              className={selectClass}
              value={projectId}
              onChange={(e) => { setProjectId(e.target.value); setSelected(''); }}
            >
              <option value="">{t('pm.selectProject')}</option>
              {projects.map((p) => (
                <option key={entityId(p)} value={entityId(p)}>{projectName(p, i18n.language)}</option>
              ))}
            </select>
          </FormField>
          <FormField label={t('pm.projectManager')} className="min-w-[220px] flex-1">
            <select className={selectClass} value={selected} onChange={(e) => setSelected(e.target.value)}>
              <option value="">{t('pm.allManagers')}</option>
              {managers.map((h) => (
                <option key={entityId(h)} value={entityId(h)}>{userName(h, i18n.language)}</option>
              ))}
            </select>
          </FormField>
        </div>
      </Card>

      <Card className="!p-0 overflow-hidden">
        <div className="px-4 py-3 flex flex-wrap items-center justify-between gap-3 border-b border-[#eef1f6] bg-[#fafbfd]">
          <span className="text-[11px] text-muted font-bold">
            {t('pm.selectedCount', { count: selectedInvoiceIds.size })}
          </span>
          <div className="flex flex-wrap items-center gap-2">
            <RefreshButton onRefresh={load} loading={loading} />
            <Button size="sm" disabled={!selectedInvoiceIds.size} onClick={() => batchReview(true)}>
              {t('pm.approveSelected')}
            </Button>
            <Button size="sm" variant="red" disabled={!selectedInvoiceIds.size} onClick={() => batchReview(false)}>
              {t('pm.rejectSelected')}
            </Button>
          </div>
        </div>
      </Card>

      {loading ? (
        <Card><PageLoader compact /></Card>
      ) : custodies.length === 0 ? (
        <Card>
          <p className="text-center text-[#64748b] py-10 text-sm">{t('pm.noPending')}</p>
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
            reviewStatus="pending_pm"
            invoiceFilter={(i) => i.status === 'pending_pm'}
          />
        ))
      )}

      <InvoiceDetailModal invoiceId={detailId} onClose={() => setDetailId(null)} />
      <RejectReasonModal open={rejectOpen} onClose={() => setRejectOpen(false)} onConfirm={confirmReject} />
    </div>
  );
}

export function PMCustodyArchivePage() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const navigate = useNavigate();
  const [projectId, setProjectId] = useState('');
  const [managerId, setManagerId] = useState('');
  const [outcomeFilter, setOutcomeFilter] = useState<'all' | 'approved' | 'rejected'>('all');

  const projectsQuery = useQuery({
    queryKey: queryKeys.projects.list({ limit: 200 }),
    queryFn: ({ signal }) => projectService.list({ limit: 200 }, { signal }),
    ...CACHE.reference,
  });
  const projects = projectsQuery.data?.items ?? [];

  const {
    table,
    items: custodies,
    total,
    totalPages,
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
  } = useServerDataTable<Custody>({
    queryKey: queryKeys.custodies.list(),
    queryFn: (params, signal) => custodyService.list(params, { signal }),
    extraFilters: { archived: 'true', view: 'table' },
    ...CACHE.transactional,
  });

  useEffect(() => {
    table.setFilter('projectId', projectId);
    table.setFilter('holderId', managerId);
  }, [projectId, managerId, table.setFilter]);

  const managers = useMemo(
    () => managersFromProjects(projects, lang, projectId || undefined),
    [projects, projectId, lang],
  );

  const displayCustodies = useMemo(() => {
    if (outcomeFilter === 'all') return custodies;
    const allowed = PA_ARCHIVE_OUTCOME_STATUSES[outcomeFilter];
    return custodies.filter((c) => (allowed as readonly string[]).includes(c.status));
  }, [custodies, outcomeFilter]);

  return (
    <div className="space-y-4">
      <Notice icon="📦">{t('pm.custodyArchiveNotice')}</Notice>

      <Card className="!p-0 overflow-hidden">
        <div className="px-4 py-3.5 border-b border-[#e8edf4] bg-gradient-to-r from-[#f8fafc] to-white">
          <span className="text-sm font-extrabold text-navy">{t('pm.filterCustody')}</span>
        </div>
        <div className="p-4 flex flex-wrap gap-3 items-end">
          <FormField label={t('common.project')} className="min-w-[220px] flex-1">
            <select
              className={selectClass}
              value={projectId}
              onChange={(e) => { setProjectId(e.target.value); setManagerId(''); }}
            >
              <option value="">{t('pm.selectProject')}</option>
              {projects.map((p) => (
                <option key={entityId(p)} value={entityId(p)}>{projectName(p, lang)}</option>
              ))}
            </select>
          </FormField>
          <FormField label={t('pm.projectManager')} className="min-w-[220px] flex-1">
            <select className={selectClass} value={managerId} onChange={(e) => setManagerId(e.target.value)}>
              <option value="">{t('pm.allManagers')}</option>
              {managers.map((h) => (
                <option key={entityId(h)} value={entityId(h)}>{userName(h, lang)}</option>
              ))}
            </select>
          </FormField>
          <FormField label={t('common.status')} className="min-w-[180px]">
            <select className={selectClass} value={outcomeFilter} onChange={(e) => setOutcomeFilter(e.target.value as typeof outcomeFilter)}>
              <option value="all">{t('common.all')}</option>
              <option value="approved">{t('pm.archiveApproved')}</option>
              <option value="rejected">{t('pm.archiveRejected')}</option>
            </select>
          </FormField>
        </div>
      </Card>

      <Card title={`📦 ${t('nav.custodyArchive')}`} noPadding>
        <DataTable
          columns={[
            {
              key: 'num',
              header: t('pa.custodyNumber'),
              render: (c: Custody) => <b className="text-brand-600">{c.custodyNumber}</b>,
              exportValue: (c: Custody) => c.custodyNumber,
            },
            {
              key: 'mgr',
              header: t('pm.projectManager'),
              render: (c: Custody) => userName(c.holder, lang),
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
              header: t('common.amount'),
              render: (c: Custody) => <Amount>{formatMoney(c.spent, lang)}</Amount>,
              exportValue: (c: Custody) => String(c.spent),
            },
            {
              key: 'inv',
              header: t('pm.invoicesLabel'),
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
              key: 'pa',
              header: t('pa.approvedBy'),
              render: (c: Custody) => (c.pmApprovedBy ? userName(c.pmApprovedBy, lang) : '—'),
              exportValue: (c: Custody) => (c.pmApprovedBy ? userName(c.pmApprovedBy, lang) : ''),
            },
            {
              key: 'date',
              header: t('common.date'),
              render: (c: Custody) => formatDate(c.closedAt || c.updatedAt, lang),
              exportValue: (c: Custody) => formatDate(c.closedAt || c.updatedAt, lang),
            },
            {
              key: 'act',
              header: '',
              exportable: false,
              render: (c: Custody) => (
                <Button size="sm" variant="ghost" onClick={() => navigate(`/dashboard/project-accountant/custody-archive/${c._id}`)}>
                  {t('common.view')}
                </Button>
              ),
            },
          ]}
          data={displayCustodies}
          loading={isLoading}
          fetching={isFetching}
          error={isError ? error : undefined}
          query={table.query}
          onQueryChange={table.setQuery}
          searchPlaceholder={t('common.search')}
          onReset={table.reset}
          onRefresh={() => { void refetch(); }}
          shown={displayCustodies.length}
          total={outcomeFilter === 'all' ? total : displayCustodies.length}
          pagination={{
            page: table.page,
            totalPages,
            total: outcomeFilter === 'all' ? total : displayCustodies.length,
            pageSize: table.pageSize,
            onPageChange: table.setPage,
          }}
          exportFilename="custody-archive"
          exportTitle={t('nav.custodyArchive')}
          exportLang={lang}
          exportRowLabel={lang === 'ar' ? 'عهدة' : 'custodies'}
          emptyText={t('pm.noArchivedCustodies')}
        />
      </Card>
    </div>
  );
}

export function PMCustodyArchiveDetailPage() {
  const { custodyId } = useParams<{ custodyId: string }>();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [custody, setCustody] = useState<Custody | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailId, setDetailId] = useState<string | null>(null);

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

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard/project-accountant/custody-archive')}>
          ← {t('pm.backToCustodyArchive')}
        </Button>
        <RefreshButton onRefresh={load} loading={loading} />
      </div>

      <CustodyReviewCard
        custody={custody}
        onView={setDetailId}
        readOnly
      />

      <InvoiceDetailModal invoiceId={detailId} onClose={() => setDetailId(null)} />
    </div>
  );
}

export function PMProjectsPage() {
  const { t, i18n } = useTranslation();
  const { runAction } = useUi();
  const invalidate = useInvalidateQueries();
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [selectedManagerId, setSelectedManagerId] = useState('');
  const [detailId, setDetailId] = useState<string | null>(null);
  const [selectedInvoiceIds, setSelectedInvoiceIds] = useState<Set<string>>(new Set());
  const [rejectOpen, setRejectOpen] = useState(false);

  const projectsQuery = useQuery({
    queryKey: queryKeys.projects.list({ limit: 200 }),
    queryFn: ({ signal }) => projectService.list({ limit: 200 }, { signal }),
    ...CACHE.reference,
  });
  const projects = projectsQuery.data?.items ?? [];

  const custodyTable = useServerTable({ pageSize: 10, extraFilters: { view: 'card' } });
  const custodyParams = useMemo(() => ({
    ...custodyTable.listParams,
    ...(selectedProjectId ? { projectId: selectedProjectId } : {}),
    ...(selectedManagerId ? { holderId: selectedManagerId } : {}),
  }), [custodyTable.listParams, selectedProjectId, selectedManagerId]);

  const {
    items: custodies,
    isLoading: custodiesLoading,
    isFetching: custodiesFetching,
    refetch: refetchCustodies,
    total: custodyTotal,
    totalPages: custodyTotalPages,
    page: custodyPage,
    pageSize: custodyPageSize,
  } = usePaginatedQuery<Custody>({
    queryKey: queryKeys.custodies.list(),
    queryFn: (params, signal) => custodyService.list(params, { signal }),
    params: custodyParams,
    enabled: Boolean(selectedProjectId && selectedManagerId),
    ...CACHE.transactional,
  });

  const selectedProject = projects.find((p) => entityId(p) === selectedProjectId);

  const managers = useMemo(
    () => managersFromProjects(projects, i18n.language, selectedProjectId || undefined),
    [projects, selectedProjectId, i18n.language],
  );

  const pendingClosed = custodies.filter((c) =>
    c.status === 'closed' && (c.invoices ?? []).some((i) => i.status === 'pending_pm'),
  );
  const openOnes = custodies.filter((c) => c.status === 'open');

  const toggleCustody = (custodyId: string, invoiceIds: string[], checked: boolean) => {
    setSelectedInvoiceIds((prev) => {
      const next = new Set(prev);
      invoiceIds.forEach((id) => (checked ? next.add(id) : next.delete(id)));
      return next;
    });
    void custodyId;
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
    if (!ids.length) return showToast(t('pm.selectInvoicesFirst'), 'error');
    if (!approved) {
      setRejectOpen(true);
      return;
    }
    runAction(async () => {
      await invoiceService.batchPmReview(ids, true);
      setSelectedInvoiceIds(new Set());
      invalidate.invoices();
      invalidate.custodies();
    }, { success: t('pm.invoicesApproved', { count: ids.length }) });
  };

  const confirmReject = (reason: string) => {
    const ids = [...selectedInvoiceIds];
    runAction(async () => {
      await invoiceService.batchPmReview(ids, false, reason);
      setSelectedInvoiceIds(new Set());
      setRejectOpen(false);
      invalidate.invoices();
      invalidate.custodies();
    }, { success: t('pm.invoicesRejected', { count: ids.length }) });
  };

  const refreshAll = () => {
    projectsQuery.refetch();
    if (selectedProjectId) refetchCustodies();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Notice icon="🏗">{t('pm.projectsNotice')}</Notice>
        <RefreshButton onRefresh={refreshAll} loading={projectsQuery.isFetching || custodiesFetching} />
      </div>

      <Card>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <FormField label={t('common.project')}>
            <select
              className={selectClass}
              value={selectedProjectId}
              onChange={(e) => { setSelectedProjectId(e.target.value); setSelectedManagerId(''); }}
            >
              <option value="">{t('pm.selectProject')}</option>
              {projects.map((p) => (
                <option key={entityId(p)} value={entityId(p)}>{projectName(p, i18n.language)}</option>
              ))}
            </select>
          </FormField>
          <FormField label={t('pm.projectManager')}>
            <select
              className={selectClass}
              value={selectedManagerId}
              disabled={!selectedProjectId}
              onChange={(e) => setSelectedManagerId(e.target.value)}
            >
              <option value="">{t('pm.selectManager')}</option>
              {managers.map((m) => (
                <option key={entityId(m)} value={entityId(m)}>{userName(m, i18n.language)}</option>
              ))}
            </select>
          </FormField>
        </div>
      </Card>

      {selectedProject && (
        <Card title={projectName(selectedProject, i18n.language)}>
          <div className="flex flex-wrap justify-between gap-2 mb-3 text-sm">
            <span className="text-muted">{t('pm.budget')}: {formatMoney(selectedProject.budget, i18n.language)}</span>
            <span className="text-muted">{t('pm.spent')}: {formatMoney(selectedProject.spent, i18n.language)}</span>
            <Amount>{t('pm.remaining')}: {formatMoney((selectedProject.budget || 0) - (selectedProject.spent || 0), i18n.language)}</Amount>
          </div>
          <ProgressBar
            value={selectedProject.spent}
            max={selectedProject.budget}
            variant={selectedProject.spent / selectedProject.budget > 0.85 ? 'amber' : 'green'}
          />
        </Card>
      )}

      {selectedProjectId && !selectedManagerId && (
        <Card>
          <p className="text-center text-muted text-sm py-8">{t('pm.selectManagerHint')}</p>
        </Card>
      )}

      {selectedManagerId && custodiesLoading ? (
        <Card><PageLoader compact /></Card>
      ) : selectedManagerId && pendingClosed.length === 0 && openOnes.length === 0 ? (
        <Card>
          <p className="text-center text-muted text-sm py-8">{t('pm.noCustodyForManager')}</p>
        </Card>
      ) : null}

      {openOnes.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-extrabold text-navy px-1">{t('pm.openCustody')}</h3>
          {openOnes.map((c) => (
            <CustodyReviewCard key={c._id} custody={c} onView={setDetailId} readOnly />
          ))}
        </div>
      )}

      {pendingClosed.length > 0 && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 px-1">
            <h3 className="text-sm font-extrabold text-navy">{t('pm.pendingApproval')}</h3>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] text-muted font-bold">
                {t('pm.selectedCount', { count: selectedInvoiceIds.size })}
              </span>
              <Button size="sm" disabled={!selectedInvoiceIds.size} onClick={() => batchReview(true)}>
                {t('pm.approveSelected')}
              </Button>
              <Button size="sm" variant="red" disabled={!selectedInvoiceIds.size} onClick={() => batchReview(false)}>
                {t('pm.rejectSelected')}
              </Button>
            </div>
          </div>
          {pendingClosed.map((c) => (
            <CustodyReviewCard
              key={c._id}
              custody={c}
              onView={setDetailId}
              selectedInvoiceIds={selectedInvoiceIds}
              onToggleCustody={toggleCustody}
              onToggleInvoice={toggleInvoice}
              reviewStatus="pending_pm"
              invoiceFilter={(i) => i.status === 'pending_pm'}
            />
          ))}
        </div>
      )}

      {selectedManagerId && custodyTotalPages > 1 && (
        <Pagination
          page={custodyPage}
          totalPages={custodyTotalPages}
          total={custodyTotal}
          pageSize={custodyPageSize}
          onPageChange={custodyTable.setPage}
        />
      )}

      <Card title={t('pm.projectSummary')} noPadding>
        <DataTable
          columns={[
            { key: 'name', header: t('common.project'), exportHeader: t('common.project'), render: (p) => <b>{projectName(p, i18n.language)}</b>, exportValue: (p) => projectName(p, i18n.language) },
            { key: 'budget', header: t('pm.budget'), exportHeader: t('pm.budget'), render: (p) => formatMoney(p.budget, i18n.language), exportValue: (p) => String(p.budget ?? 0) },
            { key: 'spent', header: t('pm.spent'), exportHeader: t('pm.spent'), render: (p) => formatMoney(p.spent, i18n.language), exportValue: (p) => String(p.spent ?? 0) },
            { key: 'rem', header: t('pm.remaining'), exportHeader: t('pm.remaining'), render: (p) => <Amount>{formatMoney((p.budget || 0) - (p.spent || 0), i18n.language)}</Amount>, exportValue: (p) => String((p.budget || 0) - (p.spent || 0)) },
            { key: 'st', header: t('common.status'), exportHeader: t('common.status'), render: (p) => <StatusChip status={p.status} label={statusLabel(p.status, t)} />, exportValue: (p) => statusLabel(p.status, t) },
          ]}
          data={projects}
          onRefresh={() => { void projectsQuery.refetch(); }}
          exportFilename="project-summary"
          exportTitle={t('pm.projectSummary')}
          exportLang={i18n.language}
          exportRowLabel={i18n.language === 'ar' ? 'مشروع' : 'projects'}
          emptyText={t('common.noData')}
        />
      </Card>

      <InvoiceDetailModal invoiceId={detailId} onClose={() => setDetailId(null)} />
      <RejectReasonModal open={rejectOpen} onClose={() => setRejectOpen(false)} onConfirm={confirmReject} />
    </div>
  );
}

export function PMEngineersPage() {
  const { t, i18n } = useTranslation();
  const [projectId, setProjectId] = useState('');

  const projectsQuery = useQuery({
    queryKey: queryKeys.projects.list({ limit: 200 }),
    queryFn: ({ signal }) => projectService.list({ limit: 200 }, { signal }),
    ...CACHE.reference,
  });
  const projects = projectsQuery.data?.items ?? [];

  const {
    table,
    items: users,
    total,
    totalPages,
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
  } = useServerDataTable<User>({
    queryKey: queryKeys.users.list(),
    queryFn: (params, signal) => userService.list(params, { signal }),
    extraFilters: { role: 'project_manager' },
    ...CACHE.transactional,
  });

  useEffect(() => {
    table.setFilter('projectId', projectId);
  }, [projectId, table.setFilter]);

  const closedCustodiesQuery = useQuery({
    queryKey: queryKeys.custodies.list({ projectId, status: 'closed', limit: 100 }),
    queryFn: ({ signal }) => custodyService.list({ projectId, status: 'closed', limit: 100 }, { signal }),
    ...CACHE.reference,
  });
  const openCustodiesQuery = useQuery({
    queryKey: queryKeys.custodies.list({ projectId, status: 'open', limit: 100 }),
    queryFn: ({ signal }) => custodyService.list({ projectId, status: 'open', limit: 100 }, { signal }),
    ...CACHE.reference,
  });

  const custodyStats = useMemo(() => {
    const closed = closedCustodiesQuery.data?.items ?? [];
    const open = openCustodiesQuery.data?.items ?? [];
    const all = [...closed, ...open];
    const byHolder = new Map<string, { pending: number; open: number }>();
    for (const c of all) {
      const uid = entityId(c.holder);
      if (!uid) continue;
      const entry = byHolder.get(uid) || { pending: 0, open: 0 };
      if (c.status === 'closed') entry.pending += 1;
      if (c.status === 'open') entry.open += 1;
      byHolder.set(uid, entry);
    }
    return byHolder;
  }, [closedCustodiesQuery.data?.items, openCustodiesQuery.data?.items]);

  const rows = users.map((u) => {
    const uid = entityId(u);
    const stats = custodyStats.get(uid);
    return { ...u, pending: stats?.pending ?? 0, open: stats?.open ?? 0 };
  });

  const refreshAll = () => {
    projectsQuery.refetch();
    refetch();
    closedCustodiesQuery.refetch();
    openCustodiesQuery.refetch();
  };

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <FormField label={t('common.project')} className="max-w-md flex-1">
            <select className={selectClass} value={projectId} onChange={(e) => setProjectId(e.target.value)}>
              <option value="">{t('pm.allManagers')}</option>
              {projects.map((p) => (
                <option key={entityId(p)} value={entityId(p)}>{projectName(p, i18n.language)}</option>
              ))}
            </select>
          </FormField>
          <RefreshButton onRefresh={refreshAll} loading={isLoading || isFetching || closedCustodiesQuery.isFetching || openCustodiesQuery.isFetching} />
        </div>
      </Card>
      <Card noPadding>
        <DataTable
          columns={[
            { key: 'name', header: t('pm.projectManager'), exportHeader: t('pm.projectManager'), render: (u) => <b>{userName(u, i18n.language)}</b>, exportValue: (u) => userName(u, i18n.language) },
            { key: 'email', header: t('auth.email'), exportHeader: t('auth.email'), render: (u) => u.email, exportValue: (u) => u.email },
            {
              key: 'pend',
              header: t('pm.pendingForYou'),
              exportHeader: t('pm.pendingForYou'),
              render: (u) => u.pending
                ? <StatusChip status="closed" label={t('pm.custodyCount', { count: u.pending })} />
                : '—',
              exportValue: (u) => String(u.pending || 0),
            },
            {
              key: 'open',
              header: t('pm.openCustody'),
              exportHeader: t('pm.openCustody'),
              render: (u) => u.open ? <StatusChip status="open" label={t('pm.custodyCount', { count: u.open })} /> : '—',
              exportValue: (u) => String(u.open || 0),
            },
            {
              key: 'st',
              header: t('common.status'),
              exportHeader: t('common.status'),
              render: (u) => (
                <StatusChip
                  status={u.pending ? 'closed' : 'active'}
                  label={u.pending ? t('pm.pendingForYou') : t('pm.working')}
                />
              ),
              exportValue: (u) => (u.pending ? t('pm.pendingForYou') : t('pm.working')),
            },
          ]}
          data={rows}
          loading={isLoading}
          fetching={isFetching}
          error={isError ? error : undefined}
          query={table.query}
          onQueryChange={table.setQuery}
          onReset={table.reset}
          onRefresh={() => { void refetch(); }}
          shown={rows.length}
          total={total}
          pagination={{
            page: table.page,
            totalPages,
            total,
            pageSize: table.pageSize,
            onPageChange: table.setPage,
          }}
          exportFilename="project-managers"
          exportTitle={t('nav.engineers')}
          exportLang={i18n.language}
          exportRowLabel={i18n.language === 'ar' ? 'مدير' : 'managers'}
          emptyText={t('common.noData')}
        />
      </Card>
    </div>
  );
}

const EMPTY_EMERGENCY_FORM = { projectId: '', holderId: '', amount: 0, priority: 'high', reason: '', date: '' };

export function PMEmergencyPage() {
  const { t, i18n } = useTranslation();
  const { runAction } = useUi();
  const [projects, setProjects] = useState<Project[]>([]);
  const [accountants, setAccountants] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const { form, setForm, clearDraft } = useFormDraft('pm.emergency', EMPTY_EMERGENCY_FORM);

  const load = async () => {
    setLoading(true);
    try {
      const [p, a] = await Promise.all([
        projectService.list({ limit: 200 }),
        userService.list({ role: 'project_manager', limit: 100 }),
      ]);
      setProjects(p.items ?? []);
      setAccountants(a.items ?? []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const submit = () =>
    runAction(async () => {
      await custodyService.create({
        projectId: form.projectId,
        amount: form.amount,
        type: 'emergency',
        purpose: form.reason,
        holderId: form.holderId || undefined,
      });
      clearDraft();
    }, { success: 'تم إرسال الطلب الطارئ' });

  return (
    <Card title={t('nav.emergency')} action={<RefreshButton onRefresh={load} loading={loading} />}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
        <FormField label={t('common.project')}>
          <select className={selectClass} value={form.projectId} onChange={(e) => setForm({ ...form, projectId: e.target.value })}>
            <option value="">—</option>
            {projects.map((p) => <option key={p._id} value={p._id}>{projectName(p, i18n.language)}</option>)}
          </select>
        </FormField>
        <FormField label="مدير المشروع">
          <select className={selectClass} value={form.holderId} onChange={(e) => setForm({ ...form, holderId: e.target.value })}>
            <option value="">—</option>
            {accountants.map((u) => <option key={u.id || u._id} value={u.id || u._id}>{userName(u, i18n.language)}</option>)}
          </select>
        </FormField>
        <FormField label={t('common.amount')}><input className={inputClass} type="number" value={form.amount || ''} onChange={(e) => setForm({ ...form, amount: +e.target.value })} /></FormField>
        <FormField label="الأولوية">
          <select className={selectClass} value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
            <option value="high">عالية</option>
            <option value="medium">متوسطة</option>
          </select>
        </FormField>
        <FormField label="تاريخ الحاجة"><input className={inputClass} type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></FormField>
        <FormField label="سبب الطوارئ" full><textarea className={inputClass} rows={3} value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} /></FormField>
      </div>
      <Button className="mt-4" onClick={submit}>{t('common.submit')}</Button>
    </Card>
  );
}

export function PMReportsPage() {
  const { t } = useTranslation();
  const [data, setData] = useState<Awaited<ReturnType<typeof dashboardService.projectManager>> | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      setData(await dashboardService.projectManager());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const r = data?.reports;
  const trend = chartOrFallback(r?.expenseTrend);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <RefreshButton onRefresh={load} loading={loading} />
      </div>
      <StatsGrid>
        <StatCard icon="⏱" label="متوسط زمن الموافقة" value={r ? formatHours(r.avgApprovalHours) : '—'} color="green" trend="من إغلاق العهدة" trendUp />
        <StatCard icon="📈" label="الالتزام بالميزانية" value={r ? `${r.budgetCompliance}%` : '—'} color="blue" trendUp />
        <StatCard icon="🧾" label="فواتير مرفوضة" value={r?.rejectedInvoices ?? '—'} color="amber" />
        <StatCard icon="⚠" label="قاربت الميزانية" value={r?.nearBudgetProjects ?? '—'} color="red" trendUp={false} />
      </StatsGrid>
      <Card title={t('nav.reports')}>
        <ProjectBarChart labels={trend.labels} data={trend.data} />
      </Card>
    </div>
  );
}

export function PAApprovalLogPage() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const dateLocale = lang === 'ar' ? 'ar-SA' : 'en-SA';

  type ApprovalLogRow = {
    _id: string;
    action: string;
    outcome: 'approved' | 'rejected';
    createdAt: string;
    user?: User;
    custody?: Custody | null;
    invoice?: Invoice | null;
  };

  const {
    table,
    items: rows,
    total,
    totalPages,
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
  } = useServerDataTable<ApprovalLogRow>({
    queryKey: queryKeys.dashboard.paApprovalLog(),
    queryFn: (params, signal) => dashboardService.paApprovalLog(params, { signal }),
    pageSize: 20,
    ...CACHE.logs,
  });

  return (
    <div className="space-y-4">
      <Notice icon="📋">{t('pa.approvalLogNotice')}</Notice>
      <Card title={`📋 ${t('pa.approvalLog')}`} noPadding>
        <DataTable
          columns={[
            {
              key: 'when',
              header: t('common.date'),
              render: (row) => new Date(row.createdAt).toLocaleString(dateLocale),
              exportValue: (row) => new Date(row.createdAt).toLocaleString(dateLocale),
            },
            {
              key: 'who',
              header: t('pa.approver'),
              render: (row) => userName(row.user, lang),
              exportValue: (row) => userName(row.user, lang),
            },
            {
              key: 'action',
              header: t('pa.action'),
              render: (row) => row.action,
              exportValue: (row) => row.action,
            },
            {
              key: 'target',
              header: t('pa.approvalTarget'),
              render: (row) => {
                if (row.custody?.custodyNumber) {
                  return `${row.custody.custodyNumber} — ${userName(row.custody.holder, lang)}`;
                }
                if (row.invoice?.referenceNumber) {
                  const custodyNo = typeof row.invoice.custody === 'object' ? row.invoice.custody?.custodyNumber : '';
                  return custodyNo
                    ? `${row.invoice.referenceNumber} (${custodyNo})`
                    : row.invoice.referenceNumber;
                }
                return '—';
              },
              exportValue: (row) => row.custody?.custodyNumber || row.invoice?.referenceNumber || '',
            },
            {
              key: 'outcome',
              header: t('common.status'),
              render: (row) => (
                <StatusChip
                  status={row.outcome === 'rejected' ? 'pm_rejected' : 'pm_approved'}
                  label={row.outcome === 'rejected' ? t('common.reject') : t('common.approve')}
                />
              ),
              exportValue: (row) => (row.outcome === 'rejected' ? t('common.reject') : t('common.approve')),
            },
          ]}
          data={rows}
          loading={isLoading}
          fetching={isFetching}
          error={isError ? error : undefined}
          onRefresh={() => { void refetch(); }}
          shown={rows.length}
          total={total}
          pagination={{
            page: table.page,
            totalPages,
            total,
            pageSize: table.pageSize,
            onPageChange: table.setPage,
          }}
          emptyText={t('common.noData')}
          exportFilename="pa-approval-log"
          exportTitle={t('pa.approvalLog')}
          exportLang={lang}
        />
      </Card>
    </div>
  );
}

export function PMNotificationsPage() {
  const { t } = useTranslation();
  const [data, setData] = useState<{ notifications: { title: string; message: string; type: string; createdAt: string; isRead: boolean }[] } | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      setData(await dashboardService.notifications());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  return (
    <Card title={t('nav.notifications')} action={<RefreshButton onRefresh={load} loading={loading} />}>
      <div className="space-y-3">
        {data?.notifications.map((n, i) => (
          <div key={i} className={`p-4 rounded-xl border text-sm ${n.type === 'reject' ? 'bg-red-50 border-red-200' : 'bg-[#f7f9fc] border-[#e3e9f2]'} ${!n.isRead ? 'border-s-2 border-s-red-400' : ''}`}>
            <div className="font-bold text-navy">{n.title}</div>
            <p className="text-muted mt-1">{n.message}</p>
            <div className="text-[11px] text-muted mt-2">{new Date(n.createdAt).toLocaleString('ar-SA')}</div>
          </div>
        )) || <p className="text-muted">{t('common.noData')}</p>}
      </div>
    </Card>
  );
}
