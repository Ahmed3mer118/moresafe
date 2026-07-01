import clsx from 'clsx';
import { useTranslation } from 'react-i18next';

interface PageLoaderProps {
  label?: string;
  compact?: boolean;
  className?: string;
}

export function PageLoader({ label, compact, className }: PageLoaderProps) {
  const { t } = useTranslation();

  return (
    <div
      className={clsx(
        'flex flex-col items-center justify-center gap-4',
        compact ? 'py-10' : 'py-16',
        className
      )}
      role="status"
      aria-live="polite"
    >
      <div className="relative w-12 h-12">
        <div className="absolute inset-0 rounded-full border-[3px] border-brand-100" />
        <div className="absolute inset-0 rounded-full border-[3px] border-transparent border-t-brand-500 animate-spin" />
        <div className="absolute inset-2 rounded-full bg-brand-50/80 animate-pulse" />
      </div>
      <span className="text-sm font-bold text-muted">{label ?? t('common.loading')}</span>
    </div>
  );
}

export function StatsSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-pulse">
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-[108px] rounded-2xl bg-gradient-to-br from-[#eef2f7] to-[#f7f9fc] border border-[#e3e9f2]" />
      ))}
    </div>
  );
}

export function TimelineSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-4 animate-pulse p-1">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-[#dde4ee] mt-1.5 shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-3.5 bg-[#e8edf4] rounded-md w-[70%]" />
            <div className="h-3 bg-[#eef2f7] rounded-md w-[40%]" />
          </div>
        </div>
      ))}
    </div>
  );
}
