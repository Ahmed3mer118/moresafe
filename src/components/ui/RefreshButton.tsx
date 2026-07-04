import { useState } from 'react';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import { Button } from './Button';

interface RefreshButtonProps {
  onRefresh: () => void | Promise<void>;
  /** External loading state (e.g. table fetch) */
  loading?: boolean;
  size?: 'sm' | 'md';
  /** Icon-only toolbar button (DataTable) or labeled ghost button */
  variant?: 'icon' | 'ghost';
  className?: string;
}

export function RefreshButton({
  onRefresh,
  loading: externalLoading,
  size = 'sm',
  variant = 'ghost',
  className,
}: RefreshButtonProps) {
  const { t } = useTranslation();
  const [internalLoading, setInternalLoading] = useState(false);
  const busy = externalLoading ?? internalLoading;

  const handleClick = async () => {
    if (busy) return;
    setInternalLoading(true);
    try {
      await onRefresh();
    } finally {
      setInternalLoading(false);
    }
  };

  if (variant === 'icon') {
    return (
      <button
        type="button"
        onClick={handleClick}
        disabled={busy}
        className={clsx(
          'w-8 h-8 border border-[#e3e9f2] rounded-lg bg-white text-muted hover:text-brand-500 hover:border-brand-200 text-sm transition-colors disabled:opacity-50',
          busy && 'animate-spin',
          className,
        )}
        title={t('common.refresh')}
        aria-label={t('common.refresh')}
      >
        ↺
      </button>
    );
  }

  return (
    <Button
      size={size}
      variant="ghost"
      onClick={handleClick}
      disabled={busy}
      className={className}
    >
      <span className={clsx(busy && 'inline-block animate-spin')}>↺</span>
      {t('common.refresh')}
    </Button>
  );
}
