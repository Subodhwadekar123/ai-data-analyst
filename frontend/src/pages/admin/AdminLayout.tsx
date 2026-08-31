/**
 * Admin Portal Layout
 * Dark sidebar navigation for the admin section with quick return to Data Analysis Studio.
 * All routes under /admin/* are wrapped here.
 */

import React, { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  LayoutDashboard, Users, Activity, FileText,
  Shield, LogOut, ChevronLeft, ChevronRight,
  Monitor, BarChart3, ArrowLeft, Database, Sparkles
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import { logoutUser } from '../../services/authApi';

const NAV_ITEMS = [
  { path: '/admin/dashboard', icon: <LayoutDashboard size={18} />, label: 'Dashboard' },
  { path: '/admin/users', icon: <Users size={18} />, label: 'Users' },
  { path: '/admin/activity', icon: <Activity size={18} />, label: 'Login Activity' },
  { path: '/admin/sessions', icon: <Monitor size={18} />, label: 'Sessions' },
  { path: '/admin/audit', icon: <FileText size={18} />, label: 'Audit Logs' },
];

const AdminLayout: React.FC = () => {
  const { user, logout } = useStore();
  const location = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  const handleLogout = async () => {
    try { await logoutUser(); } catch { }
    logout();
    navigate('/login');
    toast.success('Signed out');
  };

  React.useEffect(() => {
    // Force Pastel theme inside Admin console
    document.documentElement.setAttribute('data-theme', 'pastel');
    return () => {
      // Re-apply global Vibrant Light theme when leaving Admin console
      document.documentElement.setAttribute('data-theme', 'light');
    };
  }, []);

  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + '/');

  const SIDEBAR_W = collapsed ? 68 : 240;

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-app)' }}>
      {/* Sidebar */}
      <motion.aside
        animate={{ width: SIDEBAR_W }}
        transition={{ duration: 0.25, ease: 'easeInOut' }}
        style={{
          width: SIDEBAR_W, minHeight: '100vh', flexShrink: 0,
          background: 'var(--bg-sidebar)',
          borderRight: '1px solid var(--border-default)',
          display: 'flex', flexDirection: 'column',
          position: 'sticky', top: 0, height: '100vh', overflow: 'hidden',
          zIndex: 50,
        }}
      >
        {/* Logo & Brand */}
        <div style={{
          padding: collapsed ? '18px 12px' : '18px 16px',
          borderBottom: '1px solid var(--border-default)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <div style={{
            width: '38px', height: '38px',
            background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
            borderRadius: '12px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
            boxShadow: '0 4px 14px rgba(124,58,237,0.4)'
          }}>
            <Shield size={20} color="white" />
          </div>
          {!collapsed && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ overflow: 'hidden' }}>
              <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.1 }}>
                Admin Portal
              </div>
              <div style={{ fontSize: '11px', color: 'var(--accent-primary)', marginTop: '2px', fontWeight: 600 }}>
                Infinitics AI Platform
              </div>
            </motion.div>
          )}
        </div>

        {/* Primary Return to Analysis Panel Button */}
        <div style={{ padding: collapsed ? '12px 8px' : '12px 10px', borderBottom: '1px solid var(--border-default)' }}>
          <button
            onClick={() => navigate('/dashboard')}
            title="Back to Data Analysis Panel"
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: collapsed ? 'center' : 'flex-start',
              gap: '9px',
              padding: collapsed ? '10px 0' : '9px 12px',
              background: 'var(--accent-primary-light)',
              border: '1px solid var(--border-default)',
              borderRadius: '10px',
              color: 'var(--accent-primary)',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--bg-hover)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'var(--accent-primary-light)';
            }}
          >
            <ArrowLeft size={16} color="var(--accent-primary)" style={{ flexShrink: 0 }} />
            {!collapsed && (
              <span style={{ whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <BarChart3 size={14} color="var(--accent-primary)" />
                Analysis Panel
              </span>
            )}
          </button>
        </div>

        {/* Nav Items */}
        <nav style={{ flex: 1, padding: '14px 8px', overflowY: 'auto' }}>
          {!collapsed && (
            <div style={{
              fontSize: '10px',
              fontWeight: 700,
              textTransform: 'uppercase',
              color: 'var(--text-muted)',
              padding: '0 10px 8px',
              letterSpacing: '0.08em'
            }}>
              Administration
            </div>
          )}
          {NAV_ITEMS.map((item) => {
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                title={collapsed ? item.label : undefined}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: collapsed ? '10px 14px' : '10px 12px',
                  borderRadius: '10px',
                  marginBottom: '3px',
                  textDecoration: 'none',
                  background: active ? 'var(--accent-primary-light)' : 'transparent',
                  color: active ? 'var(--accent-primary)' : 'var(--text-secondary)',
                  borderLeft: active ? '3px solid var(--accent-primary)' : '3px solid transparent',
                  transition: 'all 0.15s ease',
                  justifyContent: collapsed ? 'center' : 'flex-start',
                }}
                onMouseEnter={(e) => {
                  if (!active) {
                    e.currentTarget.style.background = 'var(--bg-hover)';
                    e.currentTarget.style.color = 'var(--text-primary)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!active) {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = 'var(--text-secondary)';
                  }
                }}
              >
                {item.icon}
                {!collapsed && (
                  <span style={{ fontSize: '13px', fontWeight: 600, whiteSpace: 'nowrap' }}>
                    {item.label}
                  </span>
                )}
              </Link>
            );
          })}

          {/* Quick link to dataset studio */}
          <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid var(--border-default)' }}>
            {!collapsed && (
              <div style={{
                fontSize: '10px',
                fontWeight: 700,
                textTransform: 'uppercase',
                color: 'var(--text-muted)',
                padding: '0 10px 8px',
                letterSpacing: '0.08em'
              }}>
                Workspaces
              </div>
            )}
            <button
              onClick={() => navigate('/dashboard')}
              title="Data Analytics Studio"
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: collapsed ? '10px 14px' : '10px 12px',
                borderRadius: '10px',
                border: 'none',
                background: 'transparent',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                textAlign: 'left',
                justifyContent: collapsed ? 'center' : 'flex-start',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--accent-primary-light)';
                e.currentTarget.style.color = 'var(--accent-primary)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = 'var(--text-secondary)';
              }}
            >
              <Database size={18} color="var(--accent-primary)" />
              {!collapsed && (
                <span style={{ fontSize: '13px', fontWeight: 600, whiteSpace: 'nowrap' }}>
                  Datasets & EDA
                </span>
              )}
            </button>
          </div>
        </nav>

        {/* User + logout footer */}
        <div style={{ padding: '12px 8px', borderTop: '1px solid var(--border-default)' }}>
          {!collapsed && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '10px 12px',
              background: 'var(--bg-hover)',
              borderRadius: '10px',
              marginBottom: '8px'
            }}>
              <div style={{
                width: '32px', height: '32px',
                background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
                borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0
              }}>
                <span style={{ color: 'white', fontSize: '13px', fontWeight: 800 }}>
                  {user?.full_name?.[0] || user?.email?.[0] || 'A'}
                </span>
              </div>
              <div style={{ overflow: 'hidden' }}>
                <div style={{
                  fontSize: '13px',
                  fontWeight: 700,
                  color: 'var(--text-primary)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}>
                  {user?.full_name || 'System Admin'}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--accent-primary)', fontWeight: 600 }}>Administrator</div>
              </div>
            </div>
          )}
          <button
            onClick={handleLogout}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: collapsed ? 'center' : 'flex-start',
              gap: '8px',
              padding: '9px 12px',
              background: 'var(--color-danger-bg)',
              border: '1px solid var(--color-danger-border)',
              borderRadius: '10px',
              color: 'var(--color-danger)',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: 600
            }}
          >
            <LogOut size={16} /> {!collapsed && 'Sign Out'}
          </button>
        </div>

        {/* Collapse Toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          style={{
            position: 'absolute',
            top: '22px',
            right: collapsed ? 'auto' : '-13px',
            left: collapsed ? '52px' : 'auto',
            width: '26px',
            height: '26px',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-default)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: 'var(--text-secondary)',
            zIndex: 60,
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </motion.aside>

      {/* Main Content Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Top Header Bar across Admin Portal */}
        <header style={{
          height: '60px',
          background: 'var(--bg-header)',
          backdropFilter: 'blur(16px)',
          borderBottom: '1px solid var(--border-default)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 28px',
          position: 'sticky',
          top: 0,
          zIndex: 40,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: 'var(--accent-primary-light)',
              border: '1px solid var(--border-default)',
              color: 'var(--accent-primary)',
              borderRadius: '20px',
              padding: '4px 12px',
              fontSize: '12px',
              fontWeight: 700,
            }}>
              <Shield size={13} color="var(--accent-primary)" /> Administrative Console
            </span>
          </div>

          {/* Quick Action to return to Analysis Panel */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate('/dashboard')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 16px',
                background: 'linear-gradient(135deg, #4f46e5, #6366f1)',
                border: 'none',
                borderRadius: '10px',
                color: 'white',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(79,70,229,0.35)',
              }}
            >
              <BarChart3 size={16} />
              Go to Analysis Panel
            </motion.button>
          </div>
        </header>

        {/* Page Content */}
        <main style={{ flex: 1, overflow: 'auto' }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
