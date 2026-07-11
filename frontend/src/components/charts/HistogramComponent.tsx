import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  TooltipProps,
} from 'recharts';

interface HistogramComponentProps {
  bins: number[];
  counts: number[];
  xLabel?: string;
  color?: string;
  height?: number;
}

const CustomTooltip: React.FC<TooltipProps<number, string>> = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div
        style={{
          background: '#252836',
          border: '1px solid #2d2f3e',
          borderRadius: '8px',
          padding: '10px 14px',
          boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
        }}
      >
        <p style={{ color: '#94a3b8', fontSize: '12px', margin: 0, marginBottom: '4px' }}>
          Bin: {label}
        </p>
        <p style={{ color: '#e2e8f0', fontSize: '14px', fontWeight: 600, margin: 0 }}>
          Count: {payload[0].value?.toLocaleString()}
        </p>
      </div>
    );
  }
  return null;
};

const HistogramComponent: React.FC<HistogramComponentProps> = ({
  bins,
  counts,
  xLabel,
  color,
  height = 320,
}) => {
  const data = counts.map((count, i) => {
    const start = bins[i] !== undefined ? bins[i] : i;
    const end = bins[i + 1] !== undefined ? bins[i + 1] : i + 1;
    const label =
      typeof start === 'number' && typeof end === 'number'
        ? `${start.toFixed(2)}–${end.toFixed(2)}`
        : String(start);
    return { name: label, value: count };
  });

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={data}
        barCategoryGap={0}
        margin={{ top: 10, right: 20, left: 10, bottom: xLabel ? 30 : 10 }}
      >
        <defs>
          <linearGradient id="histGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color || '#6366f1'} stopOpacity={1} />
            <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.8} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#2d2f3e" vertical={false} />
        <XAxis
          dataKey="name"
          tick={{ fill: '#94a3b8', fontSize: 10 }}
          axisLine={{ stroke: '#2d2f3e' }}
          tickLine={false}
          interval="preserveStartEnd"
          label={
            xLabel
              ? { value: xLabel, position: 'insideBottom', offset: -16, fill: '#94a3b8', fontSize: 12 }
              : undefined
          }
        />
        <YAxis
          tick={{ fill: '#94a3b8', fontSize: 12 }}
          axisLine={false}
          tickLine={false}
          width={45}
          tickFormatter={(v: number) =>
            v >= 1_000_000
              ? `${(v / 1_000_000).toFixed(1)}M`
              : v >= 1_000
              ? `${(v / 1_000).toFixed(1)}k`
              : String(v)
          }
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(99,102,241,0.08)' }} />
        <Bar dataKey="value" fill="url(#histGradient)" radius={[2, 2, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
};

export default HistogramComponent;
