import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  BarChart2,
  TrendingUp,
  LineChart as LineChartIcon,
  Crosshair,
  BoxSelect,
  PieChart as PieChartIcon,
  LayoutGrid,
  Music2,
  Clock,
  Settings2,
  Play,
  AlertCircle,
  Globe,
} from 'lucide-react';
import { useStore } from '../store/useStore';
import {
  getHistogram,
  getBarChart,
  getLineChart,
  getScatterPlot,
  getBoxPlot,
  getPieChart,
  getCorrelationHeatmap,
  getViolinPlot,
  getTimeSeries,
  getBubbleMap,
} from '../services/api';
import BarChartComponent from '../components/charts/BarChartComponent';
import HistogramComponent from '../components/charts/HistogramComponent';
import LineChartComponent from '../components/charts/LineChartComponent';
import ScatterComponent from '../components/charts/ScatterComponent';
import BoxPlotComponent from '../components/charts/BoxPlotComponent';
import PieChartComponent from '../components/charts/PieChartComponent';
import HeatmapComponent from '../components/charts/HeatmapComponent';
import BubbleMapComponent from '../components/charts/BubbleMapComponent';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import EmptyState from '../components/ui/EmptyState';

// ─── Types ─────────────────────────────────────────────────────────────────────

type ChartType =
  | 'bar'
  | 'histogram'
  | 'line'
  | 'scatter'
  | 'box'
  | 'pie'
  | 'heatmap'
  | 'violin'
  | 'timeseries'
  | 'bubblemap';

interface ChartTypeOption {
  id: ChartType;
  label: string;
  icon: React.ReactNode;
}

interface ColumnConfig {
  xCol: string;
  yCol: string;
  colorCol: string;
  groupCol: string;
  dateCol: string;
  bins: number;
  topN: number;
}

type ChartResult =
  | { type: 'bar'; data: { x: string; y: number }[]; x_col: string; y_col: string }
  | { type: 'histogram'; data: { x: number; count: number }[]; column: string }
  | { type: 'line'; data: { x: any; y: number }[]; x_col: string; y_col: string }
  | { type: 'scatter'; data: { x: number; y: number; color?: any }[]; x_col: string; y_col: string; color_col?: string }
  | { type: 'box'; data: any[]; column: string }
  | { type: 'pie'; data: { name: string; value: number }[]; column: string }
  | { type: 'heatmap'; columns: string[]; data: { x: string; y: string; value: number }[] }
  | { type: 'violin'; raw: any }
  | { type: 'timeseries'; raw: any }
  | { type: 'bubblemap'; data: { location: string; size: number }[]; location_col: string; size_col: string };

// ─── Chart type list ────────────────────────────────────────────────────────────

const CHART_TYPES: ChartTypeOption[] = [
  { id: 'bar', label: 'Bar', icon: <BarChart2 size={18} /> },
  { id: 'histogram', label: 'Histogram', icon: <TrendingUp size={18} /> },
  { id: 'line', label: 'Line', icon: <LineChartIcon size={18} /> },
  { id: 'scatter', label: 'Scatter', icon: <Crosshair size={18} /> },
  { id: 'box', label: 'Box Plot', icon: <BoxSelect size={18} /> },
  { id: 'pie', label: 'Pie / Donut', icon: <PieChartIcon size={18} /> },
  { id: 'heatmap', label: 'Heatmap', icon: <LayoutGrid size={18} /> },
  { id: 'violin', label: 'Violin', icon: <Music2 size={18} /> },
  { id: 'timeseries', label: 'Time Series', icon: <Clock size={18} /> },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

const SelectField: React.FC<{
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
  placeholder?: string;
}> = ({ label, value, options, onChange, placeholder }) => (
  <div style={{ marginBottom: 12 }}>
    <label className="section-label" style={{ display: 'block', marginBottom: 4 }}>
      {label}
    </label>
    <select
      className="input"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{ width: '100%' }}
    >
      {placeholder && <option value="">{placeholder}</option>}
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  </div>
);

const NumberField: React.FC<{
  label: string;
  value: number;
  min?: number;
  max?: number;
  onChange: (v: number) => void;
}> = ({ label, value, min, max, onChange }) => (
  <div style={{ marginBottom: 12 }}>
    <label className="section-label" style={{ display: 'block', marginBottom: 4 }}>
      {label}
    </label>
    <input
      type="number"
      className="input"
      value={value}
      min={min}
      max={max}
      onChange={(e) => onChange(Number(e.target.value))}
      style={{ width: '100%' }}
    />
  </div>
);

// ─── Main component ─────────────────────────────────────────────────────────────

const VisualizationPage: React.FC = () => {
  const { activeDataset } = useStore();

  const [selectedChart, setSelectedChart] = useState<ChartType>('histogram');
  const [config, setConfig] = useState<ColumnConfig>({
    xCol: '',
    yCol: '',
    colorCol: '',
    groupCol: '',
    dateCol: '',
    bins: 20,
    topN: 10,
  });
  const [chartResult, setChartResult] = useState<ChartResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [chartTitle, setChartTitle] = useState('');

  if (!activeDataset) {
    return (
      <EmptyState
        title="No Dataset Selected"
        description="Upload or select a dataset to start visualizing your data."
      />
    );
  }

  const info = activeDataset.dataset_info;
  const allCols: string[] = info?.column_details?.map(c => c.name) ?? [];
  const numericCols: string[] = allCols.filter((c) => {
    const dtype = info?.column_details?.find(d => d.name === c)?.dtype ?? '';
    return dtype.includes('int') || dtype.includes('float');
  });
  const categoricalCols: string[] = allCols.filter((c) => !numericCols.includes(c));
  const datetimeCols: string[] = allCols.filter((c) => {
    const dtype = info?.column_details?.find(d => d.name === c)?.dtype ?? '';
    return dtype.includes('datetime') || dtype.includes('date');
  });

  const locationCols: string[] = categoricalCols.filter((c) => {
    const lower = c.toLowerCase();
    return lower.includes('country') || lower.includes('region') || lower.includes('state') || lower.includes('city') || lower.includes('location') || lower.includes('geo');
  });

  const availableChartTypes = React.useMemo(() => {
    const types = [...CHART_TYPES];
    if (locationCols.length > 0) {
      types.push({ id: 'bubblemap', label: 'Bubble Map', icon: <Globe size={18} /> });
    }
    return types;
  }, [locationCols.length]);

  const setC = (patch: Partial<ColumnConfig>) =>
    setConfig((prev) => ({ ...prev, ...patch }));

  const generateChart = useCallback(async () => {
    const id = activeDataset.id;
    setLoading(true);
    setChartResult(null);
    try {
      switch (selectedChart) {
        case 'histogram': {
          const col = config.xCol || numericCols[0];
          if (!col) throw new Error('Select a numeric column');
          const res = await getHistogram(id, col, config.bins);
          setChartResult({ type: 'histogram', ...(res as any) });
          setChartTitle(`Histogram: ${col}`);
          break;
        }
        case 'bar': {
          const col = config.xCol || allCols[0];
          if (!col) throw new Error('Select an X column');
          const res = await getBarChart(id, col, config.yCol || undefined, config.topN);
          setChartResult({ type: 'bar', ...(res as any) });
          setChartTitle(`Bar Chart: ${col}${config.yCol ? ` vs ${config.yCol}` : ''}`);
          break;
        }
        case 'line': {
          const xCol = config.xCol || allCols[0];
          const yCol = config.yCol || numericCols[0];
          if (!xCol || !yCol) throw new Error('Select X and Y columns');
          const res = await getLineChart(id, xCol, yCol);
          setChartResult({ type: 'line', ...(res as any) });
          setChartTitle(`Line Chart: ${yCol} over ${xCol}`);
          break;
        }
        case 'scatter': {
          const xCol = config.xCol || numericCols[0];
          const yCol = config.yCol || numericCols[1] || numericCols[0];
          if (!xCol || !yCol) throw new Error('Select X and Y numeric columns');
          const res = await getScatterPlot(id, xCol, yCol, config.colorCol || undefined);
          setChartResult({ type: 'scatter', ...(res as any) });
          setChartTitle(`Scatter: ${xCol} vs ${yCol}`);
          break;
        }
        case 'box': {
          const col = config.xCol || numericCols[0];
          if (!col) throw new Error('Select a numeric column');
          const res = await getBoxPlot(id, col, config.groupCol || undefined);
          setChartResult({ type: 'box', ...(res as any) });
          setChartTitle(`Box Plot: ${col}${config.groupCol ? ` by ${config.groupCol}` : ''}`);
          break;
        }
        case 'pie': {
          const col = config.xCol || allCols[0];
          if (!col) throw new Error('Select a column');
          const res = await getPieChart(id, col, config.topN);
          setChartResult({ type: 'pie', ...(res as any) });
          setChartTitle(`Pie Chart: ${col}`);
          break;
        }
        case 'heatmap': {
          const res = await getCorrelationHeatmap(id);
          setChartResult({ type: 'heatmap', ...(res as any) });
          setChartTitle('Correlation Heatmap');
          break;
        }
        case 'violin': {
          const col = config.xCol || numericCols[0];
          if (!col) throw new Error('Select a numeric column');
          const res = await getViolinPlot(id, col, config.groupCol || undefined);
          setChartResult({ type: 'violin', raw: res });
          setChartTitle(`Violin Plot: ${col}`);
          break;
        }
        case 'timeseries': {
          const dateCol = config.dateCol || datetimeCols[0] || allCols[0];
          const valueCol = config.yCol || numericCols[0];
          if (!dateCol || !valueCol) throw new Error('Select date and value columns');
          const res = await getTimeSeries(id, dateCol, valueCol);
          setChartResult({ type: 'timeseries', raw: res });
          setChartTitle(`Time Series: ${valueCol} over ${dateCol}`);
          break;
        }
        case 'bubblemap': {
          const locCol = config.xCol || locationCols[0];
          const sizeCol = config.yCol || numericCols[0];
          if (!locCol || !sizeCol) throw new Error('Select location and size columns');
          const res: any = await getBubbleMap(id, locCol, sizeCol);
          setChartResult({ type: 'bubblemap', ...res });
          setChartTitle(`Bubble Map: ${sizeCol} by ${locCol}`);
          break;
        }
      }
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to generate chart');
    } finally {
      setLoading(false);
    }
  }, [activeDataset, selectedChart, config, allCols, numericCols, datetimeCols]);

  // ─── Sidebar column controls ─────────────────────────────────────────────

  const renderColumnControls = () => {
    switch (selectedChart) {
      case 'histogram':
        return (
          <>
            <SelectField
              label="Column (numeric)"
              value={config.xCol}
              options={numericCols}
              onChange={(v) => setC({ xCol: v })}
              placeholder="Select column"
            />
            <NumberField label="Bins" value={config.bins} min={5} max={100} onChange={(v) => setC({ bins: v })} />
          </>
        );
      case 'bar':
        return (
          <>
            <SelectField label="X Column" value={config.xCol} options={allCols} onChange={(v) => setC({ xCol: v })} placeholder="Select column" />
            <SelectField label="Y Column (optional)" value={config.yCol} options={['', ...numericCols]} onChange={(v) => setC({ yCol: v })} placeholder="Count (default)" />
            <NumberField label="Top N" value={config.topN} min={3} max={50} onChange={(v) => setC({ topN: v })} />
          </>
        );
      case 'line':
        return (
          <>
            <SelectField label="X Column" value={config.xCol} options={allCols} onChange={(v) => setC({ xCol: v })} placeholder="Select column" />
            <SelectField label="Y Column (numeric)" value={config.yCol} options={numericCols} onChange={(v) => setC({ yCol: v })} placeholder="Select column" />
          </>
        );
      case 'scatter':
        return (
          <>
            <SelectField label="X Column (numeric)" value={config.xCol} options={numericCols} onChange={(v) => setC({ xCol: v })} placeholder="Select column" />
            <SelectField label="Y Column (numeric)" value={config.yCol} options={numericCols} onChange={(v) => setC({ yCol: v })} placeholder="Select column" />
            <SelectField label="Color Column (optional)" value={config.colorCol} options={['', ...allCols]} onChange={(v) => setC({ colorCol: v })} placeholder="None" />
          </>
        );
      case 'box':
        return (
          <>
            <SelectField label="Column (numeric)" value={config.xCol} options={numericCols} onChange={(v) => setC({ xCol: v })} placeholder="Select column" />
            <SelectField label="Group By (optional)" value={config.groupCol} options={['', ...categoricalCols]} onChange={(v) => setC({ groupCol: v })} placeholder="None" />
          </>
        );
      case 'pie':
        return (
          <>
            <SelectField label="Column" value={config.xCol} options={allCols} onChange={(v) => setC({ xCol: v })} placeholder="Select column" />
            <NumberField label="Top N" value={config.topN} min={3} max={20} onChange={(v) => setC({ topN: v })} />
          </>
        );
      case 'heatmap':
        return (
          <p style={{ color: '#64748b', fontSize: 13, marginTop: 8 }}>
            No configuration needed — shows correlations between all numeric columns.
          </p>
        );
      case 'violin':
        return (
          <>
            <SelectField label="Column (numeric)" value={config.xCol} options={numericCols} onChange={(v) => setC({ xCol: v })} placeholder="Select column" />
            <SelectField label="Group By (optional)" value={config.groupCol} options={['', ...categoricalCols]} onChange={(v) => setC({ groupCol: v })} placeholder="None" />
          </>
        );
      case 'timeseries':
        return (
          <>
            <SelectField
              label="Date Column"
              value={config.dateCol}
              options={datetimeCols.length ? datetimeCols : allCols}
              onChange={(v) => setC({ dateCol: v })}
              placeholder="Select date column"
            />
            <SelectField label="Value Column (numeric)" value={config.yCol} options={numericCols} onChange={(v) => setC({ yCol: v })} placeholder="Select column" />
          </>
        );
      case 'bubblemap':
        return (
          <>
            <SelectField label="Location Column" value={config.xCol} options={locationCols} onChange={(v) => setC({ xCol: v })} placeholder="Select location column" />
            <SelectField label="Size Column (numeric)" value={config.yCol} options={numericCols} onChange={(v) => setC({ yCol: v })} placeholder="Select size column" />
          </>
        );
      default:
        return null;
    }
  };

  // ─── Chart render ─────────────────────────────────────────────────────────

  const renderChart = () => {
    if (loading) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 400, gap: 16 }}>
          <LoadingSpinner />
          <p style={{ color: '#64748b', fontSize: 14 }}>Generating chart…</p>
        </div>
      );
    }

    if (!chartResult) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 400, gap: 12, opacity: 0.5 }}>
          <Settings2 size={48} color="#6366f1" />
          <p style={{ color: '#64748b', fontSize: 14, textAlign: 'center' }}>
            Configure options in the sidebar<br />and click <strong>Generate Chart</strong>
          </p>
        </div>
      );
    }

    const chartHeight = 420;

    switch (chartResult.type) {
      case 'histogram':
        return (
          <HistogramComponent
            bins={chartResult.data.map(d => d.x)}
            counts={chartResult.data.map(d => d.count)}
            xLabel={chartResult.column}
            height={chartHeight}
          />
        );
      case 'bar':
        return (
          <BarChartComponent
            data={chartResult.data.map(d => ({ name: d.x, value: d.y }))}
            height={chartHeight}
          />
        );
      case 'line':
        return (
          <LineChartComponent
            data={chartResult.data.map(d => ({ name: d.x, value: d.y }))}
            height={chartHeight}
          />
        );
      case 'scatter':
        return (
          <ScatterComponent
            data={chartResult.data}
            height={chartHeight}
          />
        );
      case 'box': {
        const boxData = chartResult.data.map(d => ({
          name: d.label,
          min: d.min,
          q1: d.q1,
          median: d.median,
          q3: d.q3,
          max: d.max,
        }));
        return <BoxPlotComponent data={boxData} height={chartHeight} />;
      }
      case 'pie':
        return (
          <PieChartComponent
            data={chartResult.data.map(d => ({ name: d.name, value: d.value }))}
            height={chartHeight}
          />
        );
      case 'heatmap': {
        const matrix = chartResult.columns.map(row => 
          chartResult.columns.map(col => {
            const cell = chartResult.data.find(d => d.x === col && d.y === row);
            return cell ? cell.value : 0;
          })
        );
        return <HeatmapComponent columns={chartResult.columns} matrix={matrix} height={chartHeight} />;
      }
      case 'violin': {
        const boxData = chartResult.raw.data.map((d: any) => ({
          name: d.label || 'All',
          min: d.min,
          q1: d.q1,
          median: d.median,
          q3: d.q3,
          max: d.max,
        }));
        return <BoxPlotComponent data={boxData} height={chartHeight} />;
      }
      case 'timeseries':
        return (
          <LineChartComponent
            data={chartResult.raw.data.map((d: any) => ({ name: d.x, value: d.y }))}
            height={chartHeight}
          />
        );
      case 'bubblemap':
        return (
          <BubbleMapComponent
            data={chartResult.data}
            locationCol={chartResult.location_col}
            sizeCol={chartResult.size_col}
            height={chartHeight}
          />
        );
      default:
        return null;
    }
  };

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div style={{ display: 'flex', height: '100%', gap: 0, overflow: 'hidden' }}>
      {/* ── Left sidebar ── */}
      <aside
        style={{
          width: 280,
          flexShrink: 0,
          background: '#1a1d27',
          borderRight: '1px solid #2d2f3e',
          overflowY: 'auto',
          padding: '20px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: 20,
        }}
      >
        {/* Chart type selector */}
        <div>
          <p className="section-label" style={{ marginBottom: 12 }}>Chart Type</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
            {availableChartTypes.map((ct) => (
              <button
                key={ct.id}
                onClick={() => {
                  setSelectedChart(ct.id);
                  setChartResult(null);
                }}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 4,
                  padding: '10px 4px',
                  borderRadius: 8,
                  border: selectedChart === ct.id ? '1.5px solid #6366f1' : '1.5px solid #2d2f3e',
                  background: selectedChart === ct.id ? 'rgba(99,102,241,0.12)' : '#252836',
                  color: selectedChart === ct.id ? '#a5b4fc' : '#64748b',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  fontSize: 10,
                  fontWeight: selectedChart === ct.id ? 600 : 400,
                }}
              >
                {ct.icon}
                <span>{ct.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Column controls */}
        <div>
          <p className="section-label" style={{ marginBottom: 12 }}>Configuration</p>
          {renderColumnControls()}
        </div>

        {/* Generate button */}
        <button
          className="btn-primary"
          onClick={generateChart}
          disabled={loading}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 'auto' }}
        >
          {loading ? <LoadingSpinner size="sm" /> : <Play size={16} />}
          {loading ? 'Generating…' : 'Generate Chart'}
        </button>
      </aside>

      {/* ── Main chart area ── */}
      <main style={{ flex: 1, overflow: 'auto', padding: 28, display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Chart header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ color: '#f1f5f9', fontSize: 20, fontWeight: 700, margin: 0 }}>
              {chartTitle || 'Visualization Explorer'}
            </h2>
            {chartResult && (
              <p style={{ color: '#64748b', fontSize: 13, margin: '4px 0 0' }}>
                Dataset: {activeDataset.filename ?? activeDataset.id}
              </p>
            )}
          </div>
          {chartResult && (
            <span className="badge badge-brand">
              {availableChartTypes.find((c) => c.id === selectedChart)?.label}
            </span>
          )}
        </div>

        {/* Chart container */}
        <AnimatePresence mode="wait">
          <motion.div
            key={chartTitle}
            className="chart-container"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.25 }}
            style={{ flex: 1, minHeight: 460, padding: 24 }}
          >
            {renderChart()}
          </motion.div>
        </AnimatePresence>

        {/* Info bar */}
        {chartResult && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              color: '#64748b',
              fontSize: 12,
            }}
          >
            <AlertCircle size={13} />
            <span>
              Showing data from <strong style={{ color: '#94a3b8' }}>{activeDataset.filename ?? activeDataset.id}</strong>
              {' · '}
              {allCols.length} columns · {(info?.rows ?? 0).toLocaleString()} rows
            </span>
          </motion.div>
        )}
      </main>
    </div>
  );
};

export default VisualizationPage;
