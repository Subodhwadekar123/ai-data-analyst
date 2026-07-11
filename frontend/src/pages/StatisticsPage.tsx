import { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import SectionHeader from '../components/ui/SectionHeader';
import EmptyState from '../components/ui/EmptyState';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { 
  getStatistics, runTTest
} from '../services/api';
import { Calculator } from 'lucide-react';
import toast from 'react-hot-toast';
import HeatmapComponent from '../components/charts/HeatmapComponent';

export default function StatisticsPage() {
  const { activeDataset } = useStore();
  const [statsData, setStatsData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'descriptive' | 'hypothesis' | 'normality' | 'confidence' | 'correlation'>('descriptive');

  useEffect(() => {
    if (activeDataset) {
      loadStats();
    }
  }, [activeDataset]);

  const loadStats = async () => {
    try {
      setLoading(true);
      const data = await getStatistics(activeDataset!.id);
      setStatsData(data);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load statistics');
    } finally {
      setLoading(false);
    }
  };

  if (!activeDataset) return <EmptyState />;

  const tabs = [
    { id: 'descriptive', label: 'Descriptive' },
    { id: 'hypothesis', label: 'Hypothesis Tests' },
    { id: 'normality', label: 'Normality' },
    { id: 'confidence', label: 'Confidence Intervals' },
    { id: 'correlation', label: 'Correlation' },
  ];

  return (
    <div style={{ paddingBottom: '40px' }}>
      <SectionHeader 
        title="Statistical Analysis" 
        subtitle="Deep dive into the statistical properties and distributions."
        icon={<Calculator />}
      />

      {/* Tabs */}
      <div style={{ 
        display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '12px',
        marginBottom: '24px', borderBottom: '1px solid #2d2f3e'
      }}>
        {tabs.map(tab => {
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
              {tab.label}
            </button>
          );
        })}
      </div>

      {loading ? (
        <LoadingSpinner text="Computing statistics..." />
      ) : statsData ? (
        <div>
          {/* Descriptive */}
          {activeTab === 'descriptive' && (
             <div className="card" style={{ padding: '24px', overflowX: 'auto' }}>
               <table className="data-table">
                 <thead>
                   <tr>
                     <th>Metric</th>
                     {Object.keys(statsData.descriptive || {}).map(col => <th key={col}>{col}</th>)}
                   </tr>
                 </thead>
                 <tbody>
                   {statsData.descriptive && Object.keys(Object.values(statsData.descriptive)[0] as any || {}).map(metric => (
                     <tr key={metric}>
                       <td style={{ fontWeight: 600, color: '#e2e8f0' }}>{metric}</td>
                       {Object.keys(statsData.descriptive).map(col => (
                         <td key={`${col}-${metric}`}>
                           {typeof statsData.descriptive[col][metric] === 'number' 
                             ? statsData.descriptive[col][metric].toFixed(4) 
                             : statsData.descriptive[col][metric]}
                         </td>
                       ))}
                     </tr>
                   ))}
                 </tbody>
               </table>
             </div>
          )}

          {/* Hypothesis Tests */}
          {activeTab === 'hypothesis' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {statsData.hypothesis_tests?.length > 0 ? (
                statsData.hypothesis_tests.map((test: any, i: number) => (
                  <div key={i} className="card" style={{ padding: '24px', borderLeft: `4px solid ${test.significant ? '#10b981' : '#64748b'}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                      <h3 style={{ color: '#e2e8f0', fontSize: '1.1rem' }}>{test.test_type}</h3>
                      <span className={`badge badge-${test.significant ? 'success' : 'default'}`}>
                        {test.significant ? 'Significant' : 'Not Significant'}
                      </span>
                    </div>
                    <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '16px' }}>{test.hypothesis}</p>
                    <div style={{ display: 'flex', gap: '24px', fontSize: '0.9rem' }}>
                      <div><span style={{ color: '#64748b' }}>Test Statistic:</span> <span style={{ color: '#818cf8', fontWeight: 600 }}>{test.test_statistic?.toFixed(4) || 'N/A'}</span></div>
                      <div><span style={{ color: '#64748b' }}>P-Value:</span> <span style={{ color: '#818cf8', fontWeight: 600 }}>{test.p_value?.toExponential(4) || 'N/A'}</span></div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="card" style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                  No automated hypothesis tests could be generated (requires mix of categorical and numeric columns).
                </div>
              )}
            </div>
          )}

          {/* Normality */}
          {activeTab === 'normality' && (
            <div className="card" style={{ padding: '24px' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Column</th>
                    <th>Shapiro-Wilk P-Value</th>
                    <th>KS Test P-Value</th>
                    <th>Is Normal (α=0.05)</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(statsData.normality_tests || {}).map(([col, results]: [string, any]) => (
                    <tr key={col}>
                      <td style={{ color: '#818cf8', fontWeight: 500 }}>{col}</td>
                      <td>{results.shapiro_wilk?.p_value?.toExponential(4) || 'N/A'}</td>
                      <td>{results.kolmogorov_smirnov?.p_value?.toExponential(4) || 'N/A'}</td>
                      <td>
                        <span className={`badge badge-${results.consensus?.is_normal ? 'success' : 'warning'}`}>
                          {results.consensus?.is_normal ? 'Yes' : 'No'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Confidence Intervals */}
          {activeTab === 'confidence' && (
            <div className="card" style={{ padding: '24px' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Column</th>
                    <th>Mean</th>
                    <th>Lower Bound (95%)</th>
                    <th>Upper Bound (95%)</th>
                    <th>Margin of Error</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(statsData.confidence_intervals || {}).map(([col, ci]: [string, any]) => (
                    <tr key={col}>
                      <td style={{ color: '#818cf8', fontWeight: 500 }}>{col}</td>
                      <td>{ci.mean?.toFixed(4)}</td>
                      <td>{ci.lower_bound?.toFixed(4)}</td>
                      <td>{ci.upper_bound?.toFixed(4)}</td>
                      <td>{ci.margin_of_error?.toFixed(4)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Correlation */}
          {activeTab === 'correlation' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px' }}>
              <div className="chart-container" style={{ height: '600px', display: 'flex', flexDirection: 'column' }}>
                <p className="section-label" style={{ marginBottom: 16 }}>Pearson Correlation Matrix</p>
                {statsData.correlation_matrix?.pearson?.matrix ? (
                  (() => {
                    const pearson = statsData.correlation_matrix.pearson;
                    const columns = pearson.columns || [];
                    const matrix = columns.map((row: string) => 
                      columns.map((col: string) => pearson.matrix[row]?.[col] ?? 0)
                    );
                    return <HeatmapComponent columns={columns} matrix={matrix} height={500} />;
                  })()
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, color: '#94a3b8' }}>
                    Need at least 2 numeric columns to compute correlations.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
