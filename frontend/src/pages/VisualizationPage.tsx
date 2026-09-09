import React, { useState, useEffect, useCallback, useRef } from 'react';
import toast from 'react-hot-toast';
import {
  Settings2,
  Download,
  Bookmark,
  Sparkles,
  RefreshCw,
  Maximize2,
  RotateCcw,
  Undo2,
  Redo2,
  Copy,
  Palette,
  Sliders,
  FileCode,
  FileSpreadsheet,
  Grid,
  CheckCircle2,
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { useIsMobile } from '../hooks/useMediaQuery';
import {
  generateVisualization,
  getVisualizationRecommendations,
  getVisualizationInsights,
} from '../services/api';
import UniversalPlotlyChart from '../components/charts/UniversalPlotlyChart';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import EmptyState from '../components/ui/EmptyState';

// ── 47 Supported Visualizations Catalog ────────────────────────────────────────

export interface VisualizationCatalogItem {
  id: string;
  name: string;
  category: 'Distributions' | 'Trends & Comparisons' | 'Relationships' | 'Part-to-Whole' | 'Multidimensional' | '3D & Scientific' | 'Time Series';
  description: string;
  icon: string;
  recommendedTypes: string[];
}

const VISUALIZATION_CATALOG: VisualizationCatalogItem[] = [
  // 1. Distributions (9)
  { id: 'histogram', name: 'Histogram', category: 'Distributions', description: 'Binned frequency distribution with optional KDE and mean/median lines', icon: '📊', recommendedTypes: ['numeric'] },
  { id: 'kde', name: 'KDE Plot', category: 'Distributions', description: 'Continuous smooth kernel density estimation curve', icon: '📈', recommendedTypes: ['numeric'] },
  { id: 'rug', name: 'Rug Plot', category: 'Distributions', description: 'Marginal tick marks showing individual data point locations', icon: '📏', recommendedTypes: ['numeric'] },
  { id: 'ecdf', name: 'ECDF Plot', category: 'Distributions', description: 'Empirical cumulative distribution function without binning artifacts', icon: '📈', recommendedTypes: ['numeric'] },
  { id: 'box', name: 'Box Plot', category: 'Distributions', description: 'Five-number summary showing quartiles, median, notch, and outliers', icon: '📦', recommendedTypes: ['numeric', 'categorical'] },
  { id: 'violin', name: 'Violin Plot', category: 'Distributions', description: 'Synergistic combination of box plot summary and KDE density shapes', icon: '🎻', recommendedTypes: ['numeric', 'categorical'] },
  { id: 'strip', name: 'Strip Plot', category: 'Distributions', description: 'Scatter plot of categorical observations with jitter dispersion', icon: '✨', recommendedTypes: ['numeric', 'categorical'] },
  { id: 'swarm', name: 'Swarm Plot', category: 'Distributions', description: 'Non-overlapping categorical point dispersion', icon: '🐝', recommendedTypes: ['numeric', 'categorical'] },
  { id: 'ridgeline', name: 'Ridgeline Plot', category: 'Distributions', description: 'Partially overlapping joyplot density curves across categories', icon: '🏔️', recommendedTypes: ['numeric', 'categorical'] },

  // 2. Trends & Comparisons (8)
  { id: 'line', name: 'Line Plot', category: 'Trends & Comparisons', description: 'Continuous connected data points showing trends over sequence or time', icon: '📉', recommendedTypes: ['numeric', 'datetime'] },
  { id: 'area', name: 'Area Plot', category: 'Trends & Comparisons', description: 'Magnitude and volume progression with shaded baseline area', icon: '⛰️', recommendedTypes: ['numeric', 'datetime'] },
  { id: 'bar', name: 'Bar Plot', category: 'Trends & Comparisons', description: 'Vertical column comparisons across categories', icon: '📊', recommendedTypes: ['categorical', 'numeric'] },
  { id: 'horizontal_bar', name: 'Horizontal Bar Plot', category: 'Trends & Comparisons', description: 'Horizontal layout ideal for long category names', icon: '📶', recommendedTypes: ['categorical', 'numeric'] },
  { id: 'count', name: 'Count Plot', category: 'Trends & Comparisons', description: 'Categorical occurrence and frequency bar breakdown', icon: '🔢', recommendedTypes: ['categorical'] },
  { id: 'waterfall', name: 'Waterfall Chart', category: 'Trends & Comparisons', description: 'Cumulative sequential positive and negative step contributions', icon: '🌊', recommendedTypes: ['categorical', 'numeric'] },
  { id: 'funnel', name: 'Funnel Chart', category: 'Trends & Comparisons', description: 'Stage-by-stage pipeline conversion and attrition rates', icon: '🌪️', recommendedTypes: ['categorical', 'numeric'] },

  // 3. Relationships & Correlations (9)
  { id: 'scatter', name: 'Scatter Plot', category: 'Relationships', description: 'Bivariate relationship with regression lines and marker styling', icon: '🎯', recommendedTypes: ['numeric', 'numeric'] },
  { id: 'bubble', name: 'Bubble Chart', category: 'Relationships', description: 'Trivariate relationship encoding 3rd metric as marker diameter', icon: '🫧', recommendedTypes: ['numeric', 'numeric', 'numeric'] },
  { id: 'joint', name: 'Joint Plot', category: 'Relationships', description: 'Bivariate scatter plot paired with marginal distribution histograms', icon: '🔗', recommendedTypes: ['numeric', 'numeric'] },
  { id: 'pair', name: 'Pair Plot', category: 'Relationships', description: 'NxN pairwise scatter matrix exploring all numeric feature pairs', icon: '🔲', recommendedTypes: ['numeric'] },
  { id: 'heatmap', name: 'Heatmap', category: 'Relationships', description: '2D matrix grid with continuous color intensity mappings', icon: '🗺️', recommendedTypes: ['numeric'] },
  { id: 'correlation_heatmap', name: 'Correlation Heatmap', category: 'Relationships', description: 'Pairwise Pearson, Spearman, or Kendall correlation matrix', icon: '🔥', recommendedTypes: ['numeric'] },
  { id: 'cluster_map', name: 'Cluster Map', category: 'Relationships', description: 'Hierarchically clustered correlation matrix with dendrogram grouping', icon: '🌳', recommendedTypes: ['numeric'] },
  { id: 'hexbin', name: 'Hexbin Plot', category: 'Relationships', description: 'Hexagonal binning density optimal for massive overlapping scatter data', icon: '🛑', recommendedTypes: ['numeric', 'numeric'] },
  { id: 'density', name: '2D Density Plot', category: 'Relationships', description: 'Continuous bivariate contour density estimation', icon: '🌪️', recommendedTypes: ['numeric', 'numeric'] },

  // 4. Part to Whole & Hierarchical (6)
  { id: 'pie', name: 'Pie Chart', category: 'Part-to-Whole', description: 'Proportional circular slice composition', icon: '🥧', recommendedTypes: ['categorical'] },
  { id: 'donut', name: 'Donut Chart', category: 'Part-to-Whole', description: 'Hollow circular composition with high visual clarity', icon: '🍩', recommendedTypes: ['categorical'] },
  { id: 'treemap', name: 'Treemap', category: 'Part-to-Whole', description: 'Nested rectangular tiles displaying hierarchical metric proportions', icon: '🪟', recommendedTypes: ['categorical', 'numeric'] },
  { id: 'sunburst', name: 'Sunburst Chart', category: 'Part-to-Whole', description: 'Concentric ring hierarchical multi-level proportions', icon: '☀️', recommendedTypes: ['categorical', 'numeric'] },
  { id: 'sankey', name: 'Sankey Diagram', category: 'Part-to-Whole', description: 'Flow diagram showing directional quantity movement between states', icon: '🔀', recommendedTypes: ['categorical', 'categorical'] },
  { id: 'chord', name: 'Chord Diagram', category: 'Part-to-Whole', description: 'Circular inter-relationship connection flows', icon: '⭕', recommendedTypes: ['categorical', 'categorical'] },

  // 5. Geographic & Multidimensional (7)
  { id: 'geographic_map', name: 'Geographic Map', category: 'Multidimensional', description: 'Geographic coordinate / country bubble distribution', icon: '🌍', recommendedTypes: ['geographic', 'numeric'] },
  { id: 'choropleth_map', name: 'Choropleth Map', category: 'Multidimensional', description: 'Regional map colored proportionally to aggregate statistics', icon: '🗺️', recommendedTypes: ['geographic', 'numeric'] },
  { id: 'parallel_coordinates', name: 'Parallel Coordinates', category: 'Multidimensional', description: 'Multi-axis parallel projection revealing high-order patterns', icon: '📐', recommendedTypes: ['numeric'] },
  { id: 'radar', name: 'Radar Chart', category: 'Multidimensional', description: 'Equi-angular radial web comparing multiple features', icon: '🕸️', recommendedTypes: ['numeric'] },
  { id: 'polar', name: 'Polar Plot', category: 'Multidimensional', description: 'Radial angle and magnitude coordinate projection', icon: '🧭', recommendedTypes: ['numeric'] },
  { id: 'network', name: 'Network Graph', category: 'Multidimensional', description: 'Node and edge relational topology layout', icon: '🕸️', recommendedTypes: ['categorical', 'categorical'] },
  { id: 'wordcloud', name: 'Word Cloud', category: 'Multidimensional', description: 'Token frequency tag cloud scaled by occurrence count', icon: '☁️', recommendedTypes: ['text'] },

  // 6. 3D & Scientific (3)
  { id: 'scatter_3d', name: '3D Scatter', category: '3D & Scientific', description: 'Interactive 3D Cartesian coordinates with rotatable viewport', icon: '🧊', recommendedTypes: ['numeric', 'numeric', 'numeric'] },
  { id: 'surface_3d', name: '3D Surface', category: '3D & Scientific', description: 'Continuous 3D elevation mesh surface topology', icon: '⛰️', recommendedTypes: ['numeric'] },
  { id: 'contour', name: 'Contour Plot', category: '3D & Scientific', description: '2D iso-curve elevation lines of 3D data surfaces', icon: '〰️', recommendedTypes: ['numeric'] },

  // 7. Time Series & Financial (6)
  { id: 'timeseries', name: 'Time Series Plot', category: 'Time Series', description: 'Temporal chronologically ordered line with rolling window smoothing', icon: '⏱️', recommendedTypes: ['datetime', 'numeric'] },
  { id: 'candlestick', name: 'Candlestick Chart', category: 'Time Series', description: 'Financial Open, High, Low, Close price ranges and directions', icon: '🕯️', recommendedTypes: ['datetime', 'numeric'] },
  { id: 'ohlc', name: 'OHLC Chart', category: 'Time Series', description: 'Bar-based Open, High, Low, Close financial series', icon: '📊', recommendedTypes: ['datetime', 'numeric'] },
  { id: 'lag', name: 'Lag Plot', category: 'Time Series', description: 'Scatter plot of y(t) vs y(t-k) evaluating temporal randomness', icon: '⏳', recommendedTypes: ['numeric'] },
  { id: 'autocorrelation', name: 'Autocorrelation (ACF)', category: 'Time Series', description: 'Serial correlation across consecutive lags with confidence limits', icon: '🔄', recommendedTypes: ['numeric'] },
  { id: 'pacf', name: 'Partial Autocorrelation (PACF)', category: 'Time Series', description: 'Direct correlation at lag k removing intermediate lag effects', icon: '🔂', recommendedTypes: ['numeric'] },
];

export default function VisualizationPage() {
  const { activeDataset, datasets, setActiveDataset } = useStore();
  const isMobile = useIsMobile();

  // ── Visualization Selection & State ─────────────────────────────────────────
  const [selectedChartType, setSelectedChartType] = useState<string>('histogram');
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // ── Column & Axis Controls ──────────────────────────────────────────────────
  const [xCol, setXCol] = useState<string>('');
  const [yCol, setYCol] = useState<string>('');
  const [yCols, setYCols] = useState<string[]>([]);
  const [colorCol, setColorCol] = useState<string>('');
  const [sizeCol, setSizeCol] = useState<string>('');
  const [zCol, setZCol] = useState<string>('');
  const [xLabel, setXLabel] = useState<string>('');
  const [yLabel, setYLabel] = useState<string>('');
  const [axisRotation, setAxisRotation] = useState<number>(0);
  const [axisScale, setAxisScale] = useState<'linear' | 'log' | 'symlog'>('linear');
  const [reverseAxis, setReverseAxis] = useState<boolean>(false);

  // ── Figure & Global Settings ────────────────────────────────────────────────
  const [figureTheme, setFigureTheme] = useState<string>('dark');
  const [figureHeight, setFigureHeight] = useState<number>(560);
  const [fontFamily] = useState<string>('Inter, sans-serif');
  const [fontSize] = useState<number>(12);
  const [palette, setPalette] = useState<string>('viridis');
  const [primaryColor, setPrimaryColor] = useState<string>('#3b82f6');
  const [alpha, setAlpha] = useState<number>(0.85);

  // ── Legend & Grid ───────────────────────────────────────────────────────────
  const [showLegend, setShowLegend] = useState<boolean>(true);
  const [legendPosition, setLegendPosition] = useState<'top' | 'bottom' | 'right' | 'inside'>('right');
  const [majorGrid, setMajorGrid] = useState<boolean>(true);
  const [minorGrid] = useState<boolean>(false);
  const [gridColor] = useState<string>('var(--border-subtle)');
  const [lineStyle] = useState<'solid' | 'dash' | 'dot'>('solid');

  // ── Specialized Settings ────────────────────────────────────────────────────
  const [bins, setBins] = useState<number>(30);
  const [enableKde, setEnableKde] = useState<boolean>(true);
  const [kdeFill] = useState<boolean>(true);
  const [meanLine, setMeanLine] = useState<boolean>(true);
  const [medianLine, setMedianLine] = useState<boolean>(false);
  const [regressionLine, setRegressionLine] = useState<boolean>(true);
  const [polyFit, setPolyFit] = useState<boolean>(false);
  const [smoothing, setSmoothing] = useState<boolean>(false);
  const [stepPlot, setStepPlot] = useState<boolean>(false);
  const [fillBetween, setFillBetween] = useState<boolean>(false);
  const [movingAvgWindow, setMovingAvgWindow] = useState<number>(0);
  const [boxNotch, setBoxNotch] = useState<boolean>(false);
  const [showOutliers, setShowOutliers] = useState<boolean>(true);
  const [correlationMethod, setCorrelationMethod] = useState<string>('pearson');
  const [showAnnotations, setShowAnnotations] = useState<boolean>(true);
  const [markerStyle, setMarkerStyle] = useState<string>('circle');
  const [markerSize] = useState<number>(8);

  // ── Runtime Data & AI States ────────────────────────────────────────────────
  const [chartData, setChartData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [loadingRecs, setLoadingRecs] = useState<boolean>(false);
  const [insights, setInsights] = useState<any[]>([]);
  const [, setLoadingInsights] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [activePanel, setActivePanel] = useState<'catalog' | 'figure' | 'axis' | 'specialized' | 'insights'>('catalog');

  // ── History Stack for Undo/Redo ─────────────────────────────────────────────
  const [historyStack, setHistoryStack] = useState<any[]>([]);
  const [redoStack, setRedoStack] = useState<any[]>([]);
  const exportFnsRef = useRef<any>(null);
  const chartWrapperRef = useRef<HTMLDivElement>(null);

  // Available dataset columns — read the canonical `column_types` shape emitted
  // by the backend, with fallbacks for legacy flat `column_names` payloads.
  const dsInfo = activeDataset?.dataset_info;
  const numericColumns = dsInfo?.column_types?.numeric ?? dsInfo?.numeric_columns ?? [];
  const categoricalColumns = dsInfo?.column_types?.categorical ?? dsInfo?.categorical_columns ?? [];
  const allColumns =
    dsInfo?.column_names ??
    [
      ...(dsInfo?.column_types?.numeric ?? []),
      ...(dsInfo?.column_types?.categorical ?? []),
      ...(dsInfo?.column_types?.datetime ?? []),
      ...(dsInfo?.column_types?.boolean ?? []),
    ];

  // Snapshot current visual state
  const captureState = useCallback(() => {
    return {
      selectedChartType,
      xCol, yCol, yCols, colorCol, sizeCol, zCol,
      xLabel, yLabel, axisRotation, axisScale, reverseAxis,
      figureTheme, figureHeight, fontFamily, fontSize, palette, primaryColor, alpha,
      showLegend, legendPosition, majorGrid, minorGrid, gridColor, lineStyle,
      bins, enableKde, kdeFill, meanLine, medianLine, regressionLine, polyFit,
      smoothing, stepPlot, fillBetween, movingAvgWindow, boxNotch, showOutliers,
      correlationMethod, showAnnotations, markerStyle, markerSize,
    };
  }, [
    selectedChartType, xCol, yCol, yCols, colorCol, sizeCol, zCol,
    xLabel, yLabel, axisRotation, axisScale, reverseAxis,
    figureTheme, figureHeight, fontFamily, fontSize, palette, primaryColor, alpha,
    showLegend, legendPosition, majorGrid, minorGrid, gridColor, lineStyle,
    bins, enableKde, kdeFill, meanLine, medianLine, regressionLine, polyFit,
    smoothing, stepPlot, fillBetween, movingAvgWindow, boxNotch, showOutliers,
    correlationMethod, showAnnotations, markerStyle, markerSize,
  ]);

  const applyState = (st: any) => {
    if (!st) return;
    if (st.selectedChartType) setSelectedChartType(st.selectedChartType);
    if (st.xCol !== undefined) setXCol(st.xCol);
    if (st.yCol !== undefined) setYCol(st.yCol);
    if (st.yCols !== undefined) setYCols(st.yCols);
    if (st.colorCol !== undefined) setColorCol(st.colorCol);
    if (st.sizeCol !== undefined) setSizeCol(st.sizeCol);
    if (st.zCol !== undefined) setZCol(st.zCol);
    if (st.xLabel !== undefined) setXLabel(st.xLabel);
    if (st.yLabel !== undefined) setYLabel(st.yLabel);
    if (st.axisRotation !== undefined) setAxisRotation(st.axisRotation);
    if (st.axisScale !== undefined) setAxisScale(st.axisScale);
    if (st.reverseAxis !== undefined) setReverseAxis(st.reverseAxis);
    if (st.figureTheme !== undefined) setFigureTheme(st.figureTheme);
    if (st.figureHeight !== undefined) setFigureHeight(st.figureHeight);
    if (st.palette !== undefined) setPalette(st.palette);
    if (st.primaryColor !== undefined) setPrimaryColor(st.primaryColor);
    if (st.alpha !== undefined) setAlpha(st.alpha);
    if (st.showLegend !== undefined) setShowLegend(st.showLegend);
    if (st.bins !== undefined) setBins(st.bins);
    if (st.enableKde !== undefined) setEnableKde(st.enableKde);
    if (st.regressionLine !== undefined) setRegressionLine(st.regressionLine);
  };

  const handleUndo = () => {
    if (historyStack.length === 0) return;
    const prev = historyStack[historyStack.length - 1];
    const current = captureState();
    setRedoStack((r) => [current, ...r]);
    setHistoryStack((h) => h.slice(0, -1));
    applyState(prev);
    toast.success('Undid last visualization setting change', { duration: 1500 });
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const next = redoStack[0];
    const current = captureState();
    setHistoryStack((h) => [...h, current]);
    setRedoStack((r) => r.slice(1));
    applyState(next);
    toast.success('Redid visualization setting change', { duration: 1500 });
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        if (e.shiftKey) {
          e.preventDefault();
          handleRedo();
        } else {
          e.preventDefault();
          handleUndo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [historyStack, redoStack]);

  const fetchRecommendations = async () => {
    if (!activeDataset?.id) return;
    setLoadingRecs(true);
    try {
      const res = await getVisualizationRecommendations(activeDataset.id);
      const recs = res?.data || res || [];
      setRecommendations(recs);
    } catch (err) {
      console.error('Failed to fetch recommendations:', err);
    } finally {
      setLoadingRecs(false);
    }
  };

  useEffect(() => {
    if (activeDataset) return;
    if (datasets.length > 0 && !activeDataset) {
      // Persisted datasets are available but no active selection yet — restore it.
      const desired = datasets.find((d) => d.id === (typeof window !== 'undefined' ? localStorage.getItem('last_active_dataset') : null)) || datasets[0];
      setActiveDataset(desired);
      try {
        localStorage.setItem('last_active_dataset', desired.id);
      } catch { /* storage may be unavailable */ }
    }
  }, [activeDataset, datasets, setActiveDataset]);

  useEffect(() => {
    if (activeDataset) {
      if (numericColumns.length > 0) {
        setXCol(numericColumns[0]);
        if (numericColumns.length > 1) {
          setYCol(numericColumns[1]);
          setYCols([numericColumns[1]]);
        }
        if (numericColumns.length > 2) {
          setZCol(numericColumns[2]);
        }
      } else if (allColumns.length > 0) {
        setXCol(allColumns[0]);
      }
      if (categoricalColumns.length > 0) {
        setColorCol(categoricalColumns[0]);
      }
      fetchRecommendations();
    }
  }, [activeDataset?.id]);

  const fetchInsights = async (config: any) => {
    if (!activeDataset?.id) return;
    setLoadingInsights(true);
    try {
      const res = await getVisualizationInsights(activeDataset.id, config);
      const insData = res?.data?.insights || res?.insights || [];
      setInsights(insData);
    } catch (err) {
      console.error('Insights error:', err);
    } finally {
      setLoadingInsights(false);
    }
  };

  const fetchChart = useCallback(async () => {
    if (!activeDataset?.id) return;

    setLoading(true);
    const config: Record<string, any> = {
      chart_type: selectedChartType,
      x_col: xCol || undefined,
      y_col: yCol || undefined,
      y_cols: yCols.length > 0 ? yCols : undefined,
      color_col: colorCol || undefined,
      size_col: sizeCol || undefined,
      z_col: zCol || undefined,
      bins,
      enable_kde: enableKde,
      kde_fill: kdeFill,
      mean_line: meanLine,
      median_line: medianLine,
      regression_line: regressionLine,
      poly_fit: polyFit,
      smoothing,
      step_plot: stepPlot,
      fill_between: fillBetween,
      moving_average_window: movingAvgWindow,
      notch: boxNotch,
      outliers: showOutliers,
      correlation_method: correlationMethod,
      annotations: showAnnotations,
      marker_style: markerStyle,
      marker_size: markerSize,
    };

    try {
      const res = await generateVisualization(activeDataset.id, config);
      const data = res?.data || res;
      setChartData(data);
      fetchInsights(config);
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Failed to render visualization');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [
    activeDataset?.id,
    selectedChartType,
    xCol,
    yCol,
    yCols,
    colorCol,
    sizeCol,
    zCol,
    bins,
    enableKde,
    kdeFill,
    meanLine,
    medianLine,
    regressionLine,
    polyFit,
    smoothing,
    stepPlot,
    fillBetween,
    movingAvgWindow,
    boxNotch,
    showOutliers,
    correlationMethod,
    showAnnotations,
    markerStyle,
    markerSize,
  ]);

  useEffect(() => {
    if (activeDataset?.id && (xCol || selectedChartType.includes('heatmap') || selectedChartType === 'parallel_coordinates')) {
      fetchChart();
    }
  }, [selectedChartType, xCol, yCol, colorCol, correlationMethod]);

  const applyRecommendation = (rec: any) => {
    setHistoryStack((h) => [...h, captureState()]);
    setSelectedChartType(rec.chart_type);
    if (rec.config?.x_col) setXCol(rec.config.x_col);
    if (rec.config?.y_col) setYCol(rec.config.y_col);
    if (rec.config?.color_col) setColorCol(rec.config.color_col);
    if (rec.config?.column) setXCol(rec.config.column);
    if (rec.config?.enable_kde !== undefined) setEnableKde(rec.config.enable_kde);
    toast.success(`Applied Recommendation: ${rec.title}`);
  };

  const copyConfigJSON = () => {
    const cfg = captureState();
    navigator.clipboard.writeText(JSON.stringify(cfg, null, 2));
    toast.success('Settings JSON copied to clipboard');
  };

  const bookmarkChart = () => {
    const saved = JSON.parse(localStorage.getItem('infinitics_saved_charts') || '[]');
    saved.push({
      id: Date.now(),
      name: `${selectedChartType.toUpperCase()} - ${xCol} ${yCol ? `vs ${yCol}` : ''}`,
      timestamp: new Date().toISOString(),
      config: captureState(),
    });
    localStorage.setItem('infinitics_saved_charts', JSON.stringify(saved));
    toast.success('Visualization bookmarked');
  };

  const filteredCatalog = VISUALIZATION_CATALOG.filter((item) => {
    const matchesCategory = activeCategory === 'All' || item.category === activeCategory;
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) || item.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const categories = ['All', 'Distributions', 'Trends & Comparisons', 'Relationships', 'Part-to-Whole', 'Multidimensional', '3D & Scientific', 'Time Series'];

  if (!activeDataset) {
    return <EmptyState />;
  }

  return (
    <div style={{ maxWidth: 1600, margin: '0 auto', paddingBottom: '40px' }}>
      
      {/* ── TOP HEADER & TOOLBAR ────────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '14px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
              Visualization Studio
            </h1>
            <span className="badge-subtle badge-info" style={{ fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Sparkles size={12} /> 47 Chart Archetypes
            </span>
          </div>
          <p style={{ margin: '3px 0 0 0', color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
            Workspace: <strong style={{ color: 'var(--text-primary)' }}>{activeDataset.filename}</strong> ({activeDataset.dataset_info?.rows?.toLocaleString() ?? '—'} rows × {activeDataset.dataset_info?.columns ?? '—'} cols)
          </p>
        </div>

        {/* Action Toolbar */}
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Undo / Redo */}
          <button
            onClick={handleUndo}
            disabled={historyStack.length === 0}
            className="btn-secondary"
            title="Undo Setting (Ctrl+Z)"
            style={{ height: '34px', padding: '0 8px', opacity: historyStack.length === 0 ? 0.4 : 1 }}
          >
            <Undo2 size={14} />
          </button>
          <button
            onClick={handleRedo}
            disabled={redoStack.length === 0}
            className="btn-secondary"
            title="Redo Setting (Ctrl+Y)"
            style={{ height: '34px', padding: '0 8px', opacity: redoStack.length === 0 ? 0.4 : 1 }}
          >
            <Redo2 size={14} />
          </button>

          <div style={{ width: '1px', height: '20px', background: 'var(--border-default)', margin: '0 3px' }} />

          {/* Reset View */}
          <button
            onClick={() => exportFnsRef.current?.resetView?.()}
            className="btn-secondary"
            title="Reset Zoom & Pan"
            style={{ height: '34px', padding: '0 10px', fontSize: '0.8rem' }}
          >
            <RotateCcw size={13} /> Reset View
          </button>

          {/* Copy Config */}
          <button
            onClick={copyConfigJSON}
            className="btn-secondary"
            title="Copy Settings JSON"
            style={{ height: '34px', padding: '0 10px', fontSize: '0.8rem' }}
          >
            <Copy size={13} /> Copy JSON
          </button>

          {/* Bookmark */}
          <button
            onClick={bookmarkChart}
            className="btn-secondary"
            title="Bookmark Visualization"
            style={{ height: '34px', padding: '0 10px', fontSize: '0.8rem' }}
          >
            <Bookmark size={13} /> Save
          </button>

          {/* Export Formats */}
          <div style={{ display: 'flex', gap: '3px' }}>
            <button
              onClick={() => exportFnsRef.current?.downloadPNG?.()}
              className="btn-secondary"
              title="Download High-Res PNG"
              style={{ height: '34px', padding: '0 9px', fontSize: '0.8rem' }}
            >
              <Download size={13} /> PNG
            </button>
            <button
              onClick={() => exportFnsRef.current?.downloadSVG?.()}
              className="btn-secondary"
              title="Download Vector SVG"
              style={{ height: '34px', padding: '0 9px', fontSize: '0.8rem' }}
            >
              SVG
            </button>
            <button
              onClick={() => exportFnsRef.current?.downloadHTML?.()}
              className="btn-secondary"
              title="Download Interactive HTML"
              style={{ height: '34px', padding: '0 9px', fontSize: '0.8rem' }}
            >
              <FileCode size={13} /> HTML
            </button>
            <button
              onClick={() => exportFnsRef.current?.downloadCSV?.()}
              className="btn-secondary"
              title="Download Chart Data CSV"
              style={{ height: '34px', padding: '0 9px', fontSize: '0.8rem' }}
            >
              <FileSpreadsheet size={13} /> CSV
            </button>
          </div>

          {/* Re-render button */}
          <button
            onClick={fetchChart}
            disabled={loading}
            className="btn-primary"
            style={{ height: '34px', padding: '0 14px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            Render
          </button>
        </div>
      </div>

      {/* ── AI RECOMMENDATION ENGINE BANNER ─────────────────────────────────── */}
      {recommendations.length > 0 && (
        <div className="card-precision" style={{
          padding: '14px 18px',
          marginBottom: '20px',
          background: 'var(--bg-surface)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sparkles size={15} color="var(--accent-primary)" />
              <span style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-primary)' }}>
                Recommended Visualizations for Schema
              </span>
            </div>
            <button
              onClick={fetchRecommendations}
              style={{ background: 'transparent', border: 'none', color: 'var(--accent-primary)', fontSize: '0.78rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}
            >
              <RefreshCw size={11} className={loadingRecs ? 'animate-spin' : ''} /> Refresh AI
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '10px' }}>
            {recommendations.map((rec, i) => (
              <div
                key={i}
                onClick={() => applyRecommendation(rec)}
                style={{
                  background: selectedChartType === rec.chart_type ? 'var(--accent-primary-light)' : 'var(--bg-canvas)',
                  border: `1px solid ${selectedChartType === rec.chart_type ? 'var(--accent-primary)' : 'var(--border-default)'}`,
                  borderRadius: '8px',
                  padding: '10px 12px',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                  <span style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {rec.title}
                  </span>
                  <span className="badge-subtle badge-success" style={{ fontSize: '0.68rem', padding: '1px 5px' }}>
                    {Math.round(rec.confidence * 100)}% Match
                  </span>
                </div>
                <p style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.35 }}>
                  {rec.reason}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── MAIN STUDIO GRID ────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '310px 1fr', gap: '20px', alignItems: 'start' }}>

        {/* ── LEFT CONTROL PANELS ───────────────────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

          {/* Panel Selector Tabs */}
          <div style={{
            display: 'flex',
            background: 'var(--bg-surface)',
            padding: '3px',
            borderRadius: '8px',
            border: '1px solid var(--border-default)',
            gap: '3px'
          }}>
            {[
              { id: 'catalog', label: 'Charts', icon: <Grid size={13} /> },
              { id: 'axis', label: 'Axes', icon: <Sliders size={13} /> },
              { id: 'figure', label: 'Theme', icon: <Palette size={13} /> },
              { id: 'specialized', label: 'Tune', icon: <Settings2 size={13} /> },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActivePanel(tab.id as any)}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px',
                  padding: '6px 0',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  background: activePanel === tab.id ? 'var(--accent-primary)' : 'transparent',
                  color: activePanel === tab.id ? '#ffffff' : 'var(--text-secondary)',
                  transition: 'all 0.15s ease'
                }}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          {/* 1. VISUALIZATION CATALOG PANEL */}
          {activePanel === 'catalog' && (
            <div className="card-precision" style={{ padding: '14px', maxHeight: '680px', overflowY: 'auto' }}>
              <div style={{ marginBottom: '10px' }}>
                <input
                  type="text"
                  placeholder="Search 47 chart archetypes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="input-precision"
                  style={{ width: '100%', fontSize: '0.8rem', height: '32px' }}
                />
              </div>

              {/* Category Pills */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px', marginBottom: '12px' }}>
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    style={{
                      fontSize: '0.68rem',
                      padding: '3px 7px',
                      borderRadius: '5px',
                      border: `1px solid ${activeCategory === cat ? 'var(--accent-primary)' : 'var(--border-default)'}`,
                      background: activeCategory === cat ? 'var(--accent-primary-light)' : 'transparent',
                      color: activeCategory === cat ? 'var(--accent-primary)' : 'var(--text-secondary)',
                      fontWeight: activeCategory === cat ? 700 : 500,
                      cursor: 'pointer'
                    }}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Catalog Items */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {filteredCatalog.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => {
                      setHistoryStack((h) => [...h, captureState()]);
                      setSelectedChartType(item.id);
                    }}
                    style={{
                      padding: '8px 10px',
                      borderRadius: '6px',
                      background: selectedChartType === item.id ? 'var(--accent-primary-light)' : 'var(--bg-canvas)',
                      border: `1px solid ${selectedChartType === item.id ? 'var(--accent-primary)' : 'var(--border-default)'}`,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '0.95rem' }}>{item.icon}</span>
                        <span style={{ fontSize: '0.82rem', fontWeight: 600, color: selectedChartType === item.id ? 'var(--accent-primary)' : 'var(--text-primary)' }}>
                          {item.name}
                        </span>
                      </div>
                      {selectedChartType === item.id && <CheckCircle2 size={13} color="var(--accent-primary)" />}
                    </div>
                    <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.3 }}>
                      {item.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 2. AXIS & COLUMN CONTROLS PANEL */}
          {activePanel === 'axis' && (
            <div className="card-precision" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <h3 style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                Axis & Feature Dimensions
              </h3>

              {/* X Column */}
              <div>
                <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '3px' }}>Primary X-Axis</label>
                <select
                  value={xCol}
                  onChange={(e) => {
                    setHistoryStack((h) => [...h, captureState()]);
                    setXCol(e.target.value);
                  }}
                  className="input-precision"
                  style={{ width: '100%', fontSize: '0.8rem', height: '32px' }}
                >
                  <option value="">-- Select X Column --</option>
                  {allColumns.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              {/* Y Column */}
              <div>
                <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '3px' }}>Primary Y-Axis</label>
                <select
                  value={yCol}
                  onChange={(e) => {
                    setHistoryStack((h) => [...h, captureState()]);
                    setYCol(e.target.value);
                  }}
                  className="input-precision"
                  style={{ width: '100%', fontSize: '0.8rem', height: '32px' }}
                >
                  <option value="">-- Select Y Column --</option>
                  {allColumns.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              {/* Color / Grouping */}
              <div>
                <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '3px' }}>Categorical Hue Dimension</label>
                <select
                  value={colorCol}
                  onChange={(e) => {
                    setHistoryStack((h) => [...h, captureState()]);
                    setColorCol(e.target.value);
                  }}
                  className="input-precision"
                  style={{ width: '100%', fontSize: '0.8rem', height: '32px' }}
                >
                  <option value="">-- None --</option>
                  {allColumns.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              {/* 3D Z Column */}
              {selectedChartType.includes('3d') && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '3px' }}>Z-Axis (3D Surface)</label>
                  <select
                    value={zCol}
                    onChange={(e) => setZCol(e.target.value)}
                    className="input-precision"
                    style={{ width: '100%', fontSize: '0.8rem', height: '32px' }}
                  >
                    <option value="">-- Select Z Column --</option>
                    {numericColumns.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Labels */}
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '8px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.74rem', color: 'var(--text-secondary)', marginBottom: '2px' }}>X Label</label>
                  <input
                    type="text"
                    value={xLabel}
                    placeholder="Auto"
                    onChange={(e) => setXLabel(e.target.value)}
                    className="input-precision"
                    style={{ width: '100%', fontSize: '0.78rem', height: '30px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.74rem', color: 'var(--text-secondary)', marginBottom: '2px' }}>Y Label</label>
                  <input
                    type="text"
                    value={yLabel}
                    placeholder="Auto"
                    onChange={(e) => setYLabel(e.target.value)}
                    className="input-precision"
                    style={{ width: '100%', fontSize: '0.78rem', height: '30px' }}
                  />
                </div>
              </div>

              {/* Scale & Rotation */}
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '8px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.74rem', color: 'var(--text-secondary)', marginBottom: '2px' }}>Scale</label>
                  <select
                    value={axisScale}
                    onChange={(e) => setAxisScale(e.target.value as any)}
                    className="input-precision"
                    style={{ width: '100%', fontSize: '0.78rem', height: '30px' }}
                  >
                    <option value="linear">Linear</option>
                    <option value="log">Logarithmic</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.74rem', color: 'var(--text-secondary)', marginBottom: '2px' }}>Rotation</label>
                  <select
                    value={axisRotation}
                    onChange={(e) => setAxisRotation(Number(e.target.value))}
                    className="input-precision"
                    style={{ width: '100%', fontSize: '0.78rem', height: '30px' }}
                  >
                    <option value={0}>0° Horizontal</option>
                    <option value={-45}>-45° Slanted</option>
                    <option value={-90}>-90° Vertical</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                <input
                  type="checkbox"
                  id="revAxis"
                  checked={reverseAxis}
                  onChange={(e) => setReverseAxis(e.target.checked)}
                />
                <label htmlFor="revAxis" style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                  Reverse Axis Orientation
                </label>
              </div>
            </div>
          )}

          {/* 3. FIGURE & THEME SETTINGS PANEL */}
          {activePanel === 'figure' && (
            <div className="card-precision" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <h3 style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                Visual Style & Colormaps
              </h3>

              {/* Color Palette */}
              <div>
                <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>Color Palette</label>
                <select
                  value={palette}
                  onChange={(e) => setPalette(e.target.value)}
                  className="input-precision"
                  style={{ width: '100%', fontSize: '0.8rem', height: '32px' }}
                >
                  <option value="viridis">Viridis (Standard)</option>
                  <option value="coolwarm">Coolwarm (Diverging)</option>
                  <option value="spectral">Spectral (Multi-Tone)</option>
                  <option value="plotly">Precision Teal/Blue</option>
                  <option value="sunset">Sunset Warm</option>
                  <option value="minimalist">Minimalist Slate</option>
                </select>
              </div>

              {/* Primary Color Picker & Alpha */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', alignItems: 'center' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.74rem', color: 'var(--text-secondary)', marginBottom: '2px' }}>Primary Hue</label>
                  <input
                    type="color"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    style={{ width: '100%', height: '32px', borderRadius: '6px', border: '1px solid var(--border-default)', cursor: 'pointer', background: 'transparent' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.74rem', color: 'var(--text-secondary)', marginBottom: '2px' }}>Alpha ({Math.round(alpha * 100)}%)</label>
                  <input
                    type="range"
                    min="0.2"
                    max="1"
                    step="0.05"
                    value={alpha}
                    onChange={(e) => setAlpha(Number(e.target.value))}
                    style={{ width: '100%' }}
                  />
                </div>
              </div>

              {/* Figure Height */}
              <div>
                <label style={{ display: 'block', fontSize: '0.74rem', color: 'var(--text-secondary)', marginBottom: '2px' }}>Canvas Height: {figureHeight}px</label>
                <input
                  type="range"
                  min="380"
                  max="850"
                  step="20"
                  value={figureHeight}
                  onChange={(e) => setFigureHeight(Number(e.target.value))}
                  style={{ width: '100%' }}
                />
              </div>

              {/* Legend Controls */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.74rem', color: 'var(--text-secondary)', marginBottom: '2px' }}>Legend</label>
                  <select
                    value={showLegend ? 'yes' : 'no'}
                    onChange={(e) => setShowLegend(e.target.value === 'yes')}
                    className="input-precision"
                    style={{ width: '100%', fontSize: '0.78rem', height: '30px' }}
                  >
                    <option value="yes">Visible</option>
                    <option value="no">Hidden</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.74rem', color: 'var(--text-secondary)', marginBottom: '2px' }}>Position</label>
                  <select
                    value={legendPosition}
                    onChange={(e) => setLegendPosition(e.target.value as any)}
                    className="input-precision"
                    style={{ width: '100%', fontSize: '0.78rem', height: '30px' }}
                  >
                    <option value="right">Right</option>
                    <option value="top">Top</option>
                    <option value="bottom">Bottom</option>
                  </select>
                </div>
              </div>

              {/* Grid Lines */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.78rem', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                  <input type="checkbox" checked={majorGrid} onChange={(e) => setMajorGrid(e.target.checked)} /> Major Grid Lines
                </label>
              </div>
            </div>
          )}

          {/* 4. SPECIALIZED & FINE-TUNE SETTINGS PANEL */}
          {activePanel === 'specialized' && (
            <div className="card-precision" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <h3 style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                Specialized Statistical Controls
              </h3>

              {/* Histogram Options */}
              {selectedChartType === 'histogram' && (
                <>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.74rem', color: 'var(--text-secondary)', marginBottom: '2px' }}>Bins: {bins}</label>
                    <input
                      type="range"
                      min="5"
                      max="80"
                      value={bins}
                      onChange={(e) => setBins(Number(e.target.value))}
                      style={{ width: '100%' }}
                    />
                  </div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.78rem', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                    <input type="checkbox" checked={enableKde} onChange={(e) => setEnableKde(e.target.checked)} /> KDE Density Curve
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.78rem', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                    <input type="checkbox" checked={meanLine} onChange={(e) => setMeanLine(e.target.checked)} /> Mean Reference Line
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.78rem', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                    <input type="checkbox" checked={medianLine} onChange={(e) => setMedianLine(e.target.checked)} /> Median Reference Line
                  </label>
                </>
              )}

              {/* Scatter Options */}
              {selectedChartType.includes('scatter') && (
                <>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.78rem', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                    <input type="checkbox" checked={regressionLine} onChange={(e) => setRegressionLine(e.target.checked)} /> OLS Linear Regression
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.78rem', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                    <input type="checkbox" checked={polyFit} onChange={(e) => setPolyFit(e.target.checked)} /> Polynomial Degree 2 Fit
                  </label>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.74rem', color: 'var(--text-secondary)', marginBottom: '2px' }}>Marker Symbol</label>
                    <select
                      value={markerStyle}
                      onChange={(e) => setMarkerStyle(e.target.value)}
                      className="input-precision"
                      style={{ width: '100%', fontSize: '0.78rem', height: '30px' }}
                    >
                      <option value="circle">Circle</option>
                      <option value="square">Square</option>
                      <option value="diamond">Diamond</option>
                      <option value="cross">Cross</option>
                    </select>
                  </div>
                </>
              )}

              {/* Line Options */}
              {selectedChartType.includes('line') && (
                <>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.78rem', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                    <input type="checkbox" checked={smoothing} onChange={(e) => setSmoothing(e.target.checked)} /> Spline Smoothing
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.78rem', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                    <input type="checkbox" checked={stepPlot} onChange={(e) => setStepPlot(e.target.checked)} /> Step Plot Mode
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.78rem', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                    <input type="checkbox" checked={fillBetween} onChange={(e) => setFillBetween(e.target.checked)} /> Shaded Area Fill
                  </label>
                </>
              )}

              {/* Box & Violin Options */}
              {(selectedChartType === 'box' || selectedChartType === 'violin') && (
                <>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.78rem', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                    <input type="checkbox" checked={boxNotch} onChange={(e) => setBoxNotch(e.target.checked)} /> Notched Median Bounds
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.78rem', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                    <input type="checkbox" checked={showOutliers} onChange={(e) => setShowOutliers(e.target.checked)} /> Display Outlier Points
                  </label>
                </>
              )}

              {/* Heatmap Options */}
              {selectedChartType.includes('heatmap') && (
                <>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.74rem', color: 'var(--text-secondary)', marginBottom: '2px' }}>Correlation Method</label>
                    <select
                      value={correlationMethod}
                      onChange={(e) => setCorrelationMethod(e.target.value)}
                      className="input-precision"
                      style={{ width: '100%', fontSize: '0.78rem', height: '30px' }}
                    >
                      <option value="pearson">Pearson (Linear)</option>
                      <option value="spearman">Spearman (Rank)</option>
                      <option value="kendall">Kendall (Tau)</option>
                    </select>
                  </div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.78rem', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                    <input type="checkbox" checked={showAnnotations} onChange={(e) => setShowAnnotations(e.target.checked)} /> Numeric Matrix Annotations
                  </label>
                </>
              )}
            </div>
          )}

        </div>

        {/* ── CENTER WORKSPACE CANVAS ───────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>

          {/* Interactive Chart Canvas Card */}
          <div
            ref={chartWrapperRef}
            className="card-precision"
            style={{
              padding: '20px',
              position: 'relative',
              minHeight: '560px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
            }}
          >
            {/* Header / Active Chart Badge */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '1.2rem' }}>
                  {VISUALIZATION_CATALOG.find((c) => c.id === selectedChartType)?.icon || '📊'}
                </span>
                <div>
                  <h2 style={{ fontSize: '0.96rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                    {VISUALIZATION_CATALOG.find((c) => c.id === selectedChartType)?.name || selectedChartType.toUpperCase()}
                  </h2>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    {xCol ? `X: ${xCol}` : ''} {yCol ? `| Y: ${yCol}` : ''} {colorCol ? `| Group: ${colorCol}` : ''}
                  </span>
                </div>
              </div>

              {/* Fullscreen Toggle */}
              <button
                onClick={() => {
                  if (!isFullscreen) {
                    chartWrapperRef.current?.requestFullscreen?.();
                    setIsFullscreen(true);
                  } else {
                    document.exitFullscreen?.();
                    setIsFullscreen(false);
                  }
                }}
                className="btn-secondary"
                title="Toggle Fullscreen"
                style={{ height: '28px', padding: '0 7px' }}
              >
                <Maximize2 size={13} />
              </button>
            </div>

            {/* Main Plotly WebGL Canvas */}
            {loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '400px', gap: '10px' }}>
                <LoadingSpinner text={`Rendering ${selectedChartType.replace('_', ' ')}...`} />
              </div>
            ) : chartData ? (
              <UniversalPlotlyChart
                chartType={selectedChartType}
                chartData={chartData}
                figureSettings={{
                  height: figureHeight,
                  theme: figureTheme,
                  fontFamily,
                  fontSize,
                }}
                axisControls={{
                  xCol,
                  yCol,
                  yCols,
                  xLabel,
                  yLabel,
                  axisRotation,
                  axisScale,
                  reverseAxis,
                }}
                legendSettings={{
                  show: showLegend,
                  position: legendPosition,
                }}
                gridSettings={{
                  majorGrid,
                  minorGrid,
                  lineWidth: 1,
                  lineStyle,
                  color: gridColor,
                }}
                colorControls={{
                  palette,
                  primaryColor,
                  alpha,
                }}
                specializedSettings={{
                  bins,
                  enable_kde: enableKde,
                  kde_fill: kdeFill,
                  mean_line: meanLine,
                  median_line: medianLine,
                  regression_line: regressionLine,
                  poly_fit: polyFit,
                  smoothing,
                  step_plot: stepPlot,
                  fill_between: fillBetween,
                  notch: boxNotch,
                  outliers: showOutliers,
                  annotations: showAnnotations,
                  marker_style: markerStyle,
                  marker_size: markerSize,
                }}
                onExportReady={(fns) => {
                  exportFnsRef.current = fns;
                }}
              />
            ) : (
              <EmptyState
                title="Select Features to Render"
                description="Choose an X Column and Y Column from the left panel or select an AI Recommendation above."
              />
            )}
          </div>

          {/* ── SMART AI INSIGHTS CARD ───────────────────────────────────────── */}
          {insights.length > 0 && (
            <div className="card-precision" style={{ padding: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <Sparkles size={16} color="var(--accent-primary)" />
                <h3 style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                  Automated Statistical Findings
                </h3>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '10px' }}>
                {insights.map((ins, idx) => (
                  <div
                    key={idx}
                    style={{
                      background: 'var(--bg-canvas)',
                      border: '1px solid var(--border-default)',
                      borderRadius: '6px',
                      padding: '10px 12px',
                    }}
                  >
                    <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '3px' }}>
                      {ins.title}
                    </div>
                    <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                      {ins.text}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
