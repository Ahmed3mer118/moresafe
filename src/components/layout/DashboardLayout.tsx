import { useState, useMemo, useCallback } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { Sidebar, type NavItem } from './Sidebar';
import { Topbar } from './Topbar';
import { Breadcrumbs, type Crumb } from '../ui/Breadcrumbs';
import type { Role } from '../../types';

interface DashboardLayoutConfig {
  subtitle?: string;
  subtitleKey?: string;
  navGroups: { titleKey?: string; items: NavItem[] }[];
  titleMap: Record<string, { titleKey: string; subKey?: string }>;
  breadcrumbMap?: Record<string, Crumb[]>;
  basePath?: string;
}

export class DashboardLayoutFactory {
  static create(config: DashboardLayoutConfig) {
    return function RoleDashboardLayout() {
      const { t } = useTranslation();
      const { user } = useAuth();
      const location = useLocation();
      const [sidebarOpen, setSidebarOpen] = useState(false);
      const closeSidebar = useCallback(() => setSidebarOpen(false), []);
      const openSidebar = useCallback(() => setSidebarOpen(true), []);
      const segment = location.pathname.split('/').filter(Boolean).pop() || 'home';
      const pageInfo = useMemo(
        () => config.titleMap[segment] || config.titleMap.home,
        [segment],
      );
      const crumbs = useMemo(
        () => config.breadcrumbMap?.[segment] ?? config.breadcrumbMap?.home ?? [],
        [segment],
      );
      const roleSubtitle = useMemo(
        () =>
          user?.role
            ? t(`roles.${user.role as Role}`)
            : config.subtitleKey
              ? t(config.subtitleKey)
              : (config.subtitle ?? ''),
        [user?.role, t, config.subtitleKey, config.subtitle],
      );

      return (
        <div className="flex min-h-screen bg-[#f4f7fb]">
          <Sidebar
            subtitle={roleSubtitle}
            navGroups={config.navGroups}
            open={sidebarOpen}
            onClose={closeSidebar}
          />
          <div className="flex-1 flex flex-col min-w-0 lg:ms-0">
            <Topbar
              title={t(pageInfo.titleKey)}
              subtitle={roleSubtitle}
              onMenuClick={openSidebar}
            />
            <main className="flex-1 p-4 lg:p-6 overflow-auto">
              {crumbs.length > 0 && <Breadcrumbs items={crumbs} />}
              <Outlet />
            </main>
          </div>
        </div>
      );
    };
  }
}
