import clsx from 'clsx';
import { Button } from './Button';

interface PaginationProps {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export function Pagination({ page, totalPages, total, pageSize, onPageChange, className }: PaginationProps) {
  if (totalPages <= 1 && total <= pageSize) return null;

  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <div className={clsx('flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t border-[#e3e9f2] bg-[#fbfcfe]', className)}>
      <span className="text-xs text-muted font-semibold">
        {from}–{to} من {total}
      </span>
      <div className="flex items-center gap-1.5">
        <Button size="sm" variant="ghost" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
          السابق
        </Button>
        <span className="text-xs font-bold text-navy px-2">
          {page} / {totalPages}
        </span>
        <Button size="sm" variant="ghost" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>
          التالي
        </Button>
      </div>
    </div>
  );
}
