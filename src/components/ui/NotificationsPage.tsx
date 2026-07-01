import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from './Card';
import { Button } from './Button';
import { dashboardService } from '../../services';
import type { Notification } from '../../types';
import { useUi } from '../../context/UiContext';

export function NotificationsPage() {
  const { t, i18n } = useTranslation();
  const { runAction } = useUi();
  const [items, setItems] = useState<Notification[]>([]);

  const load = () => dashboardService.notifications().then((d) => setItems(d.notifications));

  useEffect(() => { load(); }, []);

  const markAll = () =>
    runAction(async () => {
      const unread = items.filter((n) => !n.isRead);
      await Promise.all(unread.map((n) => dashboardService.markRead(n._id)));
      load();
    }, { success: 'تم تعليم الإشعارات كمقروءة' });

  const typeStyle = (type: string) => {
    if (type === 'reject') return 'border-red-200 bg-red-50';
    if (type === 'success') return 'border-brand-200 bg-brand-50';
    if (type === 'warning') return 'border-amber-200 bg-amber-50';
    return 'border-[#e3e9f2] bg-white';
  };

  return (
    <Card
      title={t('nav.notifications')}
      action={
        items.some((n) => !n.isRead) ? (
          <Button size="sm" variant="ghost" onClick={markAll}>تعليم الكل كمقروء</Button>
        ) : undefined
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
