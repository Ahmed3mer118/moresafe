import { useEffect, useState, useRef, useMemo } from 'react';
import { useSearchParams, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { StatCard, StatsGrid } from '../../components/ui/StatCard';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { DataTable } from '../../components/ui/DataTable';
import { StatusChip } from '../../components/ui/Chip';
import { FormField, inputClass, selectClass } from '../../components/ui/FormField';
import { InvoiceDetailModal } from '../../components/ui/InvoiceDetailModal';
import { Modal } from '../../components/ui/Modal';
import { useUi } from '../../context/UiContext';
import { useFormDraft } from '../../hooks/useFormDraft';
import { useTableFilter } from '../../hooks/useTableFilter';
import { dashboardService, custodyService, invoiceService, projectService } from '../../services';
import type { Custody, Invoice, Project } from '../../types';
import { formatMoney, projectName, entityId, statusLabel, invoiceManagerName, formatDate } from '../../utils/format';
import { exportInvoicesFromTable } from '../../utils/exportInvoicesPdf';
import { showToast } from '../../utils/toast';
import { canUploadToCustody, isInvoiceSubmittedForApproval } from '../../utils/custodyHelpers';
import { Notice } from '../../components/ui/Notice';

// const PM_BASE = '/dashboard/project-manager';

function ColoredAmount({
  value,
  variant,
  lang,
}: {
  value: number;
  variant: 'sub' | 'vat' | 'total';
  lang: string;
}) {
  const cls =
    variant === 'sub'
      ? 'text-slate-600 font-bold tabular-nums'
      : variant === 'vat'
        ? 'text-amber-600 font-bold tabular-nums'
        : 'text-emerald-700 font-extrabold tabular-nums';
  return <span className={cls}>{formatMoney(value, lang)}</span>;
}

const EMPTY_CUSTODY_FORM = { projectId: '', amount: 10000, type: 'operational', purpose: '', needDate: '' };
const EMPTY_INVOICE_FORM = {
  projectId: '',
  invoiceNumber: '',
  supplier: '',
  category: '',
  invoiceDate: new Date().toISOString().slice(0, 10),
  subtotal: 0,
  vatAmount: 0,
  total: 0,
  taxNumber: '',
};

type LineItem = { description: string; quantity: number; unitPrice: number; total: number };

const EMPTY_LINE: LineItem = { description: '', quantity: 1, unitPrice: 0, total: 0 };

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function resetInvoiceFields(projectId: string) {
  return { ...EMPTY_INVOICE_FORM, projectId };
}

export function PAHomePage() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const dateLocale = lang === 'ar' ? 'ar-SA' : 'en-SA';
  const [data, setData] = useState<Awaited<ReturnType<typeof dashboardService.projectAccountant>> | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);

  useEffect(() => {
    dashboardService.projectAccountant().then(setData);
  }, []);

  const recent = data?.recentInvoices ?? [];

  return (
    <div className="space-y-5">

      <StatsGrid>
        <StatCard
          icon="💼"
          label={t('pa.stats.openCustody')}
          value={data?.openCount ?? 0}
          color="blue"
          trend={data?.openCustody ? projectName(data.openCustody.project, lang) : ''}
        />
        <StatCard
          icon="💳"
          label={t('pa.stats.remaining')}
          value={formatMoney(data?.remaining ?? 0, lang)}
          color="green"
          trend={t('pa.stats.sarAvailable')}
          trendUp
        />
        <StatCard
          icon="📑"
          label={t('pa.stats.activeInvoices')}
          value={data?.draftInvoices ?? 0}
          color="amber"
        />
        <StatCard
          icon="🚫"
          label={t('pa.stats.rejected')}
          value={data?.rejected ?? 0}
          color="red"
          trendUp={false}
        />
      </StatsGrid>

      <Card title={`📋 ${t('pa.recentInvoices')}`} noPadding>
        <DataTable
          columns={[
            {
              key: 'ref',
              header: '#',
              render: (i) => <b className="text-brand-600 font-black">{i.referenceNumber}</b>,
              exportValue: (i) => i.referenceNumber,
            },
            {
              key: 'proj',
              header: t('common.project'),
              render: (i) => projectName(i.project, lang),
              exportValue: (i) => projectName(i.project, lang),
            },
            {
              key: 'cat',
              header: t('pa.category'),
              render: (i) => i.category || '—',
              exportValue: (i) => i.category || '',
            },
            {
              key: 'amt',
              header: t('common.amount'),
              render: (i) => <ColoredAmount value={i.total} variant="total" lang={lang} />,
              exportValue: (i) => String(i.total),
            },
            {
              key: 'st',
              header: t('common.status'),
              render: (i) => <StatusChip status={i.status} label={statusLabel(i.status, t)} />,
              exportValue: (i) => statusLabel(i.status, t),
            },
            {
              key: 'date',
              header: t('common.date'),
              render: (i) => (i.invoiceDate ? new Date(i.invoiceDate).toLocaleDateString(dateLocale) : '—'),
              exportValue: (i) => formatDate(i.invoiceDate, lang),
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
          data={recent}
          exportFilename="recent-invoices"
          exportTitle={t('pa.recentInvoices')}
          exportRowLabel={lang === 'ar' ? 'فاتورة' : 'invoices'}
          emptyText={t('common.noData')}
        />
      </Card>

      <InvoiceDetailModal invoiceId={detailId} onClose={() => setDetailId(null)} />
    </div>
  );
}

export function PANewCustodyPage() {
  const { t, i18n } = useTranslation();
  const { runAction } = useUi();
  const [projects, setProjects] = useState<Project[]>([]);
  const { form, setForm, clearDraft } = useFormDraft('pa.new-custody', EMPTY_CUSTODY_FORM);

  useEffect(() => { projectService.list().then(setProjects); }, []);

  const submit = () =>
    runAction(async () => {
      await custodyService.create({ projectId: form.projectId, amount: form.amount, type: form.type, purpose: form.purpose });
      clearDraft();
    }, { success: t('pa.custodySent') });

  return (
    <Card title={t('nav.newCustody')}>
    
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
        <FormField label={t('common.project')}>
          <select className={selectClass} value={form.projectId} onChange={(e) => setForm({ ...form, projectId: e.target.value })}>
            <option value="">—</option>
            {projects.map((p) => {
              const id = entityId(p);
              return <option key={id} value={id}>{projectName(p, i18n.language)}</option>;
            })}
          </select>
        </FormField>
        <FormField label={t('pa.custodyType')}>
          <select className={selectClass} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
            <option value="operational">{t('pa.custodyOperational')}</option>
            <option value="emergency">{t('pa.custodyEmergency')}</option>
          </select>
        </FormField>
        <FormField label={t('common.amount')}><input className={inputClass} type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: +e.target.value })} /></FormField>
        <FormField label={t('pa.needDate')}><input className={inputClass} type="date" value={form.needDate} onChange={(e) => setForm({ ...form, needDate: e.target.value })} /></FormField>
        <FormField label={t('pa.purpose')} full><textarea className={inputClass} rows={3} value={form.purpose} onChange={(e) => setForm({ ...form, purpose: e.target.value })} /></FormField>
      </div>
      <div className="flex gap-3 mt-4">
        <Button onClick={submit}>{t('common.submit')}</Button>
        <Button variant="ghost">{t('pa.saveDraft')}</Button>
      </div>
    </Card>
  );
}

export function PAInvoicesPage() {
  const { t, i18n } = useTranslation();
  const { runAction } = useUi();
  const { custodyId: routeCustodyId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const custodyId = routeCustodyId || searchParams.get('custodyId') || '';
  const isCustodyScope = Boolean(custodyId);

  useEffect(() => {
    if (routeCustodyId) {
      navigate(`/dashboard/project-manager/custody/${routeCustodyId}`, { replace: true });
    }
  }, [routeCustodyId, navigate]);

  const [activeCustody, setActiveCustody] = useState<Custody | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<Project[]>([]);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [fileQueue, setFileQueue] = useState<File[]>([]);
  const [queueTotal, setQueueTotal] = useState(0);
  const [currentPreview, setCurrentPreview] = useState<string | null>(null);
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const { form, setForm, resetForm } = useFormDraft('pa.invoice', EMPTY_INVOICE_FORM);
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  const currentFile = fileQueue[0] ?? null;
  const queuePosition = queueTotal > 0 ? queueTotal - fileQueue.length + 1 : 0;
  const pendingAfterCurrent = Math.max(0, fileQueue.length - 1);

  const load = async () => {
    setLoading(true);
    const invParams = custodyId ? { custodyId } : undefined;
    try {
      const [invResult, projsResult] = await Promise.allSettled([
        invoiceService.list(invParams),
        projectService.list(),
      ]);

      if (invResult.status === 'fulfilled') setInvoices(invResult.value);
      if (projsResult.status === 'fulfilled') setProjects(projsResult.value);
      else showToast(t('pa.loadProjectsError'), 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [custodyId]);

  useEffect(() => {
    if (!custodyId) {
      setActiveCustody(null);
      return;
    }
    custodyService.get(custodyId).then((c) => {
      setActiveCustody(c);
      setForm((f) => ({ ...f, projectId: entityId(c.project) }));
    }).catch(() => setActiveCustody(null));
  }, [custodyId, setForm]);

  const dateLocale = i18n.language === 'ar' ? 'ar-SA' : 'en-SA';
  const lang = i18n.language;

  const tf = useTableFilter(
    invoices,
    [
      (i) => i.referenceNumber,
      (i) => i.supplier || '',
      (i) => i.category || '',
      (i) => projectName(i.project, lang),
      (i) => invoiceManagerName(i, lang),
      (i) => i.invoiceNumber || '',
    ],
    (i) => i.status
  );

  const statusOptions = useMemo(() => {
    const unique = [...new Set(invoices.map((i) => i.status).filter(Boolean))].sort();
    return [
      { value: '', label: t('common.all') },
      ...unique.map((s) => ({ value: s, label: statusLabel(s, t) })),
    ];
  }, [invoices, t]);

  const invoiceColumns = useMemo(
    () => [
      {
        key: 'ref',
        header: '#',
        exportHeader: '#',
        render: (i: Invoice) => (
          <span className="inline-flex items-center gap-1.5">
            {isInvoiceSubmittedForApproval(i.status) && (
              <span
                className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 text-xs font-black shrink-0"
                title={t('pa.invoiceSubmitted')}
              >
                ✓
              </span>
            )}
            <b className="text-brand-600 font-black">{i.referenceNumber}</b>
          </span>
        ),
        exportValue: (i: Invoice) => i.referenceNumber,
      },
      {
        key: 'proj',
        header: t('common.project'),
        exportHeader: t('common.project'),
        render: (i: Invoice) => projectName(i.project, lang),
        exportValue: (i: Invoice) => projectName(i.project, lang),
      },
      {
        key: 'mgr',
        header: t('pm.projectManager'),
        exportHeader: t('pm.projectManager'),
        render: (i: Invoice) => invoiceManagerName(i, lang),
        exportValue: (i: Invoice) => invoiceManagerName(i, lang),
      },
      {
        key: 'sup',
        header: t('pa.supplier'),
        exportHeader: t('pa.supplier'),
        render: (i: Invoice) => i.supplier || '—',
        exportValue: (i: Invoice) => i.supplier || '',
      },
      {
        key: 'date',
        header: t('common.date'),
        exportHeader: t('common.date'),
        render: (i: Invoice) => (i.invoiceDate ? new Date(i.invoiceDate).toLocaleDateString(dateLocale) : '—'),
        exportValue: (i: Invoice) => formatDate(i.invoiceDate, lang),
      },
      {
        key: 'sub',
        header: t('pa.beforeTax'),
        exportHeader: t('pa.beforeTax'),
        render: (i: Invoice) => <ColoredAmount value={i.subtotal ?? 0} variant="sub" lang={lang} />,
        exportValue: (i: Invoice) => String(i.subtotal ?? 0),
      },
      {
        key: 'vat',
        header: t('pa.tax'),
        exportHeader: t('pa.tax'),
        render: (i: Invoice) => <ColoredAmount value={i.vatAmount ?? 0} variant="vat" lang={lang} />,
        exportValue: (i: Invoice) => String(i.vatAmount ?? 0),
      },
      {
        key: 'amt',
        header: t('common.amount'),
        exportHeader: t('common.amount'),
        render: (i: Invoice) => <ColoredAmount value={i.total} variant="total" lang={lang} />,
        exportValue: (i: Invoice) => String(i.total),
      },
      {
        key: 'items',
        header: t('pa.lineItems'),
        exportHeader: t('pa.lineItems'),
        render: (i: Invoice) => t('pa.itemsCount', { count: i.lineItems?.length ?? 0 }),
        exportValue: (i: Invoice) => String(i.lineItems?.length ?? 0),
      },
      {
        key: 'st',
        header: t('common.status'),
        exportHeader: t('common.status'),
        render: (i: Invoice) => <StatusChip status={i.status} label={statusLabel(i.status, t)} />,
        exportValue: (i: Invoice) => statusLabel(i.status, t),
      },
      {
        key: 'act',
        header: '',
        exportable: false,
        render: (i: Invoice) => (
          <Button size="sm" variant="ghost" onClick={() => setDetailId(i._id)}>
            {t('common.view')}
          </Button>
        ),
      },
    ],
    [t, lang, dateLocale],
  );

  const exportPdf = () => {
    const rows = tf.filtered;
    if (!rows.length) return showToast(t('common.noData'), 'error');
    exportInvoicesFromTable({
      title: t('pa.invoiceLog'),
      filename: 'my-invoices',
      columns: invoiceColumns,
      rows,
      lang,
      t,
    }).catch(() => showToast(t('common.exportFailed'), 'error'));
  };

  const revokePreview = () => {
    if (currentPreview?.startsWith('blob:')) URL.revokeObjectURL(currentPreview);
    setCurrentPreview(null);
  };

  const resetUpload = () => {
    revokePreview();
    setFileQueue([]);
    setQueueTotal(0);
    setLineItems([]);
    resetForm(resetInvoiceFields(form.projectId));
  };

  const openUpload = () => {
    resetUpload();
    setUploadOpen(true);
  };

  const closeUpload = () => {
    setUploadOpen(false);
    resetUpload();
  };

  const setCurrentFromFile = (file: File) => {
    revokePreview();
    setCurrentPreview(URL.createObjectURL(file));
  };

  const addFiles = (incoming: FileList | File[]) => {
    const list = Array.from(incoming).filter((f) => f.type.startsWith('image/') || f.type === 'application/pdf');
    if (!list.length) return;

    const wasEmpty = fileQueue.length === 0;
    setFileQueue((prev) => [...prev, ...list]);
    setQueueTotal((t) => t + list.length);

    if (wasEmpty && list[0]) {
      setCurrentFromFile(list[0]);
      if (form.projectId) runOcr(list[0]);
      else showToast(t('pa.ocrPickProject'), 'error');
    }
  };

  const skipCurrentFile = () => {
    if (fileQueue.length <= 1) {
      closeUpload();
      return;
    }
    void advanceToNextFile(fileQueue.slice(1));
  };

  const applyOcrData = (data: Record<string, unknown>) => {
    const items = Array.isArray(data.lineItems)
      ? (data.lineItems as LineItem[]).map((li) => ({
          description: String(li.description || ''),
          quantity: Number(li.quantity) || 1,
          unitPrice: Number(li.unitPrice) || 0,
          total: Number(li.total) || 0,
        }))
      : [];

    const subtotal = Number(data.subtotal) || items.reduce((s, i) => s + i.total, 0) || 0;
    const vatAmount = Number(data.vatAmount) || 0;
    const total = Number(data.total) || subtotal + vatAmount;

    setForm((f) => ({
      ...f,
      invoiceNumber: String(data.invoiceNumber || ''),
      supplier: String(data.supplier || ''),
      category: String(data.category || ''),
      invoiceDate: String(data.invoiceDate || new Date().toISOString()).slice(0, 10),
      subtotal,
      vatAmount,
      total,
      taxNumber: String(data.taxNumber || ''),
    }));
    setLineItems(items);
  };

  const scanFileForForm = async (file: File, { silent = false } = {}) => {
    if (!form.projectId) {
      showToast(t('pa.selectProjectUpload'), 'error');
      return false;
    }
    setOcrLoading(true);
    try {
      const { data } = await invoiceService.scan(file);
      applyOcrData(data);
      if (!silent) showToast(t('pa.ocrSuccess'), 'success');
      return true;
    } catch {
      showToast(t('pa.ocrFailed'), 'error');
      return false;
    } finally {
      setOcrLoading(false);
    }
  };

  const runOcr = (file: File) => {
    void scanFileForForm(file);
  };

  const advanceToNextFile = async (remaining: File[]) => {
    setFileQueue(remaining);
    setLineItems([]);
    resetForm(resetInvoiceFields(form.projectId));
    setCurrentFromFile(remaining[0]);
    await scanFileForForm(remaining[0], { silent: true });
  };

  const updateLineItem = (index: number, patch: Partial<LineItem>) => {
    setLineItems((prev) =>
      prev.map((li, i) => {
        if (i !== index) return li;
        const next = { ...li, ...patch };
        const qty = Number(next.quantity) || 0;
        const price = Number(next.unitPrice) || 0;
        next.total = patch.total !== undefined ? Number(patch.total) : qty * price;
        return next;
      })
    );
  };

  const addLineItem = () => setLineItems((prev) => [...prev, { ...EMPTY_LINE }]);
  const removeLineItem = (index: number) => setLineItems((prev) => prev.filter((_, i) => i !== index));

  const syncTotalsFromLines = () => {
    const sub = lineItems.reduce((s, i) => s + (Number(i.total) || 0), 0);
    setForm((f) => ({ ...f, subtotal: sub, total: sub + (f.vatAmount || 0) }));
  };

  const saveInvoice = () => {
    if (!custodyId) return showToast(t('pa.selectCustodyFirst'), 'error');
    if (!form.projectId) return showToast(t('pa.pickProject'), 'error');
    if (!currentFile) return showToast(t('pa.uploadImageRequired'), 'error');

    runAction(async () => {
      const dataUrl = await fileToBase64(currentFile);
      await invoiceService.create({
        projectId: form.projectId,
        custodyId,
        invoiceNumber: form.invoiceNumber || `INV-${Date.now()}`,
        supplier: form.supplier,
        category: form.category,
        invoiceDate: form.invoiceDate,
        subtotal: form.subtotal || 0,
        vatAmount: form.vatAmount || 0,
        total: form.total || (form.subtotal || 0) + (form.vatAmount || 0),
        taxNumber: form.taxNumber,
        lineItems,
        attachments: [{ data: dataUrl, filename: currentFile.name, mimeType: currentFile.type }],
      });

      const remaining = fileQueue.slice(1);

      if (remaining.length === 0) {
        closeUpload();
        await load();
        return;
      }

      await advanceToNextFile(remaining);
    }, {
      success: fileQueue.length > 1
        ? t('pa.savedBatch', { current: queueTotal - fileQueue.length + 2, total: queueTotal })
        : t('pa.savedSuccess'),
    });
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (!form.projectId) {
      showToast(t('pa.selectProjectUpload'), 'error');
      return;
    }
    if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
  };

  const selectedProject = projects.find((p) => entityId(p) === form.projectId);
  const uploadReady = Boolean(form.projectId);

  if (routeCustodyId) return null;

  return (
    <div className="space-y-4">
      {isCustodyScope && (
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate(`/dashboard/project-manager/custody/${custodyId}`)}>
            ← {t('pa.backToCustody')}
          </Button>
          {activeCustody && (
            <Notice icon="📦">
              {t('pa.uploadingToCustody', {
                number: activeCustody.custodyNumber,
                project: projectName(activeCustody.project, lang),
              })}
            </Notice>
          )}
        </div>
      )}

      <Card
        title={`📄 ${isCustodyScope ? t('pa.custodyInvoices') : t('pa.invoiceLog')}`}
        action={
          isCustodyScope && activeCustody && canUploadToCustody(activeCustody.status) ? (
            <Button size="sm" onClick={openUpload}>⊕ {t('pa.uploadNew')}</Button>
          ) : undefined
        }
        noPadding
      >
        <DataTable
          columns={invoiceColumns}
          data={tf.filtered}
          loading={loading}
          query={tf.query}
          onQueryChange={tf.setQuery}
          searchPlaceholder={t('common.search')}
          statusFilter={{
            value: tf.status,
            onChange: tf.setStatus,
            options: statusOptions,
          }}
          onReset={tf.reset}
          onRefresh={load}
          shown={tf.shown}
          total={tf.total}
          exportFilename={isCustodyScope ? `custody-${custodyId}-invoices` : 'my-invoices'}
          exportTitle={isCustodyScope ? t('pa.custodyInvoices') : t('pa.invoiceLog')}
          exportRowLabel={lang === 'ar' ? 'فاتورة' : 'invoices'}
          exportPdfLabel={t('common.exportPdf')}
          onExportPdf={exportPdf}
          emptyText={t('common.noData')}
        />
      </Card>

      <Modal
        open={uploadOpen}
        onClose={closeUpload}
        title={t('pa.uploadTitle')}
        subtitle={
          queueTotal > 1
            ? t('pa.uploadBatch', { current: queuePosition, total: queueTotal })
            : t('pa.uploadHint')
        }
        width="xl"
        footer={
          <>
            <Button onClick={saveInvoice} disabled={!uploadReady || !currentFile || ocrLoading}>
              {pendingAfterCurrent > 0
                ? t('pa.saveAndNext', { count: pendingAfterCurrent })
                : t('pa.saveInvoice')}
            </Button>
            {pendingAfterCurrent > 0 && (
              <Button variant="ghost" onClick={skipCurrentFile} disabled={ocrLoading}>{t('pa.skipCurrent')}</Button>
            )}
            <Button variant="ghost" onClick={closeUpload}>{t('common.cancel')}</Button>
          </>
        }
      >
        <div className="space-y-5 max-h-[70vh] overflow-y-auto pe-1">
          <FormField label={t('common.project')} hint={t('pa.projectsHint')}>
            <select
              className={selectClass}
              value={form.projectId}
              onChange={(e) => setForm({ ...form, projectId: e.target.value })}
            >
              <option value="">{t('pa.chooseProject')}</option>
              {projects.map((p) => {
                const id = entityId(p);
                return <option key={id} value={id}>{projectName(p, i18n.language)}</option>;
              })}
            </select>
          </FormField>

          {selectedProject && (
            <div className="text-xs text-muted -mt-2">
              {t('pa.budgetSpent', {
                budget: formatMoney(selectedProject.budget, lang),
                spent: formatMoney(selectedProject.spent ?? 0, lang),
              })}
            </div>
          )}

          <input
            ref={fileRef}
            type="file"
            accept="image/*,application/pdf"
            multiple
            hidden
            onChange={(e) => e.target.files && addFiles(e.target.files)}
          />
          <input
            ref={cameraRef}
            type="file"
            accept="image/*"
            capture="environment"
            hidden
            onChange={(e) => {
              if (e.target.files?.length) addFiles(e.target.files);
              e.target.value = '';
            }}
          />

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => {
                if (!uploadReady) return showToast(t('pa.selectProjectFirst'), 'error');
                fileRef.current?.click();
              }}
              disabled={!uploadReady}
              className="flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-brand-300 p-5 text-center transition-colors hover:bg-brand-50/50 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <span className="text-3xl">📁</span>
              <span className="font-bold text-navy text-sm">{t('pa.fromDevice')}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                if (!uploadReady) return showToast(t('pa.selectProjectFirst'), 'error');
                cameraRef.current?.click();
              }}
              disabled={!uploadReady}
              className="flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-brand-400 bg-brand-50/30 p-5 text-center transition-colors hover:bg-brand-50 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <span className="text-3xl">📷</span>
              <span className="font-bold text-navy text-sm">{t('pa.openCamera')}</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              if (!uploadReady) return showToast(t('pa.selectProjectFirst'), 'error');
              fileRef.current?.click();
            }}
            onDragOver={(e) => { if (!uploadReady) return; e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            disabled={!uploadReady}
            className={`w-full border-2 border-dashed rounded-2xl p-6 text-center transition-colors ${
              !uploadReady
                ? 'border-[#e3e9f2] bg-[#fbfcfe] cursor-not-allowed opacity-60'
                : dragOver
                  ? 'border-brand-500 bg-brand-50'
                  : 'border-brand-300 hover:bg-brand-50/50'
            }`}
          >
            <div className="text-3xl text-brand-500 mb-2">⤓</div>
            <div className="font-bold text-navy">
              {!uploadReady
                ? t('pa.selectProjectFirst')
                : ocrLoading
                  ? t('common.loading')
                  : t('pa.dragUpload')}
            </div>
            <div className="text-xs text-muted mt-2">
              {queueTotal > 0
                ? t('pa.queueProgress', {
                    current: queuePosition,
                    total: queueTotal,
                    pending: pendingAfterCurrent > 0
                      ? t('pa.queuePending', { count: pendingAfterCurrent })
                      : '',
                  })
                : t('pa.formatsHint')}
            </div>
          </button>

          {currentFile && currentPreview && (
            <div className="rounded-xl border-2 border-brand-200 overflow-hidden bg-[#f7f9fc]">
              <div className="px-3 py-2 bg-brand-50 border-b border-brand-100 flex justify-between items-center text-xs font-bold text-navy">
                <span>{t('pa.currentImage', { name: currentFile.name })}</span>
                {queueTotal > 1 && <span>{queuePosition} / {queueTotal}</span>}
              </div>
              {currentFile.type === 'application/pdf' ? (
                <div className="p-10 text-center text-muted">📄 {currentFile.name}</div>
              ) : (
                <img src={currentPreview} alt="" className="w-full max-h-64 object-contain bg-white" />
              )}
            </div>
          )}

          {pendingAfterCurrent > 0 && (
            <div className="text-xs text-muted px-1">
              {t('pa.waitingFiles')}: {fileQueue.slice(1).map((f) => f.name).join(' · ')}
            </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <FormField label={t('pa.invoiceNumber')}>
              <input className={inputClass} value={form.invoiceNumber} onChange={(e) => setForm({ ...form, invoiceNumber: e.target.value })} />
            </FormField>
            <FormField label={t('pa.invoiceDate')}>
              <input className={inputClass} type="date" value={form.invoiceDate} onChange={(e) => setForm({ ...form, invoiceDate: e.target.value })} />
            </FormField>
            <FormField label={t('pa.supplier')}>
              <input className={inputClass} value={form.supplier} onChange={(e) => setForm({ ...form, supplier: e.target.value })} />
            </FormField>
            <FormField label={t('pa.categoryLabel')}>
              <input className={inputClass} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
            </FormField>
            <FormField label={t('pa.beforeTax')}>
              <input
                className={inputClass}
                type="number"
                value={form.subtotal || ''}
                onChange={(e) => {
                  const subtotal = +e.target.value;
                  setForm((f) => ({ ...f, subtotal, total: subtotal + (f.vatAmount || 0) }));
                }}
              />
            </FormField>
            <FormField label={t('pa.taxAmount')}>
              <input
                className={inputClass}
                type="number"
                value={form.vatAmount || ''}
                onChange={(e) => {
                  const vatAmount = +e.target.value;
                  setForm((f) => ({ ...f, vatAmount, total: (f.subtotal || 0) + vatAmount }));
                }}
              />
            </FormField>
            <FormField label={t('pa.total')}>
              <input
                className={inputClass}
                type="number"
                value={form.total || ''}
                onChange={(e) => setForm({ ...form, total: +e.target.value })}
              />
            </FormField>
            <FormField label={t('pa.taxNumber')} full>
              <input className={inputClass} value={form.taxNumber} onChange={(e) => setForm({ ...form, taxNumber: e.target.value })} />
            </FormField>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-extrabold text-navy">{t('pa.lineItems')}</span>
              <div className="flex gap-2">
                <Button size="sm" variant="ghost" onClick={syncTotalsFromLines}>{t('pa.calcFromLines')}</Button>
                <Button size="sm" variant="ghost" onClick={addLineItem}>{t('pa.addLineShort')}</Button>
              </div>
            </div>
            {lineItems.length === 0 ? (
              <p className="text-xs text-muted p-4 rounded-xl border border-dashed border-[#e3e9f2] text-center">
                {t('pa.linesEmpty')}
              </p>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-[#e3e9f2]">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-[#f7f9fc]">
                      <th className="p-2 text-start">{t('pa.description')}</th>
                      <th className="p-2 w-20">{t('pa.quantity')}</th>
                      <th className="p-2 w-24">{t('pa.unitPrice')}</th>
                      <th className="p-2 w-24">{t('pa.lineTotal')}</th>
                      <th className="p-2 w-10" />
                    </tr>
                  </thead>
                  <tbody>
                    {lineItems.map((li, i) => (
                      <tr key={i} className="border-t border-[#eef1f6]">
                        <td className="p-1.5">
                          <input
                            className={`${inputClass} !py-1.5 !text-xs`}
                            value={li.description}
                            onChange={(e) => updateLineItem(i, { description: e.target.value })}
                          />
                        </td>
                        <td className="p-1.5">
                          <input
                            className={`${inputClass} !py-1.5 !text-xs text-center`}
                            type="number"
                            value={li.quantity || ''}
                            onChange={(e) => updateLineItem(i, { quantity: +e.target.value })}
                          />
                        </td>
                        <td className="p-1.5">
                          <input
                            className={`${inputClass} !py-1.5 !text-xs text-center`}
                            type="number"
                            value={li.unitPrice || ''}
                            onChange={(e) => updateLineItem(i, { unitPrice: +e.target.value })}
                          />
                        </td>
                        <td className="p-1.5">
                          <input
                            className={`${inputClass} !py-1.5 !text-xs text-center font-bold`}
                            type="number"
                            value={li.total || ''}
                            onChange={(e) => updateLineItem(i, { total: +e.target.value })}
                          />
                        </td>
                        <td className="p-1.5">
                          <button type="button" onClick={() => removeLineItem(i)} className="text-red-500 font-bold px-1">×</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </Modal>

      <InvoiceDetailModal invoiceId={detailId} onClose={() => setDetailId(null)} />
    </div>
  );
}

export function PARejectedPage() {
  const { t, i18n } = useTranslation();
  const { runAction } = useUi();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [detailId, setDetailId] = useState<string | null>(null);

  const load = () => invoiceService.rejected().then(setInvoices);
  useEffect(() => { load(); }, []);

  const resubmit = (id: string, category?: string) => {
    runAction(async () => {
      await invoiceService.update(id, { category });
      await load();
    }, { success: t('pa.resubmitted') });
  };

  return (
    <div>
      <Card noPadding>
        <DataTable
          columns={[
            { key: 'ref', header: t('pa.invoiceNumber'), exportHeader: t('pa.invoiceNumber'), render: (i) => <b className="text-brand-600">{i.referenceNumber}</b>, exportValue: (i) => i.referenceNumber },
            { key: 'cat', header: t('pa.category'), exportHeader: t('pa.category'), render: (i) => i.category || '—', exportValue: (i) => i.category || '' },
            { key: 'amt', header: t('common.amount'), exportHeader: t('common.amount'), render: (i) => <ColoredAmount value={i.total} variant="total" lang={i18n.language} />, exportValue: (i) => String(i.total) },
            { key: 'reason', header: t('pa.rejectReason'), exportHeader: t('pa.rejectReason'), render: (i) => <span className="text-red-600">{i.rejectionReason}</span>, exportValue: (i) => i.rejectionReason || '' },
            {
              key: 'act',
              header: '',
              exportable: false,
              render: (i) => (
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => setDetailId(i._id)}>{t('common.view')}</Button>
                  <Button size="sm" variant="ghost" onClick={() => resubmit(i._id, i.category)}>{t('pa.resubmit')}</Button>
                </div>
              ),
            },
          ]}
          data={invoices}
          exportFilename="rejected-invoices"
          exportTitle={t('nav.rejected')}
          exportRowLabel={i18n.language === 'ar' ? 'فاتورة' : 'invoices'}
          onRefresh={load}
          emptyText={t('common.noData')}
        />
      </Card>
      <InvoiceDetailModal invoiceId={detailId} onClose={() => setDetailId(null)} />
    </div>
  );
}

export function PANotificationsPage() {
  const { t, i18n } = useTranslation();
  const [data, setData] = useState<{ notifications: { title: string; message: string; type: string; createdAt: string }[] } | null>(null);
  useEffect(() => { dashboardService.notifications().then(setData); }, []);

  const dateLocale = i18n.language === 'ar' ? 'ar-SA' : 'en-SA';

  return (
    <Card title={`🔔 ${t('nav.notifications')}`}>
      <div className="space-y-3">
        {data?.notifications.map((n, i) => (
          <div key={i} className={`p-4 rounded-xl border text-sm ${n.type === 'reject' ? 'border-red-200 bg-red-50' : 'border-[#e3e9f2]'}`}>
            <b className="text-navy">{n.title}</b>
            <p className="text-muted mt-1">{n.message}</p>
            <div className="text-[11px] text-muted mt-2">{new Date(n.createdAt).toLocaleString(dateLocale)}</div>
          </div>
        )) || <p className="text-muted">{t('common.noData')}</p>}
      </div>
    </Card>
  );
}
