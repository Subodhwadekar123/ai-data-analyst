import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  Layers,
  TrendingUp,
  Filter,
  ZoomIn,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { runPCA, polynomialFeatures, featureSelection, varianceThreshold } from '../services/api';
import EmptyState from '../components/ui/EmptyState';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import BarChartComponent from '../components/charts/BarChartComponent';

// ─── Types ──────────────────────────────────────────────────────────────────

interface PCAResult {
  explained_variance_ratio: number[];
  components: number[][];
  transformed_preview: unknown;
}

interface PolyResult {
  new_features: string[];
  preview: unknown;
}

interface SelectionResult {
  selected_features: string[];
  scores: Record<string, number>;
  dropped_features: string[];
}

interface VarianceResult {
  removed_features: string[];
  remaining_features: string[];
}

// ─── Expandable card wrapper ─────────────────────────────────────────────────

interface ExpandableCardProps {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  accentColor: string;
  accentGradient: string;
  isExpanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

const ExpandableCard: React.FC<ExpandableCardProps> = ({
  title,
  subtitle,
  icon,
  accentColor,
  accentGradient,
  isExpanded,
  onToggle,
  children,
}) => (
  <div
    className="card"
    style={{ border: `1px solid ${accentColor}33`, overflow: 'hidden' }}
  >
    {/* Header */}
    <button
      onClick={onToggle}
      style={{
        width: '100%',
        background: 'transparent',
        border: 'none',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '18px 20px',
        gap: '12px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: '12px',
            background: accentGradient,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          {icon}
        </div>
        <div style={{ textAlign: 'left' }}>
          <p style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: '#e2e8f0' }}>{title}</p>
          <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#64748b' }}>{subtitle}</p>
        </div>
      </div>
      <motion.div animate={{ rotate: isExpanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
        <ChevronDown size={18} color="#64748b" />
      </motion.div>
    </button>

    {/* Animated body */}
    <AnimatePresence initial={false}>
      {isExpanded && (
        <motion.div
          key="body"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.35, ease: 'easeInOut' }}
          style={{ overflow: 'hidden' }}
        >
          <div style={{ padding: '0 20px 20px' }}>{children}</div>
        </motion.div>
      )}
    </AnimatePresence>
  </div>
);

// ─── Multi-select checkboxes ─────────────────────────────────────────────────

interface MultiSelectProps {
  label: string;
  options: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
}

const MultiSelect: React.FC<MultiSelectProps> = ({ label, options, selected, onChange }) => {
  const toggleItem = (item: string) => {
    if (selected.includes(item)) {
      onChange(selected.filter((s) => s !== item));
    } else {
      onChange([...selected, item]);
    }
  };

  const toggleAll = () => {
    if (selected.length === options.length) {
      onChange([]);
    } else {
      onChange([...options]);
    }
  };

  return (
    <div style={{ marginBottom: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <label className="section-label">{label}</label>
        <button className="btn-ghost" onClick={toggleAll} style={{ fontSize: '12px', padding: '2px 8px' }}>
          {selected.length === options.length ? 'Deselect All' : 'Select All'}
        </button>
      </div>
      <div
        style={{
          maxHeight: '160px',
          overflowY: 'auto',
          background: '#0f1117',
          borderRadius: '10px',
          border: '1px solid #2d2f3e',
          padding: '8px',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '6px',
        }}
      >
        {options.map((opt) => (
          <button
            key={opt}
            onClick={() => toggleItem(opt)}
            style={{
              padding: '4px 10px',
              borderRadius: '6px',
              fontSize: '12px',
              border: `1px solid ${selected.includes(opt) ? '#6366f1' : '#2d2f3e'}`,
              background: selected.includes(opt) ? '#6366f122' : 'transparent',
              color: selected.includes(opt) ? '#a78bfa' : '#64748b',
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            {opt}
          </button>
        ))}
        {options.length === 0 && (
          <span style={{ color: '#475569', fontSize: '13px', padding: '4px 8px' }}>No numeric columns available</span>
        )}
      </div>
    </div>
  );
};

// ─── Result success banner ────────────────────────────────────────────────────

const SuccessBanner: React.FC<{ message: string }> = ({ message }) => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      padding: '10px 14px',
      background: '#10b98122',
      borderRadius: '8px',
      border: '1px solid #10b98133',
      marginBottom: '12px',
      fontSize: '13px',
      color: '#34d399',
    }}
  >
    <CheckCircle size={14} />
    {message}
  </div>
);

// ─── Label style helper ───────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 12px',
  background: '#0f1117',
  border: '1px solid #2d2f3e',
  borderRadius: '8px',
  color: '#e2e8f0',
  fontSize: '14px',
  outline: 'none',
  boxSizing: 'border-box',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '12px',
  color: '#94a3b8',
  marginBottom: '6px',
  fontWeight: 500,
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
};

// ─── Main component ───────────────────────────────────────────────────────────

const FeatureEngineeringPage: React.FC = () => {
  const { activeDataset } = useStore();

  const numericCols = activeDataset?.dataset_info?.column_types?.numeric ?? [];
  const allCols = activeDataset?.dataset_info?.column_details?.map((c) => c.name) ?? [];

  // ── Expanded state ─────────────────────────────────────────────────────────
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    pca: false,
    poly: false,
    selection: false,
    variance: false,
  });

  const toggleExpand = (key: string) =>
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));

  // ── PCA state ──────────────────────────────────────────────────────────────
  const [pcaNComponents, setPcaNComponents] = useState(2);
  const [pcaColumns, setPcaColumns] = useState<string[]>([]);
  const [pcaLoading, setPcaLoading] = useState(false);
  const [pcaResult, setPcaResult] = useState<PCAResult | null>(null);

  const handleRunPCA = async () => {
    if (!activeDataset) return;
    setPcaLoading(true);
    try {
      const result = (await runPCA(activeDataset.id, {
        n_components: pcaNComponents,
        columns: pcaColumns.length > 0 ? pcaColumns : undefined,
      })) as any;
      setPcaResult(result);
      toast.success('PCA completed successfully!');
    } catch {
      toast.error('PCA failed. Please check your parameters.');
    } finally {
      setPcaLoading(false);
    }
  };

  // ── Polynomial Features state ──────────────────────────────────────────────
  const [polyDegree, setPolyDegree] = useState(2);
  const [polyColumns, setPolyColumns] = useState<string[]>([]);
  const [polyInteractionOnly, setPolyInteractionOnly] = useState(false);
  const [polyLoading, setPolyLoading] = useState(false);
  const [polyResult, setPolyResult] = useState<PolyResult | null>(null);

  const handlePolyFeatures = async () => {
    if (!activeDataset) return;
    setPolyLoading(true);
    try {
      const result = (await polynomialFeatures(activeDataset.id, {
        degree: polyDegree,
        columns: polyColumns.length > 0 ? polyColumns : undefined,
        interaction_only: polyInteractionOnly,
      })) as any;
      setPolyResult(result);
      toast.success(`Generated ${result.new_features.length} new features!`);
    } catch {
      toast.error('Polynomial feature generation failed.');
    } finally {
      setPolyLoading(false);
    }
  };

  // ── Feature Selection state ────────────────────────────────────────────────
  const [selMethod, setSelMethod] = useState('correlation');
  const [selTarget, setSelTarget] = useState('');
  const [selK, setSelK] = useState(10);
  const [selLoading, setSelLoading] = useState(false);
  const [selResult, setSelResult] = useState<any | null>(null);

  const handleFeatureSelection = async () => {
    if (!activeDataset) return;
    if (!selTarget) {
      toast.error('Please select a target column.');
      return;
    }
    setSelLoading(true);
    try {
      const result = (await featureSelection(activeDataset.id, {
        target_column: selTarget,
        k: selK,
        problem_type: numericCols.includes(selTarget) ? 'regression' : 'classification',
      })) as any;
      setSelResult(result);
      toast.success(`Selected ${result.selected_features.length} features!`);
    } catch (err: any) {
      toast.error(err?.message ?? 'Feature selection failed.');
    } finally {
      setSelLoading(false);
    }
  };

  // ── Variance Threshold state ───────────────────────────────────────────────
  const [varThreshold, setVarThreshold] = useState(0.01);
  const [varLoading, setVarLoading] = useState(false);
  const [varResult, setVarResult] = useState<VarianceResult | null>(null);

  const handleVarianceThreshold = async () => {
    if (!activeDataset) return;
    setVarLoading(true);
    try {
      const result = (await varianceThreshold(activeDataset.id, varThreshold)) as any;
      setVarResult({
        removed_features: result.removed_features,
        remaining_features: result.kept_features,
      });
      toast.success(`Removed ${result.removed_features.length} low-variance features!`);
    } catch {
      toast.error('Variance threshold failed.');
    } finally {
      setVarLoading(false);
    }
  };

  // ── Empty state ────────────────────────────────────────────────────────────
  if (!activeDataset) {
    return (
      <EmptyState
        title="No Dataset Selected"
        description="Upload or select a dataset to start feature engineering."
        actionText="Upload Dataset"
        actionLink="/dashboard/upload"
      />
    );
  }

  // ── PCA chart data ─────────────────────────────────────────────────────────
  const pcaChartData = pcaResult?.explained_variance_ratio.map((v, i) => ({
    name: `PC${i + 1}`,
    value: parseFloat((v * 100).toFixed(2)),
  })) ?? [];

  const totalExplained = pcaResult
    ? (pcaResult.explained_variance_ratio.reduce((a, b) => a + b, 0) * 100).toFixed(1)
    : null;

  const droppedFeatures = selResult?.all_scores
    ? selResult.all_scores.filter((s: any) => !s.selected).map((s: any) => s.feature)
    : [];

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Page header */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ marginBottom: '28px' }}
      >
        <h1 style={{ margin: 0, fontSize: '28px', fontWeight: 700, color: '#f1f5f9' }}>
          <span className="text-gradient">Feature Engineering</span>
        </h1>
        <p style={{ margin: '6px 0 0', color: '#94a3b8', fontSize: '15px' }}>
          Transform and select features for{' '}
          <strong style={{ color: '#e2e8f0' }}>{activeDataset.filename}</strong>
          {' '}— {numericCols.length} numeric columns available
        </p>
      </motion.div>

      {/* 2-column grid of expandable cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '20px',
          alignItems: 'start',
        }}
      >
        {/* ── 1. PCA ──────────────────────────────────────────────────────── */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0 }}>
          <ExpandableCard
            title="Principal Component Analysis"
            subtitle="Reduce dimensionality while preserving variance"
            icon={<Layers size={20} color="#fff" />}
            accentColor="#8b5cf6"
            accentGradient="linear-gradient(135deg, #7c3aed, #8b5cf6)"
            isExpanded={expanded.pca}
            onToggle={() => toggleExpand('pca')}
          >
            <div style={{ borderTop: '1px solid #2d2f3e', paddingTop: '16px' }}>
              {/* n_components */}
              <div style={{ marginBottom: '16px' }}>
                <label style={labelStyle}>Number of Components</label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={pcaNComponents}
                  onChange={(e) => setPcaNComponents(Number(e.target.value))}
                  style={inputStyle}
                />
              </div>

              {/* Column selection */}
              <MultiSelect
                label="Columns (leave empty for all numeric)"
                options={numericCols}
                selected={pcaColumns}
                onChange={setPcaColumns}
              />

              <button
                className="btn-primary"
                onClick={handleRunPCA}
                disabled={pcaLoading}
                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              >
                {pcaLoading ? <LoadingSpinner size="sm" /> : <Layers size={16} />}
                {pcaLoading ? 'Running PCA…' : 'Run PCA'}
              </button>

              {/* Result */}
              <AnimatePresence>
                {pcaResult && (
                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{ marginTop: '16px' }}
                  >
                    <SuccessBanner message={`PCA complete — ${totalExplained}% total variance explained`} />
                    <p style={labelStyle}>Explained Variance per Component (%)</p>
                    <div className="chart-container" style={{ height: 200 }}>
                      <BarChartComponent
                        data={pcaChartData}
                        color="#8b5cf6"
                        yLabel="Variance %"
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </ExpandableCard>
        </motion.div>

        {/* ── 2. Polynomial Features ──────────────────────────────────────── */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}>
          <ExpandableCard
            title="Polynomial Features"
            subtitle="Create interaction and polynomial terms"
            icon={<TrendingUp size={20} color="#fff" />}
            accentColor="#3b82f6"
            accentGradient="linear-gradient(135deg, #2563eb, #3b82f6)"
            isExpanded={expanded.poly}
            onToggle={() => toggleExpand('poly')}
          >
            <div style={{ borderTop: '1px solid #2d2f3e', paddingTop: '16px' }}>
              {/* Degree */}
              <div style={{ marginBottom: '16px' }}>
                <label style={labelStyle}>Polynomial Degree</label>
                <select
                  value={polyDegree}
                  onChange={(e) => setPolyDegree(Number(e.target.value))}
                  style={{ ...inputStyle, appearance: 'none' }}
                >
                  <option value={2}>2 (Quadratic)</option>
                  <option value={3}>3 (Cubic)</option>
                  <option value={4}>4 (Quartic)</option>
                </select>
              </div>

              {/* Columns */}
              <MultiSelect
                label="Columns (leave empty for all numeric)"
                options={numericCols}
                selected={polyColumns}
                onChange={setPolyColumns}
              />

              {/* Interaction only */}
              <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <input
                  type="checkbox"
                  id="interaction-only"
                  checked={polyInteractionOnly}
                  onChange={(e) => setPolyInteractionOnly(e.target.checked)}
                  style={{ width: 16, height: 16, accentColor: '#6366f1' }}
                />
                <label htmlFor="interaction-only" style={{ color: '#94a3b8', fontSize: '14px', cursor: 'pointer' }}>
                  Interaction Only (no polynomial powers)
                </label>
              </div>

              <button
                className="btn-primary"
                onClick={handlePolyFeatures}
                disabled={polyLoading}
                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', background: 'linear-gradient(135deg, #2563eb, #3b82f6)' }}
              >
                {polyLoading ? <LoadingSpinner size="sm" /> : <TrendingUp size={16} />}
                {polyLoading ? 'Generating…' : 'Generate Features'}
              </button>

              {/* Result */}
              <AnimatePresence>
                {polyResult && (
                  <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} style={{ marginTop: '16px' }}>
                    <SuccessBanner message={`Created ${polyResult.new_features.length} new polynomial features`} />
                    <p style={labelStyle}>New Features</p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', maxHeight: '140px', overflowY: 'auto' }}>
                      {polyResult.new_features.map((f) => (
                        <span key={f} className="badge badge-brand" style={{ fontSize: '11px' }}>
                          {f}
                        </span>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </ExpandableCard>
        </motion.div>

        {/* ── 3. Feature Selection ────────────────────────────────────────── */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16 }}>
          <ExpandableCard
            title="Feature Selection"
            subtitle="Identify and keep only the most informative features"
            icon={<Filter size={20} color="#fff" />}
            accentColor="#10b981"
            accentGradient="linear-gradient(135deg, #059669, #10b981)"
            isExpanded={expanded.selection}
            onToggle={() => toggleExpand('selection')}
          >
            <div style={{ borderTop: '1px solid #2d2f3e', paddingTop: '16px' }}>
              {/* Method */}
              <div style={{ marginBottom: '16px' }}>
                <label style={labelStyle}>Selection Method</label>
                <select
                  value={selMethod}
                  onChange={(e) => setSelMethod(e.target.value)}
                  style={{ ...inputStyle, appearance: 'none' }}
                >
                  <option value="correlation">Correlation (ANOVA / F-Test)</option>
                  <option value="mutual_info">Mutual Information</option>
                  <option value="rfe">Recursive Feature Elimination (RFE)</option>
                </select>
              </div>

              {/* Target column */}
              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>Target Column (Supervised)</label>
                <select
                  value={selTarget}
                  onChange={(e) => setSelTarget(e.target.value)}
                  style={{ ...inputStyle, appearance: 'none' }}
                >
                  <option value="">— Select target —</option>
                  {allCols.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              {/* K */}
              <div style={{ marginBottom: '16px' }}>
                <label style={labelStyle}>Top K Features</label>
                <input
                  type="number"
                  min={1}
                  max={allCols.length}
                  value={selK}
                  onChange={(e) => setSelK(Number(e.target.value))}
                  style={inputStyle}
                />
              </div>

              <button
                className="btn-primary"
                onClick={handleFeatureSelection}
                disabled={selLoading}
                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', background: 'linear-gradient(135deg, #059669, #10b981)' }}
              >
                {selLoading ? <LoadingSpinner size="sm" /> : <Filter size={16} />}
                {selLoading ? 'Selecting…' : 'Select Features'}
              </button>

              {/* Result */}
              <AnimatePresence>
                {selResult && (
                  <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} style={{ marginTop: '16px' }}>
                    <SuccessBanner message={`${selResult.selected_features.length} features selected, ${droppedFeatures.length} dropped`} />

                    <p style={labelStyle}>Selected Features</p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px' }}>
                      {selResult.selected_features.map((f: string) => (
                        <span key={f} className="badge badge-success" style={{ fontSize: '11px' }}>{f}</span>
                      ))}
                    </div>

                    {droppedFeatures.length > 0 && (
                      <>
                        <p style={labelStyle}>Dropped Features</p>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px' }}>
                          {droppedFeatures.map((f: string) => (
                            <span key={f} className="badge badge-danger" style={{ fontSize: '11px' }}>{f}</span>
                          ))}
                        </div>
                      </>
                    )}

                    {selResult.all_scores && selResult.all_scores.length > 0 && (
                      <>
                        <p style={labelStyle}>Feature Scores</p>
                        <div style={{ overflowX: 'auto' }}>
                          <table className="data-table" style={{ width: '100%', fontSize: '12px' }}>
                            <thead>
                              <tr>
                                <th>Feature</th>
                                <th>Score</th>
                              </tr>
                            </thead>
                            <tbody>
                              {Object.entries(selResult.all_scores)
                                .map(([k, v]: any) => [v.feature, v.score])
                                .sort(([, a], [, b]) => b - a)
                                .slice(0, 10)
                                .map(([feat, score]: any) => (
                                  <tr key={feat}>
                                    <td>
                                      <code style={{ color: '#a78bfa', fontSize: '11px' }}>{feat}</code>
                                    </td>
                                    <td style={{ color: '#94a3b8' }}>{score.toFixed(4)}</td>
                                  </tr>
                                ))}
                            </tbody>
                          </table>
                        </div>
                      </>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </ExpandableCard>
        </motion.div>

        {/* ── 4. Variance Threshold ───────────────────────────────────────── */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.24 }}>
          <ExpandableCard
            title="Variance Threshold"
            subtitle="Remove features with very low variance"
            icon={<ZoomIn size={20} color="#fff" />}
            accentColor="#f97316"
            accentGradient="linear-gradient(135deg, #ea580c, #f97316)"
            isExpanded={expanded.variance}
            onToggle={() => toggleExpand('variance')}
          >
            <div style={{ borderTop: '1px solid #2d2f3e', paddingTop: '16px' }}>
              <div style={{ marginBottom: '16px' }}>
                <label style={labelStyle}>Threshold (0.0 – 1.0)</label>
                <input
                  type="number"
                  min={0}
                  max={1}
                  step={0.01}
                  value={varThreshold}
                  onChange={(e) => setVarThreshold(Number(e.target.value))}
                  style={inputStyle}
                />
                <p style={{ margin: '6px 0 0', fontSize: '12px', color: '#475569' }}>
                  Features with variance below this value will be removed.
                </p>
              </div>

              <button
                className="btn-primary"
                onClick={handleVarianceThreshold}
                disabled={varLoading}
                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', background: 'linear-gradient(135deg, #ea580c, #f97316)' }}
              >
                {varLoading ? <LoadingSpinner size="sm" /> : <ZoomIn size={16} />}
                {varLoading ? 'Applying…' : 'Apply Threshold'}
              </button>

              {/* Result */}
              <AnimatePresence>
                {varResult && (
                  <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} style={{ marginTop: '16px' }}>
                    <SuccessBanner message={`${varResult.removed_features.length} features removed, ${varResult.remaining_features.length} remaining`} />

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                      <div
                        style={{
                          background: '#ef444411',
                          border: '1px solid #ef444433',
                          borderRadius: '10px',
                          padding: '12px',
                        }}
                      >
                        <p style={{ margin: 0, fontSize: '11px', color: '#f87171', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                          Removed
                        </p>
                        <p style={{ margin: 0, fontSize: '24px', fontWeight: 700, color: '#f87171' }}>
                          {varResult.removed_features.length}
                        </p>
                      </div>
                      <div
                        style={{
                          background: '#10b98111',
                          border: '1px solid #10b98133',
                          borderRadius: '10px',
                          padding: '12px',
                        }}
                      >
                        <p style={{ margin: 0, fontSize: '11px', color: '#34d399', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                          Remaining
                        </p>
                        <p style={{ margin: 0, fontSize: '24px', fontWeight: 700, color: '#34d399' }}>
                          {varResult.remaining_features.length}
                        </p>
                      </div>
                    </div>

                    {varResult.removed_features.length > 0 && (
                      <>
                        <p style={labelStyle}>Removed Features</p>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                          {varResult.removed_features.map((f) => (
                            <span key={f} className="badge badge-danger" style={{ fontSize: '11px' }}>{f}</span>
                          ))}
                        </div>
                      </>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </ExpandableCard>
        </motion.div>
      </div>
    </div>
  );
};

export default FeatureEngineeringPage;
