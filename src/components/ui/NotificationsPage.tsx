import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from './Card';
import { Button } from './Button';
import { RefreshButton } from './RefreshButton';
import { dashboardService } from '../../services';
import type { Notification } from '../../types';
import { useUi } from '../../context/UiContext';
import { notificationTypeClass } from '../../utils/notificationStyles';

export function NotificationsPage() {
  const { t, i18n } = useTranslation();
  const { runAction, notifTick } = useUi();
  const [items, setItems] = useState<Notification[]>([]);

  const load = () => dashboardService.notifications().then((d) => setItems(d.notifications));

  useEffect(() => { load(); }, [notifTick]);

  const markAll = () =>
    runAction(async () => {
      const unread = items.filter((n) => !n.isRead);
      await Promise.all(unread.map((n) => dashboardService.markRead(n._id)));
      load();
    }, { success: 'تم تعليم الإشعارات كمقروءة' });

  const typeStyle = (type: string) => notificationTypeClass(type);

  return (
    <Card
      title={t('nav.notifications')}
      action={
        <div className="flex items-center gap-2">
          <RefreshButton onRefresh={load} />
          {items.some((n) => !n.isRead) ? (
            <Button size="sm" variant="ghost" onClick={markAll}>تعليم الكل كمقروء</Button>
          ) : null}
        </div>
      }
    >
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
                <b className="text-navy">{i18n.language === 'en' && n.titleEn ? n.titleEn : n.title}</b>
                {!n.isRead && (
                  <button
                    type="button"
                    className="text-[10px] font-bold text-brand-600 shrink-0"
                    onClick={() => runAction(() => dashboardService.markRead(n._id).then(load), { success: 'تم', silent: false })}
                  >
                    ✓ مقروء
                  </button>
                )}
              </div>
              <p className="text-muted mt-1">{i18n.language === 'en' && n.messageEn ? n.messageEn : n.message}</p>
              <div className="text-[11px] text-muted mt-2">{new Date(n.createdAt).toLocaleString(i18n.language === 'en' ? 'en-US' : 'ar-SA')}</div>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}
