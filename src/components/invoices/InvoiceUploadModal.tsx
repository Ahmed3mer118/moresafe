import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { FormField, inputClass, selectClass } from '../ui/FormField';
import { useUi } from '../../context/UiContext';
import { custodyService, invoiceService, projectService } from '../../services';
import type { Project } from '../../types';
import { entityId, formatMoney, projectName } from '../../utils/format';
import { canUploadToCustody } from '../../utils/custodyHelpers';
import { showToast } from '../../utils/toast';

const EMPTY_INVOICE_FORM = {
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

export function InvoiceUploadModal({
  open,
  onClose,
  custodyId: initialCustodyId,
  defaultProjectId,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  custodyId?: string;
  defaultProjectId?: string;
  onSaved: () => void;
}) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const { runAction } = useUi();
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectId, setProjectId] = useState('');
  const [activeCustodyId, setActiveCustodyId] = useState('');
  const [ocrLoading, setOcrLoading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [fileQueue, setFileQueue] = useState<File[]>([]);
  const [queueTotal, setQueueTotal] = useState(0);
  const [currentPreview, setCurrentPreview] = useState<string | null>(null);
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [form, setForm] = useState(EMPTY_INVOICE_FORM);
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  const currentFile = fileQueue[0] ?? null;
  const queuePosition = queueTotal > 0 ? queueTotal - fileQueue.length + 1 : 0;
  const pendingAfterCurrent = Math.max(0, fileQueue.length - 1);
  // const selectedProject = projects.find((p) => entityId(p) === projectId);
  const uploadReady = Boolean(projectId && activeCustodyId);

  const revokePreview = () => {
    if (currentPreview?.startsWith('blob:')) URL.revokeObjectURL(currentPreview);
    setCurrentPreview(null);
  };

  const resetUpload = () => {
    revokePreview();
    setFileQueue([]);
    setQueueTotal(0);
    setLineItems([]);
    setForm(EMPTY_INVOICE_FORM);
  };

  const resolveCustodyForUpload = async (pid: string, preferredCustodyId?: string) => {
    if (!pid) {
      setActiveCustodyId('');
      return;
    }
    try {
      if (preferredCustodyId) {
        const preferred = await custodyService.get(preferredCustodyId);
        if (preferred && canUploadToCustody(preferred.status)) {
          setActiveCustodyId(preferred._id);
          const custodyProjectId = entityId(preferred.project);
          if (custodyProjectId && custodyProjectId !== pid) {
            setProjectId(custodyProjectId);
          }
          return;
        }
      }
      const list = await custodyService.list({ projectId: pid });
      const match =
        (preferredCustodyId && list.find((c) => c._id === preferredCustodyId && canUploadToCustody(c.status)))
        || list.find((c) => canUploadToCustody(c.status));
      if (match) {
        setActiveCustodyId(match._id);
      } else {
        setActiveCustodyId('');
        showToast(t('pa.noUploadableCustodyForProject'), 'error');
      }
    } catch {
      setActiveCustodyId('');
    }
  };

  useEffect(() => {
    if (!open) return;
    resetUpload();
    const boot = async () => {
      try {
        const [projs, custodyResult] = await Promise.all([
          projectService.list().catch(() => [] as Project[]),
          initialCustodyId
            ? custodyService.get(initialCustodyId).catch(() => null)
            : Promise.resolve(null),
        ]);

        let merged = [...projs];
        if (custodyResult?.project && typeof custodyResult.project === 'object') {
          const cp = custodyResult.project as Project;
          const cid = entityId(cp);
          if (cid && !merged.some((p) => entityId(p) === cid)) {
            merged = [cp, ...merged];
          }
        }

        setProjects(merged);

        const custodyProjectId = custodyResult ? entityId(custodyResult.project) : '';
        const initialProject =
          (defaultProjectId && merged.some((p) => entityId(p) === defaultProjectId))
            ? defaultProjectId
            : (custodyProjectId && merged.some((p) => entityId(p) === custodyProjectId))
              ? custodyProjectId
              : merged.length === 1
                ? entityId(merged[0])
                : defaultProjectId || custodyProjectId || '';

        setProjectId(initialProject);

        if (initialProject) {
          await resolveCustodyForUpload(initialProject, initialCustodyId);
        } else if (initialCustodyId && custodyResult && canUploadToCustody(custodyResult.status)) {
          setActiveCustodyId(initialCustodyId);
        } else {
          setActiveCustodyId('');
        }
      } catch {
        setProjects([]);
        setProjectId('');
        setActiveCustodyId('');
        showToast(t('pa.loadProjectsError'), 'error');
      }
    };
    boot();
  }, [open, initialCustodyId, defaultProjectId]);

  const onProjectChange = async (nextProjectId: string) => {
    setProjectId(nextProjectId);
    await resolveCustodyForUpload(nextProjectId);
  };

  const handleClose = () => {
    resetUpload();
    onClose();
  };

  const setCurrentFromFile = (file: File) => {
    revokePreview();
    setCurrentPreview(URL.createObjectURL(file));
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

    setForm({
      invoiceNumber: String(data.invoiceNumber || ''),
      supplier: String(data.supplier || ''),
      category: String(data.category || ''),
      invoiceDate: String(data.invoiceDate || new Date().toISOString()).slice(0, 10),
      subtotal,
      vatAmount,
      total,
      taxNumber: String(data.taxNumber || ''),
    });
    setLineItems(items);
  };

  const scanFileForForm = async (file: File, { silent = false } = {}) => {
    if (!projectId) {
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
    setForm({
      ...EMPTY_INVOICE_FORM,
      invoiceDate: new Date().toISOString().slice(0, 10),
    });
    setCurrentFromFile(remaining[0]);
    await scanFileForForm(remaining[0], { silent: true });
  };

  const addFiles = (incoming: FileList | File[]) => {
    const list = Array.from(incoming).filter((f) => f.type.startsWith('image/') || f.type === 'application/pdf');
    if (!list.length) return;

    const wasEmpty = fileQueue.length === 0;
    setFileQueue((prev) => [...prev, ...list]);
    setQueueTotal((n) => n + list.length);

    if (wasEmpty && list[0]) {
      setCurrentFromFile(list[0]);
      if (projectId) runOcr(list[0]);
      else showToast(t('pa.ocrPickProject'), 'error');
    }
  };

  const skipCurrentFile = () => {
    if (fileQueue.length <= 1) {
      handleClose();
      return;
    }
    void advanceToNextFile(fileQueue.slice(1));
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
      }),
    );
  };

  const syncTotalsFromLines = () => {
    const sub = lineItems.reduce((s, i) => s + (Number(i.total) || 0), 0);
    setForm((f) => ({ ...f, subtotal: sub, total: sub + (f.vatAmount || 0) }));
  };

  const saveInvoice = () => {
    if (!projectId) return showToast(t('pa.pickProject'), 'error');
    if (!activeCustodyId) return showToast(t('pa.selectCustodyFirst'), 'error');
    if (!currentFile) return showToast(t('pa.uploadImageRequired'), 'error');

    runAction(async () => {
      const dataUrl = await fileToBase64(currentFile);
      await invoiceService.create({
        projectId,
        custodyId: activeCustodyId,
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
        handleClose();
        onSaved();
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
    if (!projectId) {
      showToast(t('pa.selectProjectUpload'), 'error');
      return;
    }
    if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
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
          <Button variant="ghost" onClick={handleClose}>{t('common.cancel')}</Button>
        </>
      }
    >
      <div className="space-y-5 max-h-[70vh] overflow-y-auto pe-1">
        <FormField label={t('common.project')} hint={t('pa.projectsHint')}>
          <select
            className={selectClass}
            value={projectId}
            onChange={(e) => onProjectChange(e.target.value)}
          >
            <option value="">{t('pa.chooseProject')}</option>
            {projects.map((p) => {
              const id = entityId(p);
              return <option key={id} value={id}>{projectName(p, lang)}</option>;
            })}
          </select>
        </FormField>

  

        <input ref={fileRef} type="file" accept="image/*,application/pdf" multiple hidden onChange={(e) => e.target.files && addFiles(e.target.files)} />
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
            className="flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-brand-300 p-5 text-center transition-colors hover:bg-brand-50/50 disabled:opacity-60"
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
            className="flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-brand-400 bg-brand-50/30 p-5 text-center transition-colors hover:bg-brand-50 disabled:opacity-60"
          >
            <span className="text-3xl">📷</span>
            <span className="font-bold text-navy text-sm">{t('pa.openCamera')}</span>
          </button>
        </div>

        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          disabled={!uploadReady}
          className={`w-full border-2 border-dashed rounded-2xl p-6 text-center transition-colors ${
            dragOver ? 'border-brand-500 bg-brand-50' : 'border-brand-300 hover:bg-brand-50/50'
          } ${!uploadReady ? 'opacity-60 cursor-not-allowed' : ''}`}
        >
          <div className="text-3xl text-brand-500 mb-2">⤓</div>
          <div className="font-bold text-navy">
            {ocrLoading ? t('common.loading') : t('pa.dragUpload')}
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
            <input className={inputClass} type="number" value={form.total || ''} onChange={(e) => setForm({ ...form, total: +e.target.value })} />
          </FormField>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-extrabold text-navy">{t('pa.lineItems')}</span>
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" onClick={syncTotalsFromLines}>{t('pa.calcFromLines')}</Button>
              <Button size="sm" variant="ghost" onClick={() => setLineItems((p) => [...p, { ...EMPTY_LINE }])}>{t('pa.addLineShort')}</Button>
            </div>
          </div>
          {lineItems.length > 0 && (
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
                        <input className={`${inputClass} !py-1.5 !text-xs`} value={li.description} onChange={(e) => updateLineItem(i, { description: e.target.value })} />
                      </td>
                      <td className="p-1.5">
                        <input className={`${inputClass} !py-1.5 !text-xs text-center`} type="number" value={li.quantity || ''} onChange={(e) => updateLineItem(i, { quantity: +e.target.value })} />
                      </td>
                      <td className="p-1.5">
                        <input className={`${inputClass} !py-1.5 !text-xs text-center`} type="number" value={li.unitPrice || ''} onChange={(e) => updateLineItem(i, { unitPrice: +e.target.value })} />
                      </td>
                      <td className="p-1.5">
                        <input className={`${inputClass} !py-1.5 !text-xs text-center font-bold`} type="number" value={li.total || ''} onChange={(e) => updateLineItem(i, { total: +e.target.value })} />
                      </td>
                      <td className="p-1.5">
                        <button type="button" onClick={() => setLineItems((p) => p.filter((_, j) => j !== i))} className="text-red-500 font-bold px-1">×</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {form.total > 0 && (
          <p className="text-sm text-muted">{t('common.amount')}: <b className="text-emerald-700">{formatMoney(form.total, lang)}</b></p>
        )}
      </div>
    </Modal>
  );
}
