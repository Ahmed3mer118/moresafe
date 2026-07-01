import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { useUi } from '../../context/UiContext';
import { userName } from '../../utils/format';
import { dashboardService } from '../../services';
import { ROLE_DASHBOARD, type Notification, type Role } from '../../types';

interface TopbarProps {
  title: string;
  subtitle?: string;
  onMenuClick?: () => void;
}

export function Topbar({ title, subtitle, onMenuClick }: TopbarProps) {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const { notifTick } = useUi();
  const [unread, setUnread] = useState(0);
  const [showNotif, setShowNotif] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const panelRef = useRef<HTMLDivElement>(null);

  const notifPath = user ? `${ROLE_DASHBOARD[user.role as Role]}/notifications` : '#';

  const loadNotifications = () => {
    dashboardService.notifications().then((d) => {
      setUnread(d.unread);
      setNotifications(d.notifications.slice(0, 8));
    }).catch(() => { });
  };

  useEffect(() => { loadNotifications(); }, [notifTick]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setShowNotif(false);
    };
    if (showNotif) document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, [showNotif]);

  const markRead = async (id: string) => {
    await dashboardService.markRead(id);
    loadNotifications();
  };

  const typeStyle = (type: string) => {
    if (type === 'reject') return 'border-s-red-400 bg-red-50/80';
    if (type === 'success') return 'border-s-brand-500 bg-brand-50/50';
    if (type === 'warning') return 'border-s-amber-400 bg-amber-50/60';
    return 'border-s-[#e3e9f2]';
  };

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-[#e3e9f2] px-4 lg:px-6 py-3.5 flex items-center gap-3 lg:gap-5 shadow-[0_1px_0_rgba(31,58,95,0.04)]">
      <button type="button" onClick={onMenuClick} className="lg:hidden w-10 h-10 rounded-xl border border-[#e3e9f2] text-navy text-lg grid place-items-center shrink-0 hover:bg-[#f7f9fc]" aria-label="Menu">
        ☰
      </button>

      <div className="flex-1 min-w-0">
        <h2 className="font-extrabold text-navy text-lg truncate tracking-tight">{title}</h2>
        {subtitle && <p className="text-xs text-muted font-medium truncate">{subtitle}</p>}
      </div>

      <div className="relative" ref={panelRef}>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setShowNotif(!showNotif); }}
          className="w-10 h-10 rounded-xl border border-[#e3e9f2] bg-white grid place-items-center text-lg relative hover:border-brand-300 transition-colors"
        >
          🔔
          {unread > 0 && (
            <span className="absolute -top-1 -start-1 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-black rounded-full grid place-items-center border-2 border-white">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </button>
        {showNotif && (
          <div className="absolute top-full mt-2 end-0 w-80 max-w-[calc(100vw-2rem)] bg-white border border-[#e3e9f2] rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
            <div className="px-4 py-3 border-b flex items-center justify-between bg-gradient-to-r from-[#f8fafc] to-white">
              <span className="font-extrabold text-sm text-navy">{t('nav.notifications')}</span>
              {unread > 0 && <span className="text-[10px] font-bold text-red-500">{unread} جديد</span>}
            </div>
            <div className="max-h-72 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-6 text-sm text-muted text-center">لا إشعارات</div>
              ) : (
                notifications.map((n) => (
                  <button
                    key={n._id}
                    type="button"
                    onClick={() => !n.isRead && markRead(n._id)}
                    className={`w-full text-start px-4 py-3 border-b border-[#eef1f6] text-xs leading-relaxed border-s-2 ${typeStyle(n.type)} ${!n.isRead ? '' : 'opacity-75'}`}
                  >
                    <div className="font-bold text-navy">{i18n.language === 'en' && n.titleEn ? n.titleEn : n.title}</div>
                    <div className="text-muted mt-1">{i18n.language === 'en' && n.messageEn ? n.messageEn : n.message}</div>
                    <div className="text-[10px] text-muted mt-1.5">{new Date(n.createdAt).toLocaleString(i18n.language === 'en' ? 'en-US' : 'ar-SA')}</div>
                  </button>
                ))
              )}
            </div>
            <Link
              to={notifPath}
              onClick={() => setShowNotif(false)}
              className="block text-center py-3 text-xs font-bold text-brand-600 hover:bg-brand-50 border-t"
            >
              عرض كل الإشعارات ←
            </Link>
          </div>
        )}
      </div>

      {user && (
       <div className="group flex items-center gap-4 rounded-2xl border border-slate-200/70 bg-white/80 backdrop-blur-xl px-3 py-2 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-xl hover:shadow-brand-500/10">
       {/* Avatar */}
       <div className="relative shrink-0">
         <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-400 via-brand-500 to-brand-700 p-[2px] shadow-lg shadow-brand-500/20 transition-all duration-300 group-hover:scale-105 group-hover:rotate-2">
           <div className="flex h-full w-full items-center justify-center rounded-[14px] bg-slate-900 text-lg font-bold text-white">
             {user.name?.charAt(0)?.toUpperCase()}
           </div>
         </div>
     
         {/* Online Status */}
         <div className="absolute -bottom-1 -right-1">
           <span className="absolute inline-flex h-4 w-4 animate-ping rounded-full bg-emerald-400 opacity-70"></span>
           <span className="relative flex h-4 w-4 items-center justify-center rounded-full border-2 border-white bg-emerald-500">
             <span className="h-1.5 w-1.5 rounded-full bg-white"></span>
           </span>
         </div>
       </div>
     
       {/* User Info */}
       <div className="min-w-0 flex-1">
         <h3 className="truncate text-sm font-semibold text-slate-800 transition-colors duration-300 group-hover:text-brand-600">
           {userName(user, i18n.language)}
         </h3>
     
         <div className="mt-1 flex items-center gap-2">
           <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
     
           <span className="text-xs font-medium tracking-wide text-slate-500">
             {t(`roles.${user.role}`)}
           </span>
         </div>
       </div>
     
       {/* Arrow */}
       <div className="opacity-0 transition-all duration-300 group-hover:translate-x-1 group-hover:opacity-100">
         <svg
           xmlns="http://www.w3.org/2000/svg"
           className="h-5 w-5 text-slate-400"
           fill="none"
           viewBox="0 0 24 24"
           stroke="currentColor"
           strokeWidth={2}
         >
           <path
             strokeLinecap="round"
             strokeLinejoin="round"
             d="M9 5l7 7-7 7"
           />
         </svg>
       </div>
     </div>
      )}
    </header>
  );
}
