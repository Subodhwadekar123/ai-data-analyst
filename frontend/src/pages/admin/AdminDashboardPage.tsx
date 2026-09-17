/**
 * Admin Dashboard Page
 * Overview stats cards + recent activity panel.
 */

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Users, UserCheck, UserX, Shield, Database, FlaskConical,
  Activity, Monitor, AlertTriangle, Loader2, RefreshCw,
  TrendingUp, TrendingDown
} from 'lucide-react';
import { getAdminStats, getLoginActivity } from '../../services/adminApi';

interface Stats {
  total_users: number; active_users: number; approved_users: number;
  pending_users: number; suspended_users: number; deleted_users: number;
  total_datasets: number; total_experiments: number; total_issues: number;
  active_sessions: number; failed_logins_24h: number;
}

const STAT_CARDS = (stats: Stats) => [
  { label: 'Total Users', value: stats.total_users, icon: <Users size={22} />, color: '#6366f1', bg: 'rgba(99,102,241,0.12)', link: '/admin/users' },
  { label: 'Active Users', value: stats.active_users, icon: <UserCheck size={22} />, color: '#10b981', bg: 'rgba(16,185,129,0.12)', link: '/admin/users?is_active=true' },
  { label: 'Pending Approval', value: stats.pending_users, icon: <UserX size={22} />, color: '#f97316', bg: 'rgba(249,115,22,0.12)', link: '/admin/users?is_approved=false' },
  { label: 'Suspended', value: stats.suspended_users, icon: <Shield size={22} />, color: '#ef4444', bg: 'rgba(239,68,68,0.12)', link: '/admin/users?is_suspended=true' },
  { label: 'Active Sessions', value: stats.active_sessions, icon: <Monitor size={22} />, color: '#06b6d4', bg: 'rgba(6,182,212,0.12)', link: '/admin/sessions' },
  { label: 'Failed Logins (24h)', value: stats.failed_logins_24h, icon: <AlertTriangle size={22} />, color: '#eab308', bg: 'rgba(234,179,8,0.12)', link: '/admin/activity?success=false' },
  { label: 'Total Datasets', value: stats.total_datasets, icon: <Database size={22} />, color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)', link: '/dashboard' },
  { label: 'ML Experiments', value: stats.total_experiments, icon: <FlaskConical size={22} />, color: '#ec4899', bg: 'rgba(236,72,153,0.12)', link: '/dashboard/ml' },
];

const AdminDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    try {
      const [statsRes, activityRes] = await Promise.all([
        getAdminStats() as Promise<Stats>,
        getLoginActivity({ limit: 10 }) as Promise<any>,
      ]);
      setStats(statsRes);
      setRecentActivity(activityRes.records || []);
    } catch (err: any) {
      console.error('Failed to load dashboard data:', err.message);
    }
  };

  useEffect(() => {
    loadData().finally(() => setLoading(false));
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: '#64748b' }}>
        <Loader2 size={36} style={{ animation: 'spin 1s linear infinite' }} />
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ padding: '28px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#f1f5f9', margin: '0 0 4px' }}>Admin Dashboard</h1>
          <p style={{ color: '#64748b', margin: 0, fontSize: '14px' }}>System overview and real-time statistics</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={() => navigate('/dashboard')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '7px',
              background: 'linear-gradient(135deg, #4f46e5, #6366f1)',
              border: 'none',
              color: '#ffffff',
              borderRadius: '10px',
              padding: '9px 16px',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: 700,
              boxShadow: '0 4px 14px rgba(79,70,229,0.3)',
            }}
          >
            <Database size={15} /> Open Analysis Studio
          </button>
          <button onClick={handleRefresh} disabled={refreshing}
            style={{ display: 'flex', alignItems: 'center', gap: '7px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#94a3b8', borderRadius: '10px', padding: '9px 16px', cursor: refreshing ? 'not-allowed' : 'pointer', fontSize: '13px', fontWeight: 600 }}>
            <RefreshCw size={15} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} /> Refresh
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px', marginBottom: '28px' }}>
          {STAT_CARDS(stats).map((card, i) => (
            <motion.div key={card.label}
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              onClick={() => card.link && navigate(card.link)}
              className="glow-card"
              style={{
                borderRadius: '16px', padding: '20px', cursor: card.link ? 'pointer' : 'default',
                transition: 'all 0.2s',
              }}
              whileHover={card.link ? { scale: 1.02 } : {}}
            >
              <div style={{ width: '44px', height: '44px', background: card.bg, borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '14px', color: card.color }}>
                {card.icon}
              </div>
              <div style={{ fontSize: '28px', fontWeight: 900, color: '#f1f5f9', lineHeight: 1, marginBottom: '4px' }}>
                {card.value.toLocaleString()}
              </div>
              <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>{card.label}</div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Recent Login Activity */}
      <div className="glow-card" style={{ borderRadius: '16px', padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <h2 style={{ color: '#f1f5f9', fontWeight: 700, fontSize: '16px', margin: 0 }}>
            <Activity size={16} style={{ display: 'inline', marginRight: '8px', color: '#6366f1', verticalAlign: 'middle' }} />
            Recent Login Activity
          </h2>
          <button onClick={() => navigate('/admin/activity')}
            style={{ background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.25)', color: '#a5b4fc', borderRadius: '8px', padding: '6px 14px', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>
            View All
          </button>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr>
                {['Status', 'Email', 'Browser', 'Device', 'IP Address', 'Time'].map(h => (
                  <th key={h} style={{ padding: '8px 12px', textAlign: 'left', color: '#64748b', fontWeight: 600, borderBottom: '1px solid rgba(255,255,255,0.06)', whiteSpace: 'nowrap', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recentActivity.map((r) => (
                <tr key={r.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', transition: 'background 0.15s' }}>
                  <td style={{ padding: '10px 12px' }}>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: '4px',
                      padding: '2px 8px', borderRadius: '999px', fontSize: '11px', fontWeight: 700,
                      background: r.success ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
                      color: r.success ? '#34d399' : '#f87171',
                    }}>
                      {r.success ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                      {r.success ? 'Success' : 'Failed'}
                    </span>
                  </td>
                  <td style={{ padding: '10px 12px', color: '#e2e8f0', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.email}</td>
                  <td style={{ padding: '10px 12px', color: '#94a3b8' }}>{r.browser || '-'}</td>
                  <td style={{ padding: '10px 12px', color: '#94a3b8' }}>{r.device_type || '-'}</td>
                  <td style={{ padding: '10px 12px', color: '#64748b', fontFamily: 'monospace', fontSize: '12px' }}>{r.ip_address || '-'}</td>
                  <td style={{ padding: '10px 12px', color: '#64748b', whiteSpace: 'nowrap' }}>{new Date(r.login_time).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {recentActivity.length === 0 && <p style={{ textAlign: 'center', color: '#475569', padding: '24px' }}>No recent activity.</p>}
        </div>
      </div>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default AdminDashboardPage;
