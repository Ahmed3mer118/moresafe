import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import type { Project } from '../../types';
import { formatMoney, projectName, statusLabel } from '../../utils/format';
import { budgetBarVariant, budgetHealth, budgetPercent, summarizeProjects } from '../../utils/budgetHelpers';
import { ProgressBar } from '../ui/ProgressBar';
import { StatCard, StatsGrid } from '../ui/StatCard';
import { StatusChip } from '../ui/Chip';
import { PageLoader } from '../ui/PageLoader';

export interface BudgetSummary {
  projectCount: number;
  budget: number;
  spent: number;
  remaining: number;
  overCount: number;
  nearCount: number;
}

interface BudgetOverviewProps {
  projects: Project[];
  totals?: BudgetSummary;
  loading?: boolean;
  compact?: boolean;
  showSummary?: boolean;
  emptyText?: string;
}

function healthLabel(health: ReturnType<typeof budgetHealth>, t: (k: string) => string) {
  if (health === 'over') return t('status.over_budget');
  if (health === 'near') return t('budget.nearBudget');
  if (health === 'ok') return t('budget.withinBudget');
  return t('budget.noBudgetSet');
}

export function BudgetOverview({
  projects,
  totals,
  loading = false,
  compact = false,
  showSummary = true,
  emptyText,
}: BudgetOverviewProps) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const summary = totals ?? summarizeProjects(projects);

  if (loading) {
    return <PageLoader compact />;
  }

  if (!projects.length) {
    return (
      <p className="text-sm text-muted text-center py-10">{emptyText ?? t('budget.noProjects')}</p>
    );
  }

  return (
    <div className="space-y-5">
      {showSummary && (
        <StatsGrid>
          <StatCard
            icon="🏗"
            label={t('budget.totalBudget')}
            value={formatMoney(summary.budget, lang)}
            color="blue"
            trend={`${summary.projectCount} ${t('budget.projects')}`}
          />
          <StatCard
            icon="💸"
            label={t('budget.totalSpent')}
            value={formatMoney(summary.spent, lang)}
            color="amber"
            trend={summary.budget ? `${budgetPercent(summary.spent, summary.budget)}%` : '—'}
          />
          <StatCard
            icon="💰"
            label={t('budget.remaining')}
            value={
              summary.spent > summary.budget && summary.budget > 0
                ? `-${formatMoney(summary.spent - summary.budget, lang)}`
                : formatMoney(summary.remaining, lang)
            }
            color={summary.spent > summary.budget ? 'red' : 'green'}
            trendUp={summary.remaining >= 0}
          />
          <StatCard
            icon="⚠️"
            label={t('budget.alerts')}
            value={summary.overCount + summary.nearCount}
            color={summary.overCount ? 'red' : 'amber'}
            trend={
              summary.overCount
                ? `${summary.overCount} ${t('budget.overBudgetShort')}`
                : summary.nearCount
                  ? `${summary.nearCount} ${t('budget.nearBudgetShort')}`
                  : t('budget.allClear')
            }
            trendUp={false}
          />
        </StatsGrid>
      )}

      <div className={clsx('grid gap-4', compact ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1 lg:grid-cols-2')}>
        {projects.map((p) => {
          const spent = p.spent || 0;
          const budget = p.budget || 0;
          const health = budgetHealth(spent, budget);
          const pct = budgetPercent(spent, budget);
          const remaining = budget - spent;
          const over = budget > 0 && spent > budget;
          const displayStatus = over ? 'over_budget' : p.status;

          return (
            <article
              key={p._id}
              className={clsx(
                'rounded-2xl border bg-white overflow-hidden shadow-[0_8px_30px_rgba(31,58,95,0.06)]',
                health === 'over' ? 'border-red-200' : health === 'near' ? 'border-amber-200' : 'border-[#e3e9f2]',
              )}
            >
              <div
                className={clsx(
                  'px-4 py-3 flex flex-wrap items-center justify-between gap-2',
                  health === 'over'
                    ? 'bg-gradient-to-r from-red-50 to-white'
                    : health === 'near'
                      ? 'bg-gradient-to-r from-amber-50 to-white'
                      : 'bg-gradient-to-r from-brand-50/60 to-white',
                )}
              >
                <div>
                  <h3 className="font-extrabold text-navy">{projectName(p, lang)}</h3>
                  {displayStatus && (
                    <div className="mt-1">
                      <StatusChip status={displayStatus} label={statusLabel(displayStatus, t)} />
                    </div>
                  )}
                </div>
                <div
                  className={clsx(
                    'w-14 h-14 rounded-full grid place-items-center text-sm font-black border-4 shrink-0',
                    health === 'over'
                      ? 'border-red-200 text-red-600 bg-red-50'
                      : health === 'near'
                        ? 'border-amber-200 text-amber-700 bg-amber-50'
                        : 'border-brand-200 text-brand-600 bg-brand-50',
                  )}
                >
                  {budget ? (over ? `${pct}%+` : `${pct}%`) : '—'}
                </div>
              </div>

              <div className="px-4 py-4 space-y-4">
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-xl bg-[#f8fafc] p-2.5">
                    <div className="text-[10px] font-bold text-muted">{t('budget.spent')}</div>
                    <div className={clsx('text-sm font-extrabold mt-0.5', over ? 'text-red-600' : 'text-navy')}>
                      {formatMoney(spent, lang)}
                    </div>
                  </div>
                  <div className="rounded-xl bg-[#f8fafc] p-2.5">
                    <div className="text-[10px] font-bold text-muted">{t('budget.budgetCap')}</div>
                    <div className="text-sm font-extrabold text-navy mt-0.5">{formatMoney(budget, lang)}</div>
                  </div>
                  <div className="rounded-xl bg-[#f8fafc] p-2.5">
                    <div className="text-[10px] font-bold text-muted">{t('budget.remaining')}</div>
                    <div className={clsx('text-sm font-extrabold mt-0.5', over ? 'text-red-600' : 'text-emerald-700')}>
                      {over ? `-${formatMoney(spent - budget, lang)}` : formatMoney(remaining, lang)}
                    </div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-bold mb-1.5">
                    <span className={over ? 'text-red-600 font-extrabold' : 'text-muted'}>{healthLabel(health, t)}</span>
                    <span className={over ? 'text-red-600' : 'text-navy'}>{formatMoney(spent, lang)} / {formatMoney(budget, lang)}</span>
                  </div>
                  <ProgressBar
                    value={over ? budget : Math.min(spent, budget || spent || 1)}
                    max={budget || spent || 1}
                    variant={budgetBarVariant(health)}
                  />
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
