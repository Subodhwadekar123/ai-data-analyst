import { useState } from 'react';
import { useStore } from '../store/useStore';
import SectionHeader from '../components/ui/SectionHeader';
import EmptyState from '../components/ui/EmptyState';
import { detectProblemType, trainModel, compareModels } from '../services/api';
import toast from 'react-hot-toast';
import { Brain, Play, CheckCircle2, AlertTriangle, TrendingUp, BarChart2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function MLPage() {
  const { activeDataset } = useStore();
  const [targetCol, setTargetCol] = useState('');
  const [problemType, setProblemType] = useState<any>(null);
  const [algorithm, setAlgorithm] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [comparisonResults, setComparisonResults] = useState<any>(null);

  if (!activeDataset) return <EmptyState />;

  const cols = [...(activeDataset.dataset_info.column_types.numeric || []), ...(activeDataset.dataset_info.column_types.categorical || []), ...(activeDataset.dataset_info.column_types.boolean || [])];

  // Variants for animations
  const stagger = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const fadeUp = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  const handleDetect = async () => {
    if (!targetCol) return;
    try {
      setLoading(true);
      setResults(null);
      setComparisonResults(null);
      const res: any = await detectProblemType(activeDataset.id, targetCol);
      setProblemType(res);
      const recommended = res.recommended_algorithms?.[0]?.id || '';
      setAlgorithm(recommended);
      toast.success(`Detected ${res.problem_type} problem`);
    } catch (err: any) {
      toast.error(err.message || 'Detection failed');
    } finally {
      setLoading(false);
    }
  };

  const handleTrain = async () => {
    try {
      setLoading(true);
      const res: any = await trainModel(activeDataset.id, {
        target_column: targetCol,
        algorithm: algorithm,
        test_size: 0.2
      });
      setResults(res);
      toast.success('Model trained successfully!');
    } catch (err: any) {
      toast.error(err.message || 'Training failed');
    } finally {
      setLoading(false);
    }
  };

  const handleCompare = async () => {
    if (!targetCol || !problemType) return;
    try {
      setLoading(true);
      const algos = problemType.recommended_algorithms.map((a: any) => a.id);
      const res: any = await compareModels(activeDataset.id, {
        target_column: targetCol,
        algorithms: algos,
        test_size: 0.2
      });
      setComparisonResults(res);
      toast.success('Model comparison completed!');
    } catch (err: any) {
      toast.error(err.message || 'Comparison failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ paddingBottom: '40px' }}>
      <SectionHeader 
        title="Machine Learning" 
        subtitle="AutoML pipeline: Detect, train, and evaluate models."
        icon={<Brain />}
      />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px' }}>
        
        {/* Step 1 & 2: Setup */}
        <div className="card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 300px' }}>
              <label style={{ display: 'block', marginBottom: '8px', color: '#94a3b8', fontSize: '0.9rem' }}>1. Select Target Variable</label>
              <div style={{ display: 'flex', gap: '12px' }}>
                <select className="input" value={targetCol} onChange={(e) => setTargetCol(e.target.value)} style={{ flex: 1 }}>
                  <option value="">Select column to predict...</option>
                  {cols.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <button className="btn-primary" onClick={handleDetect} disabled={!targetCol || loading}>
                  Detect
                </button>
              </div>
            </div>

            {problemType && (
              <div style={{ flex: '1 1 300px' }}>
                <label style={{ display: 'block', marginBottom: '8px', color: '#94a3b8', fontSize: '0.9rem' }}>2. Select Algorithm ({problemType.problem_type})</label>
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  <select className="input" value={algorithm} onChange={(e) => setAlgorithm(e.target.value)} style={{ flex: '1 1 200px' }}>
                    {problemType.recommended_algorithms?.map((algo: any, idx: number) => (
                      <option key={algo.id} value={algo.id}>
                        {algo.name} {idx === 0 ? '(Recommended)' : ''}
                      </option>
                    ))}
                  </select>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button className="btn-primary" onClick={handleTrain} disabled={loading || !algorithm} style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
                      <Play size={16} /> Train Model
                    </button>
                    <button className="btn-secondary" onClick={handleCompare} disabled={loading}>
                      <BarChart2 size={16} /> Compare All
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="card" style={{ padding: '40px', textAlign: 'center', color: '#818cf8' }}>
            <Brain size={48} className="animate-float" style={{ margin: '0 auto 16px' }} />
            <h3 style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: '8px' }}>Training Model...</h3>
            <p style={{ color: '#94a3b8' }}>Preprocessing data, splitting train/test sets, fitting {algorithm}, and calculating metrics.</p>
          </div>
        )}

        {/* Results */}
        <AnimatePresence>
          {!loading && results && (
            <motion.div variants={stagger} initial="hidden" animate="visible" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '24px' }}>
              
              {/* Metrics Card */}
              <motion.div variants={fadeUp} className="card" style={{ padding: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                  <CheckCircle2 size={24} color="#10b981" />
                  <h3 style={{ fontSize: '1.2rem', color: '#e2e8f0', margin: 0 }}>Model Evaluation</h3>
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  {Object.entries(results.metrics).map(([key, value]: [string, any]) => (
                    <div key={key} style={{ background: '#252836', padding: '16px', borderRadius: '12px', border: '1px solid #3d3f50' }}>
                      <div style={{ color: '#94a3b8', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
                        {key.replace('_', ' ')}
                      </div>
                      <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#6366f1' }}>
                        {typeof value === 'number' ? value.toFixed(4) : value}
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>

              {/* Feature Importance Card */}
              {results.feature_importances && Object.keys(results.feature_importances).length > 0 && (
                <div className="card" style={{ padding: '24px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                    <TrendingUp size={24} color="#a855f7" />
                    <h3 style={{ fontSize: '1.2rem', color: '#e2e8f0', margin: 0 }}>Feature Importance</h3>
                  </div>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {Object.entries(results.feature_importances)
                      .sort(([, a]: any, [, b]: any) => b - a)
                      .slice(0, 10)
                      .map(([feature, importance]: [string, any]) => (
                      <div key={feature}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#cbd5e1', marginBottom: '4px' }}>
                          <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '200px' }}>{feature}</span>
                          <span>{(importance * 100).toFixed(1)}%</span>
                        </div>
                        <div className="progress-bar">
                          <div className="progress-bar-fill" style={{ width: `${importance * 100}%`, background: 'linear-gradient(90deg, #a855f7, #ec4899)' }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Model Comparison Results */}
        <AnimatePresence>
          {!loading && comparisonResults && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px' }}
            >
              <div className="card" style={{ padding: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                  <BarChart2 size={24} color="#6366f1" />
                  <h3 style={{ fontSize: '1.2rem', color: '#e2e8f0', margin: 0 }}>Model Accuracy & Performance Comparison</h3>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {comparisonResults.comparison
                    .filter((r: any) => !r.error)
                    .sort((a: any, b: any) => {
                      const metricA = problemType.problem_type === 'regression' ? (a.metrics?.r2_score ?? 0) : (a.metrics?.accuracy ?? 0);
                      const metricB = problemType.problem_type === 'regression' ? (b.metrics?.r2_score ?? 0) : (b.metrics?.accuracy ?? 0);
                      return metricB - metricA;
                    })
                    .map((r: any) => {
                      const metricName = problemType.problem_type === 'regression' ? 'R²' : 'Accuracy';
                      const metricVal = problemType.problem_type === 'regression' ? r.metrics?.r2_score : r.metrics?.accuracy;
                      const pct = Math.max(0, Math.min(100, (metricVal ?? 0) * 100));

                      const algoName = problemType.recommended_algorithms.find((a: any) => a.id === r.algorithm)?.name || r.algorithm;

                      return (
                        <div key={r.algorithm}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', color: '#cbd5e1', marginBottom: '6px' }}>
                            <span style={{ fontWeight: 500 }}>{algoName}</span>
                            <span style={{ fontWeight: 600, color: '#818cf8' }}>
                              {metricName}: {metricVal != null ? (metricVal * 100).toFixed(2) + '%' : 'N/A'}
                            </span>
                          </div>
                          <div className="progress-bar">
                            <div className="progress-bar-fill" style={{ width: `${pct}%`, background: 'linear-gradient(90deg, #6366f1, #a855f7)' }} />
                          </div>
                          <div style={{ display: 'flex', gap: '16px', fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>
                            {Object.entries(r.metrics || {})
                              .filter(([k]) => k !== (problemType.problem_type === 'regression' ? 'r2' : 'accuracy'))
                              .map(([k, v]: [string, any]) => (
                                <span key={k}>
                                  {k.replace('_', ' ')}: {typeof v === 'number' ? v.toFixed(4) : v}
                                </span>
                              ))}
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}
