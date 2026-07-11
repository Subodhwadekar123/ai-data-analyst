import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { useStore } from '../store/useStore';
import { uploadDataset } from '../services/api';
import DropZone from '../components/upload/DropZone';
import DataTable from '../components/ui/DataTable';
import LoadingSpinner from '../components/ui/LoadingSpinner';
// import type { UploadedDataset } from '../types';

// ---------------------------------------------------------------------------
// Icon helper
// ---------------------------------------------------------------------------
const Icon: React.FC<{ d: string; color?: string; size?: number }> = ({ d, color = '#6366f1', size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);

// ---------------------------------------------------------------------------
// Info card for dataset_info after upload
// ---------------------------------------------------------------------------
interface InfoCardProps { label: string; value: string | number; color?: string }
const InfoCard: React.FC<InfoCardProps> = ({ label, value, color = '#6366f1' }) => (
  <div
    style={{
      background: 'rgba(26, 29, 39, 0.8)',
      border: '1px solid #2d2f3e',
      borderRadius: '12px',
      padding: '14px 16px',
      display: 'flex',
      flexDirection: 'column',
      gap: '4px',
      minWidth: 0,
    }}
  >
    <p style={{ margin: 0, color: '#6b7090', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
      {label}
    </p>
    <p style={{ margin: 0, color, fontSize: '1.35rem', fontWeight: 700 }}>
      {value}
    </p>
  </div>
);

// ---------------------------------------------------------------------------
// Tips data
// ---------------------------------------------------------------------------
const TIPS = [
  { icon: 'M3 6h18M7 6v14a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V6M11 6V4h2v2', text: 'CSV files process fastest. Keep headers in the first row.' },
  { icon: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12', text: 'Excel files support multiple sheets — the first sheet is used.' },
  { icon: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z', text: 'JSON arrays or objects are both supported. Nested data is flattened.' },
  { icon: 'M9 12l2 2 4-4M21 12A9 9 0 1 1 3 12a9 9 0 0 1 18 0z', text: 'Maximum file size is 200 MB. Larger files? Pre-filter before upload.' },
];

// ---------------------------------------------------------------------------
// Supported format card
// ---------------------------------------------------------------------------
const FormatCard: React.FC<{ ext: string; label: string; color: string; description: string }> = ({ ext, label, color, description }) => (
  <div
    style={{
      background: 'rgba(26, 29, 39, 0.8)',
      border: '1px solid #2d2f3e',
      borderRadius: '12px',
      padding: '16px',
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
    }}
  >
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 40,
        height: 40,
        borderRadius: '8px',
        background: `${color}20`,
        color,
        fontWeight: 700,
        fontSize: '0.8rem',
        letterSpacing: '0.04em',
      }}
    >
      {ext}
    </div>
    <p style={{ margin: 0, color: '#e2e8f0', fontWeight: 600, fontSize: '0.9rem' }}>{label}</p>
    <p style={{ margin: 0, color: '#6b7090', fontSize: '0.78rem', lineHeight: 1.5 }}>{description}</p>
  </div>
);

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------
const UploadPage: React.FC = () => {
  const { isUploading, setIsUploading, uploadProgress, setUploadProgress, addDataset, setActiveDataset } = useStore();
  const [uploadedDataset, setUploadedDataset] = useState<any>(null);

  const handleFileDrop = useCallback(async (file: File) => {
    setIsUploading(true);
    setUploadProgress(0);
    setUploadedDataset(null);

    try {
      const result = await uploadDataset(file, (pct: number) => {
        setUploadProgress(pct);
      });
      // Keep progress at 100 so the DropZone shows a completed state
      setUploadProgress(100);
      // Set the uploaded dataset FIRST, then stop the uploading state
      // with a small delay so React renders the preview before the
      // DropZone transitions out of its uploading animation.
      setUploadedDataset(result);
      addDataset(result as any);
      setActiveDataset(result as any);
      // Use setTimeout to let React flush the uploadedDataset render
      // before we switch isUploading off (which changes DropZone UI)
      setTimeout(() => {
        setIsUploading(false);
      }, 300);
      toast.success('Dataset uploaded successfully!');
    } catch (err: any) {
      toast.error(err?.message ?? 'Upload failed. Please try again.');
      setIsUploading(false);
      setUploadProgress(0);
    }
  }, [setIsUploading, setUploadProgress, addDataset, setActiveDataset]);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  const stagger: any = {
    hidden: {},
    show: { transition: { staggerChildren: 0.07 } },
  };
  const fadeUp: any = {
    hidden: { opacity: 0, y: 18 },
    show:   { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 260, damping: 22 } },
  };

  return (
    <div style={{ padding: '24px', maxWidth: 900, margin: '0 auto' }}>
      {/* ------------------------------------------------------------------ */}
      {/* Header                                                              */}
      {/* ------------------------------------------------------------------ */}
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: '28px' }}>
        <h1 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 700, color: '#e2e8f0' }}>Upload Dataset</h1>
        <p style={{ margin: '6px 0 0', color: '#6b7090', fontSize: '0.9rem' }}>
          Drag & drop or browse to upload your data file for AI-powered analysis.
        </p>
      </motion.div>

      {/* ------------------------------------------------------------------ */}
      {/* Drop zone                                                           */}
      {/* ------------------------------------------------------------------ */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }} style={{ marginBottom: '28px' }}>
        <DropZone onFileDrop={handleFileDrop} isUploading={isUploading} progress={uploadProgress} />
      </motion.div>

      {/* ------------------------------------------------------------------ */}
      {/* Dataset preview after upload                                        */}
      {/* ------------------------------------------------------------------ */}
      <AnimatePresence>
        {uploadedDataset && (
          <motion.div
            key="preview"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            style={{ marginBottom: '32px' }}
          >
            {/* Dataset info cards */}
            <div style={{ marginBottom: '20px' }}>
              <h2 style={{ margin: '0 0 14px', fontSize: '1rem', fontWeight: 700, color: '#e2e8f0' }}>
                Dataset Summary
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '12px', marginBottom: '20px' }}>
                <InfoCard label="Rows" value={uploadedDataset.dataset_info.rows.toLocaleString()} color="#6366f1" />
                <InfoCard label="Columns" value={uploadedDataset.dataset_info.columns} color="#8b5cf6" />
                <InfoCard label="Size" value={`${uploadedDataset.file_size_mb.toFixed(2)} MB`} color="#a855f7" />
                <InfoCard label="Missing" value={uploadedDataset.dataset_info.missing_values_total.toLocaleString()} color="#f59e0b" />
                <InfoCard label="Duplicates" value={uploadedDataset.dataset_info.duplicate_rows.toLocaleString()} color="#ef4444" />
                <InfoCard label="Completeness" value={`${uploadedDataset.dataset_info.completeness_score.toFixed(1)}%`} color="#22c55e" />
              </div>

              {/* Column type breakdown */}
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '8px',
                  padding: '14px 16px',
                  background: 'rgba(26, 29, 39, 0.8)',
                  border: '1px solid #2d2f3e',
                  borderRadius: '12px',
                  marginBottom: '20px',
                }}
              >
                {[
                  { key: 'numeric',     color: '#06b6d4' },
                  { key: 'categorical', color: '#f97316' },
                  { key: 'datetime',    color: '#8b5cf6' },
                  { key: 'boolean',     color: '#22c55e' },
                ].map(({ key, color }) => {
                  const cols = (uploadedDataset.dataset_info.column_types as any)[key] as string[];
                  if (!cols?.length) return null;
                  return (
                    <span
                      key={key}
                      style={{
                        padding: '4px 12px',
                        borderRadius: 999,
                        background: `${color}18`,
                        border: `1px solid ${color}40`,
                        color,
                        fontSize: '0.78rem',
                        fontWeight: 600,
                      }}
                    >
                      {cols.length} {key}
                    </span>
                  );
                })}
              </div>
            </div>

            {/* Preview table */}
            <div>
              <h2 style={{ margin: '0 0 14px', fontSize: '1rem', fontWeight: 700, color: '#e2e8f0' }}>
                Data Preview <span style={{ color: '#6b7090', fontWeight: 400, fontSize: '0.85rem' }}>
                  (first {uploadedDataset.preview.records.length} rows)
                </span>
              </h2>
              <DataTable
                columns={uploadedDataset.preview.columns}
                data={uploadedDataset.preview.records}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ------------------------------------------------------------------ */}
      {/* Loading indicator (full-page, while processing)                    */}
      {/* ------------------------------------------------------------------ */}
      <AnimatePresence>
        {isUploading && !uploadedDataset && (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ display: 'flex', justifyContent: 'center', padding: '20px 0' }}
          >
            <LoadingSpinner size="md" text="Processing dataset…" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ------------------------------------------------------------------ */}
      {/* Supported formats                                                   */}
      {/* ------------------------------------------------------------------ */}
      <motion.div variants={stagger} initial="hidden" animate="show" style={{ marginBottom: '32px' }}>
        <motion.h2 variants={fadeUp} style={{ margin: '0 0 14px', fontSize: '1rem', fontWeight: 700, color: '#e2e8f0' }}>
          Supported Formats
        </motion.h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
          <motion.div variants={fadeUp}>
            <FormatCard ext="CSV" label="Comma-Separated Values" color="#22c55e" description="Most common tabular format. UTF-8 encoding recommended." />
          </motion.div>
          <motion.div variants={fadeUp}>
            <FormatCard ext="XLSX" label="Excel Workbook" color="#16a34a" description="Microsoft Excel 2007+ format. First sheet is imported." />
          </motion.div>
          <motion.div variants={fadeUp}>
            <FormatCard ext="XLS" label="Excel 97-2003" color="#15803d" description="Legacy Excel format. Converted automatically on upload." />
          </motion.div>
          <motion.div variants={fadeUp}>
            <FormatCard ext="JSON" label="JSON Array / Object" color="#f59e0b" description="Array of records or object of arrays. Nested data is flattened." />
          </motion.div>
        </div>
      </motion.div>

      {/* ------------------------------------------------------------------ */}
      {/* Tips                                                                */}
      {/* ------------------------------------------------------------------ */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}>
        <h2 style={{ margin: '0 0 14px', fontSize: '1rem', fontWeight: 700, color: '#e2e8f0' }}>Tips for Best Results</h2>
        <div
          style={{
            background: 'rgba(26, 29, 39, 0.8)',
            border: '1px solid #2d2f3e',
            borderRadius: '14px',
            overflow: 'hidden',
          }}
        >
          {TIPS.map((tip, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '14px',
                padding: '14px 20px',
                borderBottom: i < TIPS.length - 1 ? '1px solid #2d2f3e' : 'none',
              }}
            >
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: '8px',
                  background: 'rgba(99,102,241,0.12)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  marginTop: 1,
                }}
              >
                <Icon d={tip.icon} color="#6366f1" size={16} />
              </div>
              <p style={{ margin: 0, color: '#6b7090', fontSize: '0.87rem', lineHeight: 1.6 }}>{tip.text}</p>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
};

export default UploadPage;
