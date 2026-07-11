import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  Sparkles,
  CheckCircle,
  TrendingUp,
  AlertCircle,
  MessageSquare,
  Send,
  Trash2,
  RefreshCw,
  BookOpen,
  X,
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { getAIInsights, askQuestion, getDataDictionary } from '../services/api';
import EmptyState from '../components/ui/EmptyState';
import LoadingSpinner from '../components/ui/LoadingSpinner';

// ─── Types ──────────────────────────────────────────────────────────────────

interface AIInsights {
  executive_summary: string;
  key_findings: string[];
  recommendations: string[];
  data_quality_insights?: string[];
  data_quality_issues?: string[];
  anomalies?: string[];
  ml_readiness?: {
    score: number;
    grade: string;
    is_ready: boolean;
    notes: string[];
    suggested_models: string[];
  };
  risk_factors?: string[];
}

interface DataDictColumn {
  name: string;
  dtype: string;
  description: string;
  statistics: Record<string, unknown>;
}

interface DataDictionary {
  columns: DataDictColumn[];
}

// ─── Skeleton shimmer ────────────────────────────────────────────────────────

const SkeletonBlock: React.FC<{ height?: string }> = ({ height = '120px' }) => (
  <div className="skeleton" style={{ height, borderRadius: '12px', marginBottom: '16px' }} />
);

// ─── Suggested questions ─────────────────────────────────────────────────────

const SUGGESTED_QUESTIONS = [
  'What are the key patterns in this dataset?',
  'Which columns have the most missing data?',
  'What are the top correlations?',
  'Suggest which column to use as target for ML',
];

// ─── Typing indicator ────────────────────────────────────────────────────────

const TypingIndicator: React.FC = () => (
  <motion.div
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -8 }}
    style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}
  >
    <div
      style={{
        width: 32,
        height: 32,
        borderRadius: '50%',
        background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      <Sparkles size={16} color="#fff" />
    </div>
    <div
      style={{
        background: '#252836',
        borderRadius: '0 12px 12px 12px',
        padding: '12px 16px',
        display: 'flex',
        gap: '6px',
        alignItems: 'center',
      }}
    >
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          style={{ width: 8, height: 8, borderRadius: '50%', background: '#6366f1', display: 'block' }}
          animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1, delay: i * 0.2, repeat: Infinity }}
        />
      ))}
    </div>
  </motion.div>
);

// ─── Insight section card ─────────────────────────────────────────────────────

interface InsightCardProps {
  icon: React.ReactNode;
  title: string;
  accentColor: string;
  children: React.ReactNode;
  delay?: number;
}

const InsightCard: React.FC<InsightCardProps> = ({ icon, title, accentColor, children, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.4, delay }}
    className="card"
    style={{ marginBottom: '16px', border: `1px solid ${accentColor}33` }}
  >
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: '10px',
          background: `${accentColor}22`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {icon}
      </div>
      <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: '#e2e8f0' }}>{title}</h3>
    </div>
    {children}
  </motion.div>
);

// ─── Main component ───────────────────────────────────────────────────────────

const AIInsightsPage: React.FC = () => {
  const { activeDataset, chatHistory, addChatMessage, clearChat } = useStore();

  // Insights state
  const [insights, setInsights] = useState<AIInsights | null>(null);
  const [isLoadingInsights, setIsLoadingInsights] = useState(false);
  const [activeInsightTab, setActiveInsightTab] = useState<'general' | 'stats' | 'ml'>('general');

  // Data dictionary state
  const [dataDictionary, setDataDictionary] = useState<DataDictionary | null>(null);
  const [isLoadingDict, setIsLoadingDict] = useState(false);
  const [showDictionary, setShowDictionary] = useState(false);

  // Chat state
  const [chatInput, setChatInput] = useState('');
  const [isAiResponding, setIsAiResponding] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // ── Load insights ──────────────────────────────────────────────────────────

  const loadInsights = useCallback(async () => {
    if (!activeDataset) return;
    setIsLoadingInsights(true);
    try {
      const data = await getAIInsights(activeDataset.id);
      setInsights(data);
    } catch {
      toast.error('Failed to load AI insights.');
    } finally {
      setIsLoadingInsights(false);
    }
  }, [activeDataset]);

  useEffect(() => {
    setInsights(null);
    setDataDictionary(null);
    setShowDictionary(false);
    loadInsights();
  }, [activeDataset?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Data dictionary ────────────────────────────────────────────────────────

  const handleLoadDictionary = async () => {
    if (!activeDataset) return;
    if (dataDictionary) {
      setShowDictionary((s) => !s);
      return;
    }
    setIsLoadingDict(true);
    try {
      const data = await getDataDictionary(activeDataset.id);
      setDataDictionary(data);
      setShowDictionary(true);
    } catch {
      toast.error('Failed to load data dictionary.');
    } finally {
      setIsLoadingDict(false);
    }
  };

  // ── Chat ───────────────────────────────────────────────────────────────────

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatHistory, isAiResponding]);

  const sendMessage = async (text: string) => {
    const question = text.trim();
    if (!question || !activeDataset || isAiResponding) return;

    addChatMessage('user', question);
    setChatInput('');
    setIsAiResponding(true);

    try {
      const response = (await askQuestion(activeDataset.id, question)) as any;
      addChatMessage('ai', response.answer);
    } catch {
      toast.error('Failed to get AI response. Please try again.');
      addChatMessage('ai', 'Sorry, I encountered an error processing your question. Please try again.');
    } finally {
      setIsAiResponding(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(chatInput);
    }
  };

  const handleSuggestion = (q: string) => {
    sendMessage(q);
  };

  // ── Empty state ────────────────────────────────────────────────────────────

  if (!activeDataset) {
    return (
      <EmptyState
        title="No Dataset Selected"
        description="Upload or select a dataset to unlock AI-powered insights and chat."
        actionText="Upload Dataset"
        actionLink="/dashboard/upload"
      />
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Page header */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ marginBottom: '28px' }}
      >
        <h1 style={{ margin: 0, fontSize: '28px', fontWeight: 700, color: '#f1f5f9' }}>
          <span className="text-gradient">AI Insights</span>
        </h1>
        <p style={{ margin: '6px 0 0', color: '#94a3b8', fontSize: '15px' }}>
          Automated analysis and conversational AI for{' '}
          <strong style={{ color: '#e2e8f0' }}>{activeDataset.filename}</strong>
        </p>
      </motion.div>

      {/* Two-column grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '24px',
          alignItems: 'start',
        }}
      >
        {/* ── LEFT: Auto Insights ───────────────────────────────────────────── */}
        <div>
          {/* Refresh & Tabs Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', gap: '12px', flexWrap: 'wrap' }}>
            <div className="tabs" style={{ marginBottom: 0, gap: '4px' }}>
              <button
                className={`tab-btn ${activeInsightTab === 'general' ? 'active' : ''}`}
                onClick={() => setActiveInsightTab('general')}
                style={{ padding: '8px 12px', fontSize: '13px' }}
              >
                Overview
              </button>
              <button
                className={`tab-btn ${activeInsightTab === 'stats' ? 'active' : ''}`}
                onClick={() => setActiveInsightTab('stats')}
                style={{ padding: '8px 12px', fontSize: '13px' }}
              >
                Stats & Cleaning
              </button>
              <button
                className={`tab-btn ${activeInsightTab === 'ml' ? 'active' : ''}`}
                onClick={() => setActiveInsightTab('ml')}
                style={{ padding: '8px 12px', fontSize: '13px' }}
              >
                ML Readiness
              </button>
            </div>
            
            <button
              className="btn-secondary"
              onClick={loadInsights}
              disabled={isLoadingInsights}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px' }}
            >
              <RefreshCw size={14} className={isLoadingInsights ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>

          {isLoadingInsights ? (
            <>
              <SkeletonBlock height="140px" />
              <SkeletonBlock height="180px" />
              <SkeletonBlock height="160px" />
            </>
          ) : insights ? (
            <>
              {/* TAB 1: General Overview & Quality */}
              {activeInsightTab === 'general' && (
                <>
                  {/* Executive Summary */}
                  <InsightCard
                    icon={<Sparkles size={18} color="#a78bfa" />}
                    title="Executive Summary"
                    accentColor="#8b5cf6"
                    delay={0}
                  >
                    <p style={{ margin: 0, color: '#cbd5e1', lineHeight: 1.7, fontSize: '14px' }}>
                      {insights.executive_summary}
                    </p>
                  </InsightCard>

                  {/* Key Findings */}
                  <InsightCard
                    icon={<CheckCircle size={18} color="#34d399" />}
                    title="Key Findings"
                    accentColor="#10b981"
                    delay={0.08}
                  >
                    <ol style={{ margin: 0, paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {insights.key_findings?.map((finding: string, i: number) => (
                        <motion.li
                          key={i}
                          initial={{ opacity: 0, x: -12 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.1 + i * 0.06 }}
                          style={{ color: '#cbd5e1', fontSize: '14px', lineHeight: 1.6 }}
                        >
                          {finding}
                        </motion.li>
                      ))}
                    </ol>
                  </InsightCard>

                  {/* Data Quality Insights */}
                  <InsightCard
                    icon={<AlertCircle size={18} color="#fbbf24" />}
                    title="Data Quality Insights"
                    accentColor="#f59e0b"
                    delay={0.16}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {(insights.data_quality_insights || insights.data_quality_issues)?.map((item: string, i: number) => (
                        <div
                          key={i}
                          style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '8px',
                            padding: '8px 12px',
                            background: '#f59e0b11',
                            borderRadius: '8px',
                            fontSize: '14px',
                            color: '#cbd5e1',
                          }}
                        >
                          <span style={{ color: '#fbbf24', flexShrink: 0, marginTop: '2px' }}>•</span>
                          {item}
                        </div>
                      ))}
                    </div>
                  </InsightCard>

                  {/* Anomalies */}
                  {insights.anomalies && insights.anomalies.length > 0 && (
                    <InsightCard
                      icon={<AlertCircle size={18} color="#f87171" />}
                      title="Anomalies Detected"
                      accentColor="#ef4444"
                      delay={0.24}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {insights.anomalies.map((anomaly, i) => (
                          <div
                            key={i}
                            style={{
                              display: 'flex',
                              alignItems: 'flex-start',
                              gap: '8px',
                              padding: '8px 12px',
                              background: '#ef444411',
                              borderRadius: '8px',
                              fontSize: '14px',
                              color: '#fca5a5',
                            }}
                          >
                            <AlertCircle size={14} color="#f87171" style={{ flexShrink: 0, marginTop: '2px' }} />
                            {anomaly}
                          </div>
                        ))}
                      </div>
                    </InsightCard>
                  )}
                </>
              )}

              {/* TAB 2: Stats & Cleaning */}
              {activeInsightTab === 'stats' && (
                <>
                  {/* Risk Factors */}
                  <InsightCard
                    icon={<AlertCircle size={18} color="#f87171" />}
                    title="Statistical Risk Factors"
                    accentColor="#ef4444"
                    delay={0}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {insights.risk_factors && insights.risk_factors.length > 0 ? (
                        insights.risk_factors.map((item: string, i: number) => (
                          <div
                            key={i}
                            style={{
                              display: 'flex',
                              alignItems: 'flex-start',
                              gap: '8px',
                              padding: '8px 12px',
                              background: '#ef444411',
                              borderRadius: '8px',
                              fontSize: '14px',
                              color: '#fca5a5',
                            }}
                          >
                            <span style={{ color: '#f87171', flexShrink: 0, marginTop: '2px' }}>•</span>
                            {item}
                          </div>
                        ))
                      ) : (
                        <div style={{ color: '#94a3b8', fontSize: '14px' }}>No significant statistical risk factors found.</div>
                      )}
                    </div>
                  </InsightCard>

                  {/* Recommendations */}
                  <InsightCard
                    icon={<TrendingUp size={18} color="#60a5fa" />}
                    title="Cleaning & Imputation Recommendations"
                    accentColor="#3b82f6"
                    delay={0.08}
                  >
                    <ul style={{ margin: 0, paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {insights.recommendations?.map((rec: string, i: number) => (
                        <li key={i} style={{ color: '#cbd5e1', fontSize: '14px', lineHeight: 1.6 }}>
                          {rec}
                        </li>
                      ))}
                    </ul>
                  </InsightCard>
                </>
              )}

              {/* TAB 3: ML Readiness */}
              {activeInsightTab === 'ml' && (
                <>
                  {insights.ml_readiness ? (
                    <InsightCard
                      icon={<Sparkles size={18} color="#a855f7" />}
                      title="Machine Learning Readiness"
                      accentColor="#a855f7"
                      delay={0}
                    >
                      <div style={{ display: 'flex', gap: '20px', alignItems: 'center', marginBottom: '20px' }}>
                        <div
                          style={{
                            width: 80,
                            height: 80,
                            borderRadius: '50%',
                            border: '4px solid #a855f7',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                            background: '#a855f711',
                          }}
                        >
                          <span style={{ fontSize: '20px', fontWeight: 700, color: '#e2e8f0' }}>
                            {insights.ml_readiness.score}%
                          </span>
                          <span style={{ fontSize: '11px', color: '#a855f7', fontWeight: 600 }}>
                            GRADE {insights.ml_readiness.grade}
                          </span>
                        </div>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                            <span
                              className={`badge badge-${insights.ml_readiness.is_ready ? 'success' : 'warning'}`}
                            >
                              {insights.ml_readiness.is_ready ? 'Ready for ML' : 'Action Required'}
                            </span>
                          </div>
                          <p style={{ margin: 0, fontSize: '13px', color: '#94a3b8', lineHeight: 1.5 }}>
                            {insights.ml_readiness.is_ready
                              ? 'This dataset is structured properly and ready to train machine learning models.'
                              : 'Data cleaning or transformations should be performed before training models.'}
                          </p>
                        </div>
                      </div>

                      {/* Diagnostics notes */}
                      {insights.ml_readiness.notes && insights.ml_readiness.notes.length > 0 && (
                        <div style={{ marginBottom: '20px' }}>
                          <h4 style={{ margin: '0 0 10px', fontSize: '13px', color: '#cbd5e1', fontWeight: 600 }}>
                            Readiness Diagnostics
                          </h4>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {insights.ml_readiness.notes.map((note: string, i: number) => (
                              <div
                                key={i}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '8px',
                                  fontSize: '13px',
                                  color: '#cbd5e1',
                                }}
                              >
                                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#a855f7', flexShrink: 0 }} />
                                {note}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Suggested models */}
                      {insights.ml_readiness.suggested_models && insights.ml_readiness.suggested_models.length > 0 && (
                        <div>
                          <h4 style={{ margin: '0 0 10px', fontSize: '13px', color: '#cbd5e1', fontWeight: 600 }}>
                            Recommended Algorithms
                          </h4>
                          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            {insights.ml_readiness.suggested_models.map((model: string, i: number) => (
                              <span
                                key={i}
                                style={{
                                  padding: '6px 12px',
                                  background: '#a855f722',
                                  border: '1px solid #a855f744',
                                  borderRadius: '20px',
                                  fontSize: '12px',
                                  color: '#d8b4fe',
                                  fontWeight: 500,
                                }}
                              >
                                {model}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </InsightCard>
                  ) : (
                    <div style={{ color: '#94a3b8', fontSize: '14px', textAlign: 'center', padding: '20px 0' }}>
                      ML Readiness score is not available for this dataset.
                    </div>
                  )}
                </>
              )}

              {/* Data Dictionary toggle */}
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
                <button
                  className="btn-secondary"
                  onClick={handleLoadDictionary}
                  disabled={isLoadingDict}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', justifyContent: 'center', marginBottom: '16px' }}
                >
                  {isLoadingDict ? <LoadingSpinner size="sm" /> : <BookOpen size={16} />}
                  {showDictionary ? 'Hide Data Dictionary' : 'View Data Dictionary'}
                </button>

                <AnimatePresence>
                  {showDictionary && dataDictionary && (
                    <motion.div
                      key="dict"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.35 }}
                      style={{ overflow: 'hidden' }}
                    >
                      <div className="card" style={{ padding: '16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                          <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: '#e2e8f0' }}>
                            <BookOpen size={16} style={{ marginRight: 8, verticalAlign: 'middle', color: '#6366f1' }} />
                            Data Dictionary
                          </h3>
                          <button
                            className="btn-ghost"
                            onClick={() => setShowDictionary(false)}
                            style={{ padding: '4px' }}
                          >
                            <X size={16} />
                          </button>
                        </div>
                        <div style={{ overflowX: 'auto' }}>
                          <table className="data-table" style={{ width: '100%' }}>
                            <thead>
                              <tr>
                                <th>Column</th>
                                <th>Type</th>
                                <th>Description</th>
                              </tr>
                            </thead>
                            <tbody>
                              {dataDictionary.columns.map((col, i) => (
                                <tr key={i}>
                                  <td>
                                    <code style={{ color: '#a78bfa', fontSize: '12px' }}>{col.name}</code>
                                  </td>
                                  <td>
                                    <span className="badge">{col.dtype}</span>
                                  </td>
                                  <td style={{ color: '#94a3b8', fontSize: '13px' }}>{col.description}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            </>
          ) : (
            <div style={{ textAlign: 'center', color: '#64748b', padding: '40px 0' }}>
              <Sparkles size={40} color="#374151" style={{ marginBottom: 12 }} />
              <p>No insights loaded yet. Click Refresh Insights.</p>
            </div>
          )}
        </div>

        {/* ── RIGHT: Chat Interface ─────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.45 }}
          className="card"
          style={{
            height: 'calc(100vh - 200px)',
            display: 'flex',
            flexDirection: 'column',
            padding: 0,
            overflow: 'hidden',
            position: 'sticky',
            top: '24px',
          }}
        >
          {/* Chat header */}
          <div
            style={{
              padding: '16px 20px',
              borderBottom: '1px solid #2d2f3e',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexShrink: 0,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <MessageSquare size={18} color="#fff" />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: '#e2e8f0' }}>
                  Ask AI About Your Data
                </h3>
                <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>
                  Powered by Gemini AI
                </p>
              </div>
            </div>
            <button
              className="btn-ghost"
              onClick={clearChat}
              title="Clear chat history"
              style={{ padding: '8px', color: '#64748b' }}
            >
              <Trash2 size={16} />
            </button>
          </div>

          {/* Messages area */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
            }}
          >
            {chatHistory.length === 0 && !isAiResponding ? (
              /* Suggested questions */
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
                <div
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: '16px',
                    background: 'linear-gradient(135deg, #6366f111, #8b5cf611)',
                    border: '1px solid #6366f133',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '8px',
                  }}
                >
                  <Sparkles size={28} color="#6366f1" />
                </div>
                <p style={{ margin: 0, color: '#64748b', fontSize: '14px', textAlign: 'center' }}>
                  Ask me anything about your dataset
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%', marginTop: '8px' }}>
                  {SUGGESTED_QUESTIONS.map((q, i) => (
                    <motion.button
                      key={i}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.1 }}
                      onClick={() => handleSuggestion(q)}
                      style={{
                        background: '#252836',
                        border: '1px solid #2d2f3e',
                        borderRadius: '10px',
                        padding: '10px 14px',
                        color: '#94a3b8',
                        fontSize: '13px',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'all 0.2s',
                      }}
                      whileHover={{ borderColor: '#6366f1', color: '#e2e8f0', x: 4 }}
                    >
                      "{q}"
                    </motion.button>
                  ))}
                </div>
              </div>
            ) : (
              <>
                <AnimatePresence initial={false}>
                  {chatHistory.map((msg, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 12, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.25 }}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start',
                        marginBottom: '12px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                        {/* AI avatar */}
                        {msg.role === 'ai' && (
                          <div
                            style={{
                              width: 28,
                              height: 28,
                              borderRadius: '50%',
                              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                              marginTop: '2px',
                            }}
                          >
                            <Sparkles size={14} color="#fff" />
                          </div>
                        )}

                        {/* Bubble */}
                        <div
                          style={{
                            maxWidth: '80%',
                            padding: '12px 16px',
                            borderRadius:
                              msg.role === 'user'
                                ? '16px 16px 4px 16px'
                                : '4px 16px 16px 16px',
                            background: msg.role === 'user' ? '#6366f1' : '#252836',
                            color: msg.role === 'user' ? '#fff' : '#cbd5e1',
                            fontSize: '14px',
                            lineHeight: 1.65,
                            wordBreak: 'break-word',
                            whiteSpace: 'pre-wrap',
                          }}
                        >
                          {msg.content}
                        </div>
                      </div>

                      {/* Timestamp */}
                      <span
                        style={{
                          fontSize: '11px',
                          color: '#475569',
                          marginTop: '4px',
                          marginLeft: msg.role === 'ai' ? '36px' : 0,
                        }}
                      >
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </motion.div>
                  ))}
                </AnimatePresence>

                {/* Typing indicator */}
                <AnimatePresence>{isAiResponding && <TypingIndicator />}</AnimatePresence>

                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* Input area */}
          <div
            style={{
              padding: '16px 20px',
              borderTop: '1px solid #2d2f3e',
              flexShrink: 0,
            }}
          >
            <div
              style={{
                display: 'flex',
                gap: '10px',
                alignItems: 'flex-end',
                background: '#252836',
                borderRadius: '14px',
                border: '1px solid #2d2f3e',
                padding: '10px 12px',
                transition: 'border-color 0.2s',
              }}
            >
              <textarea
                ref={textareaRef}
                rows={2}
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask a question about your data... (Enter to send, Shift+Enter for newline)"
                disabled={isAiResponding}
                style={{
                  flex: 1,
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  resize: 'none',
                  color: '#e2e8f0',
                  fontSize: '14px',
                  lineHeight: 1.5,
                  fontFamily: 'inherit',
                }}
              />
              <button
                onClick={() => sendMessage(chatInput)}
                disabled={!chatInput.trim() || isAiResponding}
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: '10px',
                  background: chatInput.trim() && !isAiResponding ? '#6366f1' : '#374151',
                  border: 'none',
                  cursor: chatInput.trim() && !isAiResponding ? 'pointer' : 'default',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'background 0.2s, transform 0.15s',
                  flexShrink: 0,
                }}
                onMouseEnter={(e) => {
                  if (chatInput.trim() && !isAiResponding)
                    (e.currentTarget as HTMLButtonElement).style.background = '#4f46e5';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background =
                    chatInput.trim() && !isAiResponding ? '#6366f1' : '#374151';
                }}
              >
                <Send size={16} color="#fff" />
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default AIInsightsPage;
