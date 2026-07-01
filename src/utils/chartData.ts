/** Fallback when API returns empty chart series */
export function chartOrFallback(
  chart?: { labels?: string[]; data?: number[] } | null,
  fallbackLabels = ['—'],
  fallbackData = [0]
) {
  if (chart?.labels?.length && chart?.data?.length) {
    return { labels: chart.labels, data: chart.data };
  }
  return { labels: fallbackLabels, data: fallbackData };
}

export function formatHours(h: number) {
  if (!h || h <= 0) return '—';
  if (h < 24) return `${h}س`;
  return `${Math.round(h / 24)}ي`;
}
