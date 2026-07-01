import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend, Filler);

const green = '#2e9e5b';
const navy = '#1f3a5f';
const muted = '#6b7a8d';

const baseOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false } },
  scales: {
    x: { grid: { display: false }, ticks: { font: { family: 'Cairo' }, color: muted } },
    y: { grid: { color: '#eef1f6' }, ticks: { font: { family: 'Cairo' }, color: muted } },
  },
};

export function ExpenseLineChart({ labels, data }: { labels: string[]; data: number[] }) {
  return (
    <div className="h-[260px]">
      <Line
        data={{
          labels,
          datasets: [{
            label: 'المصروف',
            data,
            borderColor: green,
            backgroundColor: 'rgba(46,158,91,0.12)',
            fill: true,
            tension: 0.35,
            pointBackgroundColor: green,
          }],
        }}
        options={baseOptions}
      />
    </div>
  );
}

export function ProjectBarChart({ labels, data }: { labels: string[]; data: number[] }) {
  return (
    <div className="h-[260px]">
      <Bar
        data={{
          labels,
          datasets: [{ data, backgroundColor: [green, navy, '#d99409', '#475569'], borderRadius: 8 }],
        }}
        options={baseOptions}
      />
    </div>
  );
}

export function StatusDoughnutChart({ labels, data }: { labels: string[]; data: number[] }) {
  return (
    <div className="h-[220px] flex items-center justify-center">
      <Doughnut
        data={{
          labels,
          datasets: [{
            data,
            backgroundColor: [green, '#d99409', '#d9534f', muted],
            borderWidth: 0,
          }],
        }}
        options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' as const, labels: { font: { family: 'Cairo' } } } } }}
      />
    </div>
  );
}
