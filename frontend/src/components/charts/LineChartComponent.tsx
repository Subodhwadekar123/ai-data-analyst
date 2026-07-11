import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  TooltipProps,
} from 'recharts';

interface LineChartComponentProps {
  data: Array<{ name: string | number; value: number }>;
  xLabel?: string;
  yLabel?: string;
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
        <p style={{ color: '#94a3b8', fontSize: '12px', margin: 0, marginBottom: '4px' }}>{label}</p>
        <p style={{ color: '#e2e8f0', fontSize: '14px', fontWeight: 600, margin: 0 }}>
          {typeof payload[0].value === 'number'
            ? payload[0].value.toLocaleString(undefined, { maximumFractionDigits: 4 })
            : payload[0].value}
        </p>
      </div>
    );
  }
  return null;
};

const LineChartComponent: React.FC<LineChartComponentProps> = ({
  data,
  xLabel,
  yLabel,
  color = '#6366f1',
  height = 320,
}) => {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart
        data={data}
        margin={{ top: 10, right: 20, left: 10, bottom: xLabel ? 30 : 10 }}
      >
        <defs>
          <linearGradient id="lineAreaGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.15} />
            <stop offset="95%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#2d2f3e" vertical={false} />
        <XAxis
          dataKey="name"
          tick={{ fill: '#94a3b8', fontSize: 11 }}
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
          width={yLabel ? 60 : 45}
          domain={['auto', 'auto']}
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
        <Tooltip content={<CustomTooltip />} />
        <Line
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 5, fill: color, stroke: '#0f1117', strokeWidth: 2 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
};

export default LineChartComponent;
