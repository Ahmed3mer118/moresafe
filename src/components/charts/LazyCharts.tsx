import { lazy, Suspense } from 'react';
import { PageLoader } from '../ui/PageLoader';

const ProjectBarChartInner = lazy(() =>
  import('./DashboardCharts').then((m) => ({ default: m.ProjectBarChart })),
);
const ExpenseLineChartInner = lazy(() =>
  import('./DashboardCharts').then((m) => ({ default: m.ExpenseLineChart })),
);
const StatusDoughnutChartInner = lazy(() =>
  import('./DashboardCharts').then((m) => ({ default: m.StatusDoughnutChart })),
);

function ChartFallback({ height = 260 }: { height?: number }) {
  return (
    <div style={{ height }} className="flex items-center justify-center">
      <PageLoader compact />
    </div>
  );
}

type ChartProps = { labels: string[]; data: number[] };

export function ProjectBarChart(props: ChartProps) {
  return (
    <Suspense fallback={<ChartFallback />}>
      <ProjectBarChartInner {...props} />
    </Suspense>
  );
}

export function ExpenseLineChart(props: ChartProps) {
  return (
    <Suspense fallback={<ChartFallback />}>
      <ExpenseLineChartInner {...props} />
    </Suspense>
  );
}

export function StatusDoughnutChart(props: ChartProps) {
  return (
    <Suspense fallback={<ChartFallback height={220} />}>
      <StatusDoughnutChartInner {...props} />
    </Suspense>
  );
}
