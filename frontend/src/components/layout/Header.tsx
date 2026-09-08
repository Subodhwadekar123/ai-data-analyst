import React, { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Sun, Moon, Database, ChevronDown, RefreshCw, Plus, User, Shield, Sparkles, Palette, Menu } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { useIsMobile } from '../../hooks/useMediaQuery';

const routeTitles: Record<string, string> = {
  '/dashboard': 'Executive Overview',
  '/dashboard/upload': 'Dataset Ingestion',
  '/dashboard/eda': 'Exploratory Data Analysis',
  '/dashboard/cleaning': 'Data Cleaning & Normalization',
  '/dashboard/visualization': 'Visualization Studio',
  '/dashboard/features': 'Feature Engineering',
  '/dashboard/statistics': 'Statistical Hypothesis Suite',
  '/dashboard/ml': 'AutoML & Model Studio',
  '/dashboard/ai-insights': 'AI Executive Insights',
  '/dashboard/reports': 'Report Generator',
  '/dashboard/settings': 'Workspace Settings',
  '/dashboard/profile': 'Profile & Security',
};

interface HeaderProps {
  onMenuToggle?: () => void;
}

const Header: React.FC<HeaderProps> = ({ onMenuToggle }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const {
    datasets,
    activeDataset,
    setActiveDataset,
    user,
    theme,
    toggleTheme,
  } = useStore();

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const pageTitle = routeTitles[location.pathname] ?? 'Data Analytics Platform';

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <motion.header
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      style={{
        height: 60,
        backgroundColor: 'var(--bg-header)',
        backdropFilter: 'blur(16px)',
        borderBottom: '1px solid var(--border-default)',
        display: 'flex',
        alignItems: 'center',
        padding: isMobile ? '0 12px' : '0 24px',
        gap: isMobile ? 8 : 16,
        position: 'sticky',
        top: 0,
        zIndex: 50,
        transition: 'background-color 0.2s ease, border-color 0.2s ease',
      }}
    >
      {/* Mobile Hamburger Menu */}
      {isMobile && (
        <button
          onClick={onMenuToggle}
          style={{
            width: 36,
            height: 36,
            borderRadius: 8,
            border: '1px solid var(--border-default)',
            backgroundColor: 'var(--bg-surface)',
            color: 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            flexShrink: 0,
          }}
        >
          <Menu size={18} />
        </button>
      )}

      {/* Page Title & Breadcrumb */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
        <AnimatePresence mode="wait">
          <motion.h1
            key={pageTitle}
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 6 }}
            transition={{ duration: 0.15 }}
            style={{
              fontSize: isMobile ? 14 : 16,
              fontWeight: 700,
              color: 'var(--text-primary)',
              margin: 0,
              letterSpacing: '-0.015em',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {pageTitle}
          </motion.h1>
        </AnimatePresence>
      </div>

      {/* Dataset Selector — Precision Dropdown */}
      <div ref={dropdownRef} style={{ position: 'relative' }}>
        <button
          onClick={() => setDropdownOpen(!dropdownOpen)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '6px 12px',
            borderRadius: 8,
            border: '1px solid var(--border-default)',
            backgroundColor: 'var(--bg-surface)',
            color: activeDataset ? 'var(--text-primary)' : 'var(--text-muted)',
            cursor: 'pointer',
            fontSize: 13,
            fontWeight: 500,
            transition: 'all 0.15s ease',
            minWidth: isMobile ? 140 : 190,
            justifyContent: 'space-between',
            boxShadow: 'var(--shadow-xs)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <Database size={14} color={activeDataset ? 'var(--accent-primary)' : 'var(--text-muted)'} />
            <span
              style={{
                maxWidth: isMobile ? 80 : 130,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                fontWeight: activeDataset ? 600 : 400,
              }}
            >
              {activeDataset
                ? (activeDataset.filename || 'Active Dataset')
                : 'Select Dataset'}
            </span>
          </div>
          <ChevronDown
            size={13}
            color="var(--text-muted)"
            style={{
              transition: 'transform 0.2s',
              transform: dropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)',
              flexShrink: 0,
            }}
          />
        </button>

        <AnimatePresence>
          {dropdownOpen && (
            <motion.div
              initial={{ opacity: 0, y: -4, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.98 }}
              transition={{ duration: 0.12 }}
              style={{
                position: 'absolute',
                top: 'calc(100% + 6px)',
                left: 0,
                right: 0,
                minWidth: 230,
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--border-default)',
                borderRadius: 10,
                boxShadow: 'var(--shadow-lg)',
                zIndex: 200,
                overflow: 'hidden',
              }}
            >
              <div style={{ padding: '8px 10px', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Loaded Datasets ({datasets.length})
              </div>

              <div style={{ maxHeight: 220, overflowY: 'auto' }}>
                {datasets.length === 0 ? (
                  <div
                    style={{
                      padding: '16px',
                      textAlign: 'center',
                      color: 'var(--text-muted)',
                      fontSize: 12.5,
                    }}
                  >
                    No datasets loaded yet
                  </div>
                ) : (
                  datasets.map((ds: any) => (
                    <button
                      key={ds.id}
                      onClick={() => {
                        setActiveDataset(ds);
                        setDropdownOpen(false);
                      }}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '8px 12px',
                        border: 'none',
                        backgroundColor:
                          activeDataset?.id === ds.id
                            ? 'var(--accent-primary-light)'
                            : 'transparent',
                        color:
                          activeDataset?.id === ds.id ? 'var(--accent-primary)' : 'var(--text-primary)',
                        cursor: 'pointer',
                        fontSize: 13,
                        fontWeight: activeDataset?.id === ds.id ? 600 : 400,
                        textAlign: 'left',
                        transition: 'background 0.12s',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Database size={13} />
                        <span
                          style={{
                            maxWidth: 140,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {ds.filename || ds.name}
                        </span>
                      </div>
                      {ds.file_size_mb && (
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                          {ds.file_size_mb.toFixed(1)}MB
                        </span>
                      )}
                    </button>
                  ))
                )}
              </div>

              <div
                style={{
                  borderTop: '1px solid var(--border-subtle)',
                  padding: '6px',
                }}
              >
                <button
                  onClick={() => {
                    setDropdownOpen(false);
                    navigate('/dashboard/upload');
                  }}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    padding: '7px 10px',
                    borderRadius: 6,
                    border: '1px dashed var(--border-strong)',
                    backgroundColor: 'transparent',
                    color: 'var(--accent-primary)',
                    cursor: 'pointer',
                    fontSize: 12.5,
                    fontWeight: 600,
                    transition: 'all 0.15s',
                  }}
                >
                  <Plus size={13} />
                  Ingest New Dataset
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Right Header Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 6 : 8 }}>
        {/* Refresh Page */}
        <button
          onClick={handleRefresh}
          title="Refresh Data"
          style={{
            width: isMobile ? 32 : 34,
            height: isMobile ? 32 : 34,
            borderRadius: 8,
            border: '1px solid var(--border-default)',
            backgroundColor: 'var(--bg-surface)',
            color: 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            boxShadow: 'var(--shadow-xs)',
          }}
        >
          <RefreshCw size={14} />
        </button>

        {/* User Profile Pill */}
        {user && (
          <button
            onClick={() => navigate('/dashboard/profile')}
            title="Profile & Security Settings"
            style={{
              height: isMobile ? 32 : 34,
              padding: isMobile ? '0 8px' : '0 10px',
              borderRadius: 8,
              border: '1px solid var(--border-default)',
              backgroundColor: 'var(--bg-surface)',
              color: 'var(--text-primary)',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              cursor: 'pointer',
              fontSize: 12.5,
              fontWeight: 600,
              transition: 'all 0.15s ease',
              boxShadow: 'var(--shadow-xs)',
            }}
          >
            <div
              style={{
                width: isMobile ? 22 : 20,
                height: isMobile ? 22 : 20,
                borderRadius: '50%',
                background: user.is_admin ? 'var(--accent-amber)' : 'var(--accent-primary)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 10.5,
                fontWeight: 700,
                flexShrink: 0,
              }}
            >
              {(user.full_name || user.email || 'U')[0].toUpperCase()}
            </div>
            {!isMobile && <span>{user.full_name ? user.full_name.split(' ')[0] : 'Analyst'}</span>}
          </button>
        )}

        {/* Active Dataset Status Indicator - Hidden on mobile (shown in sidebar) */}
        {activeDataset && !isMobile && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '4px 9px',
              borderRadius: 6,
              background: 'var(--color-success-bg)',
              border: '1px solid var(--color-success-border)',
              fontSize: 12,
              fontWeight: 600,
              color: 'var(--color-success)',
            }}
          >
            <div
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                backgroundColor: 'var(--color-success)',
              }}
            />
            <span
              style={{
                maxWidth: 110,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {activeDataset.filename}
            </span>
          </div>
        )}
      </div>
    </motion.header>
  );
};

export default Header;
