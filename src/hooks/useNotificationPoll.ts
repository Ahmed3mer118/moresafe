import { useEffect, useRef } from 'react';
import { useUi } from '../context/UiContext';
import { dashboardService } from '../services';
import type { Notification } from '../types';

/** Refresh notifications after user actions — no background polling. */
export function useNotificationSync(
  onData: (data: { notifications: Notification[]; unread: number }) => void,
  enabled = true,
) {
  const { notifTick } = useUi();
  const hiddenAt = useRef(0);

  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    dashboardService
      .notifications({ page: 1, limit: 20 }, { signal: controller.signal })
      .then(onData)
      .catch((err) => {
        if (err instanceof DOMException && err.name === 'AbortError') return;
      });
    return () => controller.abort();
  }, [enabled, notifTick, onData]);

  useEffect(() => {
    if (!enabled) return;

    const onVisible = () => {
      if (document.visibilityState === 'hidden') {
        hiddenAt.current = Date.now();
        return;
      }
      if (hiddenAt.current && Date.now() - hiddenAt.current > 60_000) {
        const controller = new AbortController();
        dashboardService
          .notifications({ page: 1, limit: 20 }, { signal: controller.signal })
          .then(onData)
          .catch(() => {});
      }
    };

    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [enabled, onData]);
}

/** @deprecated use useNotificationSync */
export const useNotificationPoll = useNotificationSync;
