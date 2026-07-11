import React from 'react';
import {
  ComposedChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  TooltipProps,
  ErrorBar,
} from 'recharts';

interface BoxPlotDataPoint {
  name: string;
  min: number;
  q1: number;
  median: number;
  q3: number;
  max: number;
}

interface BoxPlotComponentProps {
  data: BoxPlotDataPoint[];
  height?: number;
}

// Transform for recharts ComposedChart approach:
// We render: a transparent bar from 0→q1 (invisible), then a visible bar from q1→q3 (the box),
// plus an ErrorBar to show whiskers (min→max), and a reference at median.
interface TransformedBoxEntry {
  name: string;
  rawQ1: number;
  rawQ3: number;
  rawMedian: number;
  rawMin: number;
  rawMax: number;
  // For stacking trick:
  invisible: number;   // bottom offset (q1)
  boxHeight: number;   // q3 - q1
  median: number;      // median value (used for the median line bar height)
  medianOffset: number; // invisible offset for median bar
  whiskerLow: number[];  // [below q1, above q3]
}

const CustomTooltip: React.FC<TooltipProps<number, string>> = ({ active, payload }) => {
  if (!active || !payload || !payload.length) return null;
  const d = payload[0]?.payload as TransformedBoxEntry | undefined;
  if (!d) return null;
  return (
    <div
      style={{
        background: '#252836',
        border: '1px solid #2d2f3e',
        borderRadius: '8px',
        padding: '10px 14px',
        boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
        minWidth: 140,
      }}
    >
      <p style={{ color: '#94a3b8', fontSize: '12px', margin: 0, marginBottom: '6px', fontWeight: 600 }}>
        {d.name}
      </p>
      {[
        ['Max', d.rawMax],
        ['Q3', d.rawQ3],
        ['Median', d.rawMedian],
        ['Q1', d.rawQ1],
        ['Min', d.rawMin],
      ].map(([label, val]) => (
        <div key={label as string} style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
          <span style={{ color: '#64748b', fontSize: 12 }}>{label}</span>
          <span style={{ color: '#e2e8f0', fontSize: 12, fontWeight: 600 }}>
            {(val as number).toLocaleString(undefined, { maximumFractionDigits: 3 })}
          </span>
        </div>
      ))}
    </div>
  );
};

// Custom shape to render box plot elements as SVG
interface BoxShapeProps {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  payload?: TransformedBoxEntry;
  chartYScale?: (v: number) => number;
}

const BoxShape: React.FC<BoxShapeProps> = ({ x = 0, y = 0, width = 0, height = 0, payload }) => {
  if (!payload) return null;

  const { rawMin, rawQ1, rawMedian, rawQ3, rawMax } = payload;
  // We need to map values to pixel coords. The bar's y and height correspond to boxHeight starting at invisible.
  // y is the top of the bar (q3 position), height is (q3 - q1) in pixels.
  const q3Y = y;
  const q1Y = y + height;

  // scale factor: pixels per unit
  const iqr = rawQ3 - rawQ1;
  const iqrPx = height;
  const pxPerUnit = iqrPx / (iqr || 1);

  const minY = q1Y + (rawQ1 - rawMin) * pxPerUnit;
  const maxY = q3Y - (rawMax - rawQ3) * pxPerUnit;
  const medianY = q3Y + (rawQ3 - rawMedian) * pxPerUnit;

  const cx = x + width / 2;
  const whiskerW = width * 0.4;

  return (
    <g>
      {/* Vertical whisker line */}
      <line x1={cx} y1={maxY} x2={cx} y2={minY} stroke="#94a3b8" strokeWidth={1.5} />
      {/* Top whisker cap */}
      <line x1={cx - whiskerW / 2} y1={maxY} x2={cx + whiskerW / 2} y2={maxY} stroke="#94a3b8" strokeWidth={1.5} />
      {/* Bottom whisker cap */}
      <line x1={cx - whiskerW / 2} y1={minY} x2={cx + whiskerW / 2} y2={minY} stroke="#94a3b8" strokeWidth={1.5} />
      {/* Box */}
      <rect
        x={x + width * 0.1}
        y={q3Y}
        width={width * 0.8}
        height={height}
        fill="rgba(99,102,241,0.25)"
        stroke="#6366f1"
        strokeWidth={1.5}
        rx={2}
      />
      {/* Median line */}
      <line
        x1={x + width * 0.1}
        y1={medianY}
        x2={x + width * 0.9}
        y2={medianY}
        stroke="#a5b4fc"
        strokeWidth={2.5}
      />
    </g>
  );
};

const BoxPlotComponent: React.FC<BoxPlotComponentProps> = ({ data, height = 360 }) => {
  // Use ComposedChart with invisible bar for q1 offset + visible bar for IQR box
  const transformed: TransformedBoxEntry[] = data.map((d) => ({
    name: d.name,
    rawQ1: d.q1,
    rawQ3: d.q3,
    rawMedian: d.median,
    rawMin: d.min,
    rawMax: d.max,
    invisible: d.q1,
    boxHeight: d.q3 - d.q1,
    median: 0.001, // tiny bar used for median line position
    medianOffset: d.median - 0.0005,
    whiskerLow: [d.q1 - d.min, d.max - d.q3],
  }));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart
        data={transformed}
        margin={{ top: 20, right: 20, left: 10, bottom: 10 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#2d2f3e" vertical={false} />
        <XAxis
          dataKey="name"
          tick={{ fill: '#94a3b8', fontSize: 12 }}
          axisLine={{ stroke: '#2d2f3e' }}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: '#94a3b8', fontSize: 12 }}
          axisLine={false}
          tickLine={false}
          width={45}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(99,102,241,0.04)' }} />
        {/* Invisible offset bar */}
        <Bar dataKey="invisible" stackId="box" fill="transparent" isAnimationActive={false} />
        {/* The IQR box rendered with custom shape */}
        <Bar
          dataKey="boxHeight"
          stackId="box"
          shape={(props: any) => <BoxShape {...props} payload={props.payload} />}
          isAnimationActive={false}
        >
          {transformed.map((_entry, index) => (
            <Cell key={`cell-${index}`} fill="transparent" />
          ))}
        </Bar>
      </ComposedChart>
    </ResponsiveContainer>
  );
};

export default BoxPlotComponent;
