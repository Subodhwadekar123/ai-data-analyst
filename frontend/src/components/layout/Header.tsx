import React, { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Sun, Moon, Database, ChevronDown, RefreshCw, Plus } from 'lucide-react';
import { useStore } from '../../store/useStore';

const routeTitles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/dashboard/upload': 'Upload Dataset',
  '/dashboard/eda': 'Exploratory Data Analysis',
  '/dashboard/cleaning': 'Data Cleaning',
  '/dashboard/visualization': 'Visualization',
  '/dashboard/features': 'Feature Engineering',
  '/dashboard/statistics': 'Statistical Analysis',
  '/dashboard/ml': 'Machine Learning',
  '/dashboard/ai-insights': 'AI Insights',
  '/dashboard/reports': 'Reports',
  '/dashboard/settings': 'Settings',
};

const Header: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const {
    datasets,
    activeDataset,
    setActiveDataset,
  } = useStore();

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const pageTitle = routeTitles[location.pathname] ?? 'DataMind AI';

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
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      style={{
        height: 64,
        backgroundColor: 'rgba(26, 29, 39, 0.8)',
        backdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(99, 102, 241, 0.15)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 24px',
        gap: 16,
        position: 'sticky',
        top: 0,
        zIndex: 50,
      }}
    >
      {/* Page Title */}
      <AnimatePresence mode="wait">
        <motion.h1
          key={pageTitle}
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 8 }}
          transition={{ duration: 0.2 }}
          style={{
            fontSize: 18,
            fontWeight: 700,
            color: '#e2e8f0',
            margin: 0,
            flex: 1,
            letterSpacing: '-0.3px',
          }}
        >
          {pageTitle}
        </motion.h1>
      </AnimatePresence>

      {/* Dataset Selector — Center */}
      <div ref={dropdownRef} style={{ position: 'relative' }}>
        <button
          onClick={() => setDropdownOpen(!dropdownOpen)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '7px 14px',
            borderRadius: 8,
            border: '1px solid rgba(99,102,241,0.25)',
            backgroundColor: 'rgba(99,102,241,0.1)',
            color: activeDataset ? '#a5b4fc' : 'rgba(148,163,184,0.6)',
            cursor: 'pointer',
            fontSize: 13,
            fontWeight: 500,
            transition: 'all 0.18s ease',
            minWidth: 180,
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <Database size={14} />
            <span
              style={{
                maxWidth: 140,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {activeDataset
                ? (activeDataset.filename || activeDataset.name || 'Active Dataset')
                : 'No dataset loaded'}
            </span>
          </div>
          <ChevronDown
            size={13}
            style={{
              transition: 'transform 0.2s',
              transform: dropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            }}
          />
        </button>

        <AnimatePresence>
          {dropdownOpen && (
            <motion.div
              initial={{ opacity: 0, y: -6, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.97 }}
              transition={{ duration: 0.15 }}
              style={{
                position: 'absolute',
                top: 'calc(100% + 8px)',
                left: 0,
                right: 0,
                minWidth: 220,
                backgroundColor: '#252836',
                border: '1px solid rgba(99,102,241,0.2)',
                borderRadius: 10,
                boxShadow: '0 12px 40px rgba(0,0,0,0.4)',
                zIndex: 200,
                overflow: 'hidden',
              }}
            >
              {datasets.length === 0 ? (
                <div
                  style={{
                    padding: '16px',
                    textAlign: 'center',
                    color: 'rgba(148,163,184,0.5)',
                    fontSize: 13,
                  }}
                >
                  No datasets available
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
                      gap: 8,
                      padding: '10px 14px',
                      border: 'none',
                      backgroundColor:
                        activeDataset?.id === ds.id
                          ? 'rgba(99,102,241,0.15)'
                          : 'transparent',
                      color:
                        activeDataset?.id === ds.id ? '#a5b4fc' : '#cbd5e1',
                      cursor: 'pointer',
                      fontSize: 13,
                      textAlign: 'left',
                      transition: 'background 0.15s',
                    }}
                  >
                    <Database size={13} />
                    <span
                      style={{
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {ds.filename || ds.name}
                    </span>
                  </button>
                ))
              )}
              <div
                style={{
                  borderTop: '1px solid rgba(99,102,241,0.1)',
                  padding: '8px',
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
                    gap: 8,
                    padding: '8px 10px',
                    borderRadius: 6,
                    border: '1px dashed rgba(99,102,241,0.3)',
                    backgroundColor: 'transparent',
                    color: '#818cf8',
                    cursor: 'pointer',
                    fontSize: 13,
                    fontWeight: 500,
                    transition: 'all 0.15s',
                  }}
                >
                  <Plus size={13} />
                  Upload New Dataset
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Right Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {/* Refresh */}
        <button
          onClick={handleRefresh}
          title="Refresh"
          style={{
            width: 36,
            height: 36,
            borderRadius: 8,
            border: '1px solid rgba(99,102,241,0.15)',
            backgroundColor: 'rgba(99,102,241,0.07)',
            color: 'rgba(148,163,184,0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'all 0.18s ease',
          }}
        >
          <RefreshCw size={15} />
        </button>

        {/* Active Dataset Badge */}
        {activeDataset && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '5px 11px',
              borderRadius: 20,
              background: 'linear-gradient(135deg, rgba(99,102,241,0.25), rgba(168,85,247,0.2))',
              border: '1px solid rgba(99,102,241,0.35)',
              fontSize: 12,
              fontWeight: 600,
              color: '#a5b4fc',
            }}
          >
            <div
              style={{
                width: 7,
                height: 7,
                borderRadius: '50%',
                backgroundColor: '#22c55e',
                boxShadow: '0 0 6px rgba(34,197,94,0.7)',
              }}
            />
            <span
              style={{
                maxWidth: 120,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {activeDataset.filename || activeDataset.name}
            </span>
          </motion.div>
        )}
      </div>
    </motion.header>
  );
};

export default Header;
