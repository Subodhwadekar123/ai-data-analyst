/**
 * Admin Properties Data Management Page
 * Handles property spreadsheet uploads, displays ingestion metadata, and maps columns.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  Upload, FileSpreadsheet, AlertCircle, CheckCircle2,
  Clock, User, Database, RefreshCw, Loader2
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import { uploadPropertiesExcel, getAdminPropertiesMetadata } from '../../services/chatbotApi';

interface PropertyMetadata {
  filename: string | null;
  row_count: number;
  uploaded_by: string | null;
  updated_at: string | null;
}

const AdminPropertiesPage: React.FC = () => {
  const { user } = useStore();
  const [meta, setMeta] = useState<PropertyMetadata>({
    filename: null,
    row_count: 0,
    uploaded_by: null,
    updated_at: null,
  });
  const [dragActive, setDragActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [mapping, setMapping] = useState<Record<string, string>>({});

  const loadMetadata = useCallback(async () => {
    setFetching(true);
    try {
      const data = await getAdminPropertiesMetadata();
      setMeta(data);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load properties metadata.');
    } finally {
      setFetching(false);
    }
  }, []);

  useEffect(() => {
    loadMetadata();
  }, [loadMetadata]);

  // ── Drag & Drop Handlers ────────────────────────────────────────────────────
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const processFile = async (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext !== 'xlsx' && ext !== 'xls') {
      toast.error('Unsupported file format. Please upload an Excel spreadsheet (.xlsx or .xls).');
      return;
    }

    setLoading(true);
    const toastId = toast.loading('Uploading and processing properties dataset...');
    try {
      const res = await uploadPropertiesExcel(file);
      toast.success(`Successfully uploaded and normalized ${res.row_count} properties!`, { id: toastId });
      if (res.mapped_columns) {
        setMapping(res.mapped_columns);
      }
      loadMetadata();
    } catch (err: any) {
      toast.error(err.message || 'Failed to parse properties Excel sheet.', { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  return (
    <div style={{ padding: '28px', color: '#e2e8f0', minHeight: '100%', boxSizing: 'border-box' }}>
      {/* Title Header */}
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#f1f5f9', margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Database size={22} style={{ color: '#6366f1' }} />
            Properties Database Management
          </h1>
          <p style={{ color: '#64748b', margin: 0, fontSize: '14px' }}>
            Upload and normalize the current active property spreadsheet for chatbot querying
          </p>
        </div>
        <button
          onClick={loadMetadata}
          disabled={fetching}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            color: '#94a3b8',
            borderRadius: '10px',
            padding: '9px 14px',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: 600,
            opacity: fetching ? 0.6 : 1
          }}
        >
          {fetching ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
          Refresh Status
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '24px', alignItems: 'start' }}>
        {/* Main Content Area */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* File Upload Dropzone */}
          <div
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            style={{
              border: `2px dashed ${dragActive ? 'var(--accent-primary)' : 'rgba(255, 255, 255, 0.1)'}`,
              borderRadius: '16px',
              background: dragActive ? 'rgba(99, 102, 241, 0.05)' : 'rgba(255, 255, 255, 0.02)',
              padding: '40px 20px',
              textAlign: 'center',
              cursor: 'pointer',
              position: 'relative',
              transition: 'all 0.2s ease-in-out',
            }}
          >
            <input
              type="file"
              id="properties-excel-upload"
              accept=".xlsx, .xls"
              onChange={handleFileInput}
              disabled={loading}
              style={{ display: 'none' }}
            />
            
            <label htmlFor="properties-excel-upload" style={{ cursor: 'pointer', display: 'block' }}>
              <div style={{
                width: '64px',
                height: '64px',
                background: 'rgba(99,102,241,0.1)',
                color: '#818cf8',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
              }}>
                {loading ? <Loader2 size={32} style={{ animation: 'spin 1.5s linear infinite' }} /> : <Upload size={32} />}
              </div>
              
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#f1f5f9', margin: '0 0 6px' }}>
                {loading ? 'Uploading spreadsheet...' : 'Upload Properties spreadsheet'}
              </h3>
              <p style={{ color: '#64748b', fontSize: '13px', margin: '0 0 16px' }}>
                Drag and drop your Excel (.xlsx / .xls) file here, or click to browse
              </p>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                padding: '6px 12px',
                borderRadius: '8px',
                color: '#94a3b8',
                fontSize: '11px',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.04em'
              }}>
                <FileSpreadsheet size={13} style={{ color: '#10b981' }} />
                Supports Excel Sheets
              </div>
            </label>
          </div>

          {/* Mapping Synonyms Column Preview */}
          {Object.keys(mapping).length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                background: '#1e2235',
                borderRadius: '16px',
                border: '1px solid rgba(255,255,255,0.08)',
                padding: '20px'
              }}
            >
              <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#f1f5f9', margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle2 size={16} color="#10b981" />
                Intelligent Column Map Detections
              </h3>
              <p style={{ fontSize: '12px', color: '#64748b', margin: '0 0 16px' }}>
                Synonyms engine successfully parsed and mapped Excel headers to property database columns:
              </p>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '10px' }}>
                {Object.entries(mapping).map(([normField, excelCol]) => (
                  <div key={normField} style={{
                    display: 'flex',
                    flexDirection: 'column',
                    padding: '8px 12px',
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid rgba(255,255,255,0.05)',
                    borderRadius: '8px'
                  }}>
                    <span style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 700 }}>
                      {normField.replace(/_/g, ' ')}
                    </span>
                    <span style={{ fontSize: '13px', color: '#e2e8f0', fontWeight: 600, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                      {excelCol}
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </div>

        {/* Sidebar Info Section */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Active Dataset Stats */}
          <div style={{
            background: '#1e2235',
            borderRadius: '16px',
            border: '1px solid rgba(255,255,255,0.08)',
            padding: '20px'
          }}>
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#f1f5f9', margin: '0 0 16px' }}>
              Active Property Dataset
            </h3>
            
            {meta.filename ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <FileSpreadsheet size={16} style={{ color: '#10b981', flexShrink: 0 }} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>FILENAME</div>
                    <div style={{ fontSize: '13px', color: '#e2e8f0', fontWeight: 700, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                      {meta.filename}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Database size={16} style={{ color: '#6366f1', flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>RECORD COUNT</div>
                    <div style={{ fontSize: '13px', color: '#e2e8f0', fontWeight: 700 }}>
                      {meta.row_count.toLocaleString()} properties
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <User size={16} style={{ color: '#ec4899', flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>UPLOADED BY</div>
                    <div style={{ fontSize: '13px', color: '#e2e8f0', fontWeight: 700 }}>
                      {meta.uploaded_by}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Clock size={16} style={{ color: '#eab308', flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>LAST UPDATED</div>
                    <div style={{ fontSize: '13px', color: '#e2e8f0', fontWeight: 700 }}>
                      {meta.updated_at ? new Date(meta.updated_at).toLocaleString() : 'N/A'}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '20px 0', color: '#64748b' }}>
                <AlertCircle size={32} style={{ margin: '0 auto 10px', opacity: 0.5 }} />
                <p style={{ fontSize: '13px', margin: 0 }}>No properties spreadsheet loaded yet.</p>
              </div>
            )}
          </div>

          {/* Guide Card */}
          <div style={{
            background: 'rgba(99,102,241,0.03)',
            borderRadius: '16px',
            border: '1px solid rgba(99,102,241,0.1)',
            padding: '20px'
          }}>
            <h4 style={{ fontSize: '13px', fontWeight: 700, color: '#f1f5f9', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Formatting Guideline
            </h4>
            <p style={{ fontSize: '12px', color: '#64748b', margin: '0 0 10px', lineHeight: 1.4 }}>
              The ingestion engine supports intelligent mapping, but to ensure high accuracy, ensure columns representing:
            </p>
            <ul style={{ fontSize: '11px', color: '#64748b', paddingLeft: '16px', margin: 0, display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <li><strong>Property Name</strong> (e.g. Title, Property Name)</li>
              <li><strong>Location</strong> (e.g. Locality, Area)</li>
              <li><strong>Price</strong> (e.g. Price, Budget - formats like 60 Lakh/1.2 Cr supported)</li>
              <li><strong>BHK</strong> (e.g. BHK, Bedrooms)</li>
              <li><strong>Contact Info</strong> (Email, Mobile)</li>
            </ul>
          </div>

        </div>
      </div>
      
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin {
          animation: spin 1s linear infinite;
        }
      `}</style>
    </div>
  );
};

export default AdminPropertiesPage;
