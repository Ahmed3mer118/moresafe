import type { ReactNode } from 'react';
import type { JournalLine } from '../../types';
import { Amount, Chip } from './Chip';
import { compareAccrualDisbursement, type JournalCompareStatus } from '../../utils/custodyHelpers';
import { formatMoney } from '../../utils/format';

export function JournalTable({
  title,
  tag,
  lines,
  lang = 'ar',
}: {
  title: string;
  tag: string;
  lines: JournalLine[];
  lang?: string;
}) {
  const totalDr = lines.reduce((s, l) => s + l.debit, 0);
  const totalCr = lines.reduce((s, l) => s + l.credit, 0);
  const internallyBalanced = Math.abs(totalDr - totalCr) < 0.01;
  return (
    <div className="mb-4 last:mb-0">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-[11px] font-extrabold px-2 py-0.5 rounded-md bg-brand-50 text-brand-700 border border-brand-200">{tag}</span>
        <span className="text-sm font-bold text-navy">{title}</span>
      </div>
      <table className="w-full text-xs border border-[#e3e9f2] rounded-xl overflow-hidden">
        <thead><tr className="bg-[#f7f9fc]"><th className="p-2 text-start">{lang === 'ar' ? 'الحساب' : 'Account'}</th><th className="p-2">{lang === 'ar' ? 'مدين' : 'Debit'}</th><th className="p-2">{lang === 'ar' ? 'دائن' : 'Credit'}</th></tr></thead>
        <tbody>
          {lines.map((l, i) => (
            <tr key={i} className="border-t border-[#eef1f6]">
              <td className="p-2"><span className="font-bold text-muted me-1">{l.accountCode}</span>{l.accountName}</td>
              <td className="p-2 text-center">{l.debit ? <Amount>{l.debit.toLocaleString()}</Amount> : '—'}</td>
              <td className="p-2 text-center">{l.credit ? <Amount>{l.credit.toLocaleString()}</Amount> : '—'}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="bg-[#f7f9fc] font-bold border-t">
            <td className="p-2">
              {lang === 'ar' ? 'الإجمالي' : 'Total'}
              {internallyBalanced && (
                <span className="text-brand-500 text-[11px] ms-1">{lang === 'ar' ? 'متوازن ✓' : 'Balanced ✓'}</span>
              )}
            </td>
            <td className="p-2 text-center">{totalDr.toLocaleString()}</td>
            <td className="p-2 text-center">{totalCr.toLocaleString()}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

const BALANCE_LABELS: Record<JournalCompareStatus, { ar: string; en: string; variant: 'green' | 'amber' | 'red' }> = {
  balanced: { ar: 'متوازن ✓', en: 'Balanced ✓', variant: 'green' },
  surplus: { ar: 'فائض', en: 'Surplus', variant: 'amber' },
  deficit: { ar: 'عجز', en: 'Deficit', variant: 'red' },
};

export function JournalCrossBalance({
  accrualLines,
  disbursementLines,
  lang = 'ar',
}: {
  accrualLines: JournalLine[];
  disbursementLines: JournalLine[];
  lang?: string;
}) {
  const cmp = compareAccrualDisbursement(accrualLines, disbursementLines);
  if (!cmp.accrualTotal && !cmp.disburseTotal) return null;

  const label = BALANCE_LABELS[cmp.status];
  const detail =
    cmp.status === 'balanced'
      ? lang === 'ar'
        ? 'إجمالي الاستحقاق = إجمالي الصرف'
        : 'Accrual total equals disbursement total'
      : lang === 'ar'
        ? `الفرق: ${formatMoney(cmp.diff, lang)}`
        : `Difference: ${formatMoney(cmp.diff, lang)}`;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl border border-[#e3e9f2] bg-[#f7f9fc] mb-4 last:mb-0">
      <div className="text-xs text-muted">
        <span className="font-bold text-navy block mb-1">{lang === 'ar' ? 'مقارنة القيود' : 'Entry comparison'}</span>
        <span>
          {lang === 'ar' ? 'استحقاق' : 'Accrual'}: <b>{formatMoney(cmp.accrualTotal, lang)}</b>
          {' · '}
          {lang === 'ar' ? 'صرف' : 'Disburse'}: <b>{formatMoney(cmp.disburseTotal, lang)}</b>
        </span>
      </div>
      <div className="text-end">
        <Chip variant={label.variant}>
          {lang === 'ar' ? label.ar : label.en}
          {cmp.status !== 'balanced' && ` · ${formatMoney(cmp.diff, lang)}`}
        </Chip>
        <div className="text-[10px] text-muted mt-1">{detail}</div>
      </div>
    </div>
  );
}

export function CustodyArchiveCard({
  title,
  subtitle,
  total,
  status,
  children,
  defaultOpen,
}: {
  title: string;
  subtitle: string;
  total: string;
  status: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  return (
    <details className="group bg-white border border-[#e3e9f2] rounded-2xl shadow-sm overflow-hidden" open={defaultOpen}>
      <summary className="flex flex-wrap items-center gap-3 p-4 cursor-pointer list-none hover:bg-[#f9fbfe]">
        <span className="w-9 h-9 rounded-xl bg-brand-50 text-brand-600 grid place-items-center font-bold">✓</span>
        <div className="flex-1 min-w-[200px]">
          <div className="font-extrabold text-navy">{title}</div>
          <div className="text-xs text-muted mt-0.5">{subtitle}</div>
        </div>
        {status}
        <Amount>{total}</Amount>
        <span className="text-muted group-open:rotate-180 transition-transform">▾</span>
      </summary>
      <div className="px-4 pb-4 border-t border-[#eef1f6] pt-4">{children}</div>
    </details>
  );
}
