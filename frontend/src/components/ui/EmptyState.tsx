import { FileSearch } from 'lucide-react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

interface EmptyStateProps {
  title?: string;
  description?: string;
  actionText?: string;
  actionLink?: string;
}

export default function EmptyState({
  title = 'No Dataset Selected',
  description = 'Upload or select a dataset to view this page.',
  actionText = 'Go to Upload',
  actionLink = '/dashboard/upload'
}: EmptyStateProps) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      minHeight: '400px', background: '#1a1d27', border: '1px dashed #3d3f50',
      borderRadius: '16px', padding: '40px', textAlign: 'center'
    }}>
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.4 }}
        style={{
          width: '80px', height: '80px', borderRadius: '20px',
          background: 'rgba(99,102,241,0.1)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', marginBottom: '24px',
          border: '1px solid rgba(99,102,241,0.2)'
        }}
      >
        <FileSearch size={40} color="#6366f1" />
      </motion.div>
      <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#e2e8f0', marginBottom: '12px' }}>
        {title}
      </h3>
      <p style={{ color: '#94a3b8', maxWidth: '400px', marginBottom: '24px', lineHeight: 1.6 }}>
        {description}
      </p>
      {actionLink && actionText && (
        <Link to={actionLink} style={{ textDecoration: 'none' }}>
          <button className="btn-primary">
            {actionText}
          </button>
        </Link>
      )}
    </div>
  );
}
