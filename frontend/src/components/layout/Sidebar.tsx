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
  User,
  MessageSquare,
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import { logoutUser } from '../../services/authApi';

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
    heading: 'Core',
    items: [
      { icon: <Home size={17} />, label: 'Home', path: '/' },
      { icon: <Database size={17} />, label: 'Overview', path: '/dashboard' },
      { icon: <Upload size={17} />, label: 'Ingest Dataset', path: '/dashboard/upload' },
    ],
  },
  {
    heading: 'Data Suite',
    items: [
      { icon: <Layers size={17} />, label: 'EDA Studio', path: '/dashboard/eda' },
      { icon: <Wand2 size={17} />, label: 'Data Cleaning', path: '/dashboard/cleaning' },
      { icon: <BarChart2 size={17} />, label: 'Visualizations', path: '/dashboard/visualization' },
      { icon: <FlaskConical size={17} />, label: 'Feature Engineering', path: '/dashboard/features' },
      { icon: <TrendingUp size={17} />, label: 'Statistics', path: '/dashboard/statistics' },
    ],
  },
  {
    heading: 'AI & Intelligence',
    items: [
      { icon: <Brain size={17} />, label: 'AutoML Studio', path: '/dashboard/ml' },
      { icon: <Database size={17} />, label: 'SQL Workplace', path: '/dashboard/sql' },
      { icon: <Sparkles size={17} />, label: 'AI Executive Brief', path: '/dashboard/ai-insights' },
      { icon: <MessageSquare size={17} />, label: 'Property AI Chat', path: '/dashboard/property-chat' },
    ],
  },
  {
    heading: 'Outputs & Config',
    items: [
      { icon: <FileText size={17} />, label: 'Reports & Export', path: '/dashboard/reports' },
      { icon: <User size={17} />, label: 'Profile & Security', path: '/dashboard/profile' },
      { icon: <Settings size={17} />, label: 'Settings', path: '/dashboard/settings' },
    ],
  },
];

const Sidebar: React.FC = () => {
  const { sidebarCollapsed, setSidebarCollapsed, activeDataset, user, logout } = useStore();
  const navigate = useNavigate();

  const dynamicSections = [...navSections];
  if (user?.is_admin) {
    dynamicSections.push({
      heading: 'Administration',
      items: [
        { icon: <Shield size={17} />, label: 'Admin Portal', path: '/admin' },
      ],
    });
  }

  const width = sidebarCollapsed ? 64 : 230;

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
        backgroundColor: 'var(--bg-surface)',
        borderRight: '1px solid var(--border-default)',
        boxShadow: 'var(--shadow-sm)',
        overflow: 'hidden',
        transition: 'background-color 0.2s ease, border-color 0.2s ease',
      }}
    >
      {/* Platform Branding */}
      <div
        style={{
          padding: sidebarCollapsed ? '16px 0' : '16px',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          cursor: 'pointer',
          borderBottom: '1px solid var(--border-subtle)',
          minHeight: 60,
          justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
        }}
        onClick={() => navigate('/dashboard')}
      >
        <img 
          src="/logo.jpg" 
          alt="Infinitics AI" 
          style={{
            width: 30,
            height: 30,
            borderRadius: 7,
            objectFit: 'cover',
            boxShadow: 'var(--shadow-xs)',
            flexShrink: 0,
          }} 
        />
        <AnimatePresence>
          {!sidebarCollapsed && (
            <motion.div
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.15 }}
              style={{ overflow: 'hidden', whiteSpace: 'nowrap' }}
            >
              <span
                style={{
                  fontSize: 15,
                  fontWeight: 700,
                  color: 'var(--text-primary)',
                  letterSpacing: '-0.02em',
                }}
              >
                Infinitics <span style={{ color: 'var(--accent-primary)', fontWeight: 800 }}>AI</span>
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Nav Sections List */}
      <nav style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '10px 0' }}>
        {dynamicSections.map((section) => (
          <div key={section.heading} style={{ marginBottom: 8 }}>
            <AnimatePresence>
              {!sidebarCollapsed && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  style={{
                    padding: '8px 16px 4px',
                    fontSize: 10.5,
                    fontWeight: 700,
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    color: 'var(--text-muted)',
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
                className="sidebar-nav-link"
                style={({ isActive }) => ({
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: sidebarCollapsed ? '9px 0' : '8px 12px',
                  margin: '2px 8px',
                  borderRadius: 7,
                  textDecoration: 'none',
                  justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
                  fontSize: 13,
                  fontWeight: isActive ? 600 : 500,
                  color: isActive ? 'var(--accent-primary)' : 'var(--text-secondary)',
                  background: isActive
                    ? 'linear-gradient(90deg, var(--accent-primary-light) 0%, rgba(255,255,255,0) 100%)'
                    : 'transparent',
                  boxShadow: isActive ? 'inset 0 0 0 1px var(--border-default), var(--shadow-xs)' : 'none',
                  transition: 'all 0.15s ease',
                  position: 'relative',
                })}
                title={sidebarCollapsed ? item.label : undefined}
              >
                {({ isActive }) => (
                  <>
                    {/* Active Left Accent Bar */}
                    {isActive && (
                      <motion.span
                        layoutId={`sidebar-active-bar-${section.heading}`}
                        initial={{ scaleY: 0 }}
                        animate={{ scaleY: 1 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                        style={{
                          position: 'absolute',
                          left: -8,
                          top: '18%',
                          bottom: '18%',
                          width: 3,
                          borderRadius: 3,
                          background: 'var(--accent-primary)',
                          boxShadow: '0 0 8px var(--accent-primary)',
                        }}
                      />
                    )}
                    <span
                      className="sidebar-nav-icon"
                      style={{
                        flexShrink: 0,
                        color: isActive ? 'var(--accent-primary)' : 'var(--text-secondary)',
                        transition: 'color 0.15s',
                        display: 'flex',
                        alignItems: 'center',
                      }}
                    >
                      {item.icon}
                    </span>
                    <AnimatePresence>
                      {!sidebarCollapsed && (
                        <motion.span
                          initial={{ opacity: 0, x: -6 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -6 }}
                          transition={{ duration: 0.15 }}
                          style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
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

      {/* Active Dataset Drawer */}
      <AnimatePresence>
        {activeDataset && !sidebarCollapsed && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.15 }}
            style={{
              margin: '0 8px 8px',
              padding: '8px 10px',
              borderRadius: 8,
              background: 'var(--bg-canvas)',
              border: '1px solid var(--border-default)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <div style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: 'var(--color-success)' }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 10,
                    color: 'var(--text-muted)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    fontWeight: 700,
                  }}
                >
                  Active Workspace
                </div>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {activeDataset.filename || 'Dataset'}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* User Profile & Sign Out Footer */}
      {!sidebarCollapsed && user && (
        <div
          style={{
            marginTop: 'auto',
            borderTop: '1px solid var(--border-subtle)',
            padding: '10px 10px 6px',
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
          }}
        >
          <div
            onClick={() => navigate('/dashboard/profile')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              minWidth: 0,
              cursor: 'pointer',
              padding: '5px 6px',
              borderRadius: 7,
              transition: 'background 0.12s',
            }}
            title="View Profile & Settings"
          >
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: 7,
                background: user.is_admin ? 'var(--accent-amber)' : 'var(--accent-primary)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: 12,
                flexShrink: 0,
              }}
            >
              {user.full_name ? user.full_name[0].toUpperCase() : user.email[0].toUpperCase()}
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div
                style={{
                  fontSize: 12.5,
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {user.full_name || 'Analyst'}
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: 'var(--text-muted)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {user.email}
              </div>
            </div>
          </div>
          <button
            onClick={async () => {
              try {
                await logoutUser();
              } catch (e) {
                console.error('Backend logout failed', e);
              }
              logout();
              navigate('/');
              toast.success('Signed out successfully.');
            }}
            className="btn-secondary"
            style={{
              padding: '5px 10px',
              fontSize: 11.5,
              fontWeight: 600,
              width: '100%',
              textAlign: 'center',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 5,
            }}
          >
            <LogOut size={12} />
            Sign Out
          </button>
        </div>
      )}

      {sidebarCollapsed && user && (
        <div
          style={{
            marginTop: 'auto',
            borderTop: '1px solid var(--border-subtle)',
            padding: '10px 0',
            display: 'flex',
            justifyContent: 'center',
          }}
        >
          <button
            onClick={async () => {
              try {
                await logoutUser();
              } catch (e) {
                console.error('Backend logout failed', e);
              }
              logout();
              navigate('/');
              toast.success('Signed out successfully.');
            }}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: 6,
            }}
            title="Sign Out"
          >
            <LogOut size={16} />
          </button>
        </div>
      )}

      {/* Collapse/Expand Action */}
      <div
        style={{
          borderTop: '1px solid var(--border-subtle)',
          padding: '8px 0',
          display: 'flex',
          justifyContent: sidebarCollapsed ? 'center' : 'flex-end',
          paddingRight: sidebarCollapsed ? 0 : 10,
        }}
      >
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          style={{
            width: 28,
            height: 28,
            borderRadius: 6,
            border: '1px solid var(--border-default)',
            backgroundColor: 'var(--bg-canvas)',
            color: 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
          title={sidebarCollapsed ? 'Expand navigation' : 'Collapse navigation'}
        >
          {sidebarCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </div>
    </motion.aside>
  );
};

export default Sidebar;
