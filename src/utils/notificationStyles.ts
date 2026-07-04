/** Shared notification / alert color classes */
export function notificationTypeClass(type?: string) {
  if (type === 'reject' || type === 'error') {
    return 'border-red-200 bg-red-50 text-red-900';
  }
  if (type === 'success') {
    return 'border-emerald-200 bg-emerald-50 text-emerald-900';
  }
  if (type === 'warning' || type === 'info') {
    return 'border-amber-200 bg-amber-50 text-amber-900';
  }
  return 'border-[#e3e9f2] bg-white text-navy';
}

export function notificationBorderAccent(type?: string) {
  if (type === 'reject' || type === 'error') return 'border-s-red-400';
  if (type === 'success') return 'border-s-emerald-500';
  if (type === 'warning' || type === 'info') return 'border-s-amber-400';
  return 'border-s-[#e3e9f2]';
}
