import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';

export interface Crumb {
  labelKey?: string;
  label?: string;
  to?: string;
}

export function Breadcrumbs({ items, className }: { items: Crumb[]; className?: string }) {
  const { t } = useTranslation();
  if (!items.length) return null;

  return (
    <nav aria-label="Breadcrumb" className={clsx('mb-4', className)}>
      <ol className="flex flex-wrap items-center gap-1.5 text-xs font-semibold text-muted">
        {items.map((item, i) => {
          const label = item.label ?? (item.labelKey ? t(item.labelKey) : '');
          const isLast = i === items.length - 1;
          return (
            <li key={`${label}-${i}`} className="flex items-center gap-1.5">
              {i > 0 && <span className="text-[#c5d0de] select-none">›</span>}
              {item.to && !isLast ? (
                <Link to={item.to} className="text-brand-600 hover:text-brand-700 hover:underline transition-colors">
                  {label} 
                </Link>
              ) : (
                <span className={clsx(isLast && 'text-navy font-bold')}>{label}</span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
