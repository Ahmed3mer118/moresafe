export type ToastType = 'success' | 'error' | 'info';

const styles: Record<ToastType, string> = {
  success: 'bg-emerald-600 text-white border-emerald-700',
  error: 'bg-red-600 text-white border-red-700',
  info: 'bg-amber-500 text-amber-950 border-amber-600',
};

let timer: ReturnType<typeof setTimeout> | null = null;

export function showToast(msg: string, type: ToastType = 'info', duration = 2800) {
  let el = document.getElementById('app-toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'app-toast';
    el.className =
      'fixed top-6 left-1/2 -translate-x-1/2 z-[10001] px-5 py-3 rounded-2xl text-sm font-bold shadow-2xl border transition-all duration-300 opacity-0 pointer-events-none max-w-[min(92vw,420px)] text-center';
    document.body.appendChild(el);
  }

  el.className = el.className.replace(/bg-\S+|text-\S+|border-\S+/g, '').trim();
  el.className = `fixed top-6 left-1/2 -translate-x-1/2 z-[10001] px-5 py-3 rounded-2xl text-sm font-bold shadow-2xl border transition-all duration-300 pointer-events-none max-w-[min(92vw,420px)] text-center ${styles[type]}`;
  el.textContent = msg;
  el.style.opacity = '1';
  el.style.transform = 'translate(-50%, 0)';

  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    if (el) {
      el.style.opacity = '0';
      el.style.transform = 'translate(-50%, -8px)';
    }
  }, duration);
}
