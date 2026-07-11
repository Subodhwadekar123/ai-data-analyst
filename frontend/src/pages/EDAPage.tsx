import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../store/useStore';
import { getFullEDA } from '../services/api';
import SectionHeader from '../components/ui/SectionHeader';
import EmptyState from '../components/ui/EmptyState';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { Activity, BarChart2, TrendingUp, AlertTriangle, Layers } from 'lucide-react';

/**
 * EDAPage – Exploratory Data Analysis
 * ====================================
 * Backend returns from /analysis/{id}/eda:
 *   {
 *     summary:            { numeric: { col: {count,mean,std,...} }, categorical: {...} }
 *     distributions:      { col: { histogram:{counts,bin_edges}, normality, skewness, ... } }
 *     correlations:       { pearson: {matrix,columns}, top_correlated_pairs: [{col1,col2,correlation,strength,direction}] }
 *     missing_values:     { total_missing_values, columns_with_missing (int), columns_detail: [{column,missing_count,missing_percentage,recommendation}] }
 *     outliers:           { columns_with_outliers (int), outlier_details: [{column,iqr_outliers,iqr_outlier_pct,...}] }
 *     feature_insights:   { ... }
 *     business_insights:  { ... }
 *     data_quality_score: { score, grade, breakdown: {completeness,uniqueness,consistency,validity} }
 *   }
 */

export default function EDAPage() {
  const { activeDataset } = useStore();
  const [edaData, setEdaData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'summary' | 'distributions' | 'correlations' | 'missing' | 'outliers'>('summary');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (activeDataset) {
      loadEDA();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // ── No dataset selected ──────────────────────────────────────────────────
  if (!activeDataset) {
    return <EmptyState />;
  }

  const tabs = [
    { id: 'summary', label: 'Summary', icon: Activity },
    { id: 'distributions', label: 'Distributions', icon: BarChart2 },
    { id: 'correlations', label: 'Correlations', icon: TrendingUp },
    { id: 'missing', label: 'Missing Values', icon: Layers },
    { id: 'outliers', label: 'Outliers', icon: AlertTriangle },
  ];

  // ── Safely extract data using ACTUAL backend key names ───────────────────
  const summaryNumeric: Record<string, any> = edaData?.summary?.numeric ?? {};
  const summaryCategorical: Record<string, any> = edaData?.summary?.categorical ?? {};
  const qualityScore = edaData?.data_quality_score ?? null;
  const correlationPairs: any[] = edaData?.correlations?.top_correlated_pairs ?? [];
  const missingDetails: any[] = edaData?.missing_values?.columns_detail ?? [];
  const outlierDetails: any[] = edaData?.outliers?.outlier_details ?? [];
  const distributions: Record<string, any> = edaData?.distributions ?? {};

  return (
    <div style={{ paddingBottom: '40px' }}>
      <SectionHeader
        title="Exploratory Data Analysis"
        subtitle="Comprehensive automated analysis of your dataset."
        icon={<Activity />}
      />

      {/* ── Tab Bar ──────────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '12px',
        marginBottom: '24px', borderBottom: '1px solid #2d2f3e'
      }}>
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              style={{
                padding: '10px 20px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px',
                background: isActive ? 'rgba(99,102,241,0.1)' : 'transparent',
                color: isActive ? '#818cf8' : '#94a3b8',
                border: `1px solid ${isActive ? 'rgba(99,102,241,0.2)' : 'transparent'}`,
                cursor: 'pointer', transition: 'all 0.2s', whiteSpace: 'nowrap'
              }}
            >
              <Icon size={16} /> {tab.label}
            </button>
          );
        })}
      </div>

      {/* ── Loading / Error / Content ────────────────────────────────────── */}
      {loading ? (
        <LoadingSpinner text="Running automated EDA..." />
      ) : error ? (
        <div style={{ padding: '20px', background: 'rgba(239,68,68,0.1)', color: '#fca5a5', borderRadius: '12px', border: '1px solid rgba(239,68,68,0.2)' }}>
          {error}
        </div>
      ) : edaData ? (
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >

            {/* ════════════════════════ SUMMARY TAB ════════════════════════ */}
            {activeTab === 'summary' && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>

                {/* Data Quality Card */}
                <div className="card" style={{ padding: '24px' }}>
                  <h3 style={{ fontSize: '1.1rem', color: '#e2e8f0', marginBottom: '16px' }}>Data Quality</h3>
                  <div style={{ fontSize: '3rem', fontWeight: 800, color: '#6366f1', marginBottom: '8px' }}>
                    {qualityScore?.score?.toFixed(0) ?? '—'}/100
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '20px' }}>
                    {Object.entries(qualityScore?.breakdown ?? {}).map(([key, value]: [string, any]) => (
                      <div key={key}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '0.85rem', color: '#94a3b8', textTransform: 'capitalize' }}>
                          <span>{key}</span>
                          <span>{typeof value === 'number' ? value.toFixed(1) : value}%</span>
                        </div>
                        <div className="progress-bar">
                          <div className="progress-bar-fill" style={{ width: `${typeof value === 'number' ? value : 0}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Summary Statistics Table */}
                <div className="card" style={{ padding: '24px', gridColumn: Object.keys(summaryNumeric).length > 0 ? 'span 2' : undefined }}>
                  <h3 style={{ fontSize: '1.1rem', color: '#e2e8f0', marginBottom: '16px' }}>Summary Statistics</h3>
                  {Object.keys(summaryNumeric).length > 0 ? (
                    <div style={{ overflowX: 'auto' }}>
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>Column</th>
                            <th>Count</th>
                            <th>Mean</th>
                            <th>Std</th>
                            <th>Min</th>
                            <th>25%</th>
                            <th>50%</th>
                            <th>75%</th>
                            <th>Max</th>
                          </tr>
                        </thead>
                        <tbody>
                          {Object.entries(summaryNumeric).map(([col, stats]: [string, any]) => (
                            <tr key={col}>
                              <td style={{ color: '#818cf8', fontWeight: 500 }}>{col}</td>
                              <td>{stats?.count?.toFixed?.(0) ?? '—'}</td>
                              <td>{stats?.mean?.toFixed?.(2) ?? '—'}</td>
                              <td>{stats?.std?.toFixed?.(2) ?? '—'}</td>
                              <td>{stats?.min?.toFixed?.(2) ?? '—'}</td>
                              <td>{stats?.['25%']?.toFixed?.(2) ?? '—'}</td>
                              <td>{stats?.['50%']?.toFixed?.(2) ?? '—'}</td>
                              <td>{stats?.['75%']?.toFixed?.(2) ?? '—'}</td>
                              <td>{stats?.max?.toFixed?.(2) ?? '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p style={{ color: '#94a3b8' }}>No numeric columns found in this dataset.</p>
                  )}
                </div>

                {/* Categorical Summary */}
                {Object.keys(summaryCategorical).length > 0 && (
                  <div className="card" style={{ padding: '24px', gridColumn: 'span 2' }}>
                    <h3 style={{ fontSize: '1.1rem', color: '#e2e8f0', marginBottom: '16px' }}>Categorical Summary</h3>
                    <div style={{ overflowX: 'auto' }}>
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>Column</th>
                            <th>Unique</th>
                            <th>Missing</th>
                            <th>Mode</th>
                            <th>Top Values</th>
                          </tr>
                        </thead>
                        <tbody>
                          {Object.entries(summaryCategorical).map(([col, info]: [string, any]) => (
                            <tr key={col}>
                              <td style={{ color: '#818cf8', fontWeight: 500 }}>{col}</td>
                              <td>{info?.unique_count ?? '—'}</td>
                              <td>{info?.missing ?? 0}</td>
                              <td>{info?.mode ?? '—'}</td>
                              <td style={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
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

            {/* ════════════════════════ DISTRIBUTIONS TAB ════════════════════════ */}
            {activeTab === 'distributions' && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '20px' }}>
                {Object.keys(distributions).length > 0 ? (
                  Object.entries(distributions).map(([col, dist]: [string, any]) => (
                    <div key={col} className="card" style={{ padding: '24px' }}>
                      <h4 style={{ color: '#e2e8f0', fontWeight: 600, marginBottom: '12px' }}>{col}</h4>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.85rem', color: '#94a3b8' }}>
                        <div>Mean: <span style={{ color: '#e2e8f0' }}>{dist?.mean?.toFixed(2) ?? '—'}</span></div>
                        <div>Median: <span style={{ color: '#e2e8f0' }}>{dist?.median?.toFixed(2) ?? '—'}</span></div>
                        <div>Std: <span style={{ color: '#e2e8f0' }}>{dist?.std?.toFixed(2) ?? '—'}</span></div>
                        <div>IQR: <span style={{ color: '#e2e8f0' }}>{dist?.iqr?.toFixed(2) ?? '—'}</span></div>
                        <div>Min: <span style={{ color: '#e2e8f0' }}>{dist?.min?.toFixed(2) ?? '—'}</span></div>
                        <div>Max: <span style={{ color: '#e2e8f0' }}>{dist?.max?.toFixed(2) ?? '—'}</span></div>
                        <div>Skewness: <span style={{ color: '#e2e8f0' }}>{dist?.skewness?.toFixed(3) ?? '—'}</span></div>
                        <div>Kurtosis: <span style={{ color: '#e2e8f0' }}>{dist?.kurtosis?.toFixed(3) ?? '—'}</span></div>
                      </div>
                      {dist?.skewness_interpretation && (
                        <div style={{ marginTop: '10px' }}>
                          <span className="badge badge-info">{dist.skewness_interpretation}</span>
                        </div>
                      )}
                      {dist?.normality && (
                        <div style={{ marginTop: '8px', fontSize: '0.82rem', color: '#94a3b8' }}>
                          Normality ({dist.normality.test}): p={dist.normality.p_value?.toFixed(4)}
                          {' — '}
                          <span style={{ color: dist.normality.is_normal ? '#10b981' : '#f59e0b' }}>
                            {dist.normality.is_normal ? 'Normal' : 'Non-normal'}
                          </span>
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="card" style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                    No numeric columns to show distributions.
                  </div>
                )}
              </div>
            )}

            {/* ════════════════════════ CORRELATIONS TAB ════════════════════════ */}
            {activeTab === 'correlations' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px' }}>

                {/* Correlation Heatmap Summary */}
                {edaData?.correlations?.pearson?.columns && (
                  <div className="card" style={{ padding: '24px' }}>
                    <h3 style={{ fontSize: '1.1rem', color: '#e2e8f0', marginBottom: '16px' }}>Correlation Matrix</h3>
                    <div style={{ overflowX: 'auto' }}>
                      <table className="data-table" style={{ fontSize: '0.8rem' }}>
                        <thead>
                          <tr>
                            <th></th>
                            {edaData.correlations.pearson.columns.map((c: string) => (
                              <th key={c} style={{ maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis' }}>{c}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {edaData.correlations.pearson.columns.map((row: string) => (
                            <tr key={row}>
                              <td style={{ color: '#818cf8', fontWeight: 500 }}>{row}</td>
                              {edaData.correlations.pearson.columns.map((col: string) => {
                                const val = edaData.correlations.pearson.matrix?.[row]?.[col];
                                const absVal = typeof val === 'number' ? Math.abs(val) : 0;
                                return (
                                  <td key={col} style={{
                                    background: absVal > 0.7
                                      ? `rgba(99,102,241,${absVal * 0.4})`
                                      : absVal > 0.3
                                        ? `rgba(99,102,241,${absVal * 0.2})`
                                        : 'transparent',
                                    textAlign: 'center',
                                    color: absVal > 0.7 ? '#e2e8f0' : '#94a3b8'
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
                <div className="card" style={{ padding: '24px' }}>
                  <h3 style={{ fontSize: '1.1rem', color: '#e2e8f0', marginBottom: '16px' }}>Top Correlated Pairs</h3>
                  {correlationPairs.length > 0 ? (
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Feature 1</th>
                          <th>Feature 2</th>
                          <th>Correlation</th>
                          <th>Strength</th>
                          <th>Direction</th>
                        </tr>
                      </thead>
                      <tbody>
                        {correlationPairs.map((pair: any, i: number) => (
                          <tr key={i}>
                            {/* Backend sends col1/col2 — NOT feature1/feature2 */}
                            <td>{pair.col1 ?? pair.feature1 ?? '—'}</td>
                            <td>{pair.col2 ?? pair.feature2 ?? '—'}</td>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ color: pair.correlation > 0 ? '#10b981' : '#ef4444' }}>
                                  {typeof pair.correlation === 'number' ? pair.correlation.toFixed(4) : '—'}
                                </span>
                                <div style={{ width: '50px', height: '4px', background: '#2d2f3e', borderRadius: '2px', overflow: 'hidden' }}>
                                  <div style={{
                                    height: '100%',
                                    width: `${Math.abs(pair.correlation ?? 0) * 100}%`,
                                    background: pair.correlation > 0 ? '#10b981' : '#ef4444'
                                  }} />
                                </div>
                              </div>
                            </td>
                            <td>
                              <span className={`badge badge-${pair.strength === 'very strong' || pair.strength === 'strong' ? 'success' : 'info'}`}>
                                {pair.strength ?? (Math.abs(pair.correlation) > 0.7 ? 'Strong' : 'Moderate')}
                              </span>
                            </td>
                            <td>{pair.direction ?? (pair.correlation > 0 ? 'positive' : 'negative')}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <p style={{ color: '#94a3b8' }}>No highly correlated pairs found (threshold: |r| ≥ 0.5).</p>
                  )}
                </div>
              </div>
            )}

            {/* ════════════════════════ MISSING VALUES TAB ════════════════════════ */}
            {activeTab === 'missing' && (
              <div className="card" style={{ padding: '24px' }}>
                <h3 style={{ fontSize: '1.1rem', color: '#e2e8f0', marginBottom: '16px' }}>Missing Values Report</h3>

                {/* Overall stats */}
                {edaData?.missing_values && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '24px' }}>
                    {[
                      { label: 'Total Missing', value: edaData.missing_values.total_missing_values ?? 0 },
                      { label: 'Overall %', value: `${edaData.missing_values.overall_missing_percentage ?? 0}%` },
                      { label: 'Cols with Missing', value: edaData.missing_values.columns_with_missing ?? 0 },
                      { label: 'Complete Columns', value: edaData.missing_values.complete_columns ?? 0 },
                      { label: 'Complete Rows', value: edaData.missing_values.complete_rows ?? '—' },
                    ].map((stat) => (
                      <div key={stat.label} style={{ background: '#1a1d27', padding: '16px', borderRadius: '10px', border: '1px solid #2d2f3e' }}>
                        <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '4px' }}>{stat.label}</div>
                        <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#e2e8f0' }}>{stat.value}</div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Column-level detail table */}
                {missingDetails.length > 0 ? (
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Column</th>
                        <th>Missing Count</th>
                        <th>Percentage</th>
                        <th>Recommendation</th>
                      </tr>
                    </thead>
                    <tbody>
                      {missingDetails.map((item: any, i: number) => (
                        <tr key={i}>
                          <td style={{ color: '#818cf8', fontWeight: 500 }}>{item.column}</td>
                          <td>{item.missing_count}</td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              {typeof item.missing_percentage === 'number' ? item.missing_percentage.toFixed(2) : item.missing_percentage}%
                              <div style={{ width: '100px', height: '6px', background: '#2d2f3e', borderRadius: '3px', overflow: 'hidden' }}>
                                <div style={{
                                  height: '100%',
                                  width: `${item.missing_percentage ?? 0}%`,
                                  background: (item.missing_percentage ?? 0) > 50 ? '#ef4444' : (item.missing_percentage ?? 0) > 20 ? '#f59e0b' : '#6366f1'
                                }} />
                              </div>
                            </div>
                          </td>
                          <td>
                            <span className={`badge badge-${(item.missing_percentage ?? 0) > 50 ? 'danger' : 'info'}`}>
                              {item.recommendation}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div style={{ padding: '40px', textAlign: 'center', color: '#10b981' }}>
                    <AlertTriangle size={40} style={{ margin: '0 auto 16px', opacity: 0.5 }} />
                    <h4 style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: '8px' }}>No Missing Values!</h4>
                    <p>Your dataset is clean and contains no missing data.</p>
                  </div>
                )}
              </div>
            )}

            {/* ════════════════════════ OUTLIERS TAB ════════════════════════ */}
            {activeTab === 'outliers' && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '20px' }}>
                {outlierDetails.length > 0 ? (
                  outlierDetails.map((item: any) => (
                    <div key={item.column} className="card" style={{ padding: '24px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <h4 style={{ color: '#e2e8f0', fontWeight: 600, margin: 0 }}>{item.column}</h4>
                        <span className={`badge badge-${item.severity === 'high' ? 'danger' : item.severity === 'medium' ? 'warning' : 'info'}`}>
                          {item.severity} severity
                        </span>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.85rem', color: '#94a3b8' }}>
                        <div>IQR Outliers: <span style={{ color: '#f59e0b', fontWeight: 600 }}>{item.iqr_outliers}</span></div>
                        <div>IQR %: <span style={{ color: '#e2e8f0' }}>{item.iqr_outlier_pct?.toFixed(2) ?? '—'}%</span></div>
                        <div>Z-Score Outliers: <span style={{ color: '#f59e0b', fontWeight: 600 }}>{item.zscore_outliers}</span></div>
                        <div>Z-Score %: <span style={{ color: '#e2e8f0' }}>{item.zscore_outlier_pct?.toFixed(2) ?? '—'}%</span></div>
                        <div>Lower Bound: <span style={{ color: '#e2e8f0' }}>{item.lower_bound}</span></div>
                        <div>Upper Bound: <span style={{ color: '#e2e8f0' }}>{item.upper_bound}</span></div>
                        <div>Min Value: <span style={{ color: '#e2e8f0' }}>{item.min_value}</span></div>
                        <div>Max Value: <span style={{ color: '#e2e8f0' }}>{item.max_value}</span></div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="card" style={{ padding: '40px', textAlign: 'center', gridColumn: '1 / -1', color: '#10b981' }}>
                    <AlertTriangle size={40} style={{ margin: '0 auto 16px', opacity: 0.5 }} />
                    <h4 style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: '8px' }}>No Outliers Detected</h4>
                    <p>No significant outliers detected in numeric columns.</p>
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
