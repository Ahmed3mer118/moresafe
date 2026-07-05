import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { ApiError } from '../core/ApiClient';
import { showToast, type ToastType } from '../utils/toast';

interface RunActionOptions {
  success?: string;
  error?: string;
  silent?: boolean;
}

interface UiContextValue {
  loading: boolean;
  notifTick: number;
  runAction: <T>(fn: () => Promise<T>, options?: RunActionOptions) => Promise<T | undefined>;
  bumpNotifications: () => void;
}

const UiContext = createContext<UiContextValue | null>(null);

function GlobalLoadingOverlay() {
  return (
    <div className="fixed inset-0 z-[10000] bg-[rgba(15,36,64,0.22)] backdrop-blur-[3px] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-[0_20px_60px_rgba(15,36,64,0.18)] px-10 py-8 flex flex-col items-center gap-4 border border-[#e3e9f2] min-w-[220px]">
        <div className="relative w-14 h-14">
          <div className="absolute inset-0 rounded-full border-[3px] border-brand-100" />
          <div className="absolute inset-0 rounded-full border-[3px] border-transparent border-t-brand-500 animate-spin" />
          <div className="absolute inset-3 rounded-full bg-brand-50 animate-pulse" />
        </div>
        <div className="text-center space-y-1">
          <span className="block text-sm font-extrabold text-navy">جاري التنفيذ...</span>
          <span className="block text-[11px] text-muted font-semibold">يرجى الانتظار</span>
        </div>
      </div>
    </div>
  );
}

export function UiProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(false);
  const [notifTick, setNotifTick] = useState(0);

  const bumpNotifications = useCallback(() => setNotifTick((n) => n + 1), []);

  const runAction = useCallback(async <T,>(fn: () => Promise<T>, options?: RunActionOptions) => {
    setLoading(true);
    try {
      const result = await fn();
      if (!options?.silent && options?.success) showToast(options.success, 'success');
      bumpNotifications();
      return result;
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : options?.error || 'حدث خطأ غير متوقع';
      showToast(msg, 'error');
      return undefined;
    } finally {
      setLoading(false);
    }
  }, [bumpNotifications]);

  const value = useMemo(
    () => ({ loading, notifTick, runAction, bumpNotifications }),
    [loading, notifTick, runAction, bumpNotifications],
  );

  return (
    <UiContext.Provider value={value}>
      {children}
      {loading && <GlobalLoadingOverlay />}
    </UiContext.Provider>
  );
}

export function useUi() {
  const ctx = useContext(UiContext);
  if (!ctx) throw new Error('useUi must be used within UiProvider');
  return ctx;
}

export type { ToastType };
