import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '../ui/Card';
import { RefreshButton } from '../ui/RefreshButton';
import { PageLoader } from '../ui/PageLoader';
import { Pagination } from '../ui/Pagination';
import { JournalTable } from '../ui/JournalBlock';
import type { CustodyTransaction, JournalLine, Project, User } from '../../types';
import { formatMoney, formatDate, projectName, userName } from '../../utils/format';

function ColoredAmount({ value, lang }: { value: number; lang: string }) {
  return (
    <span className="text-emerald-700 font-extrabold tabular-nums">{formatMoney(value, lang)}</span>
  );
}

export function journalLinesForTx(tx: CustodyTransaction): JournalLine[] {
  if (tx.journalLines?.length) return tx.journalLines;
  if (tx.type === 'adjustment' && tx.accrualEntry?.length) return tx.accrualEntry;
  if (tx.type === 'disbursement' && tx.disbursementEntry?.length) return tx.disbursementEntry;
  return [];
}

export function JournalTransactionsList({
  rows,
  loading,
  fetching,
  onRefresh,
  showProject,
  showManager,
  pagination,
}: {
  rows: CustodyTransaction[];
  loading: boolean;
  fetching?: boolean;
  onRefresh?: () => void | Promise<void>;
  showProject?: boolean;
  showManager?: boolean;
  pagination?: {
    page: number;
    totalPages: number;
    total: number;
    pageSize: number;
    onPageChange: (page: number) => void;
  };
}) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;

  const journalRows = useMemo(
    () => rows.filter((tx) => journalLinesForTx(tx).length > 0),
    [rows],
  );

  return (
    <Card
      title={`📒 ${t('pa.transactions')}`}
      action={onRefresh ? <RefreshButton onRefresh={onRefresh} loading={loading || fetching} /> : undefined}
      noPadding={Boolean(pagination)}
    >
      {loading ? (
        <PageLoader compact />
      ) : journalRows.length === 0 ? (
        <p className="text-center text-muted text-sm py-10">{t('pa.noJournalEntries')}</p>
      ) : (
        <div className="space-y-3">
          {journalRows.map((tx) => {
            const lines = journalLinesForTx(tx);
            const desc = lang === 'en' && tx.descriptionEn ? tx.descriptionEn : tx.description;
            const project = tx.project as Project | undefined;
            const holder = tx.holder as User | undefined;
            return (
              <details
                key={tx._id}
                className="rounded-xl border border-[#e3e9f2] bg-white overflow-hidden"
              >
                <summary className="px-4 py-3 flex flex-wrap items-center gap-3 cursor-pointer hover:bg-[#fafbfd] [&::-webkit-details-marker]:hidden">
                  <span className="font-bold text-brand-600">{tx.custodyNumber || '—'}</span>
                  {showProject && project && (
                    <span className="text-xs text-muted">{projectName(project, lang)}</span>
                  )}
                  {showManager && holder && (
                    <span className="text-xs text-muted">{userName(holder, lang)}</span>
                  )}
                  <span className="text-sm font-bold text-navy">
                    {tx.type === 'adjustment' ? t('pa.accrualEntry') : t('pa.disbursementEntry')}
                  </span>
                  <ColoredAmount value={tx.amount} lang={lang} />
                  <span className="text-xs text-muted ms-auto">{formatDate(tx.createdAt, lang)}</span>
                  <span className="text-xs font-bold text-brand-600">▼ {t('pa.viewJournal')}</span>
                </summary>
                <div className="px-4 pb-4 border-t border-[#eef1f6] bg-[#fcfdfe]">
                  {desc && <p className="text-sm text-muted py-2">{desc}</p>}
                  <JournalTable
                    title={tx.type === 'adjustment' ? t('pa.accrualEntry') : t('pa.disbursementEntry')}
                    tag={tx.type === 'adjustment' ? t('pa.accrualTag') : t('pa.disbursementTag')}
                    lines={lines}
                  />
                </div>
              </details>
            );
          })}
        </div>
      )}
      {pagination && (
        <Pagination {...pagination} />
      )}
    </Card>
  );
}
