import clsx from 'clsx';
import { useTranslation } from 'react-i18next';

function stepIndex(status: string) {
  if (status === 'open' || status === 'accumulated') return 0;
  if (status === 'closed' || status === 'pending_pm' || status === 'pm_rejected') return 1;
  if (status === 'pm_approved' || status === 'pending_finance' || status === 'finance_rejected') return 2;
  if (status === 'finance_pending') return 3;
  if (status === 'settled') return 4;
  return 0;
}

export function CycleFlow({ status, hasPendingPm }: { status: string; hasPendingPm?: boolean }) {
  const { t } = useTranslation();
  const STEPS = [
    { key: 'pm', icon: '👷', label: t('cycle.stepPm') },
    { key: 'pa', icon: '📋', label: t('cycle.stepPa') },
    { key: 'chief', icon: '🧾', label: t('cycle.stepChief') },
    { key: 'disburse', icon: '🏦', label: t('cycle.stepDisburse') },
    { key: 'done', icon: '✓', label: t('cycle.stepDone') },
  ];

  const resubmitActive = hasPendingPm && ['pm_rejected', 'finance_rejected', 'settled'].includes(status);
  const effectiveStatus = resubmitActive ? 'closed' : status;
  const current = stepIndex(effectiveStatus);
  const rejected = status.includes('reject') && !resubmitActive;

  if (rejected) {
    return <span className="inline-block bg-red-50 text-red-700 text-[11px] font-extrabold px-2.5 py-1 rounded-full">{t('cycle.rejected')}</span>;
  }

  return (
    <div className="inline-flex items-center gap-0.5">
      {STEPS.map((s, i) => (
        <span key={s.key} className="inline-flex items-center gap-0.5">
          <span
            title={s.label}
            className={clsx(
              'w-6 h-6 rounded-full grid place-items-center text-[11px] border',
              i < current ? 'bg-brand-50 text-brand-600 border-brand-200' : i === current ? 'bg-brand-500 text-white border-brand-500 scale-110 shadow-[0_0_0_2px_rgba(46,158,91,0.35)]' : 'bg-[#eef1f6] text-[#9fb2cc] border-[#dde4ee]'
            )}
          >
            {s.icon}
          </span>
          {i < STEPS.length - 1 && (
            <span className={clsx('w-2 h-0.5 rounded', i < current ? 'bg-brand-300' : 'bg-[#dde4ee]')} />
          )}
        </span>
      ))}
    </div>
  );
}

export function CyclePipeline({ stats }: { stats: { pm: number; pa: number; chief: number; disbursement: number; settled: number } }) {
  const { t } = useTranslation();
  const stages = [
    { icon: '👷', label: t('cycle.stepPm'), sub: t('cycle.subPm'), count: stats.pm },
    { icon: '📋', label: t('cycle.stepPa'), sub: t('cycle.subPa'), count: stats.pa },
    { icon: '🧾', label: t('cycle.stepChief'), sub: t('cycle.subChief'), count: stats.chief },
    { icon: '🏦', label: t('cycle.stepDisburse'), sub: t('cycle.subDisburse'), count: stats.disbursement },
    { icon: '✓', label: t('cycle.stepDone'), sub: t('cycle.subDone'), count: stats.settled },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
      {stages.map((s, i) => (
        <div
          key={s.label}
          className={clsx(
            'relative text-center rounded-2xl border p-4 shadow-sm',
            s.count > 0 && i === 4 ? 'border-brand-200 bg-gradient-to-b from-brand-50 to-white' : 'border-[#e3e9f2] bg-white'
          )}
        >
          {i > 0 && <span className="hidden lg:block absolute -start-3 top-1/2 -translate-y-1/2 text-[#9fb2cc] font-bold">←</span>}
          <div className="text-2xl mb-1">{s.icon}</div>
          <div className="text-3xl font-black text-navy">{s.count}</div>
          <div className="text-[10px] text-brand-600 font-bold mt-0.5">{t('cycle.workCount', { count: s.count })}</div>
          <div className="text-sm font-extrabold text-navy mt-1">{s.label}</div>
          <div className="text-[11px] text-muted">{s.sub}</div>
        </div>
      ))}
    </div>
  );
}
