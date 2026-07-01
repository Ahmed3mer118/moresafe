import { useTranslation } from 'react-i18next';
import type { Custody } from '../../types';
import { formatMoney, projectName } from '../../utils/format';
import { StatusChip } from './Chip';
import { ProgressBar } from './ProgressBar';
import { Button } from './Button';

interface ActiveCustodyCardProps {
  custody: Custody;
  lang?: string;
  onSubmit?: () => void;
  submitting?: boolean;
  className?: string;
}

export function ActiveCustodyCard({ custody, lang = 'ar', onSubmit, submitting, className }: ActiveCustodyCardProps) {
  const { t } = useTranslation();
  const spent = custody.spent || 0;
  const amount = custody.amount || 1;
  const overBudget = spent > amount;
  const pct = (spent / amount) * 100;

  return (
    <div
      className={`inline-flex flex-col w-full max-w-md rounded-2xl border overflow-hidden shadow-sm ${
        overBudget ? 'border-amber-200 bg-gradient-to-br from-amber-50/90 to-white' : 'border-brand-200/80 bg-gradient-to-br from-brand-50/60 to-white'
      } ${className ?? ''}`}
    >
      <div className="flex items-start gap-3 p-4 pb-3">
        <div className={`w-11 h-11 rounded-xl grid place-items-center text-lg shrink-0 ${overBudget ? 'bg-amber-100 text-amber-700' : 'bg-brand-100 text-brand-700'}`}>
          💼
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[10px] font-bold text-muted uppercase tracking-wide">العهدة النشطة</div>
          <div className="font-extrabold text-navy text-sm truncate mt-0.5">
            {projectName(custody.project, lang)} · {custody.custodyNumber}
          </div>
          <div className={`text-xs font-bold mt-1 ${overBudget ? 'text-amber-700' : 'text-muted'}`}>
            {formatMoney(spent)} / {formatMoney(amount)} ريال
          </div>
        </div>
        <StatusChip status={custody.status} label={t(`status.${custody.status}`, custody.status)} />
      </div>
      <div className="px-4 pb-3">
        <ProgressBar
          value={spent}
          max={amount}
          variant={overBudget ? 'amber' : pct > 85 ? 'amber' : 'green'}
          showLabel
          label={overBudget ? 'تجاوز الميزانية' : `${Math.round(pct)}%`}
        />
      </div>
      {onSubmit && (
        <div className="px-4 py-3 border-t border-[#e8edf4] bg-white/70">
          <Button size="sm" className="w-full" onClick={onSubmit} disabled={!spent || submitting} loading={submitting}>
            إرسال للمراجعة
          </Button>
          <p className="text-[10px] text-muted text-center mt-2">يُرسل لمدير المشروع دون إنشاء عهدة جديدة</p>
        </div>
      )}
    </div>
  );
}
