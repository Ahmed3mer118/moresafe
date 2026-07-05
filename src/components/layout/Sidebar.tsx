import { memo } from 'react';
import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import { useAuth } from '../../context/AuthContext';
import { setLanguage } from '../../i18n';
import logo from '../../assets/images/Transparent-for-Dark-background-139x139.png';

export interface NavItem {
  to: string;
  labelKey: string;
  icon: string;
  end?: boolean;
  badge?: number;
}

interface SidebarProps {
  subtitle: string;
  navGroups: { titleKey?: string; items: NavItem[] }[];
  open?: boolean;
  onClose?: () => void;
}

export const Sidebar = memo(function Sidebar({ subtitle, navGroups, open, onClose }: SidebarProps) {
  const { t, i18n } = useTranslation();
  const { user, logout } = useAuth();
  const lang = i18n.language as 'ar' | 'en';
  const rtl = i18n.dir() === 'rtl';

  return (
    <>
      <div
        className={clsx(
          'fixed inset-0 bg-[rgba(15,36,64,0.5)] z-40 lg:hidden transition-opacity',
          open ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none',
        )}
        onClick={onClose}
        aria-hidden={!open}
      />
      <aside
        className={clsx(
          'w-[264px] shrink-0 bg-gradient-to-b from-navy to-[#28456e] text-white flex flex-col min-h-screen z-50',
          'fixed lg:sticky inset-y-0 start-0 h-screen transition-transform duration-300 ease-out',
          open ? 'translate-x-0' : rtl ? 'translate-x-full' : '-translate-x-full',
          'lg:translate-x-0',
          !open && 'pointer-events-none lg:pointer-events-auto',
        )}
      >
        <div className="p-5 border-b border-white/10">
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="w-full max-w-[210px] rounded-xl bg-white/5 border border-white/10 px-4 py-3 shadow-lg">
              <img
                src={logo}
                alt="Moresafe"
                width={139}
                height={139}
                loading="eager"
                decoding="async"
                className="w-full h-auto max-h-[72px] object-contain object-center mx-auto"
              />
            </div>
            <div>
              <h1 className="font-extrabold text-[15px] leading-tight">{t('app.name')}</h1>
              <span className="text-[11px] text-[#9fb2cc] font-semibold">{subtitle}</span>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-3 overflow-y-auto">
          {navGroups.map((group, gi) => (
            <div key={gi} className="mb-3">
              {group.titleKey && (
                <div className="text-[11px] font-bold text-[#7e93b0] px-3 py-2">{t(group.titleKey)}</div>
              )}
              {group.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  onClick={onClose}
                  className={({ isActive }) =>
                    clsx(
                      'flex items-center gap-2.5 px-3 py-2.5 rounded-[11px] text-[13.5px] font-semibold mb-0.5 transition-all',
                      isActive
                        ? 'bg-brand-500 text-white shadow-[0_4px_14px_rgba(46,158,91,0.45)]'
                        : 'text-[#cdd9ea] hover:bg-white/10 hover:text-white',
                    )
                  }
                >
                  <span className="w-5 text-center shrink-0">{item.icon}</span>
                  <span className="flex-1">{t(item.labelKey)}</span>
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-white/20 font-bold">{item.badge}</span>
                  )}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        <div className="p-4 border-t border-white/10 bg-[#1a3354]/60">
          {user && (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-white/8 border border-white/10 mb-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-500 to-brand-600 text-white grid place-items-center font-extrabold text-sm shrink-0 shadow-md">
                {user.name.charAt(0)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-bold text-white truncate">{user.name}</div>
                <div className="text-[10px] text-[#9fb2cc] truncate">{user.email}</div>
              </div>
            </div>
          )}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setLanguage(lang === 'ar' ? 'en' : 'ar')}
              className="flex items-center justify-center gap-1.5 text-xs font-bold text-[#cdd9ea] hover:text-white py-2.5 px-3 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
            >
              🌐 {t('common.language')}
            </button>
            <button
              type="button"
              onClick={logout}
              className="flex items-center justify-center gap-1.5 text-xs font-bold text-red-200 hover:text-white py-2.5 px-3 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-400/20 transition-colors"
            >
              {t('auth.logout')}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
});
