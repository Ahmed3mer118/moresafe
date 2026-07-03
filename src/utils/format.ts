export function entityId(e?: { _id?: string; id?: string } | null) {
  if (!e) return '';
  return String(e._id || e.id || '');
}

export function formatMoney(n: number, lang = 'ar') {
  return new Intl.NumberFormat(lang === 'ar' ? 'ar-SA' : 'en-SA', {
    maximumFractionDigits: 0,
  }).format(n);
}

export function formatDate(value?: string | Date | null, lang = 'ar') {
  if (!value) return '';
  const locale = lang === 'ar' ? 'ar-SA' : 'en-SA';
  return new Date(value).toLocaleDateString(locale);
}

export function projectName(p: { name: string; nameEn?: string }, lang: string) {
  return lang === 'en' && p.nameEn ? p.nameEn : p.name;
}

export function userName(u: { name: string; nameEn?: string } | string | null | undefined, lang: string) {
  if (!u || typeof u === 'string') return '—';
  return lang === 'en' && u.nameEn ? u.nameEn : u.name;
}

export function managersFromProjects(
  projects: { _id?: string; id?: string; manager?: { _id?: string; id?: string; name: string; nameEn?: string } | string }[],
  lang: string,
  projectId?: string,
) {
  const map = new Map<string, { name: string; nameEn?: string; _id?: string; id?: string }>();
  projects
    .filter((p) => !projectId || entityId(p) === projectId)
    .forEach((p) => {
      const mgr = p.manager;
      if (mgr && typeof mgr === 'object' && mgr.name) map.set(entityId(mgr), mgr);
    });
  return [...map.values()].sort((a, b) => userName(a, lang).localeCompare(userName(b, lang), lang === 'ar' ? 'ar' : 'en'));
}

export function invoiceManagerName(
  inv: { uploadedBy?: { name: string; nameEn?: string }; project?: { manager?: { name: string; nameEn?: string } } },
  lang: string,
) {
  if (inv.uploadedBy && typeof inv.uploadedBy === 'object' && inv.uploadedBy.name) {
    return userName(inv.uploadedBy, lang);
  }
  const mgr = inv.project?.manager;
  if (mgr && typeof mgr === 'object' && mgr.name) return userName(mgr, lang);
  return '—';
}

/** Safe project/custody status label — avoids showing raw i18n keys when status is missing */
export function statusLabel(status: string | undefined, t: (key: string, opts?: { defaultValue?: string }) => string): string {
  if (!status) return t('status.unknown', { defaultValue: 'غير محدد' });
  return t(`status.${status}`, { defaultValue: status });
}

export function assetUrl(relativePath: string) {
  if (!relativePath) return '';
  if (relativePath.startsWith('http') || relativePath.startsWith('blob:') || relativePath.startsWith('data:')) {
    return relativePath;
  }
  const base = (import.meta.env.VITE_BASE_URL || '').replace(/\/$/, '');
  const path = relativePath.startsWith('/') ? relativePath : `/${relativePath}`;
  return `${base}${path}`;
}
