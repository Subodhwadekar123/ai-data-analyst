import React, { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useStore } from '../store/useStore';
import type { UploadedDataset } from '../store/useStore';
import { getSummary, listDatasets, getQualityScore, deleteDataset } from '../services/api';
import EmptyState from '../components/ui/EmptyState';
import StatCard from '../components/ui/StatCard';
import LoadingSpinner from '../components/ui/LoadingSpinner';

// ---------------------------------------------------------------------------
// Icon helpers (inline SVG, no external dep)
// ---------------------------------------------------------------------------
const Icon: React.FC<{ d: string; color?: string; size?: number }> = ({ d, color = '#6366f1', size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);

const ICONS = {
  rows:        'M3 5h18M3 10h18M3 15h18M3 20h18',
  columns:     'M12 3v18M6 3v18M18 3v18',
  memory:      'M20 7H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2zM12 12h.01',
  missing:     'M12 8v4m0 4h.01M21 12A9 9 0 1 1 3 12a9 9 0 0 1 18 0z',
  duplicate:   'M8 16H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v2m-6 12h8a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2h-8a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2z',
  quality:     'M9 12l2 2 4-4M21 12A9 9 0 1 1 3 12a9 9 0 0 1 18 0z',
  numeric:     'M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4v16',
  categorical: 'M4 6h16M4 10h16M4 14h8M4 18h4',
};

// ---------------------------------------------------------------------------
// Quick action card
// ---------------------------------------------------------------------------
interface QuickActionProps {
  label: string;
  description: string;
  icon: string;
  color: string;
  to: string;
}

const QuickAction: React.FC<QuickActionProps> = ({ label, description, icon, color, to }) => {
  const navigate = useNavigate();
  return (
    <motion.button
      whileHover={{ scale: 1.03, y: -2 }}
      whileTap={{ scale: 0.97 }}
      onClick={() => navigate(to)}
      style={{
        background: 'rgba(26, 29, 39, 0.8)',
        border: '1px solid #2d2f3e',
        borderRadius: '12px',
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: '14px',
        cursor: 'pointer',
        textAlign: 'left',
        width: '100%',
        transition: 'border-color 0.2s',
      }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = color)}
      onMouseLeave={e => (e.currentTarget.style.borderColor = '#2d2f3e')}
    >
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: '10px',
          background: `${color}20`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <Icon d={icon} color={color} size={20} />
      </div>
      <div>
        <p style={{ margin: 0, color: '#e2e8f0', fontWeight: 600, fontSize: '0.9rem' }}>{label}</p>
        <p style={{ margin: 0, color: '#6b7090', fontSize: '0.78rem' }}>{description}</p>
      </div>
      <div style={{ marginLeft: 'auto', color: '#6b7090' }}>→</div>
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
      gap: '12px',
      padding: '10px 12px',
      borderRadius: '10px',
      background: isActive ? 'rgba(99,102,241,0.1)' : 'rgba(37,40,54,0.5)',
      border: `1px solid ${isActive ? 'rgba(99,102,241,0.4)' : '#2d2f3e'}`,
      transition: 'all 0.2s',
    }}
  >
    <div style={{ flex: 1, minWidth: 0 }}>
      <p style={{ margin: 0, color: '#e2e8f0', fontSize: '0.85rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {dataset.filename ?? dataset.original_filename ?? 'Unnamed'}
      </p>
      <p style={{ margin: 0, color: '#6b7090', fontSize: '0.75rem' }}>
        {(dataset.dataset_info?.rows ?? dataset.rows ?? 0).toLocaleString()} rows · {(dataset.file_size_mb ?? 0).toFixed(2)} MB
      </p>
    </div>
    {isActive && (
      <span
        style={{
          padding: '2px 8px',
          borderRadius: 999,
          background: 'rgba(99,102,241,0.2)',
          color: '#6366f1',
          fontSize: '0.7rem',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
        }}
      >
        Active
      </span>
    )}
    {!isActive && (
      <button
        onClick={() => onActivate(dataset)}
        style={{
          padding: '4px 10px',
          borderRadius: '6px',
          background: 'rgba(99,102,241,0.15)',
          border: '1px solid rgba(99,102,241,0.3)',
          color: '#6366f1',
          fontSize: '0.75rem',
          cursor: 'pointer',
          fontWeight: 600,
        }}
      >
        Activate
      </button>
    )}
    <button
      onClick={() => onDelete(dataset.id)}
      style={{
        padding: '4px 8px',
        borderRadius: '6px',
        background: 'rgba(239,68,68,0.1)',
        border: '1px solid rgba(239,68,68,0.2)',
        color: '#ef4444',
        fontSize: '0.75rem',
        cursor: 'pointer',
        fontWeight: 600,
      }}
    >
      ✕
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
    addDataset,
    removeDataset,
  } = useStore();

  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<any>(null);
  const [qualityScore, setQualityScore] = useState<number | null>(null);
  const [allDatasets, setAllDatasets] = useState<any[]>(datasets);

  // ---------------------------------------------------------------------------
  // Load summary + quality + dataset list when activeDataset changes
  // ---------------------------------------------------------------------------
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
      // listDatasets returns { datasets: [...], total: N } — extract the array
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

  // ---------------------------------------------------------------------------
  // Delete
  // ---------------------------------------------------------------------------
  const handleDelete = async (id: string) => {
    try {
      await deleteDataset(id);
      removeDataset(id);
      setAllDatasets(prev => prev.filter(d => d.id !== id));
      if (activeDataset?.id === id) setActiveDataset(null);
      toast.success('Dataset deleted');
    } catch (err: any) {
      toast.error(err?.message ?? 'Delete failed');
    }
  };

  // ---------------------------------------------------------------------------
  // No active dataset → empty state
  // ---------------------------------------------------------------------------
  if (!activeDataset) {
    return (
      <EmptyState
        title="No dataset loaded"
        description="Upload a CSV, Excel, or JSON file to start exploring your data with AI-powered analysis."
        actionText="Upload Dataset"
        actionLink="/dashboard/upload"
      />
    );
  }

  // ---------------------------------------------------------------------------
  // Safely extract dataset info — handles both upload response shapes
  // ---------------------------------------------------------------------------
  const info = activeDataset.dataset_info ?? {} as any;
  const safeNum = (v: any, fallback = 0) => (typeof v === 'number' ? v : fallback);
  const safeArr = (v: any) => (Array.isArray(v) ? v : []);

  const metrics = [
    { label: 'Total Rows',          value: safeNum(info.rows).toLocaleString(),                             icon: ICONS.rows,        color: '#6366f1' },
    { label: 'Total Columns',       value: safeNum(info.columns).toString(),                                icon: ICONS.columns,     color: '#8b5cf6' },
    { label: 'Memory Usage',        value: `${safeNum(info.memory_usage_mb).toFixed(2)} MB`,                icon: ICONS.memory,      color: '#a855f7' },
    { label: 'Missing Values',      value: safeNum(info.missing_values_total).toLocaleString(),             icon: ICONS.missing,     color: '#f59e0b' },
    { label: 'Duplicate Rows',      value: safeNum(info.duplicate_rows).toLocaleString(),                   icon: ICONS.duplicate,   color: '#ef4444' },
    { label: 'Quality Score',       value: `${safeNum(info.completeness_score).toFixed(1)}%`,               icon: ICONS.quality,     color: '#22c55e' },
    { label: 'Numeric Columns',     value: safeArr(info.column_types?.numeric).length.toString(),           icon: ICONS.numeric,     color: '#06b6d4' },
    { label: 'Categorical Columns', value: safeArr(info.column_types?.categorical).length.toString(),       icon: ICONS.categorical, color: '#f97316' },
  ];

  // ---------------------------------------------------------------------------
  // Stagger variants
  // ---------------------------------------------------------------------------
  const container = {
    hidden: {},
    show: { transition: { staggerChildren: 0.06 } },
  };
  const cardVariant = {
    hidden: { opacity: 0, y: 20 },
    show:   { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 260, damping: 22 } },
  };

  // ---------------------------------------------------------------------------
  // Column details — safely extracted
  // ---------------------------------------------------------------------------
  const columnDetails: any[] = safeArr(info.column_details);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div style={{ padding: '24px', maxWidth: 1400, margin: '0 auto' }}>
      {/* ---- Header ---- */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '28px' }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 700, color: '#e2e8f0' }}>
            Dataset Overview
          </h1>
          <p style={{ margin: '4px 0 0', color: '#6b7090', fontSize: '0.88rem' }}>
            Explore your data at a glance
          </p>
        </div>
        <span
          style={{
            marginLeft: 'auto',
            padding: '5px 14px',
            borderRadius: 999,
            background: 'rgba(99,102,241,0.15)',
            border: '1px solid rgba(99,102,241,0.3)',
            color: '#6366f1',
            fontSize: '0.82rem',
            fontWeight: 600,
            maxWidth: 260,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          📁 {activeDataset.filename}
        </span>
      </motion.div>

      {/* ---- Loading state ---- */}
      {loading && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
          <LoadingSpinner />
        </div>
      )}

      {!loading && (
        <>
          {/* ---- Metric cards 2×4 grid ---- */}
          <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
              gap: '14px',
              marginBottom: '28px',
            }}
          >
            {metrics.map((m) => (
              <motion.div key={m.label} variants={cardVariant}>
                <StatCard
                  title={m.label}
                  value={m.value}
                  icon={<Icon d={m.icon} color={m.color} size={20} />}
                  color={m.color}
                />
              </motion.div>
            ))}
          </motion.div>

          {/* ---- Two-column section ---- */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '20px', marginBottom: '28px' }}>
            {/* ---- Column details table ---- */}
            <motion.div
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.35 }}
              style={{
                background: 'rgba(26, 29, 39, 0.8)',
                border: '1px solid #2d2f3e',
                borderRadius: '14px',
                overflow: 'hidden',
              }}
            >
              <div style={{ padding: '16px 20px', borderBottom: '1px solid #2d2f3e' }}>
                <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#e2e8f0' }}>Column Details</h2>
              </div>
              <div style={{ overflowX: 'auto' }}>
                {columnDetails.length > 0 ? (
                  <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.83rem' }}>
                    <thead>
                      <tr style={{ background: 'rgba(37,40,54,0.6)' }}>
                        {['Column', 'Type', 'Missing %', 'Unique Count'].map(h => (
                          <th key={h} style={{ padding: '10px 14px', textAlign: 'left', color: '#6b7090', fontWeight: 600, borderBottom: '1px solid #2d2f3e', whiteSpace: 'nowrap' }}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {columnDetails.map((col: any, i: number) => (
                        <tr
                          key={col.name ?? i}
                          style={{ background: i % 2 === 0 ? 'transparent' : 'rgba(37,40,54,0.3)', transition: 'background 0.15s' }}
                          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(99,102,241,0.06)')}
                          onMouseLeave={e => (e.currentTarget.style.background = i % 2 === 0 ? 'transparent' : 'rgba(37,40,54,0.3)')}
                        >
                          <td style={{ padding: '9px 14px', color: '#e2e8f0', fontWeight: 500, borderBottom: '1px solid rgba(45,47,62,0.5)' }}>
                            {col.name}
                          </td>
                          <td style={{ padding: '9px 14px', borderBottom: '1px solid rgba(45,47,62,0.5)' }}>
                            <span
                              style={{
                                padding: '2px 8px',
                                borderRadius: 999,
                                fontSize: '0.73rem',
                                fontWeight: 600,
                                background:
                                  col.type_category === 'numeric'     ? 'rgba(6,182,212,0.15)'   :
                                  col.type_category === 'categorical' ? 'rgba(249,115,22,0.15)'  :
                                  col.type_category === 'datetime'    ? 'rgba(139,92,246,0.15)'  :
                                  'rgba(99,102,241,0.15)',
                                color:
                                  col.type_category === 'numeric'     ? '#06b6d4' :
                                  col.type_category === 'categorical' ? '#f97316' :
                                  col.type_category === 'datetime'    ? '#8b5cf6' :
                                  '#6366f1',
                              }}
                            >
                              {col.type_category}
                            </span>
                          </td>
                          <td style={{ padding: '9px 14px', color: (col.missing_pct ?? 0) > 20 ? '#ef4444' : (col.missing_pct ?? 0) > 5 ? '#f59e0b' : '#22c55e', borderBottom: '1px solid rgba(45,47,62,0.5)' }}>
                            {safeNum(col.missing_pct).toFixed(1)}%
                          </td>
                          <td style={{ padding: '9px 14px', color: '#6b7090', borderBottom: '1px solid rgba(45,47,62,0.5)' }}>
                            {safeNum(col.unique_count).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div style={{ padding: '40px', textAlign: 'center', color: '#6b7090' }}>
                    No column details available.
                  </div>
                )}
              </div>
            </motion.div>

            {/* ---- Recent Datasets ---- */}
            <motion.div
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              style={{
                background: 'rgba(26, 29, 39, 0.8)',
                border: '1px solid #2d2f3e',
                borderRadius: '14px',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <div style={{ padding: '16px 20px', borderBottom: '1px solid #2d2f3e' }}>
                <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#e2e8f0' }}>Recent Datasets</h2>
              </div>
              <div style={{ flex: 1, overflowY: 'auto', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {allDatasets.length === 0 && (
                  <p style={{ color: '#6b7090', fontSize: '0.85rem', textAlign: 'center', padding: '20px 0' }}>
                    No datasets yet
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

          {/* ---- Quick Actions ---- */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <h2 style={{ margin: '0 0 14px', fontSize: '1rem', fontWeight: 700, color: '#e2e8f0' }}>
              Quick Actions
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '12px' }}>
              <QuickAction
                label="Exploratory Analysis"
                description="Distributions, correlations & outliers"
                icon="M3 3h18v18H3zM9 9h6M9 12h6M9 15h4"
                color="#6366f1"
                to="/dashboard/eda"
              />
              <QuickAction
                label="Visualizations"
                description="Charts, heatmaps & custom plots"
                icon="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4v16"
                color="#8b5cf6"
                to="/dashboard/visualization"
              />
              <QuickAction
                label="Data Cleaning"
                description="Handle missing values, outliers & more"
                icon="M12 3l.01 9.93M12 21a9 9 0 0 0 0-18"
                color="#a855f7"
                to="/dashboard/cleaning"
              />
              <QuickAction
                label="AI Insights"
                description="Natural language Q&A on your data"
                icon="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
                color="#06b6d4"
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
