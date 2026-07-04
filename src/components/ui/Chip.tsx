import clsx from 'clsx';

type ChipVariant = 'green' | 'amber' | 'red' | 'blue' | 'gray';

const styles: Record<ChipVariant, string> = {
  green: 'bg-emerald-50/90 text-emerald-800 border-emerald-200/80',
  amber: 'bg-amber-50/90 text-amber-800 border-amber-200/80',
  red: 'bg-red-50/90 text-red-800 border-red-200/80',
  blue: 'bg-slate-50 text-slate-700 border-slate-200/90',
  gray: 'bg-gray-50 text-gray-600 border-gray-200/90',
};

const chipBase =
  'inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-[11px] font-semibold border whitespace-nowrap shadow-[0_1px_2px_rgba(15,36,64,0.05)]';

export function statusToChip(status?: string): ChipVariant {
  if (!status) return 'gray';
  if (['settled', 'active', 'open', 'accumulated', 'finance_approved'].includes(status)) return 'green';
  if (['closed', 'pending_pm', 'pending_finance', 'pm_approved', 'near_budget', 'finance_pending'].includes(status)) return 'amber';
  if (status === 'over_budget' || status.includes('reject')) return 'red';
  if (status === 'new') return 'blue';
  return 'gray';
}

export function Chip({ children, variant = 'gray' }: { children: React.ReactNode; variant?: ChipVariant }) {
  return (
    <span className={clsx(chipBase, styles[variant])}>
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70 shrink-0" />
      {children}
    </span>
  );
}

export function StatusChip({ status, label }: { status?: string; label: string }) {
  return <Chip variant={statusToChip(status)}>{label}</Chip>;
}

const roleStyles: Record<string, ChipVariant> = {
  admin: 'gray',
  chief_accountant: 'green',
  project_accountant: 'blue',
  project_manager: 'amber',
};

const roleCustom: Record<string, string> = {
  admin: 'bg-violet-50/95 text-violet-800 border-violet-200/80',
  chief_accountant: 'bg-teal-50/95 text-teal-800 border-teal-200/80',
  project_accountant: 'bg-sky-50/95 text-sky-800 border-sky-200/80',
  project_manager: 'bg-orange-50/95 text-orange-800 border-orange-200/80',
};

/** Role badge with distinct, eye-friendly colors per role */
export function RoleChip({ role, label }: { role: string; label: string }) {
  if (roleCustom[role]) {
    return (
      <span className={clsx(chipBase, roleCustom[role])}>
        <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70 shrink-0" />
        {label}
      </span>
    );
  }
  return <Chip variant={roleStyles[role] || 'gray'}>{label}</Chip>;
}

export function Amount({ children }: { children: React.ReactNode }) {
  return <span className="font-extrabold text-navy whitespace-nowrap">{children}</span>;
}
