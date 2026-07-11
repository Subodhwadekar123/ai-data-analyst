import React, { useCallback, useState } from 'react';
import { useDropzone, FileRejection } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface DropZoneProps {
  onFileDrop: (file: File) => void;
  isUploading: boolean;
  progress: number;
}

// ---------------------------------------------------------------------------
// Helpers – file-type icons (SVG inline, no external icon dep required)
// ---------------------------------------------------------------------------
const CSVIcon: React.FC<{ size?: number }> = ({ size = 40 }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="40" height="40" rx="8" fill="#22c55e22" />
    <text x="50%" y="56%" dominantBaseline="middle" textAnchor="middle" fontSize="11" fontWeight="700" fill="#22c55e" fontFamily="monospace">CSV</text>
  </svg>
);

const ExcelIcon: React.FC<{ size?: number }> = ({ size = 40 }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="40" height="40" rx="8" fill="#16a34a22" />
    <text x="50%" y="56%" dominantBaseline="middle" textAnchor="middle" fontSize="10" fontWeight="700" fill="#16a34a" fontFamily="monospace">XLS</text>
  </svg>
);

const JSONIcon: React.FC<{ size?: number }> = ({ size = 40 }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="40" height="40" rx="8" fill="#f59e0b22" />
    <text x="50%" y="56%" dominantBaseline="middle" textAnchor="middle" fontSize="10" fontWeight="700" fill="#f59e0b" fontFamily="monospace">JSON</text>
  </svg>
);

const UploadCloudIcon: React.FC<{ size?: number; color?: string }> = ({ size = 56, color = '#6366f1' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M4 16.243A7 7 0 0 1 5.07 2.101 8 8 0 0 1 20 6a5 5 0 0 1 .9 9.9" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    <polyline points="16 16 12 12 8 16" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    <line x1="12" y1="12" x2="12" y2="21" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);

const CheckCircleIcon: React.FC<{ size?: number }> = ({ size = 56 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="10" stroke="#22c55e" strokeWidth="1.8" />
    <path d="M8 12l3 3 5-5" stroke="#22c55e" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const XCircleIcon: React.FC<{ size?: number }> = ({ size = 56 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="10" stroke="#ef4444" strokeWidth="1.8" />
    <path d="M15 9l-6 6M9 9l6 6" stroke="#ef4444" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);

// ---------------------------------------------------------------------------
// Accepted MIME / extensions
// ---------------------------------------------------------------------------
const ACCEPTED_TYPES = {
  'text/csv': ['.csv'],
  'application/vnd.ms-excel': ['.xls'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
  'application/json': ['.json'],
};

const MAX_SIZE_MB = 200;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

// ---------------------------------------------------------------------------
// Helper: extension from filename
// ---------------------------------------------------------------------------
function getExt(filename: string): string {
  return filename.split('.').pop()?.toLowerCase() ?? '';
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
const DropZone: React.FC<DropZoneProps> = ({ onFileDrop, isUploading, progress }) => {
  const [droppedFile, setDroppedFile] = useState<File | null>(null);
  const [rejected, setRejected] = useState<FileRejection[]>([]);
  const [isDragAccept, setIsDragAccept] = useState(false);
  const [isDragReject, setIsDragReject] = useState(false);

  const onDrop = useCallback(
    (accepted: File[], rejections: FileRejection[]) => {
      setRejected(rejections);
      if (accepted.length > 0) {
        const file = accepted[0];
        setDroppedFile(file);
        setRejected([]);
        onFileDrop(file);
      }
    },
    [onFileDrop],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_TYPES,
    maxFiles: 1,
    maxSize: MAX_SIZE_BYTES,
    multiple: false,
    disabled: isUploading,
    onDragEnter: () => { setIsDragAccept(true); setIsDragReject(false); },
    onDragLeave: () => { setIsDragAccept(false); setIsDragReject(false); },
    onDropAccepted: () => { setIsDragAccept(false); },
    onDropRejected: () => { setIsDragReject(true); setIsDragAccept(false); },
  });

  // Determine border / glow style
  const borderColor = isDragReject || rejected.length > 0
    ? '#ef4444'
    : isDragAccept || isDragActive
      ? '#6366f1'
      : droppedFile && !isUploading
        ? '#22c55e'
        : '#2d2f3e';

  const glowColor = isDragAccept || isDragActive
    ? 'rgba(99,102,241,0.35)'
    : isDragReject || rejected.length > 0
      ? 'rgba(239,68,68,0.3)'
      : droppedFile && !isUploading
        ? 'rgba(34,197,94,0.25)'
        : 'transparent';

  const ext = droppedFile ? getExt(droppedFile.name) : null;

  return (
    <div style={{ width: '100%' }}>
      {/* ------------------------------------------------------------------ */}
      {/* Drop area                                                           */}
      {/* ------------------------------------------------------------------ */}
      <motion.div
        {...(getRootProps() as any)}
        animate={{
          borderColor,
          boxShadow: `0 0 0 3px ${glowColor}`,
        }}
        transition={{ duration: 0.25 }}
        style={{
          position: 'relative',
          border: `2px dashed ${borderColor}`,
          borderRadius: '16px',
          padding: '48px 32px',
          textAlign: 'center',
          cursor: isUploading ? 'not-allowed' : 'pointer',
          background: 'rgba(26,29,39,0.7)',
          backdropFilter: 'blur(12px)',
          overflow: 'hidden',
          transition: 'background 0.2s',
        }}
      >
        <input {...getInputProps()} />

        {/* Animated background gradient on drag */}
        <AnimatePresence>
          {(isDragActive || isDragAccept) && (
            <motion.div
              key="drag-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{
                position: 'absolute',
                inset: 0,
                background: 'radial-gradient(ellipse at center, rgba(99,102,241,0.12) 0%, transparent 70%)',
                pointerEvents: 'none',
              }}
            />
          )}
        </AnimatePresence>

        {/* ---- Content ---- */}
        <AnimatePresence mode="wait">
          {isUploading ? (
            <motion.div
              key="uploading"
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.92 }}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}
            >
              {/* Spinning ring */}
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1.2, ease: 'linear' }}
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: '50%',
                  border: '3px solid #2d2f3e',
                  borderTopColor: '#6366f1',
                }}
              />
              <p style={{ color: '#6b7090', fontSize: '0.95rem', margin: 0 }}>
                Uploading <span style={{ color: '#e2e8f0', fontWeight: 600 }}>{droppedFile?.name}</span>…
              </p>
              {/* Progress bar */}
              <div
                style={{
                  width: '100%',
                  maxWidth: 360,
                  height: 8,
                  borderRadius: 999,
                  background: '#2d2f3e',
                  overflow: 'hidden',
                }}
              >
                <motion.div
                  animate={{ width: `${progress}%` }}
                  transition={{ ease: 'easeOut', duration: 0.3 }}
                  style={{
                    height: '100%',
                    borderRadius: 999,
                    background: 'linear-gradient(90deg, #6366f1, #a855f7)',
                  }}
                />
              </div>
              <p style={{ color: '#6366f1', fontSize: '0.85rem', margin: 0, fontWeight: 600 }}>
                {Math.round(progress)}%
              </p>
            </motion.div>
          ) : rejected.length > 0 ? (
            <motion.div
              key="rejected"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}
            >
              <XCircleIcon />
              <p style={{ color: '#ef4444', fontWeight: 600, margin: 0 }}>File rejected</p>
              <p style={{ color: '#6b7090', fontSize: '0.85rem', margin: 0 }}>
                {rejected[0]?.errors?.[0]?.message ?? 'Invalid file. Please try again.'}
              </p>
              <p style={{ color: '#6366f1', fontSize: '0.82rem', margin: 0, cursor: 'pointer' }}>
                Click or drag a valid file to retry
              </p>
            </motion.div>
          ) : droppedFile && !isUploading ? (
            <motion.div
              key="accepted"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}
            >
              <CheckCircleIcon />
              <p style={{ color: '#22c55e', fontWeight: 600, margin: 0 }}>Upload complete!</p>
              <p style={{ color: '#6b7090', fontSize: '0.88rem', margin: 0 }}>{droppedFile.name}</p>
              <p style={{ color: '#6366f1', fontSize: '0.82rem', margin: 0, cursor: 'pointer' }}>
                Drop another file to replace
              </p>
            </motion.div>
          ) : (
            <motion.div
              key="idle"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}
            >
              <motion.div
                animate={isDragActive ? { scale: 1.15, y: -6 } : { scale: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              >
                <UploadCloudIcon color={isDragActive ? '#a855f7' : '#6366f1'} />
              </motion.div>

              <div>
                <p style={{ color: '#e2e8f0', fontSize: '1.05rem', fontWeight: 600, margin: '0 0 4px' }}>
                  {isDragActive ? 'Release to upload' : 'Drag & drop your dataset here'}
                </p>
                <p style={{ color: '#6b7090', fontSize: '0.88rem', margin: 0 }}>
                  or <span style={{ color: '#6366f1', fontWeight: 600 }}>browse files</span> on your computer
                </p>
              </div>

              {/* File type pills */}
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
                {[
                  { icon: <CSVIcon size={28} />, label: 'CSV' },
                  { icon: <ExcelIcon size={28} />, label: 'Excel (.xlsx/.xls)' },
                  { icon: <JSONIcon size={28} />, label: 'JSON' },
                ].map(({ icon, label }) => (
                  <div
                    key={label}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '5px 12px',
                      borderRadius: 999,
                      background: 'rgba(45,47,62,0.8)',
                      border: '1px solid #2d2f3e',
                      fontSize: '0.78rem',
                      color: '#6b7090',
                    }}
                  >
                    {icon}
                    {label}
                  </div>
                ))}
              </div>

              <p style={{ color: '#555870', fontSize: '0.78rem', margin: 0 }}>
                Max file size: {MAX_SIZE_MB} MB
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* ------------------------------------------------------------------ */}
      {/* Progress bar below (alternative, always visible when uploading)     */}
      {/* ------------------------------------------------------------------ */}
      <AnimatePresence>
        {isUploading && (
          <motion.div
            key="bottom-progress"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            style={{ marginTop: '12px', overflow: 'hidden' }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px 16px',
                borderRadius: '10px',
                background: 'rgba(26, 29, 39, 0.8)',
                border: '1px solid #2d2f3e',
              }}
            >
              <div style={{ flex: 1, height: 6, borderRadius: 999, background: '#252836', overflow: 'hidden' }}>
                <motion.div
                  animate={{ width: `${progress}%` }}
                  transition={{ ease: 'easeOut', duration: 0.3 }}
                  style={{
                    height: '100%',
                    borderRadius: 999,
                    background: 'linear-gradient(90deg, #6366f1, #a855f7)',
                  }}
                />
              </div>
              <span style={{ color: '#6b7090', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                {Math.round(progress)}%
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ------------------------------------------------------------------ */}
      {/* Accepted file details after drop (while not yet uploading)          */}
      {/* ------------------------------------------------------------------ */}
      <AnimatePresence>
        {droppedFile && !isUploading && ext !== null && (
          <motion.div
            key="file-detail"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            style={{
              marginTop: '12px',
              padding: '12px 16px',
              borderRadius: '10px',
              background: 'rgba(26, 29, 39, 0.8)',
              border: '1px solid #2d2f3e',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
            }}
          >
            {ext === 'csv' && <CSVIcon size={32} />}
            {(ext === 'xlsx' || ext === 'xls') && <ExcelIcon size={32} />}
            {ext === 'json' && <JSONIcon size={32} />}
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, color: '#e2e8f0', fontSize: '0.9rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {droppedFile.name}
              </p>
              <p style={{ margin: 0, color: '#6b7090', fontSize: '0.78rem' }}>
                {(droppedFile.size / (1024 * 1024)).toFixed(2)} MB
              </p>
            </div>
            <span
              style={{
                padding: '3px 10px',
                borderRadius: 999,
                background: 'rgba(99,102,241,0.15)',
                color: '#6366f1',
                fontSize: '0.75rem',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              {ext.toUpperCase()}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DropZone;
