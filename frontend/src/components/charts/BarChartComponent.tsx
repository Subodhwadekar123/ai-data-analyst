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

interface BarChartComponentProps {
  data: Array<{ name: string; value: number }>;
  xLabel?: string;
  yLabel?: string;
  color?: string;
  height?: number;
}

interface CustomTooltipPayload {
  name: string;
  value: number;
}

const CustomTooltip: React.FC<TooltipProps<any, any>> = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const item = payload[0] as { payload: CustomTooltipPayload; value: number };
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
        <p style={{ color: '#94a3b8', fontSize: '12px', margin: 0, marginBottom: '4px' }}>{label}</p>
        <p style={{ color: '#e2e8f0', fontSize: '14px', fontWeight: 600, margin: 0 }}>
          {typeof item.value === 'number' ? item.value.toLocaleString(undefined, { maximumFractionDigits: 4 }) : item.value}
        </p>
      </div>
    );
  }
  return null;
};

const BarChartComponent: React.FC<BarChartComponentProps> = ({
  data,
  xLabel,
  yLabel,
  color,
  height = 320,
}) => {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={data}
        margin={{ top: 10, right: 20, left: 10, bottom: xLabel ? 30 : 10 }}
      >
        <defs>
          <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color || '#6366f1'} stopOpacity={1} />
            <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.8} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#2d2f3e" vertical={false} />
        <XAxis
          dataKey="name"
          tick={{ fill: '#94a3b8', fontSize: 12 }}
          axisLine={{ stroke: '#2d2f3e' }}
          tickLine={false}
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
          width={yLabel ? 60 : 45}
          label={
            yLabel
              ? { value: yLabel, angle: -90, position: 'insideLeft', fill: '#94a3b8', fontSize: 12 }
              : undefined
          }
          tickFormatter={(v: number) =>
            v >= 1_000_000
              ? `${(v / 1_000_000).toFixed(1)}M`
              : v >= 1_000
              ? `${(v / 1_000).toFixed(1)}k`
              : String(v)
          }
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(99,102,241,0.08)' }} />
        <Bar dataKey="value" fill="url(#barGradient)" radius={[4, 4, 0, 0]} maxBarSize={64} />
      </BarChart>
    </ResponsiveContainer>
  );
};

export default BarChartComponent;
