import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  Brain,
  Home,
  Upload,
  Wand2,
  BarChart2,
  PieChart,
  FlaskConical,
  TrendingUp,
  FileText,
  Settings,
  ChevronLeft,
  ChevronRight,
  Layers,
  Database,
  Sparkles,
  LogOut,
  Shield,
} from 'lucide-react';
import { useStore } from '../../store/useStore';

interface NavItem {
  icon: React.ReactNode;
  label: string;
  path: string;
}

interface NavSection {
  heading: string;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    heading: 'Main',
    items: [
      { icon: <Home size={18} />, label: 'Home', path: '/' },
      { icon: <Upload size={18} />, label: 'Upload Dataset', path: '/dashboard/upload' },
      { icon: <Database size={18} />, label: 'Dashboard', path: '/dashboard' },
    ],
  },
  {
    heading: 'Analysis',
    items: [
      { icon: <Layers size={18} />, label: 'EDA', path: '/dashboard/eda' },
      { icon: <Wand2 size={18} />, label: 'Data Cleaning', path: '/dashboard/cleaning' },
      { icon: <BarChart2 size={18} />, label: 'Visualization', path: '/dashboard/visualization' },
      { icon: <FlaskConical size={18} />, label: 'Feature Engineering', path: '/dashboard/features' },
      { icon: <TrendingUp size={18} />, label: 'Statistics', path: '/dashboard/statistics' },
    ],
  },
  {
    heading: 'AI & ML',
    items: [
      { icon: <Brain size={18} />, label: 'Machine Learning', path: '/dashboard/ml' },
      { icon: <Sparkles size={18} />, label: 'AI Insights', path: '/dashboard/ai-insights' },
    ],
  },
  {
    heading: 'Output',
    items: [
      { icon: <FileText size={18} />, label: 'Reports', path: '/dashboard/reports' },
      { icon: <Settings size={18} />, label: 'Settings', path: '/dashboard/settings' },
    ],
  },
];

const Sidebar: React.FC = () => {
  const { sidebarCollapsed, setSidebarCollapsed, activeDataset, user, logout } = useStore();
  const navigate = useNavigate();

  const dynamicSections = [...navSections];
  if (user?.is_admin) {
    dynamicSections.push({
      heading: 'System',
      items: [
        { icon: <Shield size={18} />, label: 'Admin Console', path: '/dashboard/admin' },
      ],
    });
  }

  const width = sidebarCollapsed ? 68 : 240;

  return (
    <motion.aside
      animate={{ width }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      style={{
        position: 'fixed',
        left: 0,
        top: 0,
        bottom: 0,
        zIndex: 100,
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#0f1117',
        borderRight: '1px solid #2d2f3e',
        boxShadow: '4px 0 24px rgba(0,0,0,0.1)',
        overflow: 'hidden',
      }}
    >
      {/* Logo */}
      <div
        style={{
          padding: sidebarCollapsed ? '20px 0' : '20px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          cursor: 'pointer',
          borderBottom: '1px solid rgba(99,102,241,0.1)',
          minHeight: 68,
          justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
        }}
        onClick={() => navigate('/dashboard')}
      >
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            background: 'linear-gradient(135deg, #6366f1, #a855f7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            boxShadow: '0 0 16px rgba(99,102,241,0.4)',
          }}
        >
          <Brain size={20} color="#fff" />
        </div>
        <AnimatePresence>
          {!sidebarCollapsed && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
              style={{ overflow: 'hidden', whiteSpace: 'nowrap' }}
            >
              <span
                style={{
                  fontSize: 16,
                  fontWeight: 700,
                  background: 'linear-gradient(135deg, #6366f1, #a855f7)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  letterSpacing: '-0.3px',
                }}
              >
                DataMind AI
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Nav Sections */}
      <nav style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '8px 0' }}>
        {dynamicSections.map((section) => (
          <div key={section.heading} style={{ marginBottom: 4 }}>
            <AnimatePresence>
              {!sidebarCollapsed && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  style={{
                    padding: '12px 16px 4px',
                    fontSize: 10,
                    fontWeight: 600,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: 'rgba(148,163,184,0.5)',
                  }}
                >
                  {section.heading}
                </motion.div>
              )}
            </AnimatePresence>

            {section.items.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/dashboard' || item.path === '/'}
                style={({ isActive }) => ({
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: sidebarCollapsed ? '10px 0' : '9px 14px',
                  margin: '2px 8px',
                  borderRadius: 8,
                  textDecoration: 'none',
                  justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
                  fontSize: 13.5,
                  fontWeight: 500,
                  color: isActive ? '#e2e8f0' : 'rgba(148,163,184,0.75)',
                  backgroundColor: isActive
                    ? 'rgba(99,102,241,0.18)'
                    : 'transparent',
                  borderLeft: isActive
                    ? '3px solid #6366f1'
                    : '3px solid transparent',
                  transition: 'all 0.18s ease',
                  position: 'relative',
                })}
                className={({ isActive }) =>
                  `sidebar-item${isActive ? ' active' : ''}`
                }
                title={sidebarCollapsed ? item.label : undefined}
              >
                {({ isActive }) => (
                  <>
                    <span
                      style={{
                        flexShrink: 0,
                        color: isActive ? '#818cf8' : 'rgba(148,163,184,0.7)',
                        transition: 'color 0.18s',
                      }}
                    >
                      {item.icon}
                    </span>
                    <AnimatePresence>
                      {!sidebarCollapsed && (
                        <motion.span
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -8 }}
                          transition={{ duration: 0.18 }}
                          style={{ whiteSpace: 'nowrap', overflow: 'hidden' }}
                        >
                          {item.label}
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </>
                )}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      {/* Active Dataset Indicator */}
      <AnimatePresence>
        {activeDataset && !sidebarCollapsed && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.2 }}
            style={{
              margin: '0 8px 8px',
              padding: '10px 12px',
              borderRadius: 8,
              background: 'rgba(99,102,241,0.1)',
              border: '1px solid rgba(99,102,241,0.2)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <Database size={13} color="#818cf8" />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 10,
                    color: 'rgba(148,163,184,0.6)',
                    marginBottom: 2,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                  }}
                >
                  Active Dataset
                </div>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: '#a5b4fc',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {activeDataset.filename || activeDataset.name || 'Dataset'}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* User Profile & Sign Out */}
      {!sidebarCollapsed && user && (
        <div
          style={{
            marginTop: 'auto',
            borderTop: '1px solid rgba(255, 255, 255, 0.05)',
            padding: '16px 12px 8px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: '#6366f120',
                border: '1px solid #6366f140',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#818cf8',
                fontWeight: 600,
                fontSize: '14px',
                flexShrink: 0
              }}
            >
              {user.full_name ? user.full_name[0].toUpperCase() : user.email[0].toUpperCase()}
            </div>
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontSize: '13px',
                  fontWeight: 600,
                  color: 'white',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}
              >
                {user.full_name || 'User'}
              </div>
              <div
                style={{
                  fontSize: '11px',
                  color: '#64748b',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}
              >
                {user.email}
              </div>
            </div>
          </div>
          <button
            onClick={() => {
              logout();
              navigate('/');
              toast.success('Logged out successfully.');
            }}
            className="btn-secondary"
            style={{
              padding: '6px 12px',
              fontSize: '12px',
              fontWeight: 600,
              width: '100%',
              textAlign: 'center'
            }}
          >
            Sign Out
          </button>
        </div>
      )}

      {sidebarCollapsed && user && (
        <div
          style={{
            marginTop: 'auto',
            borderTop: '1px solid rgba(255, 255, 255, 0.05)',
            padding: '12px 0',
            display: 'flex',
            justifyContent: 'center'
          }}
        >
          <button
            onClick={async () => {
              try {
                const api = await import('../../services/api');
                await api.logout();
              } catch (e) {
                console.error('Backend logout failed', e);
              }
              logout();
              navigate('/');
              toast.success('Logged out successfully.');
            }}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'rgba(148, 163, 184, 0.7)',
              cursor: 'pointer',
              padding: '8px'
            }}
            title="Sign Out"
            onMouseEnter={(e) => e.currentTarget.style.color = '#ef4444'}
            onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(148, 163, 184, 0.7)'}
          >
            <LogOut size={18} />
          </button>
        </div>
      )}

      {/* Collapse Toggle */}
      <div
        style={{
          borderTop: '1px solid rgba(99,102,241,0.1)',
          padding: '12px 0',
          display: 'flex',
          justifyContent: sidebarCollapsed ? 'center' : 'flex-end',
          paddingRight: sidebarCollapsed ? 0 : 12,
        }}
      >
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            border: '1px solid rgba(99,102,241,0.2)',
            backgroundColor: 'rgba(99,102,241,0.1)',
            color: '#818cf8',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'all 0.18s ease',
          }}
          title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {sidebarCollapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
        </button>
      </div>
    </motion.aside>
  );
};

export default Sidebar;
