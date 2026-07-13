import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  FileText,
  Table2,
  Download,
  Sparkles,
  CheckCircle,
  Clock,
  BarChart2,
  Database,
  ArrowDown,
  Code,
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { downloadPDFReport, downloadExcelReport, downloadJupyterReport, getQualityScore } from '../services/api';
import EmptyState from '../components/ui/EmptyState';

// ─── Types ──────────────────────────────────────────────────────────────────

interface QualityScore {
  score: number;
  breakdown: {
    completeness: number;
    consistency: number;
    validity: number;
    uniqueness: number;
  };
}

// ─── Content list item ────────────────────────────────────────────────────────

const ContentItem: React.FC<{ label: string; index: number }> = ({ label, index }) => (
  <motion.div
    initial={{ opacity: 0, x: -10 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ delay: index * 0.06 }}
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      padding: '9px 0',
      borderBottom: '1px solid #1a1d2788',
      fontSize: '14px',
      color: '#94a3b8',
    }}
  >
    <CheckCircle size={14} color="#34d399" style={{ flexShrink: 0 }} />
    {label}
  </motion.div>
);

// ─── Download card ────────────────────────────────────────────────────────────

interface DownloadCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  badgeLabel: string;
  estimatedSize: string;
  gradient: string;
  buttonLabel: string;
  onClick: () => void;
  delay?: number;
}

const DownloadCard: React.FC<DownloadCardProps> = ({
  icon,
  title,
  description,
  badgeLabel,
  estimatedSize,
  gradient,
  buttonLabel,
  onClick,
  delay = 0,
}) => (
  <motion.div
    initial={{ opacity: 0, y: 24 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.45, delay }}
    whileHover={{ y: -4, transition: { duration: 0.2 } }}
    style={{
      background: 'linear-gradient(145deg, #1a1d27, #252836)',
      borderRadius: '20px',
      overflow: 'hidden',
      border: '1px solid #2d2f3e',
      position: 'relative',
    }}
  >
    {/* Gradient top bar */}
    <div style={{ height: '4px', background: gradient }} />

    <div style={{ padding: '28px' }}>
      {/* Icon */}
      <div
        style={{
          width: 72,
          height: 72,
          borderRadius: '20px',
          background: gradient,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '20px',
          boxShadow: `0 8px 24px ${gradient.split(',')[0].replace('linear-gradient(135deg,', '').trim()}44`,
        }}
      >
        {icon}
      </div>

      {/* Badges row */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', alignItems: 'center' }}>
        <span
          style={{
            padding: '3px 10px',
            borderRadius: '99px',
            fontSize: '11px',
            fontWeight: 600,
            background: '#ffffff18',
            color: '#e2e8f0',
            letterSpacing: '0.06em',
          }}
        >
          {badgeLabel}
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: '#64748b' }}>
          <Database size={12} />
          {estimatedSize}
        </span>
      </div>

      <h2 style={{ margin: '0 0 10px', fontSize: '20px', fontWeight: 700, color: '#f1f5f9' }}>{title}</h2>
      <p style={{ margin: '0 0 24px', fontSize: '14px', color: '#94a3b8', lineHeight: 1.7 }}>{description}</p>

      <button
        onClick={onClick}
        style={{
          width: '100%',
          padding: '13px 20px',
          borderRadius: '12px',
          background: gradient,
          border: 'none',
          color: '#fff',
          fontWeight: 600,
          fontSize: '15px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '10px',
          transition: 'opacity 0.2s, transform 0.15s',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.88')}
        onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
        onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.98)')}
        onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
      >
        <Download size={18} />
        {buttonLabel}
      </button>
    </div>
  </motion.div>
);

// ─── Info stat box ────────────────────────────────────────────────────────────

const StatBox: React.FC<{ label: string; value: string | number; icon: React.ReactNode }> = ({
  label,
  value,
  icon,
}) => (
  <div
    style={{
      background: '#0f111788',
      borderRadius: '12px',
      padding: '14px 16px',
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
    }}
  >
    <div
      style={{
        width: 36,
        height: 36,
        borderRadius: '10px',
        background: '#6366f122',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      {icon}
    </div>
    <div>
      <p style={{ margin: 0, fontSize: '11px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        {label}
      </p>
      <p style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: '#e2e8f0' }}>{value}</p>
    </div>
  </div>
);

// ─── Main component ───────────────────────────────────────────────────────────

const ReportsPage: React.FC = () => {
  const { activeDataset } = useStore();
  const [qualityScore, setQualityScore] = useState<QualityScore | null>(null);

  useEffect(() => {
    if (!activeDataset) return;
    getQualityScore(activeDataset.id)
      .then(setQualityScore)
      .catch(() => {/* silent – quality score is optional */});
  }, [activeDataset?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!activeDataset) {
    return (
      <EmptyState
        title="No Dataset Selected"
        description="Upload or select a dataset to generate reports."
      />
    );
  }

  const handlePDFDownload = () => {
    const url = downloadPDFReport(activeDataset.id);
    window.open(url, '_blank');
    toast.success('PDF report download started!');
  };

  const handleExcelDownload = () => {
    const url = downloadExcelReport(activeDataset.id);
    window.open(url, '_blank');
    toast.success('Excel report download started!');
  };

  const handleJupyterDownload = () => {
    const url = downloadJupyterReport(activeDataset.id);
    window.open(url, '_blank');
    toast.success('Jupyter Notebook generated!');
  };

  const { dataset_info } = activeDataset;

  const pdfContents = [
    'Dataset Overview & Summary',
    'EDA Summary with Statistics',
    'Data Quality Grade & Score',
    'Comprehensive Column Profiles',
    'AI Key Findings & Trends',
    'ML Readiness Diagnostics',
  ];

  const excelContents = [
    'Sheet 1: Raw Data',
    'Sheet 2: Descriptive Statistics',
    'Sheet 3: Correlations',
    'Sheet 4: Missing Values',
    'Sheet 5: Summary',
  ];

  const jupyterContents = [
    'Cell 1: Environment Setup',
    'Cell 2: Data Loading',
    'Cell 3: Exact Cleaning Steps',
    'Cell 4: Exploratory Analysis',
    'Standard ML Boilerplate',
  ];

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Page header */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ marginBottom: '32px' }}
      >
        <h1 style={{ margin: 0, fontSize: '28px', fontWeight: 700, color: '#f1f5f9' }}>
          <span className="text-gradient">Reports &amp; Export</span>
        </h1>
        <p style={{ margin: '6px 0 0', color: '#94a3b8', fontSize: '15px' }}>
          Download comprehensive reports for{' '}
          <strong style={{ color: '#e2e8f0' }}>{activeDataset.filename}</strong>
        </p>
      </motion.div>

      {/* ── Download cards ──────────────────────────────────────────────────── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '24px',
          marginBottom: '32px',
        }}
      >
        <DownloadCard
          icon={<FileText size={32} />}
          title="Executive PDF Report"
          description="A beautiful, print-ready document containing executive summaries, structured statistics, data quality assessments, and ML recommendations."
          badgeLabel="PDF"
          estimatedSize="~1-2 MB"
          gradient="linear-gradient(135deg, #6366f1, #8b5cf6)"
          buttonLabel="Download PDF Report"
          onClick={handlePDFDownload}
          delay={0}
        />
        <DownloadCard
          icon={<Database size={32} />}
          title="Excel Workbook Report"
          description="Multi-sheet Excel workbook with raw data, descriptive statistics, correlation matrix, and summary sheets."
          badgeLabel="XLSX"
          estimatedSize="~1-3 MB"
          gradient="linear-gradient(135deg, #10b981, #059669)"
          buttonLabel="Download Excel Report"
          onClick={handleExcelDownload}
          delay={0.1}
        />
        <DownloadCard
          icon={<Code size={32} />}
          title="Jupyter Notebook"
          description="A programmatic Kaggle-style notebook containing the Python code to reproduce your cleaning and visualization steps."
          badgeLabel="IPYNB"
          estimatedSize="~10-50 KB"
          gradient="linear-gradient(135deg, #eab308, #d97706)"
          buttonLabel="Generate Notebook"
          onClick={handleJupyterDownload}
          delay={0.2}
        />
      </div>

      {/* ── What's included ─────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        style={{ marginBottom: '28px' }}
      >
        <h2 style={{ margin: '0 0 16px', fontSize: '18px', fontWeight: 600, color: '#e2e8f0' }}>
          <Sparkles size={18} style={{ marginRight: 8, verticalAlign: 'middle', color: '#6366f1' }} />
          What's Included
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
          {/* PDF contents */}
          <div
            className="card"
            style={{ border: '1px solid #6366f133' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: '8px',
                  background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <FileText size={16} color="#fff" />
              </div>
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: '#e2e8f0' }}>PDF Report</h3>
            </div>
            {pdfContents.map((item, i) => (
              <ContentItem key={i} label={item} index={i} />
            ))}
          </div>

          {/* Excel contents */}
          <div
            className="card"
            style={{ border: '1px solid #10b98133' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: '8px',
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Table2 size={16} color="#fff" />
              </div>
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: '#e2e8f0' }}>Excel Workbook</h3>
            </div>
            {excelContents.map((item, i) => (
              <ContentItem key={i} label={item} index={i} />
            ))}
          </div>

          {/* Jupyter contents */}
          <div
            className="card"
            style={{ border: '1px solid #eab30833' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: '8px',
                  background: 'linear-gradient(135deg, #eab308, #d97706)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Code size={16} color="#fff" />
              </div>
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: '#e2e8f0' }}>Jupyter Notebook</h3>
            </div>
            {jupyterContents.map((item, i) => (
              <ContentItem key={i} label={item} index={i} />
            ))}
          </div>
        </div>
      </motion.div>

      {/* ── Dataset info card ───────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        style={{ marginBottom: '24px' }}
      >
        <div
          className="card"
          style={{ border: '1px solid #2d2f3e' }}
        >
          <h3 style={{ margin: '0 0 18px', fontSize: '15px', fontWeight: 600, color: '#e2e8f0' }}>
            <Database size={16} style={{ marginRight: 8, verticalAlign: 'middle', color: '#6366f1' }} />
            Dataset Information
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
            <StatBox
              label="Filename"
              value={activeDataset.filename.length > 14 ? activeDataset.filename.slice(0, 14) + '...' : activeDataset.filename}
              icon={<Database size={16} color="#6366f1" />}
            />
            <StatBox
              label="Rows"
              value={dataset_info.rows.toLocaleString()}
              icon={<Database size={16} color="#6366f1" />}
            />
            <StatBox
              label="Columns"
              value={dataset_info.columns}
              icon={<Database size={16} color="#6366f1" />}
            />
            <StatBox
              label="Quality Score"
              value={
                qualityScore
                  ? `${qualityScore.score.toFixed(1)}%`
                  : `${(dataset_info.completeness_score * 100).toFixed(1)}%`
              }
              icon={<Database size={16} color="#6366f1" />}
            />
          </div>

          {/* Quality breakdown */}
          {qualityScore && (
            <div style={{ marginTop: '16px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
              {Object.entries(qualityScore.breakdown).map(([key, val]) => (
                <div key={key}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontSize: '12px', color: '#64748b', textTransform: 'capitalize' }}>{key}</span>
                    <span style={{ fontSize: '12px', color: '#94a3b8' }}>{val.toFixed(0)}%</span>
                  </div>
                  <div className="progress-bar">
                    <div
                      className="progress-bar-fill"
                      style={{ width: `${val}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>

      {/* ── Tip box ─────────────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: '12px',
          padding: '16px 20px',
          background: '#f59e0b11',
          border: '1px solid #f59e0b33',
          borderRadius: '14px',
        }}
      >
        <Clock size={18} color="#fbbf24" style={{ flexShrink: 0, marginTop: '1px' }} />
        <div>
          <p style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#fbbf24', marginBottom: '4px' }}>
            Performance Note
          </p>
          <p style={{ margin: 0, fontSize: '13px', color: '#94a3b8', lineHeight: 1.6 }}>
            Report generation may take <strong style={{ color: '#e2e8f0' }}>15–30 seconds</strong> for large
            datasets. The report will open in a new tab when ready. Please do not close this page while
            downloading.
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default ReportsPage;
