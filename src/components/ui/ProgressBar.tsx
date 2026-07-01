import clsx from 'clsx';

interface ProgressBarProps {
  value: number;
  max?: number;
  variant?: 'default' | 'green' | 'amber' | 'red';
  showLabel?: boolean;
  label?: string;
}

const barColors = {
  default: 'bg-navy/70',
  green: 'bg-brand-500',
  amber: 'bg-amber-500',
  red: 'bg-red-500',
};

export function ProgressBar({ value, max = 100, variant = 'green', showLabel, label }: ProgressBarProps) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div>
      {showLabel && label && (
        <div className="flex justify-between text-sm font-bold mb-1.5">
          <span className="text-navy">{label}</span>
          <span className="text-muted text-xs">{Math.round(pct)}%</span>
        </div>
      )}
      <div className="h-2.5 bg-[#eef1f6] rounded-full overflow-hidden">
        <div className={clsx('h-full rounded-full transition-all duration-500', barColors[variant])} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
