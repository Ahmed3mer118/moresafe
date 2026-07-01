import type { ReactNode } from 'react';
import clsx from 'clsx';

interface NoticeProps {
  children: ReactNode;
  variant?: 'info' | 'warn';
  icon?: string;
}

export function Notice({ children, variant = 'info', icon = 'ℹ' }: NoticeProps) {
  return (
    <div
      className={clsx(
        'flex gap-3 p-4 rounded-[13px] text-[13px] leading-relaxed mb-5 border',
        variant === 'warn'
          ? 'bg-amber-50 border-amber-200 text-amber-900'
          : 'bg-brand-50/80 border-brand-200 text-navy'
      )}
    >
      <span className="text-xl shrink-0">{icon}</span>
      <div>{children}</div>
    </div>
  );
}
