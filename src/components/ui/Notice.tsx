import type { ReactNode } from 'react';
import clsx from 'clsx';

interface NoticeProps {
  children: ReactNode;
  variant?: 'info' | 'warn' | 'success' | 'error';
  icon?: string;
}

const variants = {
  info: 'bg-amber-50 border-amber-200 text-amber-900',
  warn: 'bg-amber-50 border-amber-200 text-amber-900',
  success: 'bg-emerald-50 border-emerald-200 text-emerald-900',
  error: 'bg-red-50 border-red-200 text-red-900',
};

export function Notice({ children, variant = 'info', icon = 'ℹ' }: NoticeProps) {
  return (
    <div className={clsx('flex gap-3 p-4 rounded-[13px] text-[13px] leading-relaxed mb-5 border', variants[variant])}>
      <span className="text-xl shrink-0">{icon}</span>
      <div>{children}</div>
    </div>
  );
}
