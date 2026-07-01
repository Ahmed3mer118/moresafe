import type { ReactNode } from 'react';
import { Button } from './Button';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  width?: 'md' | 'lg' | 'xl';
}

export function Modal({ open, onClose, title, subtitle, children, footer, width = 'md' }: ModalProps) {
  if (!open) return null;
  const widthClass = width === 'xl' ? 'max-w-5xl' : width === 'lg' ? 'max-w-3xl' : 'max-w-lg';
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[rgba(15,36,64,0.52)] backdrop-blur-sm animate-in fade-in">
      <div
        className={`bg-white rounded-2xl shadow-2xl w-full max-h-[92vh] overflow-hidden flex flex-col ${widthClass}`}
      >
        <div className="flex items-start gap-3 px-6 py-5 border-b border-[#e3e9f2] bg-gradient-to-b from-[#f8fafc] to-white">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-extrabold text-navy">{title}</h3>
            {subtitle && <p className="text-xs text-muted mt-1 font-semibold">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl border border-[#e3e9f2] text-muted hover:border-brand-500 hover:text-navy transition-colors shrink-0"
          >
            ×
          </button>
        </div>
        <div className="px-6 py-5 overflow-y-auto flex-1">{children}</div>
        {footer !== undefined ? (
          <div className="px-6 py-4 border-t border-[#e3e9f2] bg-[#f8fafc] flex gap-2">{footer}</div>
        ) : (
          <div className="px-6 py-4 border-t border-[#e3e9f2] bg-[#f8fafc]">
            <Button variant="ghost" onClick={onClose}>إغلاق</Button>
          </div>
        )}
      </div>
    </div>
  );
}
