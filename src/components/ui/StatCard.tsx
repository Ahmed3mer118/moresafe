import clsx from 'clsx';
import type { ReactNode } from 'react';

interface StatCardProps {
  icon: ReactNode;
  label: string;
  value: string | number;
  trend?: string;
  trendUp?: boolean;
  color?: 'blue' | 'green' | 'amber' | 'red';
}

const iconColors = {
  blue: 'bg-[#eef1f6] text-[#475569]',
  green: 'bg-brand-50 text-brand-500',
  amber: 'bg-amber-50 text-amber-600',
  red: 'bg-red-50 text-red-500',
};

export function StatCard({ icon, label, value, trend, trendUp, color = 'green' }: StatCardProps) {
  return (
    <div className="bg-white rounded-2xl border border-[#e3e9f2] p-[18px] shadow-[0_6px_24px_rgba(31,58,95,0.06)] relative overflow-hidden">
      <div className={clsx('w-11 h-11 rounded-[13px] grid place-items-center text-xl mb-3', iconColors[color])}>{icon}</div>
      <div className="text-[13px] font-semibold text-muted">{label}</div>
      <div className="text-[26px] font-black text-navy leading-tight mt-0.5">{value}</div>
      {trend && (
        <div className={clsx('text-xs font-bold mt-1.5', trendUp === false ? 'text-red-500' : 'text-brand-500')}>{trend}</div>
      )}
    </div>
  );
}

export function StatsGrid({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-5">{children}</div>;
}
