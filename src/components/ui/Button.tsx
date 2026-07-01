import clsx from 'clsx';
import type { ReactNode } from 'react';

type Variant = 'primary' | 'green' | 'red' | 'ghost';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: 'sm' | 'md';
  loading?: boolean;
  children: ReactNode;
}

const variants: Record<Variant, string> = {
  primary: 'bg-brand-500 hover:bg-brand-600 text-white shadow-[0_4px_14px_rgba(46,158,91,0.35)]',
  green: 'bg-brand-500 hover:bg-brand-600 text-white shadow-[0_4px_14px_rgba(46,158,91,0.35)]',
  red: 'bg-red-500 hover:bg-red-600 text-white',
  ghost: 'bg-white border border-[#e3e9f2] text-navy hover:bg-[#f9fbfe]',
};

export function Button({ variant = 'primary', size = 'md', className, children, disabled, loading, type = 'button', ...props }: ButtonProps) {
  return (
    <button
      type={type}
      className={clsx(
        'inline-flex items-center justify-center gap-2 rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed',
        size === 'sm' ? 'px-3 py-1.5 text-xs rounded-lg' : 'px-4 py-2.5 text-sm',
        variants[variant],
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <span className="w-3.5 h-3.5 border-2 border-current/30 border-t-current rounded-full animate-spin" />
      )}
      {children}
    </button>
  );
}
