import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  Users,
  Database,
  AlertCircle,
  FileText,
  User,
  Shield,
  Activity,
  Calendar,
  Layers,
  Inbox
} from 'lucide-react';
import { getAdminStats, getAdminUsers, getAdminDatasets, getAdminIssues } from '../services/api';
import SectionHeader from '../components/ui/SectionHeader';
import LoadingSpinner from '../components/ui/LoadingSpinner';

const AdminPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'users' | 'datasets' | 'issues'>('users');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<{ total_users: number; total_datasets: number; total_experiments: number; total_issues: number } | null>(null);
  
  const [usersList, setUsersList] = useState<any[]>([]);
  const [datasetsList, setDatasetsList] = useState<any[]>([]);
  const [issuesList, setIssuesList] = useState<any[]>([]);

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      const [statsData, usersData, datasetsData, issuesData] = await Promise.all([
        getAdminStats(),
        getAdminUsers(),
        getAdminDatasets(),
        getAdminIssues()
      ]);
      setStats(statsData);
      setUsersList(usersData);
      setDatasetsList(datasetsData);
      setIssuesList(issuesData);
    } catch (err: any) {
      toast.error(err.message || 'Failed to fetch administration logs.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', minHeight: '80vh', alignItems: 'center', justifyContent: 'center' }}>
        <LoadingSpinner />
      </div>
    );
  }

  const statCards = [
    { label: 'Total Registered Users', value: stats?.total_users || 0, icon: Users, color: '#6366f1' },
    { label: 'Datasets Uploaded', value: stats?.total_datasets || 0, icon: Database, color: '#3b82f6' },
    { label: 'ML Experiments Run', value: stats?.total_experiments || 0, icon: Activity, color: '#10b981' },
    { label: 'Reported Issues', value: stats?.total_issues || 0, icon: AlertCircle, color: '#f59e0b' }
  ];

  return (
    <div style={{ padding: '24px', color: '#94a3b8' }}>
      <SectionHeader
        title="Admin Control Center"
        description="Monitor system-wide activity, audit user dataset uploads, and inspect reported feedback logs."
      />

      {/* Stats Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '20px',
          marginBottom: '32px',
          marginTop: '16px'
        }}
      >
        {statCards.map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: i * 0.05 }}
            style={{
              background: '#1a1d27',
              border: '1px solid #252836',
              borderRadius: '16px',
              padding: '24px',
              boxShadow: '0 8px 30px rgba(0, 0, 0, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            <div>
              <span style={{ fontSize: '13px', fontWeight: 500, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {card.label}
              </span>
              <h3 style={{ fontSize: '32px', fontWeight: 700, color: 'white', margin: '8px 0 0' }}>
                {card.value}
              </h3>
            </div>
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                background: `${card.color}15`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: `1px solid ${card.color}30`
              }}
            >
              <card.icon size={22} color={card.color} />
            </div>
          </motion.div>
        ))}
      </div>

      {/* Tab controls */}
      <div
        style={{
          display: 'flex',
          gap: '12px',
          borderBottom: '1px solid #252836',
          paddingBottom: '16px',
          marginBottom: '24px'
        }}
      >
        {[
          { id: 'users', label: 'Users Audit', icon: Users },
          { id: 'datasets', label: 'Dataset Registry', icon: Database },
          { id: 'issues', label: 'Reported Issues', icon: AlertCircle }
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 18px',
                borderRadius: '10px',
                border: 'none',
                background: isActive ? '#6366f1' : 'transparent',
                color: isActive ? 'white' : '#94a3b8',
                fontWeight: 600,
                fontSize: '14px',
                cursor: 'pointer',
                transition: 'background 0.25s, color 0.25s'
              }}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab contents */}
      <div style={{ background: '#1a1d27', border: '1px solid #252836', borderRadius: '16px', overflow: 'hidden', minHeight: '300px' }}>
        <AnimatePresence mode="wait">
          {activeTab === 'users' && (
            <motion.div
              key="users"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.2 }}
              style={{ padding: '24px' }}
            >
              <h3 style={{ fontSize: '18px', color: 'white', fontWeight: 600, margin: '0 0 16px' }}>Registered User Profiles</h3>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #252836', color: '#64748b', fontWeight: 600 }}>
                      <th style={{ padding: '12px' }}>Profile Name</th>
                      <th style={{ padding: '12px' }}>Email Address</th>
                      <th style={{ padding: '12px' }}>Role</th>
                      <th style={{ padding: '12px' }}>Status</th>
                      <th style={{ padding: '12px' }}>Registered Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usersList.length === 0 ? (
                      <tr>
                        <td colSpan={5} style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>No users registered.</td>
                      </tr>
                    ) : (
                      usersList.map((user) => (
                        <tr key={user.id} style={{ borderBottom: '1px solid #25283688' }}>
                          <td style={{ padding: '14px 12px', color: 'white', fontWeight: 500 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <User size={16} color="#64748b" />
                              {user.full_name || 'N/A'}
                            </div>
                          </td>
                          <td style={{ padding: '14px 12px' }}>{user.email}</td>
                          <td style={{ padding: '14px 12px' }}>
                            {user.is_admin ? (
                              <span style={{ padding: '3px 8px', borderRadius: '4px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', fontSize: '11px', fontWeight: 600, border: '1px solid rgba(239,68,68,0.2)' }}>
                                <Shield size={10} style={{ marginRight: '4px', display: 'inline' }} /> ADMIN
                              </span>
                            ) : (
                              <span style={{ padding: '3px 8px', borderRadius: '4px', background: 'rgba(99, 102, 241, 0.1)', color: '#6366f1', fontSize: '11px', fontWeight: 600 }}>
                                USER
                              </span>
                            )}
                          </td>
                          <td style={{ padding: '14px 12px' }}>
                            <span style={{ color: user.is_active ? '#10b981' : '#ef4444', fontWeight: 500 }}>
                              ● {user.is_active ? 'Active' : 'Suspended'}
                            </span>
                          </td>
                          <td style={{ padding: '14px 12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748b' }}>
                              <Calendar size={14} />
                              {new Date(user.created_at).toLocaleDateString()}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

          {activeTab === 'datasets' && (
            <motion.div
              key="datasets"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.2 }}
              style={{ padding: '24px' }}
            >
              <h3 style={{ fontSize: '18px', color: 'white', fontWeight: 600, margin: '0 0 16px' }}>System Dataset Upload Registry</h3>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #252836', color: '#64748b', fontWeight: 600 }}>
                      <th style={{ padding: '12px' }}>Dataset Name</th>
                      <th style={{ padding: '12px' }}>Owner Account</th>
                      <th style={{ padding: '12px' }}>Dimentions</th>
                      <th style={{ padding: '12px' }}>File Size</th>
                      <th style={{ padding: '12px' }}>Upload Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {datasetsList.length === 0 ? (
                      <tr>
                        <td colSpan={5} style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>No dataset logs found.</td>
                      </tr>
                    ) : (
                      datasetsList.map((d) => (
                        <tr key={d.id} style={{ borderBottom: '1px solid #25283688' }}>
                          <td style={{ padding: '14px 12px', color: 'white', fontWeight: 500 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <FileText size={16} color="#3b82f6" />
                              {d.original_filename}
                            </div>
                          </td>
                          <td style={{ padding: '14px 12px', color: '#a5b4fc' }}>{d.owner_email}</td>
                          <td style={{ padding: '14px 12px' }}>
                            {d.rows !== null ? `${d.rows.toLocaleString()} rows × ${d.columns} cols` : 'Loading...'}
                          </td>
                          <td style={{ padding: '14px 12px' }}>
                            {roundSize(d.file_size_bytes)}
                          </td>
                          <td style={{ padding: '14px 12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748b' }}>
                              <Calendar size={14} />
                              {new Date(d.created_at).toLocaleDateString()}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

          {activeTab === 'issues' && (
            <motion.div
              key="issues"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.2 }}
              style={{ padding: '24px' }}
            >
              <h3 style={{ fontSize: '18px', color: 'white', fontWeight: 600, margin: '0 0 16px' }}>Reported Feedback Issues</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {issuesList.length === 0 ? (
                  <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                    <Inbox size={32} style={{ marginBottom: '12px', opacity: 0.5 }} />
                    <p style={{ margin: 0 }}>No issues reported. System is healthy!</p>
                  </div>
                ) : (
                  issuesList.map((issue) => (
                    <div
                      key={issue.id}
                      style={{
                        background: '#0f111744',
                        border: '1px solid #252836',
                        borderRadius: '12px',
                        padding: '20px',
                        position: 'relative'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px', marginBottom: '10px' }}>
                        <h4 style={{ margin: 0, fontSize: '16px', color: 'white', fontWeight: 600 }}>
                          #{issue.id} - {issue.title}
                        </h4>
                        <span
                          style={{
                            padding: '3px 10px',
                            borderRadius: '99px',
                            background: getCategoryStyle(issue.category).bg,
                            color: getCategoryStyle(issue.category).fg,
                            fontSize: '11px',
                            fontWeight: 600,
                            border: `1px solid ${getCategoryStyle(issue.category).border}`
                          }}
                        >
                          {issue.category.toUpperCase()}
                        </span>
                      </div>
                      
                      <p style={{ fontSize: '14px', color: '#e2e8f0', margin: '0 0 16px', whiteSpace: 'pre-wrap', lineHeight: '1.5' }}>
                        {issue.description}
                      </p>

                      <div style={{ display: 'flex', gap: '20px', fontSize: '12px', color: '#64748b' }}>
                        <div>
                          Reporter: <span style={{ color: '#94a3b8' }}>{issue.email || 'Anonymous'}</span>
                        </div>
                        <div>
                          Date: <span style={{ color: '#94a3b8' }}>{new Date(issue.created_at).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

// Helpers
const roundSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
};

const getCategoryStyle = (cat: string) => {
  switch (cat) {
    case 'bug':
      return { bg: 'rgba(239,68,68,0.1)', fg: '#ef4444', border: 'rgba(239,68,68,0.2)' };
    case 'feature':
      return { bg: 'rgba(16,185,129,0.1)', fg: '#10b981', border: 'rgba(16,185,129,0.2)' };
    case 'performance':
      return { bg: 'rgba(245,158,11,0.1)', fg: '#f59e0b', border: 'rgba(245,158,11,0.2)' };
    case 'docs':
      return { bg: 'rgba(59,130,246,0.1)', fg: '#3b82f6', border: 'rgba(59,130,246,0.2)' };
    default:
      return { bg: 'rgba(148,163,184,0.1)', fg: '#94a3b8', border: 'rgba(148,163,184,0.2)' };
  }
};

export default AdminPage;
