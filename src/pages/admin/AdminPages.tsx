import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StatCard, StatsGrid } from '../../components/ui/StatCard';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { DataTable } from '../../components/ui/DataTable';
import { Modal } from '../../components/ui/Modal';
import { Timeline } from '../../components/ui/Timeline';
import { Pagination } from '../../components/ui/Pagination';
import { CyclePipeline, CycleFlow } from '../../components/ui/CycleFlow';
import { StatusChip, RoleChip, Amount } from '../../components/ui/Chip';
import { FormField, inputClass, selectClass } from '../../components/ui/FormField';
import { ProjectBarChart } from '../../components/charts/DashboardCharts';
import { BudgetOverview } from '../../components/budget/BudgetOverview';
import { useTableFilter } from '../../hooks/useTableFilter';
import { usePagination } from '../../hooks/usePagination';
import { useFormDraft, hasFormDraft } from '../../hooks/useFormDraft';
import { useUi } from '../../context/UiContext';
import { useAuth } from '../../context/AuthContext';
import { dashboardService, userService, projectService, custodyService } from '../../services';
import type { User, Project, Custody } from '../../types';
import { formatMoney, projectName, userName, statusLabel } from '../../utils/format';
import { NotificationsPage } from '../../components/ui/NotificationsPage';
import { PageLoader, StatsSkeleton, TimelineSkeleton } from '../../components/ui/PageLoader';
import { RefreshButton } from '../../components/ui/RefreshButton';

const ACTIVITY_PAGE_SIZE = 15;

function AdminBudgetSection() {
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
    <BudgetOverview
      projects={budgetData?.projects ?? []}
      totals={budgetData?.totals}
      loading={loading}
      compact
      showSummary={false}
    />
  );
}

export function AdminHomePage() {
  const { t } = useTranslation();
  const [stats, setStats] = useState<{ users: number; projects: number; rolesCount?: number } | null>(null);
  const [cycleStats, setCycleStats] = useState({ pm: 0, pa: 0, chief: 0, disbursement: 0, settled: 0 });
  const [statsLoading, setStatsLoading] = useState(true);
  const [activityPage, setActivityPage] = useState(1);
  const [activityLoading, setActivityLoading] = useState(true);
  const [activity, setActivity] = useState<{ items: { action?: string; createdAt?: string }[]; total: number; totalPages: number }>({
    items: [], total: 0, totalPages: 1,
  });

  const loadStats = async () => {
    setStatsLoading(true);
    try {
      const [adminStats, cycles] = await Promise.all([
        dashboardService.admin(),
        custodyService.cycleStats(),
      ]);
      setStats(adminStats);
      setCycleStats(cycles);
    } catch {
      setStats(null);
    } finally {
      setStatsLoading(false);
    }
  };

  const loadActivity = async () => {
    setActivityLoading(true);
    try {
      const res = await dashboardService.activityLogs({ page: activityPage, limit: ACTIVITY_PAGE_SIZE });
      setActivity({
        items: res.items ?? [],
        total: res.total ?? 0,
        totalPages: res.totalPages ?? 1,
      });
    } catch {
      setActivity({ items: [], total: 0, totalPages: 1 });
    } finally {
      setActivityLoading(false);
    }
  };

  const loadAll = async () => {
    await Promise.all([loadStats(), loadActivity()]);
  };

  useEffect(() => { loadStats(); }, []);

  useEffect(() => { loadActivity(); }, [activityPage]);

  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <RefreshButton onRefresh={loadAll} loading={statsLoading || activityLoading} />
      </div>
      {statsLoading ? (
        <StatsSkeleton />
      ) : (
        <StatsGrid>
          <StatCard icon="👥" label={t('nav.users')} value={stats?.users ?? '—'} color="blue" trend={t('admin.home.activeUsers')} trendUp />
          <StatCard icon="🏗" label={t('nav.projects')} value={stats?.projects ?? '—'} color="green" />
          <StatCard icon="🏦" label={t('admin.home.awaitingDisbursement')} value={cycleStats.disbursement} color="amber" />
          <StatCard icon="✔" label={t('admin.home.settledCustodies')} value={cycleStats.settled} color="blue" />
        </StatsGrid>
      )}

      <Card title={`📊 ${t('budget.overviewTitle')}`}>
        <AdminBudgetSection />
      </Card>

      <Card title="آخر العمليات الإدارية" noPadding>
        {activityLoading ? (
          <div className="p-4">
            <TimelineSkeleton rows={6} />
          </div>
        ) : (activity.items?.length ?? 0) > 0 ? (
          <>
            <div className="p-4">
              <Timeline items={activity.items.map((l) => ({
                title: l.action || '',
                date: l.createdAt ? new Date(l.createdAt).toLocaleString('ar-SA') : '',
                done: true,
              }))} />
            </div>
            <Pagination
              page={activityPage}
              totalPages={activity.totalPages}
              total={activity.total}
              pageSize={ACTIVITY_PAGE_SIZE}
              onPageChange={setActivityPage}
            />
          </>
        ) : (
          <p className="text-muted text-sm p-4">{t('common.noData')}</p>
        )}
      </Card>
    </div>
  );
}

const EMPTY_USER_FORM = { name: '', nameEn: '', email: '', password: '', role: 'project_accountant', isActive: true };
const USER_DRAFT_OMIT: (keyof typeof EMPTY_USER_FORM)[] = ['password'];
const EMPTY_PROJECT_FORM = { name: '', nameEn: '', budget: 0, status: 'active', manager: '', accountant: '' };
const SETTINGS_INIT = { companyName: '', taxNumber: '' };

function userId(u: User) {
  return String(u.id || u._id);
}

const USERS_PAGE_SIZE = 15;
const ROLE_FILTER_OPTIONS = [
  { value: '', label: 'كل الأدوار' },
  { value: 'admin', label: 'مدير النظام' },
  { value: 'chief_accountant', label: 'مدير المحاسبين' },
  { value: 'project_accountant', label: 'محاسب المشروع' },
  { value: 'project_manager', label: 'مدير المشروع' },
];

export function AdminUsersPage() {
  const { t, i18n } = useTranslation();
  const { runAction } = useUi();
  const [users, setUsers] = useState<User[]>([]);
  const [modal, setModal] = useState<'create' | 'edit' | null>(null);
  const [viewUser, setViewUser] = useState<User | null>(null);
  const [editingId, setEditingId] = useState('');

  const draftKey =
    modal === 'edit' && editingId
      ? `admin.users.edit.${editingId}`
      : modal === 'create'
        ? 'admin.users.create'
        : 'admin.users.inactive';

  const { form, setForm, clearDraft } = useFormDraft(draftKey, EMPTY_USER_FORM, {
    omit: USER_DRAFT_OMIT,
    persist: modal !== null,
  });

  const load = () => userService.list().then(setUsers);
  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (modal !== 'edit' || !editingId) return;
    if (hasFormDraft(`admin.users.edit.${editingId}`)) return;
    const u = users.find((x) => userId(x) === editingId);
    if (!u) return;
    setForm({
      name: u.name,
      nameEn: u.nameEn || '',
      email: u.email,
      password: '',
      role: u.role,
      isActive: u.isActive,
    });
  }, [modal, editingId, users, setForm]);

  const roleCounts = {
    acc: users.filter((u) => u.role === 'project_accountant').length,
    pm: users.filter((u) => u.role === 'project_manager').length,
    fin: users.filter((u) => u.role === 'chief_accountant').length,
  };

  const tf = useTableFilter(users, [(u) => u.name, (u) => u.email, (u) => u.role, (u) => t(`roles.${u.role}`)], (u) => u.role);
  const userPages = usePagination(tf.filtered, USERS_PAGE_SIZE);

  useEffect(() => { userPages.setPage(1); }, [tf.query, tf.status]);

  const openCreate = () => {
    setEditingId('');
    setModal('create');
  };

  const openEdit = (u: User) => {
    setEditingId(userId(u));
    setModal('edit');
  };

  const save = () =>
    runAction(async () => {
      if (modal === 'create') {
        if (!form.password) throw new Error('كلمة المرور مطلوبة');
        await userService.create({
          name: form.name,
          nameEn: form.nameEn || undefined,
          email: form.email,
          password: form.password,
          role: form.role,
        });
      } else {
        const payload: Record<string, unknown> = {
          name: form.name,
          nameEn: form.nameEn,
          email: form.email,
          role: form.role,
          isActive: form.isActive,
        };
        if (form.password) payload.password = form.password;
        await userService.update(editingId, payload);
      }
      setModal(null);
      clearDraft();
      load();
    }, { success: modal === 'create' ? 'تم إضافة المستخدم بنجاح' : 'تم تحديث المستخدم' });

  return (
    <div className="space-y-4">
      <StatsGrid>
        <StatCard icon="👷" label="محاسبين المشاريع" value={roleCounts.acc} color="blue" />
        <StatCard icon="👔" label="مدرين المشاريع" value={roleCounts.pm} color="amber" />
        <StatCard icon="🏦" label="مديرين المحاسبين" value={roleCounts.fin} color="green" />
      </StatsGrid>
      <Card title={t('nav.users')} action={
        <div className="flex items-center gap-2">
          <RefreshButton onRefresh={load} />
          <Button size="sm" onClick={openCreate}>＋ {t('common.add')}</Button>
        </div>
      } noPadding>
        <DataTable
          columns={[
            {
              key: 'name',
              header: t('nav.users'),
              exportHeader: t('nav.users'),
              render: (u) => (
                <button type="button" onClick={() => setViewUser(u)} className="font-bold text-navy hover:text-brand-600 hover:underline text-start">
                  {i18n.language === 'en' && u.nameEn ? u.nameEn : u.name}
                </button>
              ),
              exportValue: (u) => (i18n.language === 'en' && u.nameEn ? u.nameEn : u.name),
            },
            { key: 'email', header: t('auth.email'), exportHeader: t('auth.email'), render: (u) => u.email, exportValue: (u) => u.email },
            { key: 'role', header: i18n.language === 'ar' ? 'الدور' : 'Role', exportHeader: i18n.language === 'ar' ? 'الدور' : 'Role', render: (u) => <RoleChip role={u.role} label={t(`roles.${u.role}`)} />, exportValue: (u) => t(`roles.${u.role}`) },
            { key: 'status', header: t('common.status'), exportHeader: t('common.status'), render: (u) => <StatusChip status={u.isActive ? 'active' : 'pm_rejected'} label={u.isActive ? (i18n.language === 'ar' ? 'نشط' : 'Active') : (i18n.language === 'ar' ? 'معطّل' : 'Inactive')} />, exportValue: (u) => (u.isActive ? (i18n.language === 'ar' ? 'نشط' : 'Active') : (i18n.language === 'ar' ? 'معطّل' : 'Inactive')) },
            {
              key: 'act',
              header: t('common.actions'),
              exportable: false,
              render: (u) => (
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => setViewUser(u)}>{t('common.view')}</Button>
                  <Button size="sm" variant="ghost" onClick={() => openEdit(u)}>{t('common.edit')}</Button>
                </div>
              ),
            },
          ]}
          data={userPages.paginated}
          query={tf.query}
          onQueryChange={tf.setQuery}
          statusFilter={{ value: tf.status, onChange: tf.setStatus, options: ROLE_FILTER_OPTIONS }}
          onReset={tf.reset}
          onRefresh={load}
          shown={tf.shown}
          total={tf.total}
          exportFilename="users"
          exportTitle={t('nav.users')}
          exportLang={i18n.language}
          exportRowLabel={i18n.language === 'ar' ? 'مستخدم' : 'users'}
          pagination={{
            page: userPages.page,
            totalPages: userPages.totalPages,
            total: userPages.total,
            pageSize: USERS_PAGE_SIZE,
            onPageChange: userPages.setPage,
          }}
        />
      </Card>
      <Modal
        open={modal !== null}
        onClose={() => setModal(null)}
        title={modal === 'create' ? 'مستخدم جديد' : 'تعديل المستخدم'}
        footer={
          <>
            <Button onClick={save}>{t('common.save')}</Button>
            <Button variant="ghost" onClick={() => setModal(null)}>{t('common.cancel')}</Button>
          </>
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="الاسم"><input className={inputClass} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></FormField>
          <FormField label="English name"><input className={inputClass} value={form.nameEn} onChange={(e) => setForm({ ...form, nameEn: e.target.value })} /></FormField>
          <FormField label="البريد"><input className={inputClass} type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></FormField>
          <FormField label="الدور">
            <select className={selectClass} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              <option value="admin">مدير النظام</option>
              <option value="chief_accountant">مدير المحاسبين</option>
              <option value="project_accountant">محاسب المشروع</option>
              <option value="project_manager">مدير المشروع</option>
            </select>
          </FormField>
          <FormField label={modal === 'edit' ? 'كلمة مرور جديدة (اختياري)' : 'كلمة المرور'}>
            <input
              className={inputClass}
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder={modal === 'edit' ? 'اتركه فارغاً للإبقاء على الحالية' : ''}
              required={modal === 'create'}
            />
          </FormField>
          {modal === 'edit' && (
            <FormField label="الحالة">
              <select
                className={selectClass}
                value={form.isActive ? 'active' : 'inactive'}
                onChange={(e) => setForm({ ...form, isActive: e.target.value === 'active' })}
              >
                <option value="active">نشط</option>
                <option value="inactive">معطّل</option>
              </select>
            </FormField>
          )}
        </div>
      </Modal>
      <Modal open={!!viewUser} onClose={() => setViewUser(null)} title={viewUser ? userName(viewUser, i18n.language) : ''} width="lg">
        {viewUser && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3 bg-[#f7f9fc] rounded-xl border">
                <span className="text-[11px] text-muted font-bold">البريد</span>
                <div className="font-bold text-navy mt-1">{viewUser.email}</div>
              </div>
              <div className="p-3 bg-[#f7f9fc] rounded-xl border">
                <span className="text-[11px] text-muted font-bold">الدور</span>
                <div className="mt-1"><RoleChip role={viewUser.role} label={t(`roles.${viewUser.role}`)} /></div>
              </div>
            </div>
            <div className="rounded-xl border border-[#e3e9f2] overflow-hidden bg-[#fbfcfe]">
              <div className="px-4 py-2.5 border-b border-[#e3e9f2] bg-white">
                <h4 className="font-extrabold text-navy text-sm">المشاريع المرتبطة</h4>
                <p className="text-[11px] text-muted mt-0.5">{viewUser.projects?.length ?? 0} مشروع</p>
              </div>
              {(viewUser.projects?.length ?? 0) > 0 ? (
                <ul className="divide-y divide-[#e8edf4]">
                  {viewUser.projects!.map((p) => (
                    <li key={p._id || p.id} className="flex items-center gap-3 px-4 py-3.5 bg-white hover:bg-[#f9fbfe] transition-colors">
                      <div className="w-9 h-9 rounded-xl bg-brand-50 border border-brand-100 text-brand-600 grid place-items-center text-base shrink-0">
                        🏗
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-navy truncate">{projectName(p, i18n.language)}</div>
                      </div>
                      <StatusChip status={p.status} label={statusLabel(p.status, t as any)} />
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted text-sm p-4">{t('common.noData')}</p>
              )}
            </div>
            <div className="flex gap-2 pt-2">
              <Button size="sm" onClick={() => { openEdit(viewUser); setViewUser(null); }}>{t('common.edit')}</Button>
              <Button size="sm" variant="ghost" onClick={() => setViewUser(null)}>{t('common.cancel')}</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

export function AdminProjectsPage() {
  const { t, i18n } = useTranslation();
  const { runAction } = useUi();
  const [projects, setProjects] = useState<Project[]>([]);
  const [managers, setManagers] = useState<User[]>([]);
  const [accountants, setAccountants] = useState<User[]>([]);
  const [modal, setModal] = useState<'create' | 'edit' | null>(null);
  const [editingId, setEditingId] = useState('');

  const draftKey =
    modal === 'edit' && editingId
      ? `admin.projects.edit.${editingId}`
      : modal === 'create'
        ? 'admin.projects.create'
        : 'admin.projects.inactive';

  const { form, setForm, clearDraft } = useFormDraft(draftKey, EMPTY_PROJECT_FORM, {
    persist: modal !== null,
  });

  const load = () => projectService.list().then(setProjects);
  useEffect(() => {
    load();
    userService.list({ role: 'project_manager' }).then(setManagers);
    userService.list({ role: 'project_accountant' }).then(setAccountants);
  }, []);

  useEffect(() => {
    if (modal !== 'edit' || !editingId) return;
    if (hasFormDraft(`admin.projects.edit.${editingId}`)) return;
    const p = projects.find((x) => x._id === editingId);
    if (!p) return;
    setForm({
      name: p.name,
      nameEn: p.nameEn || '',
      budget: p.budget,
      status: p.status,
      manager: String((p.manager as User & { _id?: string })?._id || (p.manager as User)?.id || ''),
      accountant: String(
        (p.accountants?.[0] as User & { _id?: string })?._id
          || (p.accountants?.[0] as User)?.id
          || '',
      ),
    });
  }, [modal, editingId, projects, setForm]);

  const openCreate = () => {
    setEditingId('');
    setModal('create');
  };

  const openEdit = (p: Project) => {
    setEditingId(p._id);
    setModal('edit');
  };

  const save = () =>
    runAction(async () => {
      const payload = {
        name: form.name,
        nameEn: form.nameEn,
        budget: form.budget,
        status: form.status,
        manager: form.manager || undefined,
        accountants: form.accountant ? [form.accountant] : [],
      };
      if (modal === 'create') {
        await projectService.create(payload);
      } else {
        await projectService.update(editingId, payload);
      }
      setModal(null);
      clearDraft();
      load();
    }, { success: modal === 'create' ? 'تم إنشاء المشروع' : 'تم تحديث المشروع' });

  return (
    <div className="space-y-4">
      <Card title={t('nav.projects')} action={
        <div className="flex items-center gap-2">
          <RefreshButton onRefresh={load} />
          <Button size="sm" onClick={openCreate}>＋ مشروع جديد</Button>
        </div>
      } noPadding>
        <DataTable
          columns={[
            { key: 'name', header: t('common.project'), exportHeader: t('common.project'), render: (p) => <span className="font-bold">{projectName(p, i18n.language)}</span>, exportValue: (p) => projectName(p, i18n.language) },
            {
              key: 'manager',
              header: t('roles.project_manager'),
              exportHeader: t('roles.project_manager'),
              render: (p) => (p.manager ? userName(p.manager, i18n.language) : '—'),
              exportValue: (p) => (p.manager ? userName(p.manager, i18n.language) : ''),
            },
            {
              key: 'accountant',
              header: t('roles.project_accountant'),
              exportHeader: t('roles.project_accountant'),
              render: (p) => (p.accountants?.[0] ? userName(p.accountants[0], i18n.language) : '—'),
              exportValue: (p) => (p.accountants?.[0] ? userName(p.accountants[0], i18n.language) : ''),
            },
            { key: 'budget', header: t('pm.budget'), exportHeader: t('pm.budget'), render: (p) => <Amount>{formatMoney(p.budget, i18n.language)}</Amount>, exportValue: (p) => String(p.budget ?? 0) },
            { key: 'spent', header: t('pm.spent'), exportHeader: t('pm.spent'), render: (p) => formatMoney(p.spent, i18n.language), exportValue: (p) => String(p.spent ?? 0) },
            { key: 'status', header: t('common.status'), exportHeader: t('common.status'), render: (p) => <StatusChip status={p.status} label={statusLabel(p.status, t)} />, exportValue: (p) => statusLabel(p.status, t) },
            { key: 'act', header: t('common.actions'), exportable: false, render: (p) => (
              <Button size="sm" variant="ghost" onClick={() => openEdit(p)}>{t('common.edit')}</Button>
            ) },
          ]}
          data={projects}
          onRefresh={load}
          exportFilename="projects"
          exportTitle={t('nav.projects')}
          exportLang={i18n.language}
          exportRowLabel={i18n.language === 'ar' ? 'مشروع' : 'projects'}
        />
      </Card>
      <Modal
        open={modal !== null}
        onClose={() => setModal(null)}
        title={modal === 'create' ? 'مشروع جديد' : 'تعديل المشروع'}
        footer={<><Button onClick={save}>{t('common.save')}</Button><Button variant="ghost" onClick={() => setModal(null)}>{t('common.cancel')}</Button></>}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="اسم المشروع"><input className={inputClass} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></FormField>
          <FormField label="English name"><input className={inputClass} value={form.nameEn} onChange={(e) => setForm({ ...form, nameEn: e.target.value })} /></FormField>
          <FormField label="الميزانية"><input className={inputClass} type="number" value={form.budget || ''} onChange={(e) => setForm({ ...form, budget: +e.target.value })} /></FormField>
          <FormField label={t('common.status')}>
            <select className={selectClass} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              <option value="active">نشط</option>
              <option value="new">جديد</option>
              <option value="near_budget">قارب الميزانية</option>
              <option value="over_budget">تخطي الميزانية</option>
              <option value="closed">مغلق</option>
            </select>
          </FormField>
          <FormField label="مدير المشروع" full>
            <select className={selectClass} value={form.manager} onChange={(e) => setForm({ ...form, manager: e.target.value })}>
              <option value="">—</option>
              {managers.map((m) => <option key={m.id || m._id} value={m.id || m._id}>{userName(m, i18n.language)}</option>)}
            </select>
          </FormField>
          <FormField label={t('roles.project_accountant')} full>
            <select className={selectClass} value={form.accountant} onChange={(e) => setForm({ ...form, accountant: e.target.value })}>
              <option value="">—</option>
              {accountants.map((a) => <option key={a.id || a._id} value={a.id || a._id}>{userName(a, i18n.language)}</option>)}
            </select>
          </FormField>
        </div>
      </Modal>
    </div>
  );
}

export function AdminRolesPage() {
  const { t } = useTranslation();
  const { form: toggles, setForm: setToggles } = useFormDraft('admin.roles.toggles', {
    approve: true,
    emergency: true,
    finance: false,
    reports: true,
  });
  const permissions: [string, boolean, boolean, boolean, boolean][] = [
    ['إنشاء طلب عهدة', true, true, false, true],
    ['رفع الفواتير', false, true, false, true],
    ['الموافقة المبدئية', false, false, true, true],
    ['الاعتماد المالي', false, false, false, true],
    ['التسوية وإغلاق العهد', false, false, false, true],
    ['إدارة المستخدمين', false, false, false, true],
  ];

  return (
    <div className="space-y-4">
      <Card title={t('nav.roles')} noPadding>
        <table className="w-full text-sm matrix">
          <thead><tr className="bg-[#f7f9fc]">
            <th className="p-3 text-start">الصلاحية</th>
            <th className="p-3 text-center">{t('roles.chief_accountant')}</th>
            <th className="p-3 text-center">{t('roles.project_accountant')}</th>
            <th className="p-3 text-center">{t('roles.project_manager')}</th>
            <th className="p-3 text-center">{t('roles.admin')}</th>
          </tr></thead>
          <tbody>
            {permissions.map(([name, fin, acc, pm, adm]) => (
              <tr key={name} className="border-t">
                <td className="p-3 font-bold text-navy">{name}</td>
                {[fin, acc, pm, adm].map((v, i) => (
                  <td key={i} className={`p-3 text-center font-black ${v ? 'text-brand-500' : 'text-red-500'}`}>{v ? '✔' : '✕'}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      <Card title="تعديل صلاحيات مدير المشروع">
        {Object.entries({ approve: 'الموافقة المبدئية', emergency: 'عهدة طارئة', finance: 'الاعتماد المالي', reports: 'تقارير الأداء' }).map(([k, label]) => (
          <div key={k} className="flex justify-between items-center py-3 border-b last:border-0">
            <span>{label}</span>
            <button type="button" onClick={() => setToggles({ ...toggles, [k]: !toggles[k as keyof typeof toggles] })} className={`w-10 h-6 rounded-full relative transition-colors ${toggles[k as keyof typeof toggles] ? 'bg-brand-500' : 'bg-gray-300'}`}>
              <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${toggles[k as keyof typeof toggles] ? 'start-0.5' : 'end-0.5'}`} />
            </button>
          </div>
        ))}
        <Button className="mt-4">{t('common.save')}</Button>
      </Card>
    </div>
  );
}

const CUSTODY_STATUS_OPTIONS = [
  { value: '', label: 'كل الحالات' },
  { value: 'open', label: 'مفتوحة' },
  { value: 'closed', label: 'مغلقة' },
  { value: 'pm_approved', label: 'موافقة مدير المشروع' },
  { value: 'pm_rejected', label: 'مرفوضة — مدير المشروع' },
  { value: 'finance_pending', label: 'بانتظار المالية' },
  { value: 'settled', label: 'مسوّاة' },
  { value: 'finance_rejected', label: 'مرفوضة — المالية' },
];

export function AdminCyclePage() {
  const { t, i18n } = useTranslation();
  const [stats, setStats] = useState({ pm: 0, pa: 0, chief: 0, disbursement: 0, settled: 0 });
  const [custodies, setCustodies] = useState<Custody[]>([]);
  const [loading, setLoading] = useState(true);
  const tf = useTableFilter(custodies, [(c) => c.custodyNumber, (c) => projectName(c.project, i18n.language)], (c) => c.status);

  const load = async () => {
    setLoading(true);
    try {
      const [s, c] = await Promise.all([custodyService.cycleStats(), custodyService.list()]);
      setStats(s);
      setCustodies(c);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-5">
      <Card action={<RefreshButton onRefresh={load} loading={loading} />}><CyclePipeline stats={stats} /></Card>
      <Card title="سجل العهد — تفاصيل الدورة" noPadding>
        <DataTable
          columns={[
            { key: 'num', header: t('nav.myCustody'), exportHeader: t('nav.myCustody'), render: (c) => <b>{c.custodyNumber}</b>, exportValue: (c) => c.custodyNumber },
            { key: 'proj', header: t('common.project'), exportHeader: t('common.project'), render: (c) => projectName(c.project, i18n.language), exportValue: (c) => projectName(c.project, i18n.language) },
            { key: 'total', header: t('common.amount'), exportHeader: t('common.amount'), render: (c) => <Amount>{formatMoney(c.spent, i18n.language)}</Amount>, exportValue: (c) => String(c.spent) },
            { key: 'flow', header: t('nav.cycle'), exportHeader: t('nav.cycle'), render: (c) => <CycleFlow status={c.status} />, exportValue: (c) => statusLabel(c.status, t) },
            { key: 'st', header: t('common.status'), exportHeader: t('common.status'), render: (c) => <StatusChip status={c.status} label={statusLabel(c.status, t)} />, exportValue: (c) => statusLabel(c.status, t) },
          ]}
          data={tf.filtered}
          loading={loading}
          query={tf.query}
          onQueryChange={tf.setQuery}
          statusFilter={{ value: tf.status, onChange: tf.setStatus, options: CUSTODY_STATUS_OPTIONS }}
          onReset={tf.reset}
          onRefresh={load}
          shown={tf.shown}
          total={tf.total}
          exportFilename="custody-cycle"
          exportTitle={t('nav.cycle')}
          exportLang={i18n.language}
          exportRowLabel={i18n.language === 'ar' ? 'عهدة' : 'custodies'}
        />
      </Card>
    </div>
  );
}

export function AdminSettingsPage() {
  const { t, i18n } = useTranslation();
  const { runAction } = useUi();
  const { user } = useAuth();
  const { form: settings, setForm: setSettings, clearDraft } = useFormDraft('admin.settings', SETTINGS_INIT);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    if (hasFormDraft('admin.settings', user?.id)) return;
    setLoading(true);
    try {
      const s = await dashboardService.settings();
      setSettings({
        companyName: s.companyName || '',
        taxNumber: s.taxNumber || '',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [user?.id, setSettings]);

  const save = () =>
    runAction(async () => {
      await dashboardService.updateSettings(settings);
      clearDraft();
    }, { success: 'تم حفظ الإعدادات' });

  return (
    <Card title={t('nav.settings')} action={<RefreshButton onRefresh={load} loading={loading} />}>
      <div className="grid gap-4 max-w-md">
        <div className="p-4 bg-[#f7f9fc] rounded-xl border space-y-1">
          <span className="text-[11px] text-muted font-bold">مدير النظام</span>
          <div className="font-extrabold text-navy">{user ? userName(user, i18n.language) : '—'}</div>
          <div className="text-sm text-muted">{user?.email ?? '—'}</div>
        </div>
        <FormField label="اسم الشركة"><input className={inputClass} value={settings.companyName} onChange={(e) => setSettings({ ...settings, companyName: e.target.value })} /></FormField>
        <FormField label="الرقم الضريبي"><input className={inputClass} value={settings.taxNumber} onChange={(e) => setSettings({ ...settings, taxNumber: e.target.value })} /></FormField>
        <Button onClick={save}>{t('common.save')}</Button>
      </div>
    </Card>
  );
}

export function AdminLogsPage() {
  const { t } = useTranslation();
  const [logsPage, setLogsPage] = useState(1);
  const [logsLoading, setLogsLoading] = useState(true);
  const [logs, setLogs] = useState<{ items: { action?: string; createdAt?: string }[]; total: number; totalPages: number }>({
    items: [], total: 0, totalPages: 1,
  });

  const load = async () => {
    setLogsLoading(true);
    try {
      const res = await dashboardService.activityLogs({ page: logsPage, limit: ACTIVITY_PAGE_SIZE });
      setLogs({
        items: res.items ?? [],
        total: res.total ?? 0,
        totalPages: res.totalPages ?? 1,
      });
    } catch {
      setLogs({ items: [], total: 0, totalPages: 1 });
    } finally {
      setLogsLoading(false);
    }
  };

  useEffect(() => { load(); }, [logsPage]);

  return (
    <Card title={t('nav.logs')} action={<RefreshButton onRefresh={load} loading={logsLoading} />} noPadding>
      {logsLoading ? (
        <PageLoader compact />
      ) : (
        <>
          <div className="p-4">
            {(logs.items?.length ?? 0) > 0 ? (
              <Timeline items={logs.items.map((l) => ({
                title: l.action || '',
                date: l.createdAt ? new Date(l.createdAt).toLocaleString('ar-SA') : '',
                done: true,
              }))} />
            ) : (
              <p className="text-muted text-sm">{t('common.noData')}</p>
            )}
          </div>
          <Pagination
            page={logsPage}
            totalPages={logs.totalPages}
            total={logs.total}
            pageSize={ACTIVITY_PAGE_SIZE}
            onPageChange={setLogsPage}
          />
        </>
      )}
    </Card>
  );
}

export function AdminAnalyticsPage() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const [data, setData] = useState<Awaited<ReturnType<typeof dashboardService.adminAnalytics>> | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      setData(await dashboardService.adminAnalytics());
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const formatHours = (h: number) => (h ? `${h} ${lang === 'ar' ? 'س' : 'h'}` : '—');

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <RefreshButton onRefresh={load} loading={loading} />
      </div>
      <StatsGrid>
        <StatCard icon="📊" label={t('admin.analytics.settledCycles')} value={data?.settledCycles ?? '—'} color="green" />
        <StatCard icon="💰" label={t('admin.analytics.totalExpense')} value={data ? formatMoney(data.totalExpense, lang) : '—'} color="blue" />
        <StatCard icon="⏱" label={t('admin.analytics.avgSettlement')} value={data ? formatHours(data.avgSettlementHours) : '—'} color="amber" />
        <StatCard icon="⚠" label={t('admin.analytics.nearBudgetAlerts')} value={data?.nearBudgetAlerts ?? '—'} color="red" />
      </StatsGrid>
      <Card title={t('nav.analytics')} action={<RefreshButton onRefresh={load} loading={loading} />}>
        {loading ? (
          <PageLoader compact />
        ) : (
          <ProjectBarChart
            labels={data?.expenseTrend?.labels ?? []}
            data={data?.expenseTrend?.data ?? []}
          />
        )}
      </Card>
    </div>
  );
}

export function AdminNotificationsPage() {
  return <NotificationsPage />;
}
