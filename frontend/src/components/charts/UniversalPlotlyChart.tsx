import React, { useEffect, useRef, useState } from 'react';
// @ts-ignore
import Plotly from 'plotly.js/dist/plotly.js';

let PlotlyLib: any = null;
try {
  PlotlyLib = (window as any).Plotly || (Plotly as any)?.default || Plotly;
} catch {
  // handled via dynamic import if needed
}

export interface UniversalPlotlyChartProps {
  chartType: string;
  chartData: any;
  figureSettings: {
    width?: number | string;
    height?: number;
    dpi?: number;
    bgColor?: string;
    theme?: string;
    fontFamily?: string;
    fontSize?: number;
    borderRadius?: number;
    padding?: number;
    margins?: { t: number; r: number; b: number; l: number };
  };
  axisControls: {
    xCol?: string;
    yCol?: string;
    yCols?: string[];
    xLabel?: string;
    yLabel?: string;
    axisRotation?: number;
    axisScale?: 'linear' | 'log' | 'symlog';
    reverseAxis?: boolean;
    tickInterval?: number;
    scientificNotation?: boolean;
    xMin?: number;
    xMax?: number;
    yMin?: number;
    yMax?: number;
  };
  legendSettings: {
    show: boolean;
    position: 'top' | 'bottom' | 'right' | 'inside';
    fontSize?: number;
    background?: string;
    border?: boolean;
  };
  gridSettings: {
    majorGrid: boolean;
    minorGrid: boolean;
    lineWidth: number;
    lineStyle: 'solid' | 'dash' | 'dot';
    color: string;
  };
  colorControls: {
    palette: string;
    primaryColor: string;
    alpha: number;
  };
  specializedSettings?: Record<string, any>;
  onExportReady?: (exportFns: {
    downloadPNG: () => void;
    downloadSVG: () => void;
    downloadHTML: () => void;
    downloadCSV: () => void;
    resetView: () => void;
  }) => void;
}

// ── Color Palettes ─────────────────────────────────────────────────────────────
const PALETTES: Record<string, string[]> = {
  precision: ['#0284c7', '#10b981', '#f59e0b', '#6366f1', '#ec4899', '#14b8a6', '#8b5cf6', '#0891b2'],
  tableau: ['#4e79a7', '#f28e2c', '#e15759', '#76b7b2', '#59a14f', '#edc949', '#af7aa1', '#ff9da7', '#9c755f', '#bab0ab'],
  stripe: ['#6366f1', '#06b6d4', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'],
  viridis: ['#440154', '#482878', '#3e4989', '#31688e', '#26828e', '#1f9e89', '#35b779', '#6ece58', '#b5de2b', '#fde725'],
  plasma: ['#0d0887', '#46039f', '#7201a8', '#9c179e', '#bd3786', '#d8576b', '#ed7953', '#fb9f3a', '#fdca26', '#f0f921'],
  turbo: ['#30123b', '#4662d8', '#35abf8', '#1ae4b6', '#72fe5e', '#c7f135', '#faba39', '#f66b19', '#ca280c', '#7a0403'],
  coolwarm: ['#3b4cc0', '#6788ee', '#9abbff', '#c9d7f0', '#edd1c2', '#f7a889', '#e26952', '#b40426'],
  spectral: ['#9e0142', '#d53e4f', '#f46d43', '#fdae61', '#fee08b', '#e6f598', '#abdda4', '#66c2a5', '#3288bd', '#5e4fa2'],
  plotly: ['#0284C7', '#10B981', '#F59E0B', '#6366F1', '#EC4899', '#14B8A6', '#8B5CF6', '#0891B2'],
  emerald: ['#047857', '#059669', '#10b981', '#34d399', '#6ee7b7', '#a7f3d0', '#064e3b', '#065f46'],
  sunset: ['#f97316', '#fb923c', '#fdba74', '#f43f5e', '#fb7185', '#fda4af', '#e11d48', '#be123c'],
  minimalist: ['#0f172a', '#334155', '#475569', '#64748b', '#94a3b8', '#cbd5e1', '#0284c7', '#0d9488']
};

// ── Color utilities ───────────────────────────────────────────────────────────
const hexToRgba = (hex: string, opacity: number) => {
  if (!hex) return `rgba(59, 130, 246, ${opacity})`;
  if (hex.startsWith('#')) {
    const cleaned = hex.replace('#', '');
    const full = cleaned.length === 3 ? cleaned.split('').map((c) => c + c).join('') : cleaned;
    const num = parseInt(full, 16);
    if (!Number.isNaN(num) && full.length === 6) {
      return `rgba(${(num >> 16) & 255}, ${(num >> 8) & 255}, ${num & 255}, ${opacity})`;
    }
  }
  if (hex.startsWith('rgba(') || hex.startsWith('rgb(')) return hex;
  return hex;
};

export const UniversalPlotlyChart: React.FC<UniversalPlotlyChartProps> = ({
  chartType,
  chartData,
  figureSettings,
  axisControls,
  legendSettings,
  gridSettings,
  colorControls,
  specializedSettings = {},
  onExportReady,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [plotlyLoaded, setPlotlyLoaded] = useState(false);

  useEffect(() => {
    if (PlotlyLib) {
      setPlotlyLoaded(true);
      return;
    }
    // @ts-ignore - plotly.js ships without type declarations
    import('plotly.js/dist/plotly.js')
      .then((mod) => {
        PlotlyLib = mod.default || mod;
        setPlotlyLoaded(true);
      })
      .catch((err) => console.error('Failed to load Plotly library', err));
  }, []);

  useEffect(() => {
    if (!plotlyLoaded || !containerRef.current || !chartData || !PlotlyLib) return;

    const isDarkMode = document.documentElement.getAttribute('data-theme') === 'dark';
    const el = containerRef.current;
    const palette = PALETTES[colorControls.palette] || PALETTES.precision;
    const primary = colorControls.primaryColor || palette[0];
    const alpha = colorControls.alpha ?? 0.85;

    // ── Build Plotly Traces based on chartType ──────────────────────────────
    const traces: any[] = [];
    const layout: any = {
      autosize: true,
      paper_bgcolor: figureSettings.bgColor || 'transparent',
      plot_bgcolor: figureSettings.bgColor || 'transparent',
      font: {
        family: figureSettings.fontFamily || 'Inter, -apple-system, sans-serif',
        size: figureSettings.fontSize || 12,
        color: isDarkMode ? '#f8fafc' : '#0f172a',
      },
      margin: figureSettings.margins || { t: 36, r: 24, b: 50, l: 54 },
      showlegend: legendSettings.show,
      legend: {
        font: { size: legendSettings.fontSize || 11, color: isDarkMode ? '#94a3b8' : '#475569' },
        bgcolor: legendSettings.background || 'transparent',
        bordercolor: legendSettings.border ? (isDarkMode ? '#334155' : '#e2e8f0') : 'transparent',
        borderwidth: legendSettings.border ? 1 : 0,
        orientation: legendSettings.position === 'top' || legendSettings.position === 'bottom' ? 'h' : 'v',
        x: legendSettings.position === 'top' ? 0.5 : legendSettings.position === 'bottom' ? 0.5 : legendSettings.position === 'inside' ? 0.85 : 1.02,
        y: legendSettings.position === 'top' ? 1.15 : legendSettings.position === 'bottom' ? -0.2 : 1,
        xanchor: legendSettings.position === 'top' || legendSettings.position === 'bottom' ? 'center' : 'left',
      },
      hovermode: 'closest',
    };

    // Grid formatting
    const gridConfig = {
      showgrid: gridSettings.majorGrid,
      gridcolor: gridSettings.color || (isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'),
      gridwidth: gridSettings.lineWidth || 1,
      griddash: gridSettings.lineStyle || 'solid',
      zeroline: true,
      zerolinecolor: isDarkMode ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)',
      tickangle: axisControls.axisRotation || 0,
      type: axisControls.axisScale === 'log' ? 'log' : 'linear',
      autorange: axisControls.reverseAxis ? 'reversed' : true,
      tickfont: { color: isDarkMode ? '#94a3b8' : '#64748b', size: 11 },
    };

    layout.xaxis = {
      ...gridConfig,
      title: {
        text: axisControls.xLabel || chartData.x_col || chartData.column || '',
        font: { color: isDarkMode ? '#e2e8f0' : '#1e293b', size: 12, weight: 600 },
      },
      range: axisControls.xMin !== undefined && axisControls.xMax !== undefined ? [axisControls.xMin, axisControls.xMax] : undefined,
    };

    layout.yaxis = {
      ...gridConfig,
      title: {
        text: axisControls.yLabel || chartData.y_col || 'Value',
        font: { color: isDarkMode ? '#e2e8f0' : '#1e293b', size: 12, weight: 600 },
      },
      range: axisControls.yMin !== undefined && axisControls.yMax !== undefined ? [axisControls.yMin, axisControls.yMax] : undefined,
    };

    const type = chartType.toLowerCase().replace(/-/g, '_');

    // ── 1. HISTOGRAM & DISTRIBUTIONS ─────────────────────────────────────────
    if (type === 'histogram') {
      const bins = chartData.bins || [];
      traces.push({
        type: 'bar',
        x: bins.map((b: any) => b.bin_center),
        y: bins.map((b: any) => b.count),
        name: 'Counts',
        marker: {
          color: primary,
          opacity: alpha,
          line: { color: primary, width: 1 },
        },
      });

      // KDE Curve Overlay
      if (chartData.kde && chartData.kde.length > 0 && specializedSettings.enable_kde !== false) {
        traces.push({
          type: 'scatter',
          mode: 'lines',
          x: chartData.kde.map((p: any) => p.x),
          y: chartData.kde.map((p: any) => p.y),
          name: 'KDE Density',
          line: { color: palette[1] || '#38bdf8', width: 2.5, shape: 'spline' },
          fill: specializedSettings.kde_fill ? 'tozeroy' : 'none',
          fillcolor: 'rgba(56, 189, 248, 0.15)',
        });
      }

      // Statistical Mean & Median Lines
      if (chartData.stats) {
        const st = chartData.stats;
        layout.shapes = [];
        if (specializedSettings.mean_line !== false) {
          layout.shapes.push({
            type: 'line',
            x0: st.mean, x1: st.mean, y0: 0, y1: 1, yref: 'paper',
            line: { color: '#f43f5e', width: 2, dash: 'dash' },
          });
        }
        if (specializedSettings.median_line) {
          layout.shapes.push({
            type: 'line',
            x0: st.median, x1: st.median, y0: 0, y1: 1, yref: 'paper',
            line: { color: '#eab308', width: 2, dash: 'dot' },
          });
        }
      }
    }
    // ── 2. SCATTER & BUBBLE ──────────────────────────────────────────────────
    else if (type === 'scatter' || type === 'scatter_plot' || type === 'bubble' || type === 'bubble_chart') {
      const pts = chartData.points || [];
      const hasHue = pts.some((p: any) => p.color !== undefined);

      if (hasHue) {
        // Group by color hue
        const groups: Record<string, any[]> = {};
        pts.forEach((p: any) => {
          const k = String(p.color);
          if (!groups[k]) groups[k] = [];
          groups[k].push(p);
        });

        Object.keys(groups).forEach((k, idx) => {
          traces.push({
            type: 'scatter',
            mode: 'markers',
            name: k,
            x: groups[k].map((p) => p.x),
            y: groups[k].map((p) => p.y),
            marker: {
              color: palette[idx % palette.length],
              size: groups[k].map((p) => (p.size ? Math.max(6, Math.min(p.size, 35)) : (specializedSettings.marker_size || 8))),
              symbol: specializedSettings.marker_style || 'circle',
              opacity: alpha,
              line: { color: 'rgba(255,255,255,0.2)', width: 0.5 },
            },
          });
        });
      } else {
        traces.push({
          type: 'scatter',
          mode: 'markers',
          name: 'Observations',
          x: pts.map((p: any) => p.x),
          y: pts.map((p: any) => p.y),
          marker: {
            color: primary,
            size: pts.map((p: any) => (p.size ? Math.max(6, Math.min(p.size, 35)) : (specializedSettings.marker_size || 8))),
            symbol: specializedSettings.marker_style || 'circle',
            opacity: alpha,
            line: { color: 'rgba(255,255,255,0.2)', width: 0.5 },
          },
        });
      }

      // Regressions / Trendlines
      if (chartData.trendlines?.ols && specializedSettings.regression_line !== false) {
        const ols = chartData.trendlines.ols;
        traces.push({
          type: 'scatter',
          mode: 'lines',
          name: ols.equation || 'OLS Trendline',
          x: ols.points.map((p: any) => p.x),
          y: ols.points.map((p: any) => p.y),
          line: { color: '#f43f5e', width: 2.5, dash: 'solid' },
        });
      }
      if (chartData.trendlines?.polynomial && specializedSettings.poly_fit) {
        const poly = chartData.trendlines.polynomial;
        traces.push({
          type: 'scatter',
          mode: 'lines',
          name: 'Polynomial Fit (Deg 2)',
          x: poly.points.map((p: any) => p.x),
          y: poly.points.map((p: any) => p.y),
          line: { color: '#eab308', width: 2.5, dash: 'dot' },
        });
      }
    }
    // ── 3. LINE & AREA ───────────────────────────────────────────────────────
    else if (type === 'line' || type === 'line_plot' || type === 'area' || type === 'area_plot') {
      const series = chartData.series || [];
      const isArea = type.includes('area') || specializedSettings.fill_between;

      series.forEach((s: any, idx: number) => {
        traces.push({
          type: 'scatter',
          mode: specializedSettings.markers ? 'lines+markers' : 'lines',
          name: s.name,
          x: s.points.map((p: any) => p.x),
          y: s.points.map((p: any) => p.y),
          line: {
            color: palette[idx % palette.length],
            width: specializedSettings.line_width || 2.5,
            dash: specializedSettings.line_style || 'solid',
            shape: specializedSettings.step_plot ? 'hv' : (specializedSettings.smoothing ? 'spline' : 'linear'),
          },
          fill: isArea ? (idx === 0 ? 'tozeroy' : 'tonexty') : 'none',
          fillcolor: isArea ? `${palette[idx % palette.length]}33` : undefined,
        });

        // Moving average overlay
        if (s.moving_avg) {
          traces.push({
            type: 'scatter',
            mode: 'lines',
            name: `${s.name} (MA)`,
            x: s.moving_avg.map((p: any) => p.x),
            y: s.moving_avg.map((p: any) => p.y),
            line: { color: '#fbbf24', width: 1.8, dash: 'dash' },
          });
        }
      });
    }
    // ── 4. BAR & HORIZONTAL BAR & COUNT ──────────────────────────────────────
    else if (type === 'bar' || type === 'bar_plot' || type === 'horizontal_bar' || type === 'count' || type === 'count_plot') {
      const bars = chartData.bars || [];
      const isHoriz = type === 'horizontal_bar' || chartData.orientation === 'horizontal';

      traces.push({
        type: 'bar',
        orientation: isHoriz ? 'h' : 'v',
        x: isHoriz ? bars.map((b: any) => b.value) : bars.map((b: any) => b.label),
        y: isHoriz ? bars.map((b: any) => b.label) : bars.map((b: any) => b.value),
        marker: {
          color: bars.map((_: any, i: number) => palette[i % palette.length]),
          opacity: alpha,
        },
      });
    }
    // ── 5. PIE & DONUT ───────────────────────────────────────────────────────
    else if (type === 'pie' || type === 'pie_chart' || type === 'donut' || type === 'donut_chart') {
      const slices = chartData.slices || [];
      const isDonut = type.includes('donut') || chartData.donut;

      traces.push({
        type: 'pie',
        labels: slices.map((s: any) => s.label),
        values: slices.map((s: any) => s.value),
        hole: isDonut ? 0.45 : 0,
        marker: {
          colors: palette,
        },
        textinfo: 'label+percent',
        hoverinfo: 'label+value+percent',
      });
    }
    // ── 6. BOX PLOT ──────────────────────────────────────────────────────────
    else if (type === 'box' || type === 'box_plot') {
      const boxes = chartData.boxes || [];
      boxes.forEach((b: any, idx: number) => {
        traces.push({
          type: 'box',
          name: b.group || `Group ${idx + 1}`,
          q1: [b.q1],
          median: [b.median],
          q3: [b.q3],
          lowerfence: [b.low_whisker ?? b.min],
          upperfence: [b.high_whisker ?? b.max],
          mean: specializedSettings.mean_marker ? [b.mean] : undefined,
          notched: specializedSettings.notch ?? false,
          notchspan: b.notch_upper && b.notch_lower ? [b.notch_upper - b.notch_lower] : undefined,
          marker: { color: palette[idx % palette.length] },
          boxpoints: specializedSettings.outliers !== false ? 'outliers' : false,
        });
      });
    }
    // ── 7. HEATMAP & CORRELATION MATRIX ──────────────────────────────────────
    else if (type === 'heatmap' || type === 'correlation_heatmap' || type === 'cluster_map') {
      const cols = chartData.columns || [];
      const matrix = chartData.matrix || [];
      const zValues = cols.map((r: string) => cols.map((c: string) => {
        const item = matrix.find((m: any) => m.x === c && m.y === r);
        return item ? item.value : 0;
      }));

      traces.push({
        type: 'heatmap',
        x: cols,
        y: cols,
        z: zValues,
        colorscale: colorControls.palette === 'coolwarm' ? 'RdBu' : (colorControls.palette === 'viridis' ? 'Viridis' : 'Plasma'),
        reversescale: colorControls.palette === 'coolwarm',
        zmin: -1,
        zmax: 1,
        showscale: true,
      });

      if (specializedSettings.annotations !== false) {
        layout.annotations = [];
        cols.forEach((r: string, i: number) => {
          cols.forEach((c: string, j: number) => {
            const v = zValues[i][j];
            if (v !== null && v !== undefined) {
              layout.annotations.push({
                x: c,
                y: r,
                text: typeof v === 'number' ? v.toFixed(2) : String(v),
                font: { color: Math.abs(v) > 0.5 ? '#ffffff' : '#94a3b8', size: 10 },
                showarrow: false,
              });
            }
          });
        });
      }
    }
    // ── 8. TIME SERIES & FINANCIAL (CANDLESTICK / OHLC) ───────────────────────
    else if (type === 'timeseries' || type === 'time_series') {
      const pts = chartData.points || [];
      traces.push({
        type: 'scatter',
        mode: 'lines',
        name: chartData.value_col || 'Value',
        x: pts.map((p: any) => p.date),
        y: pts.map((p: any) => p.value),
        line: { color: primary, width: 2 },
      });
      if (pts.some((p: any) => p.rolling_avg !== undefined)) {
        traces.push({
          type: 'scatter',
          mode: 'lines',
          name: '7-Day Rolling Avg',
          x: pts.map((p: any) => p.date),
          y: pts.map((p: any) => p.rolling_avg),
          line: { color: '#f59e0b', width: 2, dash: 'dash' },
        });
      }
    } else if (type === 'candlestick' || type === 'ohlc') {
      const candles = chartData.candles || [];
      traces.push({
        type: type === 'ohlc' ? 'ohlc' : 'candlestick',
        x: candles.map((c: any) => c.date),
        open: candles.map((c: any) => c.open),
        high: candles.map((c: any) => c.high),
        low: candles.map((c: any) => c.low),
        close: candles.map((c: any) => c.close),
        increasing: { line: { color: '#10b981' } },
        decreasing: { line: { color: '#ef4444' } },
      });
    }
    // ── 9. TREEMAP & SUNBURST ────────────────────────────────────────────────
    else if (type === 'treemap' || type === 'sunburst') {
      const nodes = chartData.nodes || [];
      traces.push({
        type: type,
        labels: nodes.map((n: any) => n.name),
        parents: nodes.map(() => ''),
        values: nodes.map((n: any) => n.value),
        marker: { colorscale: 'Viridis' },
      });
    }
    // ── 10. 3D SCATTER & SURFACE ─────────────────────────────────────────────
    else if (type === 'scatter_3d' || type === '3d_scatter') {
      const pts = chartData.points || [];
      const hasHue = pts.some((p: any) => p.color !== undefined);
      if (hasHue) {
        const groups: Record<string, any[]> = {};
        pts.forEach((p: any) => {
          const k = String(p.color);
          if (!groups[k]) groups[k] = [];
          groups[k].push(p);
        });
        Object.keys(groups).forEach((k, idx) => {
          traces.push({
            type: 'scatter3d',
            mode: 'markers',
            name: k,
            x: groups[k].map((p: any) => p.x),
            y: groups[k].map((p: any) => p.y),
            z: groups[k].map((p: any) => p.z),
            marker: {
              color: palette[idx % palette.length],
              size: 4,
              opacity: alpha,
            },
          });
        });
      } else {
        traces.push({
          type: 'scatter3d',
          mode: 'markers',
          x: pts.map((p: any) => p.x),
          y: pts.map((p: any) => p.y),
          z: pts.map((p: any) => p.z),
          marker: {
            color: primary,
            size: 4,
            opacity: alpha,
          },
        });
      }
      layout.scene = {
        xaxis: { title: chartData.x_col || 'X', color: isDarkMode ? '#94a3b8' : '#475569' },
        yaxis: { title: chartData.y_col || 'Y', color: isDarkMode ? '#94a3b8' : '#475569' },
        zaxis: { title: chartData.z_col || 'Z', color: isDarkMode ? '#94a3b8' : '#475569' },
      };
    } else if (type === 'surface_3d' || type === '3d_surface' || type === 'contour') {
      traces.push({
        type: type === 'contour' ? 'contour' : 'surface',
        x: chartData.x,
        y: chartData.y,
        z: chartData.z,
        colorscale: 'Plasma',
      });
    }
    // ── 11. RADAR / POLAR ────────────────────────────────────────────────────
    else if (type === 'radar' || type === 'radar_chart' || type === 'polar') {
      const series = chartData.series || [];
      series.forEach((s: any, idx: number) => {
        const metrics = s.metrics || [];
        traces.push({
          type: 'scatterpolar',
          r: metrics.map((m: any) => m.value),
          theta: metrics.map((m: any) => m.axis),
          fill: 'toself',
          name: s.name,
          marker: { color: palette[idx % palette.length] },
        });
      });
      layout.polar = {
        radialaxis: { visible: true, color: '#94a3b8' },
        angularaxis: { color: '#94a3b8' },
        bgcolor: 'transparent',
      };
    }
    // ── 12. ACF / PACF AUTOCORRELATION ───────────────────────────────────────
    else if (type === 'autocorrelation' || type === 'acf' || type === 'pacf') {
      const lags = chartData.lags || [];
      const ci = chartData.confidence_bound || 0.1;
      traces.push({
        type: 'bar',
        x: lags.map((l: any) => l.lag),
        y: lags.map((l: any) => l.autocorr),
        name: 'Autocorrelation',
        marker: { color: primary },
      });
      layout.shapes = [
        { type: 'line', x0: 0, x1: lags.length, y0: ci, y1: ci, line: { color: '#38bdf8', dash: 'dash' } },
        { type: 'line', x0: 0, x1: lags.length, y0: -ci, y1: -ci, line: { color: '#38bdf8', dash: 'dash' } },
      ];
    }
    // ── 13. EXTENDED DISTRIBUTION FORMATS (KDE, RUG, ECDF, VIOLIN) ──────────────
    else if (type === 'kde' || type === 'kde_plot') {
      const pts = chartData.data || [];
      traces.push({
        type: 'scatter',
        mode: 'lines',
        name: 'KDE Density',
        x: pts.map((p: any) => p.x),
        y: pts.map((p: any) => p.density ?? p.y),
        line: { color: palette[1] || '#38bdf8', width: 2.5, shape: 'spline' },
        fill: specializedSettings.kde_fill ? 'tozeroy' : 'none',
        fillcolor: hexToRgba(palette[1] || '#38bdf8', 0.15),
      });
    } else if (type === 'rug' || type === 'rug_plot') {
      const vals = chartData.data || chartData.points || [];
      traces.push({
        type: 'scatter',
        mode: 'markers',
        name: 'Rug',
        x: vals.map((v: any) => (typeof v === 'number' ? v : Number(v.x ?? v.value ?? 0))),
        y: vals.map(() => 0),
        marker: { color: primary, size: 6, opacity: alpha, symbol: 'line-ns' },
        showlegend: false,
      });
    } else if (type === 'ecdf' || type === 'ecdf_plot') {
      const pts = chartData.data || [];
      traces.push({
        type: 'scatter',
        mode: 'lines+markers',
        name: 'ECDF',
        x: pts.map((p: any) => p.x),
        y: pts.map((p: any) => p.probability),
        line: { color: primary, width: 2, shape: 'hv' },
        marker: { size: 4, color: primary },
      });
    } else if (type === 'violin' || type === 'violin_plot') {
      const violins = chartData.violins || [];
      violins.forEach((v: any, idx: number) => {
        const density = v.density || [];
        const peak = density.reduce((acc: number, d: any) => Math.max(acc, Math.abs(d.density)), 0.00001);
        const symm = density.map((d: any) => ({ m: -d.density / peak * 0.4, p: d.density / peak * 0.4 }));
        const xs: number[] = [];
        const ys: number[] = [];
        density.forEach((d: any, i: number) => { xs.push(idx + symm[i].m); ys.push(d.val); });
        density.slice().reverse().forEach((d: any, i: number) => {
          const orig = density.length - 1 - i;
          xs.push(idx + symm[orig].p);
          ys.push(d.val);
        });
        traces.push({
          type: 'scatter',
          mode: 'lines',
          name: v.group || `Group ${idx + 1}`,
          x: xs,
          y: ys,
          line: { color: palette[idx % palette.length], width: 1.5 },
          fill: 'toself',
          fillcolor: hexToRgba(palette[idx % palette.length], 0.15),
        });
      });
    }
    else if (type === 'strip' || type === 'strip_plot' || type === 'swarm' || type === 'swarm_plot') {
      const pts = chartData.data || [];
      const groups: Record<string, any[]> = {};
      pts.forEach((p: any) => {
        const k = String(p.x);
        if (!groups[k]) groups[k] = [];
        groups[k].push(p);
      });
      Object.keys(groups).forEach((k, idx) => {
        traces.push({
          type: 'scatter',
          mode: 'markers',
          name: k,
          x: groups[k].map((p: any) => idx + (p.jitter ?? 0)),
          y: groups[k].map((p: any) => p.y),
          marker: { color: palette[idx % palette.length], size: 6, opacity: alpha },
        });
      });
      layout.xaxis = {
        ...layout.xaxis,
        tickmode: 'array',
        tickvals: Object.keys(groups).map((_, i: number) => i),
        ticktext: Object.keys(groups),
      };
    } else if (type === 'ridgeline' || type === 'ridgeline_plot') {
      const ridges = chartData.ridges || [];
      ridges.forEach((r: any, idx: number) => {
        const density = r.density || [];
        const offset = idx * 0.8;
        traces.push({
          type: 'scatter',
          mode: 'lines',
          name: r.category,
          x: density.map((p: any) => p.x),
          y: density.map((p: any) => p.y * 0.6 + offset),
          line: { color: palette[idx % palette.length], width: 1.5 },
          fill: specializedSettings.kde_fill !== false ? 'tonexty' : 'none',
          fillcolor: hexToRgba(palette[idx % palette.length], 0.18),
        });
      });
    } else if (type === 'waterfall' || type === 'waterfall_plot') {
      const items = chartData.items || [];
      const baseline = items.map((it: any) => it.start ?? 0);
      const heights = items.map((it: any) => (it.end !== undefined ? it.end - (it.start ?? 0) : it.value));
      const colors = items.map((it: any, i: number) => {
        if (i === 0) return '#38bdf8';
        const net = it.end !== undefined ? it.end - (it.start ?? 0) : it.value;
        return net >= 0 ? '#10b981' : '#ef4444';
      });
      traces.push({
        type: 'bar',
        x: items.map((it: any) => it.label),
        base: baseline,
        y: heights,
        marker: { color: colors, opacity: alpha },
        name: 'Value',
      });
    } else if (type === 'funnel' || type === 'funnel_plot') {
      const stages = chartData.stages || [];
      const sc = specializedSettings.color?.length ? specializedSettings.color : palette;
      traces.push({
        type: 'funnel',
        x: stages.map((s: any) => s.value),
        y: stages.map((s: any) => s.stage),
        textinfo: 'value+percent initial',
        marker: { color: sc },
      });
    }
    else if (type === 'joint' || type === 'joint_plot') {
      const sc = chartData.scatter?.points || [];
      traces.push({
        type: 'scatter',
        mode: 'markers',
        name: 'Joint',
        x: sc.map((p: any) => p.x),
        y: sc.map((p: any) => p.y),
        marker: { color: primary, size: 6, opacity: alpha },
      });
      if (chartData.x_marginal?.bins) {
        traces.push({
          type: 'bar',
          x: (chartData.x_marginal.bins || []).map((b: any) => b.bin_center),
          y: (chartData.x_marginal.bins || []).map((b: any) => b.count),
          xaxis: 'x2',
          yaxis: 'y2',
          name: 'X Marginal',
          marker: { color: palette[0] },
        });
      }
      if (chartData.y_marginal?.bins) {
        traces.push({
          type: 'bar',
          x: (chartData.y_marginal.bins || []).map((b: any) => b.count),
          y: (chartData.y_marginal.bins || []).map((b: any) => b.bin_center),
          xaxis: 'x3',
          yaxis: 'y3',
          name: 'Y Marginal',
          orientation: 'h',
          marker: { color: palette[1] },
        });
      }
      layout.grid = {
        rows: 2,
        columns: 2,
        pattern: 'independent',
        roworder: 'top to bottom',
      };
    } else if (type === 'pair' || type === 'pair_plot') {
      const cols = chartData.columns || [];
      const rowData = chartData.matrix || [];
      rowData.forEach((row: any, i: number) => {
        row.forEach((cell: any, j: number) => {
          const name = i <= j ? `xy${i + 1}_${j + 1}` : `xy${j + 1}_${i + 1}`;
          if (cell.type === 'hist') {
            traces.push({
              type: 'bar',
              x: (cell.data?.bins || []).map((b: any) => b.bin_center),
              y: (cell.data?.bins || []).map((b: any) => b.count),
              xaxis: name,
              yaxis: name,
              marker: { color: primary, opacity: alpha },
            });
          } else {
            traces.push({
              type: 'scatter',
              mode: 'markers',
              x: (cell.points || []).map((p: any) => p.x),
              y: (cell.points || []).map((p: any) => p.y),
              xaxis: name,
              yaxis: name,
              marker: { color: primary, size: 4, opacity: alpha },
            });
          }
        });
      });
      layout.grid = {
        rows: cols.length,
        columns: cols.length,
        pattern: 'independent',
      };
      layout.xaxis = { title: { text: cols[0] || '', font: { size: 10 } } };
      layout.yaxis = { title: { text: cols[0] || '', font: { size: 10 } } };
    } else if (type === 'hexbin' || type === 'hexbin_plot' || type === 'density' || type === 'density_plot') {
      traces.push({
        type: 'histogram2dcontour',
        x: (chartData.bins || []).map((b: any) => b.x),
        y: (chartData.bins || []).map((b: any) => b.y),
        name: '2D Density',
        colorscale: colorControls.palette === 'coolwarm' ? 'RdBu' : 'Viridis',
        showscale: true,
      });
    }
    else if (type === 'sankey' || type === 'sankey_diagram') {
      traces.push({
        type: 'sankey',
        node: {
          label: (chartData.nodes || []).map((n: any) => n.name),
          color: palette,
          pad: 12,
          thickness: 16,
        },
        link: {
          source: (chartData.links || []).map((l: any) => l.source),
          target: (chartData.links || []).map((l: any) => l.target),
          value: (chartData.links || []).map((l: any) => l.value),
        },
        orientation: 'v',
      });
    } else if (type === 'chord' || type === 'chord_diagram' || type === 'network' || type === 'network_graph') {
      const hasPositions = (chartData.nodes || []).some((n: any) => n.x !== undefined && n.y !== undefined);
      if (!hasPositions) {
        // Flow-style fallback (sankey-like) when no explicit coordinates exist
        traces.push({
          type: 'sankey',
          node: {
            label: (chartData.nodes || []).map((n: any) => n.name),
            color: palette,
            pad: 12,
            thickness: 16,
          },
          link: {
            source: (chartData.links || []).map((l: any) => l.source),
            target: (chartData.links || []).map((l: any) => l.target),
            value: (chartData.links || []).map((l: any) => l.value),
          },
          orientation: 'h',
        });
      } else {
        // Network layout using scatter points + line segments
        const nodePos = new Map<string, any>((chartData.nodes || []).map((n: any) => [String(n.id ?? n.name), n]));
        const linkPts: { x: number; y: number }[] = [];
        (chartData.links || []).forEach((l: any) => {
          const s: any = nodePos.get(l.source) || nodePos.get(String(l.source));
          const t: any = nodePos.get(l.target) || nodePos.get(String(l.target));
          if (s && t) {
            linkPts.push({ x: s.x, y: s.y }, { x: t.x, y: t.y });
          }
        });
        traces.push({
          type: 'scatter',
          mode: 'lines',
          name: 'Edges',
          x: linkPts.map((p) => p.x),
          y: linkPts.map((p) => p.y),
          line: { color: isDarkMode ? '#64748b' : '#94a3b8', width: 1.2, shape: 'spline' },
          hoverinfo: 'skip',
        });
        traces.push({
          type: 'scatter',
          mode: 'markers+text',
          name: 'Nodes',
          x: (chartData.nodes || []).map((n: any) => n.x),
          y: (chartData.nodes || []).map((n: any) => n.y),
          text: (chartData.nodes || []).map((n: any) => n.name),
          textposition: 'top center',
          marker: { color: palette, size: 10, opacity: alpha },
        });
        layout.xaxis = { showgrid: false, zeroline: false, visible: false };
        layout.yaxis = { showgrid: false, zeroline: false, visible: false };
      }
    } else if (type === 'wordcloud' || type === 'word_cloud') {
      const tags = chartData.tags || [];
      traces.push({
        type: 'bar',
        x: tags.map((t: any) => t.text),
        y: tags.map((t: any) => t.value),
        name: 'Word Frequencies',
        marker: {
          color: tags.map((_: any, i: number) => palette[i % palette.length]),
          opacity: alpha,
        },
      });
    }
    else if (type === 'geographic_map' || type === 'geo_map' || type === 'choropleth_map' || type === 'choropleth') {
      const pts = chartData.points || [];
      const isChoro = type.startsWith('choropleth');
      if (isChoro) {
        traces.push({
          type: 'choropleth',
          locationmode: 'country names',
          locations: pts.map((p: any) => p.location),
          z: pts.map((p: any) => p.value),
          text: pts.map((p: any) => `${p.location}: ${p.value}`),
          colorscale: colorControls.palette === 'coolwarm' ? 'RdBu' : 'Viridis',
          reversescale: colorControls.palette === 'coolwarm',
          colorbar: { title: { text: chartData.size_col || 'Value' } },
        });
      } else {
        traces.push({
          type: 'scattergeo',
          locationmode: 'country names',
          locations: pts.map((p: any) => p.location),
          text: pts.map((p: any) => `${p.location}: ${p.value}`),
          mode: 'markers+text',
          marker: {
            size: pts.map((p: any) => Math.max(6, Math.min(30, Math.sqrt(Math.abs(Number(p.value) || 0)) * 2))),
            color: primary,
            opacity: alpha,
            line: { color: '#ffffff', width: 0.5 },
          },
        });
      }
      layout.geo = {
        bgcolor: 'transparent',
        framecolor: isDarkMode ? '#334155' : '#e2e8f0',
        showland: true,
        landcolor: isDarkMode ? '#1e293b' : '#f1f5f9',
        coastlinecolor: isDarkMode ? '#334155' : '#94a3b8',
        showocean: true,
        oceancolor: isDarkMode ? '#0f172a' : '#e0f2fe',
        showcountries: true,
      };
    } else if (type === 'parallel_coordinates' || type === 'parallel_coord') {
      const dims = (chartData.dimensions || []).map((d: any) => ({
        label: d.name,
        values: (chartData.records || []).map((r: any) => r[d.name]),
        range: [d.min, d.max],
      }));
      traces.push({
        type: 'parcoords',
        line: {
          color: (chartData.records || []).map((_: any, i: number) => i),
          colorscale: colorControls.palette === 'coolwarm' ? 'RdBu' : 'Viridis',
        },
        dimensions: dims,
      });
    } else if (type === 'lag' || type === 'lag_plot') {
      const pts = chartData.points || [];
      traces.push({
        type: 'scatter',
        mode: 'markers',
        name: 'Lag',
        x: pts.map((p: any) => p.y_lag),
        y: pts.map((p: any) => p.y_t),
        marker: { color: primary, size: 5, opacity: alpha },
      });
      const xs = pts.map((p: any) => p.y_lag);
      if (xs.length) {
        const minX = Math.min(...xs);
        const maxX = Math.max(...xs);
        traces.push({
          type: 'scatter',
          mode: 'lines',
          name: 'y = x',
          x: [minX, maxX],
          y: [minX, maxX],
          line: { color: isDarkMode ? '#64748b' : '#94a3b8', width: 1.5, dash: 'dash' },
        });
      }
    }
    // ── 13. FALLBACK FOR OTHER TYPES ─────────────────────────────────────────
    else {
      // General fallback using available data structures
      const dataArr = chartData.data || chartData.points || chartData.bars || [];
      traces.push({
        type: 'bar',
        x: dataArr.map((d: any, i: number) => d.x || d.label || d.location || `Item ${i}`),
        y: dataArr.map((d: any) => d.y || d.value || d.count || d.size || 0),
        marker: { color: primary },
      });
    }

    const config = {
      responsive: true,
      displayModeBar: true,
      displaylogo: false,
      modeBarButtonsToRemove: ['sendDataToCloud'],
    };

    PlotlyLib.newPlot(el, traces, layout, config);

    // Provide high-resolution export functions
    if (onExportReady) {
      onExportReady({
        downloadPNG: () => {
          PlotlyLib.downloadImage(el, {
            format: 'png',
            width: figureSettings.width ? Number(figureSettings.width) : 1280,
            height: figureSettings.height ? Number(figureSettings.height) : 720,
            filename: `${chartType}_export_${Date.now()}`,
          });
        },
        downloadSVG: () => {
          PlotlyLib.downloadImage(el, {
            format: 'svg',
            width: 1280,
            height: 720,
            filename: `${chartType}_vector_${Date.now()}`,
          });
        },
        downloadHTML: () => {
          const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <title>${chartType.toUpperCase()} - Infinitics AI</title>
  <script src="https://cdn.plot.ly/plotly-2.35.2.min.js"></script>
</head>
<body style="background: #0f172a; margin: 0; padding: 20px; font-family: Inter, sans-serif; display: flex; justify-content: center; align-items: center; min-height: 90vh;">
  <div id="chart-root" style="width: 90vw; height: 80vh;"></div>
  <script>
    Plotly.newPlot('chart-root', ${JSON.stringify(traces)}, ${JSON.stringify(layout)}, { responsive: true });
  </script>
</body>
</html>`;
          const blob = new Blob([htmlContent], { type: 'text/html' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${chartType}_interactive_${Date.now()}.html`;
          a.click();
          URL.revokeObjectURL(url);
        },
        downloadCSV: () => {
          const pts = chartData.points || chartData.bars || chartData.bins || chartData.slices || [];
          if (pts.length === 0) return;
          const headers = Object.keys(pts[0]);
          const csvRows = [headers.join(',')];
          pts.forEach((row: any) => {
            csvRows.push(headers.map((h) => JSON.stringify(row[h] ?? '')).join(','));
          });
          const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${chartType}_data_${Date.now()}.csv`;
          a.click();
          URL.revokeObjectURL(url);
        },
        resetView: () => {
          PlotlyLib.relayout(el, {
            'xaxis.autorange': true,
            'yaxis.autorange': true,
          });
        },
      });
    }

    const handleResize = () => {
      PlotlyLib.Plots.resize(el);
    };
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [
    plotlyLoaded,
    chartType,
    chartData,
    figureSettings,
    axisControls,
    legendSettings,
    gridSettings,
    colorControls,
    specializedSettings,
  ]);

  return (
    <div
      style={{
        width: figureSettings.width || '100%',
        height: figureSettings.height || 520,
        position: 'relative',
        borderRadius: figureSettings.borderRadius || 12,
        overflow: 'hidden',
      }}
    >
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
    </div>
  );
};

export default UniversalPlotlyChart;
