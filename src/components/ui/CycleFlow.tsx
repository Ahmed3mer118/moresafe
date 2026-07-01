import clsx from 'clsx';

const STEPS = [
  { key: 'engineer', icon: '👷', label: 'Accountant' },
  { key: 'pm', icon: '👔', label: 'PM' },
  { key: 'finance', icon: '🏦', label: 'Finance' },
  { key: 'done', icon: '✓', label: 'Settled' },
];

function stepIndex(status: string) {
  if (status === 'open' || status === 'accumulated') return 0;
  if (status === 'closed' || status === 'pending_pm' || status === 'pm_rejected') return 1;
  if (status === 'pm_approved' || status === 'pending_finance' || status === 'finance_rejected') return 2;
  if (status === 'settled') return 3;
  return 0;
}

export function CycleFlow({ status }: { status: string }) {
  const current = stepIndex(status);
  const rejected = status.includes('reject');

  if (rejected) {
    return <span className="inline-block bg-red-50 text-red-700 text-[11px] font-extrabold px-2.5 py-1 rounded-full">مرفوض</span>;
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

export function CyclePipeline({ stats }: { stats: { engineer: number; pm: number; finance: number; settled: number } }) {
  const stages = [
    { icon: '👷', label: 'عند المحاسب', sub: 'مسودة / جارية', count: stats.engineer },
    { icon: '👔', label: 'مدير المشروع', sub: 'بانتظار الاعتماد', count: stats.pm },
    { icon: '🏦', label: 'المالية', sub: 'بانتظار التسوية', count: stats.finance },
    { icon: '✓', label: 'مسوّاة', sub: 'تم الصرف', count: stats.settled },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {stages.map((s, i) => (
        <div
          key={s.label}
          className={clsx(
            'relative text-center rounded-2xl border p-4 shadow-sm',
            s.count > 0 && i === 3 ? 'border-brand-200 bg-gradient-to-b from-brand-50 to-white' : 'border-[#e3e9f2] bg-white'
          )}
        >
          {i > 0 && <span className="hidden lg:block absolute -start-3 top-1/2 -translate-y-1/2 text-[#9fb2cc] font-bold">←</span>}
          <div className="text-2xl mb-1">{s.icon}</div>
          <div className="text-3xl font-black text-navy">{s.count}</div>
          <div className="text-sm font-extrabold text-navy mt-1">{s.label}</div>
          <div className="text-[11px] text-muted">{s.sub}</div>
        </div>
      ))}
    </div>
  );
}
