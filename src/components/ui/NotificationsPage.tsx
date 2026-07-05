import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from './Card';
import { Button } from './Button';
import { RefreshButton } from './RefreshButton';
import { Pagination } from './Pagination';
import { PageLoader } from './PageLoader';
import { Notice } from './Notice';
import { dashboardService } from '../../services';
import { useServerTable } from '../../hooks/useServerTable';
import { usePaginatedQuery } from '../../hooks/usePaginatedQuery';
import { useUi } from '../../context/UiContext';
import { queryKeys } from '../../lib/queryKeys';
import { CACHE } from '../../lib/cachePolicy';
import { notificationTypeClass } from '../../utils/notificationStyles';
import { refetchVoid } from '../../lib/queryFn';

export function NotificationsPage() {
  const { t, i18n } = useTranslation();
  const { runAction, notifTick } = useUi();
  const table = useServerTable({ pageSize: 20 });

  const {
    items,
    isLoading,
    isFetching,
    isError,
    refetch,
    total,
    totalPages,
    page,
    pageSize,
  } = usePaginatedQuery({
    queryKey: queryKeys.dashboard.notifications(),
    queryFn: (params, signal) => dashboardService.notifications(params, { signal }),
    params: table.listParams,
    ...CACHE.notifications,
    enabled: true,
  });

  // Re-fetch when global notification tick changes (after mutations)
  useEffect(() => {
    void refetch();
  }, [notifTick, refetch]);

  const markAll = () =>
    runAction(async () => {
      const unread = items.filter((n) => !n.isRead);
      await Promise.all(unread.map((n) => dashboardService.markRead(n._id)));
      refetch();
    }, { success: 'تم تعليم الإشعارات كمقروءة' });

  const typeStyle = (type: string) => notificationTypeClass(type);

  return (
    <Card
      title={t('nav.notifications')}
      action={
        <div className="flex items-center gap-2">
          <RefreshButton onRefresh={refetchVoid(refetch)} loading={isLoading || isFetching} />
          {items.some((n) => !n.isRead) ? (
            <Button size="sm" variant="ghost" onClick={markAll}>تعليم الكل كمقروء</Button>
          ) : null}
        </div>
      }
    >
      {isError ? (
        <Notice variant="error">{t('common.loadFailed', { defaultValue: 'تعذّر تحميل البيانات' })}</Notice>
      ) : isLoading ? (
        <PageLoader compact />
      ) : (
        <>
          <div className="space-y-3">
            {items.length === 0 ? (
              <p className="text-muted text-sm text-center py-8">{t('common.noData')}</p>
            ) : (
              items.map((n) => (
                <div
                  key={n._id}
                  className={`p-4 rounded-xl border text-sm ${typeStyle(n.type)} ${!n.isRead ? 'ring-1 ring-brand-200' : ''}`}
                >
                  <div className="flex justify-between gap-2">
                    <strong>{i18n.language === 'en' && n.titleEn ? n.titleEn : n.title}</strong>
                    {!n.isRead && (
                      <button
                        type="button"
                        className="text-xs font-bold text-brand-600"
                        onClick={() => runAction(() => dashboardService.markRead(n._id).then(() => refetch()))}
                      >
                        ✓
                      </button>
                    )}
                  </div>
                  <p className="mt-1 text-muted">{i18n.language === 'en' && n.messageEn ? n.messageEn : n.message}</p>
                  <p className="text-[10px] text-muted mt-2">{new Date(n.createdAt).toLocaleString(i18n.language === 'en' ? 'en-US' : 'ar-SA')}</p>
                </div>
              ))
            )}
          </div>
          {total > pageSize && (
            <Pagination
              page={page}
              totalPages={totalPages}
              total={total}
              pageSize={pageSize}
              onPageChange={table.setPage}
            />
          )}
        </>
      )}
    </Card>
  );
}
