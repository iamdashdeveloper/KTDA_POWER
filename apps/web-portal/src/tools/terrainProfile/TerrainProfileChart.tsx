import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import type { ProfilePoint } from './terrainProfileUtils';
import { Download } from 'lucide-react';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Filler,
  Legend
);

interface TerrainProfileChartProps {
  data: ProfilePoint[];
}

export const TerrainProfileChart: React.FC<TerrainProfileChartProps> = ({ data }) => {
  if (data.length === 0) return null;

  const elevations = data.map(p => p.elevation);
  const minElev = Math.min(...elevations);
  const maxElev = Math.max(...elevations);
  const totalDist = data[data.length - 1]?.distance ?? 0;

  const chartData = {
    labels: data.map(p => Math.round(p.distance)),
    datasets: [
      {
        label: 'Elevation (m)',
        data: elevations,
        fill: true,
        backgroundColor: 'rgba(59, 130, 246, 0.15)',
        borderColor: 'rgb(59, 130, 246)',
        borderWidth: 2,
        tension: 0.3,
        pointRadius: 0,
        pointHoverRadius: 4,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 400 },
    plugins: {
      legend: { display: false },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
        callbacks: {
          label: (ctx: any) => `Elevation: ${ctx.parsed.y.toFixed(1)} m`,
          title: (ctx: any) => `Distance: ${ctx[0].label} m`,
        },
      },
    },
    scales: {
      x: {
        title: { display: true, text: 'Distance (m)', font: { size: 10 } },
        ticks: { maxTicksLimit: 12, font: { size: 9 } },
        grid: { color: 'rgba(128,128,128,0.1)' },
      },
      y: {
        title: { display: true, text: 'Elevation (m)', font: { size: 10 } },
        ticks: { font: { size: 9 } },
        grid: { color: 'rgba(128,128,128,0.1)' },
      },
    },
  };

  const exportToCSV = () => {
    const headers = ['Distance (m)', 'Elevation (m)', 'Longitude', 'Latitude'];
    const rows = data.map(p => [
      p.distance.toFixed(2),
      p.elevation.toFixed(2),
      p.longitude.toFixed(6),
      p.latitude.toFixed(6)
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(e => e.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `terrain_profile_${new Date().getTime()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col h-full w-full bg-card">
      {/* Stats strip */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-muted/40 shrink-0">
        <div className="flex items-center gap-6">
          <Stat label="Min Elevation" value={`${minElev.toFixed(1)} m`} color="text-blue-400" />
          <Stat label="Max Elevation" value={`${maxElev.toFixed(1)} m`} color="text-orange-400" />
          <Stat label="Relief" value={`${(maxElev - minElev).toFixed(1)} m`} color="text-green-400" />
          <Stat label="Profile Length" value={`${(totalDist / 1000).toFixed(2)} km`} color="text-muted-foreground" />
          <Stat label="Sample Points" value={`${data.length}`} color="text-muted-foreground" />
        </div>
        
        <button 
          onClick={exportToCSV}
          className="flex items-center gap-2 px-3 py-1 bg-primary text-primary-foreground rounded text-[11px] font-medium hover:bg-primary/90 transition-colors shadow-sm"
        >
          <Download size={14} />
          Export CSV
        </button>
      </div>

      {/* Chart — grows to fill remaining height */}
      <div className="flex-1 min-h-0 px-4 py-3">
        <Line data={chartData} options={options} />
      </div>
    </div>
  );
};

const Stat: React.FC<{ label: string; value: string; color: string }> = ({ label, value, color }) => (
  <div className="flex flex-col">
    <span className="text-[9px] text-muted-foreground uppercase tracking-wider">{label}</span>
    <span className={`text-[12px] font-semibold font-mono ${color}`}>{value}</span>
  </div>
);
