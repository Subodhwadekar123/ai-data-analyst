import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../store/useStore';
import { useIsMobile } from '../hooks/useMediaQuery';
import { getFullEDA } from '../services/api';
import SectionHeader from '../components/ui/SectionHeader';
import EmptyState from '../components/ui/EmptyState';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { Activity, BarChart2, TrendingUp, AlertTriangle, Layers, CheckCircle2 } from 'lucide-react';

export default function EDAPage() {
  const { activeDataset } = useStore();
  const isMobile = useIsMobile();
  const [edaData, setEdaData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'summary' | 'distributions' | 'correlations' | 'missing' | 'outliers'>('summary');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (activeDataset) {
      loadEDA();
    }
  }, [activeDataset]);

  const loadEDA = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getFullEDA(activeDataset!.id);
      setEdaData(data);
    } catch (err: any) {
      setError(err?.message || 'Failed to load EDA data');
    } finally {
      setLoading(false);
    }
  };

  if (!activeDataset) {
    return <EmptyState />;
  }

  const tabs = [
    { id: 'summary', label: 'Summary & Profile', icon: Activity },
    { id: 'distributions', label: 'Feature Distributions', icon: BarChart2 },
    { id: 'correlations', label: 'Correlation Matrix', icon: TrendingUp },
    { id: 'missing', label: 'Missing Values & Nulls', icon: Layers },
    { id: 'outliers', label: 'Outlier Diagnostics', icon: AlertTriangle },
  ];

  const summaryNumeric: Record<string, any> = edaData?.summary?.numeric ?? {};
  const summaryCategorical: Record<string, any> = edaData?.summary?.categorical ?? {};
  const qualityScore = edaData?.data_quality_score ?? null;
  const correlationPairs: any[] = edaData?.correlations?.top_correlated_pairs ?? [];
  const missingDetails: any[] = edaData?.missing_values?.columns_detail ?? [];
  const outlierDetails: any[] = edaData?.outliers?.outlier_details ?? [];
  const distributions: Record<string, any> = edaData?.distributions ?? {};

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto', paddingBottom: '40px' }}>
      <SectionHeader
        title="Exploratory Data Analysis"
        subtitle="Automated statistical profiling, correlation heatmaps, and outlier diagnostics"
        icon={<Activity size={20} />}
      />

      {/* Tab Navigation */}
      <div style={{
        display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '8px',
        marginBottom: '20px', borderBottom: '1px solid var(--border-default)'
      }}>
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: isActive ? 'var(--accent-primary-light)' : 'transparent',
                color: isActive ? 'var(--accent-primary)' : 'var(--text-secondary)',
                border: `1px solid ${isActive ? 'var(--accent-primary)' : 'transparent'}`,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                whiteSpace: 'nowrap',
                fontWeight: 600,
                fontSize: '0.82rem',
              }}
            >
              <Icon size={15} /> {tab.label}
            </button>
          );
        })}
      </div>

      {/* Loading / Error / Content */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
          <LoadingSpinner text="Computing automated exploratory analysis..." />
        </div>
      ) : error ? (
        <div style={{ padding: '16px 20px', background: 'rgba(239,68,68,0.1)', color: 'var(--color-danger)', borderRadius: '8px', border: '1px solid var(--border-default)', fontSize: '0.86rem' }}>
          {error}
        </div>
      ) : edaData ? (
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
          >

            {/* SUMMARY TAB */}
            {activeTab === 'summary' && (
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(320px, 1fr))', gap: '18px' }}>

                {/* Data Quality Card */}
                <div className="card-precision" style={{ padding: '20px' }}>
                  <h3 style={{ fontSize: '0.94rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 14px' }}>
                    Data Quality Health
                  </h3>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: '14px' }}>
                    <span style={{ fontSize: '2.4rem', fontWeight: 800, color: 'var(--accent-primary)', letterSpacing: '-0.03em' }}>
                      {qualityScore?.score?.toFixed(0) ?? '—'}
                    </span>
                    <span style={{ fontSize: '1rem', color: 'var(--text-muted)', fontWeight: 600 }}>/100</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {Object.entries(qualityScore?.breakdown ?? {}).map(([key, value]: [string, any]) => (
                      <div key={key}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '0.78rem', color: 'var(--text-secondary)', textTransform: 'capitalize', fontWeight: 600 }}>
                          <span>{key}</span>
                          <span style={{ fontFamily: 'var(--font-family-mono)' }}>{typeof value === 'number' ? value.toFixed(1) : value}%</span>
                        </div>
                        <div style={{ height: 5, borderRadius: 999, background: 'var(--border-default)', overflow: 'hidden' }}>
                          <div style={{ height: '100%', borderRadius: 999, width: `${typeof value === 'number' ? value : 0}%`, background: 'var(--accent-primary)' }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Summary Statistics Table */}
                <div className="card-precision" style={{ padding: '20px', gridColumn: Object.keys(summaryNumeric).length > 0 ? 'span 2' : undefined }}>
                  <h3 style={{ fontSize: '0.94rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 14px' }}>
                    Parametric Summary Statistics
                  </h3>
                  {Object.keys(summaryNumeric).length > 0 ? (
                    <div style={{ overflowX: 'auto', maxHeight: 360 }}>
                      <table className="data-table" style={{ width: '100%', fontSize: '0.8rem' }}>
                        <thead>
                          <tr>
                            {['Column', 'Count', 'Mean', 'Std', 'Min', '25%', '50%', '75%', 'Max'].map(h => (
                              <th key={h} style={{ padding: '8px 12px', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {Object.entries(summaryNumeric).map(([col, stats]: [string, any], idx) => (
                            <tr key={col} style={{ background: idx % 2 === 0 ? 'var(--bg-surface)' : 'var(--bg-canvas)' }}>
                              <td style={{ color: 'var(--accent-primary)', fontWeight: 600, fontFamily: 'var(--font-family-mono)', padding: '7px 12px' }}>{col}</td>
                              <td style={{ fontFamily: 'var(--font-family-mono)', padding: '7px 12px' }}>{stats?.count?.toFixed?.(0) ?? '—'}</td>
                              <td style={{ fontFamily: 'var(--font-family-mono)', padding: '7px 12px' }}>{stats?.mean?.toFixed?.(2) ?? '—'}</td>
                              <td style={{ fontFamily: 'var(--font-family-mono)', padding: '7px 12px' }}>{stats?.std?.toFixed?.(2) ?? '—'}</td>
                              <td style={{ fontFamily: 'var(--font-family-mono)', padding: '7px 12px' }}>{stats?.min?.toFixed?.(2) ?? '—'}</td>
                              <td style={{ fontFamily: 'var(--font-family-mono)', padding: '7px 12px' }}>{stats?.['25%']?.toFixed?.(2) ?? '—'}</td>
                              <td style={{ fontFamily: 'var(--font-family-mono)', padding: '7px 12px' }}>{stats?.['50%']?.toFixed?.(2) ?? '—'}</td>
                              <td style={{ fontFamily: 'var(--font-family-mono)', padding: '7px 12px' }}>{stats?.['75%']?.toFixed?.(2) ?? '—'}</td>
                              <td style={{ fontFamily: 'var(--font-family-mono)', padding: '7px 12px' }}>{stats?.max?.toFixed?.(2) ?? '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.84rem' }}>No numeric columns detected in this dataset.</p>
                  )}
                </div>

                {/* Categorical Summary */}
                {Object.keys(summaryCategorical).length > 0 && (
                  <div className="card-precision" style={{ padding: '20px', gridColumn: '1 / -1' }}>
                    <h3 style={{ fontSize: '0.94rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 14px' }}>
                      Categorical Cardinality & Distributions
                    </h3>
                    <div style={{ overflowX: 'auto', maxHeight: 320 }}>
                      <table className="data-table" style={{ width: '100%', fontSize: '0.8rem' }}>
                        <thead>
                          <tr>
                            {['Column', 'Unique Count', 'Missing Count', 'Top Mode', 'Frequency Sample'].map(h => (
                              <th key={h} style={{ padding: '8px 12px', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {Object.entries(summaryCategorical).map(([col, info]: [string, any], idx) => (
                            <tr key={col} style={{ background: idx % 2 === 0 ? 'var(--bg-surface)' : 'var(--bg-canvas)' }}>
                              <td style={{ color: 'var(--accent-primary)', fontWeight: 600, fontFamily: 'var(--font-family-mono)', padding: '7px 12px' }}>{col}</td>
                              <td style={{ fontFamily: 'var(--font-family-mono)', padding: '7px 12px' }}>{info?.unique_count ?? '—'}</td>
                              <td style={{ fontFamily: 'var(--font-family-mono)', padding: '7px 12px' }}>{info?.missing ?? 0}</td>
                              <td style={{ fontFamily: 'var(--font-family-mono)', padding: '7px 12px' }}>{info?.mode ?? '—'}</td>
                              <td style={{ maxWidth: 360, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', padding: '7px 12px', color: 'var(--text-secondary)' }}>
                                {info?.top_values ? Object.entries(info.top_values).slice(0, 3).map(([k, v]) => `${k} (${v})`).join(', ') : '—'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* DISTRIBUTIONS TAB */}
            {activeTab === 'distributions' && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '16px' }}>
                {Object.keys(distributions).length > 0 ? (
                  Object.entries(distributions).map(([col, dist]: [string, any]) => (
                    <div key={col} className="card-precision" style={{ padding: '18px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                        <h4 style={{ color: 'var(--text-primary)', fontWeight: 700, margin: 0, fontSize: '0.9rem', fontFamily: 'var(--font-family-mono)' }}>{col}</h4>
                        {dist?.skewness_interpretation && (
                          <span className="badge-subtle badge-info" style={{ fontSize: '0.7rem' }}>
                            {dist.skewness_interpretation}
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                        <div>Mean: <span style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-family-mono)' }}>{dist?.mean?.toFixed(2) ?? '—'}</span></div>
                        <div>Median: <span style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-family-mono)' }}>{dist?.median?.toFixed(2) ?? '—'}</span></div>
                        <div>Std: <span style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-family-mono)' }}>{dist?.std?.toFixed(2) ?? '—'}</span></div>
                        <div>IQR: <span style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-family-mono)' }}>{dist?.iqr?.toFixed(2) ?? '—'}</span></div>
                        <div>Min: <span style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-family-mono)' }}>{dist?.min?.toFixed(2) ?? '—'}</span></div>
                        <div>Max: <span style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-family-mono)' }}>{dist?.max?.toFixed(2) ?? '—'}</span></div>
                        <div>Skewness: <span style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-family-mono)' }}>{dist?.skewness?.toFixed(3) ?? '—'}</span></div>
                        <div>Kurtosis: <span style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-family-mono)' }}>{dist?.kurtosis?.toFixed(3) ?? '—'}</span></div>
                      </div>
                      {dist?.normality && (
                        <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid var(--border-subtle)', fontSize: '0.76rem', color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between' }}>
                          <span>Normality ({dist.normality.test}): p={dist.normality.p_value?.toFixed(4)}</span>
                          <span className={`badge-subtle ${dist.normality.is_normal ? 'badge-success' : 'badge-warning'}`} style={{ fontSize: '0.68rem' }}>
                            {dist.normality.is_normal ? 'Gaussian' : 'Non-Gaussian'}
                          </span>
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="card-precision" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    No numeric columns available for distribution modeling.
                  </div>
                )}
              </div>
            )}

            {/* CORRELATIONS TAB */}
            {activeTab === 'correlations' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '18px' }}>
                {edaData?.correlations?.pearson?.columns && (
                  <div className="card-precision" style={{ padding: '20px' }}>
                    <h3 style={{ fontSize: '0.94rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 14px' }}>
                      Pearson Correlation Heatmap Matrix
                    </h3>
                    <div style={{ overflowX: 'auto' }}>
                      <table className="data-table" style={{ fontSize: '0.78rem' }}>
                        <thead>
                          <tr>
                            <th></th>
                            {edaData.correlations.pearson.columns.map((c: string) => (
                              <th key={c} style={{ maxWidth: 90, overflow: 'hidden', textOverflow: 'ellipsis', padding: '6px 8px', fontSize: '0.7rem' }}>{c}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {edaData.correlations.pearson.columns.map((row: string) => (
                            <tr key={row}>
                              <td style={{ color: 'var(--accent-primary)', fontWeight: 600, fontFamily: 'var(--font-family-mono)', padding: '6px 8px' }}>{row}</td>
                              {edaData.correlations.pearson.columns.map((col: string) => {
                                const val = edaData.correlations.pearson.matrix?.[row]?.[col];
                                const absVal = typeof val === 'number' ? Math.abs(val) : 0;
                                return (
                                  <td key={col} style={{
                                    background: absVal > 0.7
                                      ? `var(--accent-primary-light)`
                                      : absVal > 0.3
                                        ? `var(--bg-surface-elevated)`
                                        : 'transparent',
                                    textAlign: 'center',
                                    color: absVal > 0.7 ? 'var(--accent-primary)' : 'var(--text-secondary)',
                                    fontWeight: absVal > 0.7 ? 700 : 400,
                                    fontFamily: 'var(--font-family-mono)',
                                    padding: '6px 8px',
                                  }}>
                                    {typeof val === 'number' ? val.toFixed(2) : '—'}
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Top Correlated Pairs */}
                <div className="card-precision" style={{ padding: '20px' }}>
                  <h3 style={{ fontSize: '0.94rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 14px' }}>
                    Dominant Linear Feature Associations (|r| ≥ 0.5)
                  </h3>
                  {correlationPairs.length > 0 ? (
                    <table className="data-table" style={{ width: '100%', fontSize: '0.8rem' }}>
                      <thead>
                        <tr>
                          {['Feature 1', 'Feature 2', 'Correlation Coefficient', 'Strength', 'Direction'].map(h => (
                            <th key={h} style={{ padding: '8px 12px', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {correlationPairs.map((pair: any, i: number) => (
                          <tr key={i} style={{ background: i % 2 === 0 ? 'var(--bg-surface)' : 'var(--bg-canvas)' }}>
                            <td style={{ fontFamily: 'var(--font-family-mono)', fontWeight: 600, color: 'var(--text-primary)', padding: '8px 12px' }}>{pair.col1 ?? pair.feature1 ?? '—'}</td>
                            <td style={{ fontFamily: 'var(--font-family-mono)', fontWeight: 600, color: 'var(--text-primary)', padding: '8px 12px' }}>{pair.col2 ?? pair.feature2 ?? '—'}</td>
                            <td style={{ padding: '8px 12px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ color: pair.correlation > 0 ? 'var(--color-success)' : 'var(--color-danger)', fontFamily: 'var(--font-family-mono)', fontWeight: 700 }}>
                                  {typeof pair.correlation === 'number' ? pair.correlation.toFixed(4) : '—'}
                                </span>
                                <div style={{ width: '60px', height: '4px', background: 'var(--border-default)', borderRadius: '2px', overflow: 'hidden' }}>
                                  <div style={{
                                    height: '100%',
                                    width: `${Math.abs(pair.correlation ?? 0) * 100}%`,
                                    background: pair.correlation > 0 ? 'var(--color-success)' : 'var(--color-danger)'
                                  }} />
                                </div>
                              </div>
                            </td>
                            <td style={{ padding: '8px 12px' }}>
                              <span className="badge-subtle badge-info" style={{ fontSize: '0.7rem' }}>
                                {pair.strength ?? (Math.abs(pair.correlation) > 0.7 ? 'Strong' : 'Moderate')}
                              </span>
                            </td>
                            <td style={{ textTransform: 'capitalize', color: 'var(--text-secondary)', padding: '8px 12px' }}>{pair.direction ?? (pair.correlation > 0 ? 'positive' : 'negative')}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.84rem' }}>No strongly correlated pairs detected.</p>
                  )}
                </div>
              </div>
            )}

            {/* MISSING VALUES TAB */}
            {activeTab === 'missing' && (
              <div className="card-precision" style={{ padding: '20px' }}>
                <h3 style={{ fontSize: '0.94rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 14px' }}>
                  Null Value & Sparsity Audit
                </h3>

                {edaData?.missing_values && (
                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(auto-fit, minmax(160px, 1fr))', gap: '10px', marginBottom: '20px' }}>
                    {[
                      { label: 'Total Nulls', value: edaData.missing_values.total_missing_values ?? 0 },
                      { label: 'Overall Null %', value: `${edaData.missing_values.overall_missing_percentage ?? 0}%` },
                      { label: 'Sparse Columns', value: edaData.missing_values.columns_with_missing ?? 0 },
                      { label: 'Complete Columns', value: edaData.missing_values.complete_columns ?? 0 },
                      { label: 'Complete Records', value: edaData.missing_values.complete_rows ?? '—' },
                    ].map((stat) => (
                      <div key={stat.label} style={{ background: 'var(--bg-canvas)', padding: '12px 14px', borderRadius: '8px', border: '1px solid var(--border-default)' }}>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '2px' }}>{stat.label}</div>
                        <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)' }}>{stat.value}</div>
                      </div>
                    ))}
                  </div>
                )}

                {missingDetails.length > 0 ? (
                  <table className="data-table" style={{ width: '100%', fontSize: '0.8rem' }}>
                    <thead>
                      <tr>
                        {['Column', 'Missing Count', 'Missing Percentage', 'Remediation Action'].map(h => (
                          <th key={h} style={{ padding: '8px 12px', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {missingDetails.map((item: any, i: number) => (
                        <tr key={i} style={{ background: i % 2 === 0 ? 'var(--bg-surface)' : 'var(--bg-canvas)' }}>
                          <td style={{ fontFamily: 'var(--font-family-mono)', fontWeight: 600, color: 'var(--accent-primary)', padding: '8px 12px' }}>{item.column}</td>
                          <td style={{ fontFamily: 'var(--font-family-mono)', padding: '8px 12px' }}>{item.missing_count}</td>
                          <td style={{ padding: '8px 12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontFamily: 'var(--font-family-mono)' }}>{typeof item.missing_percentage === 'number' ? item.missing_percentage.toFixed(2) : item.missing_percentage}%</span>
                              <div style={{ width: '80px', height: '5px', background: 'var(--border-default)', borderRadius: '3px', overflow: 'hidden' }}>
                                <div style={{
                                  height: '100%',
                                  width: `${item.missing_percentage ?? 0}%`,
                                  background: (item.missing_percentage ?? 0) > 50 ? 'var(--color-danger)' : (item.missing_percentage ?? 0) > 20 ? 'var(--accent-amber)' : 'var(--accent-primary)'
                                }} />
                              </div>
                            </div>
                          </td>
                          <td style={{ padding: '8px 12px' }}>
                            <span className={`badge-subtle ${(item.missing_percentage ?? 0) > 50 ? 'badge-danger' : 'badge-neutral'}`} style={{ fontSize: '0.7rem' }}>
                              {item.recommendation}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div style={{ padding: '36px', textAlign: 'center', color: 'var(--color-success)' }}>
                    <CheckCircle2 size={36} style={{ margin: '0 auto 10px', color: 'var(--color-success)' }} />
                    <h4 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 4px', color: 'var(--text-primary)' }}>Zero Null Values Detected</h4>
                    <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-secondary)' }}>All tabular attributes are 100% complete and populated.</p>
                  </div>
                )}
              </div>
            )}

            {/* OUTLIERS TAB */}
            {activeTab === 'outliers' && (
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(360px, 1fr))', gap: '16px' }}>
                {outlierDetails.length > 0 ? (
                  outlierDetails.map((item: any) => (
                    <div key={item.column} className="card-precision" style={{ padding: '18px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                        <h4 style={{ color: 'var(--text-primary)', fontWeight: 700, margin: 0, fontSize: '0.9rem', fontFamily: 'var(--font-family-mono)' }}>{item.column}</h4>
                        <span className={`badge-subtle ${item.severity === 'high' ? 'badge-danger' : item.severity === 'medium' ? 'badge-warning' : 'badge-neutral'}`} style={{ fontSize: '0.7rem' }}>
                          {item.severity} severity
                        </span>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                        <div>IQR Outliers: <span style={{ color: 'var(--accent-amber)', fontWeight: 700, fontFamily: 'var(--font-family-mono)' }}>{item.iqr_outliers}</span></div>
                        <div>IQR %: <span style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-family-mono)' }}>{item.iqr_outlier_pct?.toFixed(2) ?? '—'}%</span></div>
                        <div>Z-Score Outliers: <span style={{ color: 'var(--accent-amber)', fontWeight: 700, fontFamily: 'var(--font-family-mono)' }}>{item.zscore_outliers}</span></div>
                        <div>Z-Score %: <span style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-family-mono)' }}>{item.zscore_outlier_pct?.toFixed(2) ?? '—'}%</span></div>
                        <div>Lower Bound: <span style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-family-mono)' }}>{item.lower_bound}</span></div>
                        <div>Upper Bound: <span style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-family-mono)' }}>{item.upper_bound}</span></div>
                        <div>Min Value: <span style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-family-mono)' }}>{item.min_value}</span></div>
                        <div>Max Value: <span style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-family-mono)' }}>{item.max_value}</span></div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="card-precision" style={{ padding: '36px', textAlign: 'center', gridColumn: '1 / -1', color: 'var(--color-success)' }}>
                    <CheckCircle2 size={36} style={{ margin: '0 auto 10px', color: 'var(--color-success)' }} />
                    <h4 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 4px', color: 'var(--text-primary)' }}>No Anomalous Outliers Detected</h4>
                    <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-secondary)' }}>All numeric series conform within statistical IQR boundaries.</p>
                  </div>
                )}
              </div>
            )}

          </motion.div>
        </AnimatePresence>
      ) : null}
    </div>
  );
}
