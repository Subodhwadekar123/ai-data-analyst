import React, { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  FileText,
  BarChart3,
  Wand2,
  Sparkles,
  Database,
  ArrowRight,
  Trash2,
  CheckCircle2,
  Layers,
  Table,
  Cpu,
  AlertCircle,
  Copy,
  Activity,
  Hash,
  Type,
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { useIsMobile } from '../hooks/useMediaQuery';
import { getSummary, listDatasets, getQualityScore, deleteDataset } from '../services/api';
import EmptyState from '../components/ui/EmptyState';
import StatCard from '../components/ui/StatCard';
import LoadingSpinner from '../components/ui/LoadingSpinner';

// ---------------------------------------------------------------------------
// Quick action card
// ---------------------------------------------------------------------------
interface QuickActionProps {
  label: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  to: string;
}

const QuickAction: React.FC<QuickActionProps> = ({ label, description, icon, color, to }) => {
  const navigate = useNavigate();
  return (
    <motion.button
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => navigate(to)}
      className="card-precision"
      style={{
        padding: '16px 18px',
        display: 'flex',
        alignItems: 'center',
        gap: '14px',
        cursor: 'pointer',
        textAlign: 'left',
        width: '100%',
      }}
    >
      <div
        style={{
          width: 38,
          height: 38,
          borderRadius: '8px',
          background: 'var(--accent-primary-light)',
          color: color,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, color: 'var(--text-primary)', fontWeight: 600, fontSize: '0.88rem' }}>{label}</p>
        <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.76rem' }}>{description}</p>
      </div>
      <ArrowRight size={15} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
    </motion.button>
  );
};

// ---------------------------------------------------------------------------
// Dataset list item
// ---------------------------------------------------------------------------
interface DatasetItemProps {
  dataset: any;
  isActive: boolean;
  onActivate: (d: any) => void;
  onDelete: (id: string) => void;
}

const DatasetItem: React.FC<DatasetItemProps> = ({ dataset, isActive, onActivate, onDelete }) => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      padding: '10px 12px',
      borderRadius: '8px',
      background: isActive ? 'var(--accent-primary-light)' : 'var(--bg-canvas)',
      border: `1px solid ${isActive ? 'var(--accent-primary)' : 'var(--border-default)'}`,
      transition: 'all 0.15s ease',
    }}
  >
    <Database size={15} style={{ color: isActive ? 'var(--accent-primary)' : 'var(--text-secondary)', flexShrink: 0 }} />
    <div style={{ flex: 1, minWidth: 0 }}>
      <p style={{ margin: 0, color: 'var(--text-primary)', fontSize: '0.82rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {dataset.filename ?? dataset.original_filename ?? 'Unnamed'}
      </p>
      <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.72rem' }}>
        {(dataset.dataset_info?.rows ?? dataset.rows ?? 0).toLocaleString()} rows · {(dataset.file_size_mb ?? 0).toFixed(2)} MB
      </p>
    </div>
    {isActive && (
      <span className="badge-subtle badge-success" style={{ fontSize: '0.7rem' }}>
        Active
      </span>
    )}
    {!isActive && (
      <button
        onClick={() => onActivate(dataset)}
        className="btn-secondary"
        style={{
          padding: '3px 8px',
          fontSize: '0.72rem',
          fontWeight: 600,
        }}
      >
        Select
      </button>
    )}
    <button
      onClick={() => onDelete(dataset.id)}
      style={{
        padding: '4px 6px',
        borderRadius: '6px',
        background: 'transparent',
        border: 'none',
        color: 'var(--text-muted)',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--color-danger)')}
      onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
      title="Delete dataset"
    >
      <Trash2 size={13} />
    </button>
  </div>
);

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------
const DashboardHome: React.FC = () => {
  const {
    activeDataset,
    setActiveDataset,
    datasets,
    removeDataset,
  } = useStore();
  const isMobile = useIsMobile();

  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<any>(null);
  const [qualityScore, setQualityScore] = useState<number | null>(null);
  const [allDatasets, setAllDatasets] = useState<any[]>(datasets);

  const loadData = useCallback(async () => {
    if (!activeDataset) return;
    setLoading(true);
    try {
      const dsId = activeDataset.id ?? (activeDataset as any).dataset_id;
      const [sum, qs, listRes] = await Promise.all([
        getSummary(dsId).catch(() => null),
        getQualityScore(dsId).catch(() => null),
        listDatasets().catch(() => ({ datasets: [] })),
      ]);
      if (sum) setSummary(sum);
      if (qs && typeof qs.score === 'number') setQualityScore(qs.score);
      const datasetList = Array.isArray(listRes) ? listRes : (listRes?.datasets ?? []);
      setAllDatasets(datasetList);
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to load dataset info');
    } finally {
      setLoading(false);
    }
  }, [activeDataset]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleDelete = async (id: string) => {
    try {
      await deleteDataset(id);
      removeDataset(id);
      setAllDatasets(prev => prev.filter(d => d.id !== id));
      if (activeDataset?.id === id) setActiveDataset(null);
      toast.success('Dataset removed');
    } catch (err: any) {
      toast.error(err?.message ?? 'Delete failed');
    }
  };

  if (!activeDataset) {
    return (
      <EmptyState
        title="No Dataset Loaded"
        description="Ingest a structured CSV, Excel, or Parquet dataset to generate real-time exploratory profiles and predictive models."
        actionText="Ingest Dataset"
        actionLink="/dashboard/upload"
      />
    );
  }

  const info = activeDataset.dataset_info ?? {} as any;
  const safeNum = (v: any, fallback = 0) => (typeof v === 'number' ? v : fallback);
  const safeArr = (v: any) => (Array.isArray(v) ? v : []);

  const metrics = [
    { label: 'Total Rows',          value: safeNum(info.rows),                                     icon: <Table size={18} />,       color: 'var(--accent-primary)' },
    { label: 'Total Columns',       value: safeNum(info.columns),                                  icon: <Layers size={18} />,      color: 'var(--accent-indigo)' },
    { label: 'Memory Footprint',    value: `${safeNum(info.memory_usage_mb).toFixed(2)} MB`,       icon: <Cpu size={18} />,         color: 'var(--accent-teal)' },
    { label: 'Missing Values',      value: safeNum(info.missing_values_total),                     icon: <AlertCircle size={18} />, color: 'var(--accent-amber)' },
    { label: 'Duplicate Rows',      value: safeNum(info.duplicate_rows),                           icon: <Copy size={18} />,        color: 'var(--color-danger)' },
    { label: 'Completeness Score',  value: `${safeNum(info.completeness_score, 100).toFixed(1)}%`,icon: <Activity size={18} />,    color: 'var(--color-success)' },
    { label: 'Numeric Features',    value: safeArr(info.column_types?.numeric).length,             icon: <Hash size={18} />,        color: 'var(--accent-primary)' },
    { label: 'Categorical Features',value: safeArr(info.column_types?.categorical).length,         icon: <Type size={18} />,        color: 'var(--accent-amber)' },
  ];

  const container = {
    hidden: {},
    show: { transition: { staggerChildren: 0.04 } },
  };
  const cardVariant = {
    hidden: { opacity: 0, y: 10 },
    show:   { opacity: 1, y: 0, transition: { duration: 0.2 } },
  };

  const columnDetails: any[] = safeArr(info.column_details);

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto' }}>
      {/* Workspace Banner */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '22px', flexWrap: 'wrap', gap: 12 }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: '1.45rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            Dataset Overview
          </h1>
          <p style={{ margin: '3px 0 0', color: 'var(--text-secondary)', fontSize: '0.86rem' }}>
            Telemetry profile and schema properties for active workspace
          </p>
        </div>
        <div
          className="badge-subtle"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '6px 12px',
            fontSize: '0.8rem',
            fontWeight: 600,
            maxWidth: 300,
          }}
        >
          <Database size={13} color="var(--accent-primary)" />
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {activeDataset.filename}
          </span>
        </div>
      </motion.div>

      {/* Loading state */}
      {loading && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
          <LoadingSpinner text="Computing profile and metrics..." />
        </div>
      )}

      {!loading && (
        <>
          {/* Stat Cards Grid */}
          <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(auto-fill, minmax(220px, 1fr))',
              gap: '12px',
              marginBottom: '22px',
            }}
          >
            {metrics.map((m) => (
              <motion.div key={m.label} variants={cardVariant}>
                <StatCard
                  title={m.label}
                  value={m.value}
                  icon={m.icon}
                  color={m.color}
                />
              </motion.div>
            ))}
          </motion.div>

          {/* Two-column section */}
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 340px', gap: '18px', marginBottom: '22px' }}>
            {/* Column details table */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.15 }}
              className="card-precision"
              style={{
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border-default)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h2 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-primary)' }}>Column Schema & Types</h2>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                  {columnDetails.length} Total Columns
                </span>
              </div>
              <div style={{ overflowX: 'auto', maxHeight: 360 }}>
                {columnDetails.length > 0 ? (
                  <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                    <thead>
                      <tr>
                        {['Column Name', 'Type Category', 'Null %', 'Distinct Values'].map(h => (
                          <th key={h} style={{ padding: '9px 14px', textAlign: 'left', color: 'var(--text-secondary)', fontWeight: 700, borderBottom: '1px solid var(--border-default)', backgroundColor: 'var(--bg-canvas)', whiteSpace: 'nowrap', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {columnDetails.map((col: any, i: number) => {
                        const isHighMissing = (col.missing_pct ?? 0) > 20;
                        const isModerateMissing = (col.missing_pct ?? 0) > 5;
                        return (
                          <tr
                            key={col.name ?? i}
                            style={{ background: i % 2 === 0 ? 'var(--bg-surface)' : 'var(--bg-canvas)', transition: 'background 0.1s ease' }}
                          >
                            <td style={{ padding: '8px 14px', color: 'var(--text-primary)', fontWeight: 600, borderBottom: '1px solid var(--border-subtle)', fontFamily: 'var(--font-family-mono)', fontSize: '0.78rem' }}>
                              {col.name}
                            </td>
                            <td style={{ padding: '8px 14px', borderBottom: '1px solid var(--border-subtle)' }}>
                              <span
                                className={`badge-subtle ${
                                  col.type_category === 'numeric' ? 'badge-info' :
                                  col.type_category === 'categorical' ? 'badge-warning' :
                                  'badge-neutral'
                                }`}
                                style={{ fontSize: '0.7rem' }}
                              >
                                {col.type_category}
                              </span>
                            </td>
                            <td style={{ padding: '8px 14px', borderBottom: '1px solid var(--border-subtle)', fontFamily: 'var(--font-family-mono)', fontSize: '0.78rem', color: isHighMissing ? 'var(--color-danger)' : isModerateMissing ? 'var(--accent-amber)' : 'var(--color-success)' }}>
                              {safeNum(col.missing_pct).toFixed(1)}%
                            </td>
                            <td style={{ padding: '8px 14px', color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-subtle)', fontFamily: 'var(--font-family-mono)', fontSize: '0.78rem' }}>
                              {safeNum(col.unique_count).toLocaleString()}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                ) : (
                  <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    No column details available.
                  </div>
                )}
              </div>
            </motion.div>

            {/* Datasets drawer */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="card-precision"
              style={{
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border-default)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h2 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-primary)' }}>Workspace Datasets</h2>
                <button
                  onClick={() => window.location.href = '/dashboard/upload'}
                  className="btn-secondary"
                  style={{ padding: '3px 8px', fontSize: '0.72rem' }}
                >
                  + Add
                </button>
              </div>
              <div style={{ flex: 1, overflowY: 'auto', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: 360 }}>
                {allDatasets.length === 0 && (
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', textAlign: 'center', padding: '20px 0' }}>
                    No datasets available
                  </p>
                )}
                {allDatasets.map((d: any) => (
                  <DatasetItem
                    key={d.id}
                    dataset={d}
                    isActive={activeDataset.id === d.id}
                    onActivate={setActiveDataset}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            </motion.div>
          </div>

          {/* Quick Actions */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
          >
            <h2 style={{ margin: '0 0 12px', fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              Analysis Workflows
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(260px, 1fr))', gap: '12px' }}>
              <QuickAction
                label="Exploratory Data Analysis"
                description="Distributions, correlations & outlier diagnostics"
                icon={<Layers size={18} />}
                color="var(--accent-primary)"
                to="/dashboard/eda"
              />
              <QuickAction
                label="Visual Analytics Studio"
                description="Interactive multi-dimensional charts & export"
                icon={<BarChart3 size={18} />}
                color="var(--accent-teal)"
                to="/dashboard/visualization"
              />
              <QuickAction
                label="Data Transformation & Cleaning"
                description="Imputation, outlier clipping & encoding"
                icon={<Wand2 size={18} />}
                color="var(--accent-indigo)"
                to="/dashboard/cleaning"
              />
              <QuickAction
                label="AI Executive Intelligence"
                description="Conversational Q&A and narrative briefings"
                icon={<Sparkles size={18} />}
                color="var(--accent-amber)"
                to="/dashboard/ai-insights"
              />
            </div>
          </motion.div>
        </>
      )}
    </div>
  );
};

export default DashboardHome;
