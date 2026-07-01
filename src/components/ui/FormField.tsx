import type { ReactNode } from 'react';
import clsx from 'clsx';

interface FormFieldProps {
  label: string;
  hint?: string;
  children: ReactNode;
  className?: string;
  full?: boolean;
}

export function FormField({ label, hint, children, className, full }: FormFieldProps) {
  return (
    <div className={clsx('flex flex-col gap-1.5', full && 'md:col-span-2', className)}>
      <label className="text-sm font-bold text-navy">{label}</label>
      {children}
      {hint && <span className="text-[11px] text-muted leading-relaxed">{hint}</span>}
    </div>
  );
}

export const inputClass =
  'w-full font-[inherit] text-sm px-3.5 py-2.5 border border-[#e3e9f2] rounded-xl bg-[#fbfcfe] outline-none focus:border-brand-500 focus:bg-white focus:ring-2 focus:ring-brand-500/15 transition-all';

export const selectClass = inputClass;
