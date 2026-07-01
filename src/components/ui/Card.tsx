import clsx from 'clsx';
import type { ReactNode } from 'react';

interface CardProps {
  title?: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
  noPadding?: boolean;
}

export function Card({ title, subtitle, action, children, className, bodyClassName, noPadding }: CardProps) {
  return (
    <div className={clsx('bg-white rounded-2xl border border-[#e3e9f2]/80 shadow-[0_8px_30px_rgba(31,58,95,0.07)] overflow-hidden', className)}>
      {(title || action) && (
        <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-[#e3e9f2] bg-gradient-to-r from-[#fafbfd] to-white">
          <div>
            {title && <h3 className="font-extrabold text-navy text-[15px]">{title}</h3>}
            {subtitle && <p className="text-xs text-muted mt-0.5 font-semibold">{subtitle}</p>}
          </div>
          {action}
        </div>
      )}
      <div className={clsx(!noPadding && 'p-5', bodyClassName)}>{children}</div>
    </div>
  );
}
