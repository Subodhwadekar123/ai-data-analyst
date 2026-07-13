import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  Key,
  Eye,
  EyeOff,
  Save,
  Trash2,
  Database,
  Palette,
  Info,
  Sidebar,
  ChevronRight,
  CheckCircle,
  X,
  AlertCircle,
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { deleteDataset, reportIssue, downloadIssuesCSV } from '../services/api';

// ─── Types ──────────────────────────────────────────────────────────────────

// ─── Toggle switch ────────────────────────────────────────────────────────────

interface ToggleSwitchProps {
  checked: boolean;
  onChange: () => void;
  id: string;
}

const ToggleSwitch: React.FC<ToggleSwitchProps> = ({ checked, onChange, id }) => (
  <button
    id={id}
    role="switch"
    aria-checked={checked}
    onClick={onChange}
    style={{
      width: 48,
      height: 26,
      borderRadius: 99,
      background: checked ? '#6366f1' : '#374151',
      border: 'none',
      cursor: 'pointer',
      position: 'relative',
      transition: 'background 0.2s',
      flexShrink: 0,
    }}
  >
    <motion.span
      animate={{ x: checked ? 24 : 2 }}
      transition={{ type: 'spring', stiffness: 500, damping: 35 }}
      style={{
        position: 'absolute',
        top: 3,
        left: 0,
        width: 20,
        height: 20,
        borderRadius: '50%',
        background: '#fff',
        boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
        display: 'block',
      }}
    />
  </button>
);

// ─── Section card ─────────────────────────────────────────────────────────────

interface SettingsCardProps {
  icon: React.ReactNode;
  iconColor: string;
  title: string;
  children: React.ReactNode;
  delay?: number;
}

const SettingsCard: React.FC<SettingsCardProps> = ({ icon, iconColor, title, children, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.4, delay }}
    className="card"
    style={{ marginBottom: '20px' }}
  >
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px', paddingBottom: '16px', borderBottom: '1px solid #2d2f3e' }}>
      <div
        style={{
          width: 38,
          height: 38,
          borderRadius: '10px',
          background: `${iconColor}22`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {icon}
      </div>
      <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#e2e8f0' }}>{title}</h2>
    </div>
    {children}
  </motion.div>
);

// ─── Row helpers ──────────────────────────────────────────────────────────────

const RowDivider: React.FC = () => (
  <div style={{ height: '1px', background: '#2d2f3e', margin: '16px 0' }} />
);

interface SettingRowProps {
  label: string;
  description?: string;
  children: React.ReactNode;
}

const SettingRow: React.FC<SettingRowProps> = ({ label, description, children }) => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
    <div style={{ flex: 1 }}>
      <p style={{ margin: 0, fontSize: '14px', fontWeight: 500, color: '#e2e8f0' }}>{label}</p>
      {description && <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#64748b' }}>{description}</p>}
    </div>
    {children}
  </div>
);

// ─── Input style ──────────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '9px 12px',
  background: '#0f1117',
  border: '1px solid #2d2f3e',
  borderRadius: '8px',
  color: '#e2e8f0',
  fontSize: '14px',
  outline: 'none',
  boxSizing: 'border-box',
  transition: 'border-color 0.2s',
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

// ─── Tech badge ───────────────────────────────────────────────────────────────

const TechBadge: React.FC<{ label: string; color: string }> = ({ label, color }) => (
  <span
    style={{
      padding: '4px 12px',
      borderRadius: '99px',
      fontSize: '12px',
      fontWeight: 500,
      background: `${color}22`,
      color,
      border: `1px solid ${color}44`,
    }}
  >
    {label}
  </span>
);

// ─── Main component ───────────────────────────────────────────────────────────

const SettingsPage: React.FC = () => {
  const {
    datasets,
    activeDataset,
    setActiveDataset,
    removeDataset,
    sidebarCollapsed,
    setSidebarCollapsed,
  } = useStore();

  // ── API Key ────────────────────────────────────────────────────────────────
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [apiBaseUrl, setApiBaseUrl] = useState('/api/v1');
  const [aiModel, setAiModel] = useState('gemini-2.0-flash');
  
  // ── Collapsible Docs State ──────────────────────────────────────────────────
  const [showDocs, setShowDocs] = useState(false);

  // ── Report an Issue States ─────────────────────────────────────────────────
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [issueTitle, setIssueTitle] = useState('');
  const [issueCategory, setIssueCategory] = useState('bug');
  const [issueDesc, setIssueDesc] = useState('');
  const [issueEmail, setIssueEmail] = useState('');

  const handleReportIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!issueTitle.trim() || !issueDesc.trim()) {
      toast.error('Please fill in all required fields.');
      return;
    }
    const loadingToast = toast.loading('Submitting report to database...');
    try {
      await reportIssue({
        title: issueTitle,
        category: issueCategory,
        description: issueDesc,
        email: issueEmail || undefined,
      });
      toast.dismiss(loadingToast);
      toast.success('Thank you! Your issue report has been recorded in the database.');
      setIssueTitle('');
      setIssueCategory('bug');
      setIssueDesc('');
      setIssueEmail('');
      setShowIssueModal(false);
    } catch (err: any) {
      toast.dismiss(loadingToast);
      toast.error(err.message || 'Failed to submit issue report.');
    }
  };

  useEffect(() => {
    setApiKey(localStorage.getItem('gemini_api_key') ?? '');
    setApiBaseUrl(localStorage.getItem('api_base_url') ?? '/api/v1');
    setAiModel(localStorage.getItem('ai_model') ?? 'gemini-2.0-flash');
  }, []);

  const handleSaveApiKey = () => {
    localStorage.setItem('gemini_api_key', apiKey);
    localStorage.setItem('api_base_url', apiBaseUrl);
    localStorage.setItem('ai_model', aiModel);
    toast.success('Settings saved successfully!');
  };

  const downloadDocs = () => {
    const docsMarkdown = `# DataMind AI - Platform User Guide & Documentation

Welcome to the DataMind AI documentation. This guide details the features, capabilities, and settings of the DataMind AI platform.

## 🚀 1. Getting Started
DataMind AI is an automated, AI-driven data analyst web application. 
- **Upload File Size**: Maximum 200 MB.
- **Supported Formats**: CSV (\`.csv\`), Excel (\`.xlsx\`, \`.xls\`).

## 🧼 2. Data Cleaning
- **Missing Values**: Impute numeric columns with mean/median, and categorical columns with mode or a constant.
- **De-duplication**: Remove duplicate rows instantly.
- **Datatype Casting**: Correctly cast columns to float, integer, category, or datetime.
- **Outliers**: Drop rows with outliers or clip values using the IQR/Z-score method.

## 📊 3. Exploratory Data Analysis (EDA)
- **Data Quality Score**: Calculates a 100-point score breaking down completeness, uniqueness, consistency, and validity.
- **Column Summaries**: Detailed metrics for data distributions.
- **Correlations**: Auto-calculates Pearson correlation matrix.

## 🎨 4. Data Visualizations
Generate and customize:
- Bar Charts, Histograms, Scatter Plots, Pie Charts, Line Charts, and Box Plots.
- **Bubble Maps**: Plot geographical location names (e.g. Countries, Cities) and size bubbles based on aggregated numeric variables.

## 🧮 5. Statistical Inference
- **Normality Tests**: Run Shapiro-Wilk or Kolmogorov-Smirnov tests.
- **Confidence Intervals**: Calculate margins of error and 95% confidence intervals.
- **Hypothesis Tests**: Configure and run independent two-sample t-tests.

## 🤖 6. Machine Learning (AutoML)
- **Auto-detection**: Classify continuous target variables for Regression, and categorical target variables for Classification.
- **AutoML Compare**: Click "Compare All" to train all compatible algorithms and view a performance-sorted scoreboard.

## 📥 7. Reports & Exports
- **Excel Report**: Download descriptive metrics and column definitions.
- **Executive PDF Report**: Generate print-ready, beautifully designed PDF documents powered by ReportLab.
`;

    const blob = new Blob([docsMarkdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'DataMind_AI_Documentation.md';
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Documentation download started!');
  };

  // ── Dataset management ─────────────────────────────────────────────────────
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDeleteDataset = async (id: string) => {
    setDeletingId(id);
    try {
      await deleteDataset(id);
      removeDataset(id);
      toast.success('Dataset deleted.');
    } catch {
      toast.error('Failed to delete dataset.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleClearAll = () => {
    if (!window.confirm('Are you sure you want to clear all datasets? This action cannot be undone.')) return;
    datasets.forEach((ds) => {
      removeDataset(ds.id);
      deleteDataset(ds.id).catch(() => {/* silent */});
    });
    toast.success('All datasets cleared.');
  };

  // ── Tech stack ─────────────────────────────────────────────────────────────
  const techStack = [
    { label: 'React 19', color: '#60a5fa' },
    { label: 'FastAPI', color: '#34d399' },
    { label: 'Pandas', color: '#fbbf24' },
    { label: 'Recharts', color: '#a78bfa' },
    { label: 'Framer Motion', color: '#f472b6' },
    { label: 'TypeScript', color: '#60cdff' },
    { label: 'Python 3.11', color: '#4ade80' },
    { label: 'Gemini AI', color: '#fb923c' },
  ];

  return (
    <div style={{ padding: '24px', maxWidth: '860px', margin: '0 auto' }}>
      {/* Page header */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ marginBottom: '28px' }}
      >
        <h1 style={{ margin: 0, fontSize: '28px', fontWeight: 700, color: '#f1f5f9' }}>
          <span className="text-gradient">Settings</span>
        </h1>
        <p style={{ margin: '6px 0 0', color: '#94a3b8', fontSize: '15px' }}>
          Configure your AI models, appearance, and manage datasets.
        </p>
      </motion.div>

      {/* ── 1. AI Configuration ─────────────────────────────────────────────── */}
      <SettingsCard
        icon={<Key size={18} color="#6366f1" />}
        iconColor="#6366f1"
        title="AI Configuration"
        delay={0}
      >
        {/* API Key */}
        <div style={{ marginBottom: '16px' }}>
          <label style={labelStyle} htmlFor="api-key-input">Gemini API Key</label>
          <div style={{ position: 'relative' }}>
            <input
              id="api-key-input"
              type={showApiKey ? 'text' : 'password'}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Enter your Gemini API key…"
              style={{ ...inputStyle, paddingRight: '44px' }}
            />
            <button
              onClick={() => setShowApiKey((v) => !v)}
              style={{
                position: 'absolute',
                right: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: '#64748b',
                display: 'flex',
                alignItems: 'center',
                padding: 0,
              }}
              title={showApiKey ? 'Hide API key' : 'Show API key'}
            >
              {showApiKey ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <RowDivider />

        {/* API Base URL */}
        <div style={{ marginBottom: '16px' }}>
          <label style={labelStyle} htmlFor="api-base-url-input">API Base URL</label>
          <input
            id="api-base-url-input"
            type="text"
            value={apiBaseUrl}
            onChange={(e) => setApiBaseUrl(e.target.value)}
            placeholder="/api/v1"
            style={inputStyle}
          />
        </div>

        <RowDivider />

        {/* AI Model */}
        <div style={{ marginBottom: '20px' }}>
          <label style={labelStyle} htmlFor="ai-model-select">AI Model</label>
          <select
            id="ai-model-select"
            value={aiModel}
            onChange={(e) => {
              setAiModel(e.target.value);
              localStorage.setItem('ai_model', e.target.value);
            }}
            style={{ ...inputStyle, appearance: 'none', cursor: 'pointer' }}
          >
            <option value="gemini-2.0-flash">gemini-2.0-flash (Fastest)</option>
            <option value="gemini-1.5-pro">gemini-1.5-pro (Most Capable)</option>
            <option value="gemini-1.5-flash">gemini-1.5-flash (Balanced)</option>
          </select>
        </div>

        {/* Save button */}
        <button
          id="save-settings-btn"
          className="btn-primary"
          onClick={handleSaveApiKey}
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <Save size={16} />
          Save API Key &amp; Settings
        </button>
      </SettingsCard>

      {/* ── 2. Appearance ──────────────────────────────────────────────────── */}
      <SettingsCard
        icon={<Palette size={18} color="#f472b6" />}
        iconColor="#f472b6"
        title="Appearance"
        delay={0.08}
      >
        <SettingRow
          label="Sidebar Collapsed"
          description="Start with the sidebar collapsed by default"
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Sidebar size={16} color="#64748b" />
            <ToggleSwitch
              id="sidebar-toggle"
              checked={sidebarCollapsed}
              onChange={() => setSidebarCollapsed(!sidebarCollapsed)}
            />
          </div>
        </SettingRow>
      </SettingsCard>

      {/* ── 3. Dataset Management ─────────────────────────────────────────── */}
      <SettingsCard
        icon={<Database size={18} color="#34d399" />}
        iconColor="#34d399"
        title="Dataset Management"
        delay={0.16}
      >
        {datasets.length === 0 ? (
          <p style={{ color: '#475569', fontSize: '14px', textAlign: 'center', padding: '20px 0' }}>
            No datasets loaded.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
            {datasets.map((ds) => {
              const isActive = activeDataset?.id === ds.id;
              return (
                <motion.div
                  key={ds.id}
                  layout
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '12px 14px',
                    background: isActive ? '#6366f111' : '#0f111788',
                    border: `1px solid ${isActive ? '#6366f133' : '#2d2f3e'}`,
                    borderRadius: '12px',
                    transition: 'all 0.2s',
                  }}
                >
                  {/* Dataset info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                      <p style={{ margin: 0, fontSize: '14px', fontWeight: 500, color: '#e2e8f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {ds.filename}
                      </p>
                      {isActive && (
                        <span
                          style={{
                            padding: '2px 8px',
                            borderRadius: '99px',
                            fontSize: '10px',
                            fontWeight: 600,
                            background: '#6366f122',
                            color: '#a78bfa',
                            border: '1px solid #6366f133',
                            flexShrink: 0,
                          }}
                        >
                          ACTIVE
                        </span>
                      )}
                    </div>
                    <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>
                      {ds.dataset_info.rows.toLocaleString()} rows · {ds.dataset_info.columns} cols ·{' '}
                      {ds.file_size_mb.toFixed(2)} MB ·{' '}
                      {new Date(ds.uploaded_at + (ds.uploaded_at.endsWith('Z') ? '' : 'Z')).toLocaleDateString()}
                    </p>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                    {!isActive && (
                      <button
                        className="btn-secondary"
                        onClick={() => setActiveDataset(ds)}
                        style={{ padding: '6px 12px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}
                      >
                        <CheckCircle size={12} />
                        Set Active
                      </button>
                    )}
                    <button
                      className="btn-ghost"
                      onClick={() => handleDeleteDataset(ds.id)}
                      disabled={deletingId === ds.id}
                      style={{ padding: '6px', color: '#f87171' }}
                      title="Delete dataset"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {datasets.length > 0 && (
          <>
            <RowDivider />
            <button
              id="clear-all-datasets-btn"
              className="btn-ghost"
              onClick={handleClearAll}
              style={{
                color: '#f87171',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                border: '1px solid #ef444433',
                borderRadius: '10px',
                padding: '8px 16px',
                fontSize: '14px',
              }}
            >
              <Trash2 size={15} />
              Clear All Datasets
            </button>
          </>
        )}
      </SettingsCard>

      {/* ── 4. About ─────────────────────────────────────────────────────── */}
      <SettingsCard
        icon={<Info size={18} color="#60a5fa" />}
        iconColor="#60a5fa"
        title="About"
        delay={0.24}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: '16px',
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Database size={28} color="#fff" />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: '#f1f5f9' }}>DataMind AI</h3>
            <p style={{ margin: '2px 0 0', fontSize: '13px', color: '#64748b' }}>Version 1.0.0</p>
          </div>
        </div>

        <p style={{ margin: '0 0 20px', fontSize: '14px', color: '#94a3b8', lineHeight: 1.75 }}>
          DataMind AI is a powerful, AI-driven data analytics platform that transforms raw datasets into
          actionable insights. Upload any CSV or Excel file and instantly get statistical analysis, interactive
          visualizations, machine learning models, and conversational AI powered by Google Gemini.
        </p>

        <RowDivider />

        <div style={{ marginTop: '16px' }}>
          <p style={{ margin: '0 0 12px', fontSize: '12px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>
            Built With
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {techStack.map((t) => (
              <TechBadge key={t.label} label={t.label} color={t.color} />
            ))}
          </div>
        </div>

        <RowDivider />

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {/* Collapsible Documentation Item */}
          <button
            onClick={() => setShowDocs(!showDocs)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 14px',
              background: showDocs ? 'rgba(99, 102, 241, 0.08)' : '#0f111788',
              borderRadius: '10px',
              border: `1px solid ${showDocs ? '#6366f155' : '#2d2f3e'}`,
              color: showDocs ? '#e2e8f0' : '#94a3b8',
              cursor: 'pointer',
              fontSize: '14px',
              transition: 'all 0.2s',
              textAlign: 'left',
              width: '100%',
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 500 }}>
              📚 Platform User Guide &amp; Documentation
            </span>
            <ChevronRight
              size={16}
              style={{
                transition: 'transform 0.2s',
                transform: showDocs ? 'rotate(90deg)' : 'rotate(0deg)',
              }}
            />
          </button>

          <AnimatePresence>
            {showDocs && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                style={{
                  background: '#0f111755',
                  border: '1px solid #2d2f3e',
                  borderRadius: '10px',
                  padding: '20px',
                  fontSize: '13.5px',
                  color: '#94a3b8',
                  lineHeight: 1.65,
                }}
              >
                {/* Download Button */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
                  <button
                    className="btn-primary"
                    onClick={(e) => {
                      e.stopPropagation();
                      downloadDocs();
                    }}
                    style={{
                      padding: '8px 14px',
                      fontSize: '12px',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    📥 Download Markdown Docs (.md)
                  </button>
                </div>

                {/* Content Sections */}
                <h4 style={{ color: '#e2e8f0', margin: '0 0 6px', fontSize: '14px' }}>🚀 Getting Started</h4>
                <p style={{ margin: '0 0 16px', fontSize: '13px' }}>
                  DataMind AI is an automated, AI-driven data analyst dashboard. Upload any CSV or Excel file (up to 200 MB) to get instant descriptive analysis, interactive charts, statistical hypothesis tests, and machine learning predictions.
                </p>

                <h4 style={{ color: '#e2e8f0', margin: '0 0 6px', fontSize: '14px' }}>🧼 Data Cleaning &amp; Imputation</h4>
                <p style={{ margin: '0 0 16px', fontSize: '13px' }}>
                  Perform single-click preprocessing operations in the <b>Data Cleaning</b> page. You can drop duplicate rows, convert column datatypes, treat numeric outliers using the Z-Score or IQR methods, and impute missing cells with mathematical means, medians, or categorical modes.
                </p>

                <h4 style={{ color: '#e2e8f0', margin: '0 0 6px', fontSize: '14px' }}>📊 Visualizations &amp; Geo-Spatial Maps</h4>
                <p style={{ margin: '0 0 16px', fontSize: '13px' }}>
                  Unlock charts dynamically based on column profiles. Supported visualization forms include Bar Charts, Histograms, Scatter Plots, Pie Charts, Line Charts, Box Plots, and <b>Bubble Maps</b> for aggregated geo-spatial coordinate projections.
                </p>

                <h4 style={{ color: '#e2e8f0', margin: '0 0 6px', fontSize: '14px' }}>🤖 Machine Learning &amp; AutoML Scoreboard</h4>
                <p style={{ margin: '0 0 16px', fontSize: '13px' }}>
                  Define target prediction fields to auto-classify prediction problems (Classification vs Regression). Click <b>Compare All</b> to run a parallel training pipeline comparing multiple models (Decision Trees, XGBoost, Random Forests, etc.) sorted by metrics (Accuracy, Precision, Recall, or R²).
                </p>

                <h4 style={{ color: '#e2e8f0', margin: '0 0 6px', fontSize: '14px' }}>🧠 AI Chat &amp; Automated Insights</h4>
                <p style={{ margin: '0 0 16px', fontSize: '13px' }}>
                  Save your <b>Gemini API Key</b> in the AI Configuration card to unlock the generative AI assistant. Ask natural-language questions about your dataset inside the chatbot or read automated executive summary reports.
                </p>

                <h4 style={{ color: '#e2e8f0', margin: '0 0 6px', fontSize: '14px' }}>📥 Report Exports</h4>
                <p style={{ margin: '0', fontSize: '13px' }}>
                  Export raw analysis details through high-quality downloadable channels. Download structured multi-sheet Excel files or download clean, print-ready <b>PDF documents</b> built via Python's ReportLab engine.
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {[
            { label: 'GitHub Repository', onClick: () => toast.error('Repository is not uploaded yet.') },
            { label: 'Report an Issue', onClick: () => setShowIssueModal(true) },
          ].map((link) => (
            <button
              key={link.label}
              onClick={link.onClick}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 14px',
                background: '#0f111788',
                borderRadius: '10px',
                border: '1px solid #2d2f3e',
                color: '#94a3b8',
                fontSize: '14px',
                cursor: 'pointer',
                transition: 'border-color 0.2s, color 0.2s',
                width: '100%',
                textAlign: 'left',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#6366f155';
                e.currentTarget.style.color = '#e2e8f0';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#2d2f3e';
                e.currentTarget.style.color = '#94a3b8';
              }}
            >
              {link.label}
              <ChevronRight size={16} />
            </button>
          ))}
        </div>
      </SettingsCard>

      {/* Report an Issue Modal */}
      <AnimatePresence>
        {showIssueModal && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 1000,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '24px',
            }}
          >
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowIssueModal(false)}
              style={{
                position: 'absolute',
                inset: 0,
                background: 'rgba(15, 17, 23, 0.75)',
                backdropFilter: 'blur(8px)',
              }}
            />

            {/* Modal Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              style={{
                position: 'relative',
                background: '#1a1d27',
                border: '1px solid #2d2f3e',
                borderRadius: '16px',
                width: '100%',
                maxWidth: '480px',
                padding: '28px',
                boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
                zIndex: 1001,
              }}
            >
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '18px', fontWeight: 600, color: 'white', margin: 0 }}>
                  <AlertCircle size={20} color="#6366f1" /> Report an Issue
                </h3>
                <button
                  onClick={() => setShowIssueModal(false)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#94a3b8',
                    cursor: 'pointer',
                    padding: '4px',
                    borderRadius: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.color = '#e2e8f0'}
                  onMouseLeave={(e) => e.currentTarget.style.color = '#94a3b8'}
                >
                  <X size={18} />
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleReportIssue} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label htmlFor="issue-title" style={labelStyle}>Issue Title *</label>
                  <input
                    id="issue-title"
                    type="text"
                    className="input"
                    placeholder="Brief summary of the issue..."
                    value={issueTitle}
                    onChange={(e) => setIssueTitle(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label htmlFor="issue-category" style={labelStyle}>Category</label>
                  <select
                    id="issue-category"
                    className="input"
                    value={issueCategory}
                    onChange={(e) => setIssueCategory(e.target.value)}
                    style={{ cursor: 'pointer' }}
                  >
                    <option value="bug">🐛 Bug / Defect</option>
                    <option value="feature">💡 Feature Request</option>
                    <option value="docs">📖 Documentation Error</option>
                    <option value="performance">⚡ Performance Issue</option>
                    <option value="other">❓ Other</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="issue-desc" style={labelStyle}>Description *</label>
                  <textarea
                    id="issue-desc"
                    className="input"
                    placeholder="Describe what went wrong or what you want to suggest. Please include steps to reproduce if reporting a bug."
                    value={issueDesc}
                    onChange={(e) => setIssueDesc(e.target.value)}
                    rows={4}
                    style={{ resize: 'none' }}
                    required
                  />
                </div>

                <div>
                  <label htmlFor="issue-email" style={labelStyle}>Email Address (Optional)</label>
                  <input
                    id="issue-email"
                    type="email"
                    className="input"
                    placeholder="yourname@example.com"
                    value={issueEmail}
                    onChange={(e) => setIssueEmail(e.target.value)}
                  />
                </div>

                {/* Footer Buttons */}
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '10px' }}>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => setShowIssueModal(false)}
                    style={{ padding: '8px 16px', fontSize: '13px' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-primary"
                    style={{ padding: '8px 20px', fontSize: '13px' }}
                  >
                    Submit Report
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SettingsPage;
