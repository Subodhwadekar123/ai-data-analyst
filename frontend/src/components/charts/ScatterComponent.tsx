import React from 'react';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  TooltipProps,
} from 'recharts';

interface ScatterDataPoint {
  x: number;
  y: number;
  name?: string;
}

interface ScatterComponentProps {
  data: ScatterDataPoint[];
  xLabel?: string;
  yLabel?: string;
  height?: number;
}

const CustomTooltip: React.FC<TooltipProps<any, any>> = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const point = payload[0]?.payload as ScatterDataPoint | undefined;
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
        {point?.name && (
          <p style={{ color: '#94a3b8', fontSize: '12px', margin: 0, marginBottom: '4px' }}>
            {point.name}
          </p>
        )}
        <p style={{ color: '#e2e8f0', fontSize: '13px', margin: 0 }}>
          x: <span style={{ fontWeight: 600 }}>{point?.x?.toLocaleString(undefined, { maximumFractionDigits: 4 })}</span>
        </p>
        <p style={{ color: '#e2e8f0', fontSize: '13px', margin: 0 }}>
          y: <span style={{ fontWeight: 600 }}>{point?.y?.toLocaleString(undefined, { maximumFractionDigits: 4 })}</span>
        </p>
      </div>
    );
  }
  return null;
};

const ScatterComponent: React.FC<ScatterComponentProps> = ({
  data,
  xLabel,
  yLabel,
  height = 320,
}) => {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <ScatterChart margin={{ top: 10, right: 20, left: 10, bottom: xLabel ? 30 : 10 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#2d2f3e" />
        <XAxis
          type="number"
          dataKey="x"
          name={xLabel || 'x'}
          tick={{ fill: '#94a3b8', fontSize: 12 }}
          axisLine={{ stroke: '#2d2f3e' }}
          tickLine={false}
          domain={['auto', 'auto']}
          label={
            xLabel
              ? { value: xLabel, position: 'insideBottom', offset: -16, fill: '#94a3b8', fontSize: 12 }
              : undefined
          }
        />
        <YAxis
          type="number"
          dataKey="y"
          name={yLabel || 'y'}
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
        />
        <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3', stroke: '#2d2f3e' }} />
        <Scatter data={data} fill="#6366f1" fillOpacity={0.7} />
      </ScatterChart>
    </ResponsiveContainer>
  );
};

export default ScatterComponent;
