import React from 'react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
  TooltipProps,
} from 'recharts';

interface PieChartComponentProps {
  data: Array<{ name: string; value: number }>;
  height?: number;
}

const COLORS = [
  '#6366f1',
  '#8b5cf6',
  '#a855f7',
  '#ec4899',
  '#06b6d4',
  '#10b981',
  '#f59e0b',
  '#ef4444',
];

const CustomTooltip: React.FC<TooltipProps<any, any>> = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const item = payload[0];
    const total = (item.payload as { total?: number })?.total;
    const pct = total ? ((item.value as number) / total * 100).toFixed(1) : null;
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
          {item.name}
        </p>
        <p style={{ color: '#e2e8f0', fontSize: '14px', fontWeight: 600, margin: 0 }}>
          {(item.value as number).toLocaleString()}
          {pct && <span style={{ color: '#94a3b8', fontWeight: 400, marginLeft: 6 }}>({pct}%)</span>}
        </p>
      </div>
    );
  }
  return null;
};

interface CustomLabelProps {
  cx: number;
  cy: number;
  midAngle: number;
  innerRadius: number;
  outerRadius: number;
  percent: number;
  name: string;
}

const RADIAN = Math.PI / 180;
const renderCustomLabel = ({
  cx,
  cy,
  midAngle,
  innerRadius,
  outerRadius,
  percent,
  name,
}: CustomLabelProps) => {
  if (percent < 0.04) return null;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text
      x={x}
      y={y}
      fill="#f1f5f9"
      textAnchor="middle"
      dominantBaseline="central"
      style={{ fontSize: 11, fontWeight: 600 }}
    >
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

const PieChartComponent: React.FC<PieChartComponentProps> = ({ data, height = 340 }) => {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  const enriched = data.map((d) => ({ ...d, total }));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={enriched}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={Math.min(height / 2 - 60, 120)}
          dataKey="value"
          labelLine={false}
          label={renderCustomLabel as any}
          strokeWidth={2}
          stroke="#0f1117"
        >
          {enriched.map((_entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={COLORS[index % COLORS.length]}
            />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
        <Legend
          formatter={(value: string) => (
            <span style={{ color: '#94a3b8', fontSize: 12 }}>{value}</span>
          )}
          wrapperStyle={{ paddingTop: 8 }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
};

export default PieChartComponent;
