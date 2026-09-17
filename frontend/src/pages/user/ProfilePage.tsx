/**
 * ProfilePage.tsx
 * User self-service profile + security settings:
 *  - Profile information
 *  - Change password
 *  - Active sessions list with revoke
 *  - Login history
 *  - Logout all devices
 */

import React, { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  User, Mail, Shield, Clock, Monitor, Smartphone,
  Tablet, Globe, Key, Lock, LogOut, Trash2, CheckCircle,
  AlertCircle, Loader2, Eye, EyeOff, RefreshCw
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import {
  updateProfile, changePassword, getActiveSessions,
  revokeSession, logoutAllDevices, getLoginHistory
} from '../../services/authApi';
import PasswordStrengthMeter from '../../components/auth/PasswordStrengthMeter';

const DeviceIcon: React.FC<{ type?: string }> = ({ type }) => {
  if (type === 'mobile') return <Smartphone size={18} color="#6366f1" />;
  if (type === 'tablet') return <Tablet size={18} color="#8b5cf6" />;
  return <Monitor size={18} color="#06b6d4" />;
};

const ProfilePage: React.FC = () => {
  const { user, setUser, sessionId, logout } = useStore();
  const [tab, setTab] = useState<'profile' | 'security' | 'sessions' | 'history'>('profile');

  // Profile state
  const [profileData, setProfileData] = useState({ full_name: user?.full_name || '', username: user?.username || '' });
  const [savingProfile, setSavingProfile] = useState(false);

  // Password state
  const [pwData, setPwData] = useState({ current_password: '', new_password: '', confirm_password: '', logout_other_sessions: false });
  const [showPw, setShowPw] = useState({ current: false, new: false, confirm: false });
  const [savingPw, setSavingPw] = useState(false);

  // Sessions state
  const [sessions, setSessions] = useState<any[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);

  // History state
  const [history, setHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const loadSessions = useCallback(async () => {
    setLoadingSessions(true);
    try {
      const res = await getActiveSessions() as any;
      setSessions(res.sessions || []);
    } catch { } finally { setLoadingSessions(false); }
  }, []);

  const loadHistory = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const res = await getLoginHistory(20) as any;
      setHistory(res.history || []);
    } catch { } finally { setLoadingHistory(false); }
  }, []);

  useEffect(() => {
    if (tab === 'sessions') loadSessions();
    if (tab === 'history') loadHistory();
  }, [tab, loadSessions, loadHistory]);

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    try {
      const res = await updateProfile(profileData) as any;
      setUser({ ...user!, ...res });
      toast.success('Profile updated!');
    } catch (err: any) { toast.error(err.message); } finally { setSavingProfile(false); }
  };

  const handleChangePassword = async () => {
    if (pwData.new_password !== pwData.confirm_password) { toast.error('Passwords do not match.'); return; }
    setSavingPw(true);
    try {
      await changePassword(pwData);
      toast.success('Password changed successfully!');
      setPwData({ current_password: '', new_password: '', confirm_password: '', logout_other_sessions: false });
    } catch (err: any) { toast.error(err.message); } finally { setSavingPw(false); }
  };

  const handleRevokeSession = async (id: string) => {
    try {
      await revokeSession(id);
      toast.success('Session revoked.');
      loadSessions();
    } catch (err: any) { toast.error(err.message); }
  };

  const handleLogoutAll = async () => {
    try {
      await logoutAllDevices();
      toast.success('Logged out from all devices.');
      logout();
    } catch (err: any) { toast.error(err.message); }
  };

  const tabs = [
    { id: 'profile', label: 'Profile', icon: <User size={15} /> },
    { id: 'security', label: 'Security', icon: <Key size={15} /> },
    { id: 'sessions', label: 'Sessions', icon: <Monitor size={15} /> },
    { id: 'history', label: 'Login History', icon: <Clock size={15} /> },
  ];

  return (
    <div style={{ padding: '28px', maxWidth: '860px', margin: '0 auto' }}>
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#f1f5f9', margin: '0 0 4px' }}>Account Settings</h1>
        <p style={{ color: '#64748b', margin: 0 }}>Manage your profile, password, and session security</p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '4px', background: 'rgba(255,255,255,0.04)', borderRadius: '12px', padding: '4px', marginBottom: '24px', width: 'fit-content' }}>
        {tabs.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id as any)}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 600, transition: 'all 0.2s',
              background: tab === t.id ? 'linear-gradient(135deg, #4f46e5, #7c3aed)' : 'transparent',
              color: tab === t.id ? 'white' : '#64748b' }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      <motion.div key={tab} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>

        {/* ── Profile Tab ─────────────────────────────────────────────────── */}
        {tab === 'profile' && (
          <div className="glow-card" style={cardStyle}>
            <h3 style={sectionTitle}>Profile Information</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
              <div>
                <label style={labelStyle}>Full Name</label>
                <input value={profileData.full_name} onChange={(e) => setProfileData(p => ({ ...p, full_name: e.target.value }))}
                  placeholder="John Doe" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Username</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#475569', fontSize: '14px' }}>@</span>
                  <input value={profileData.username} onChange={(e) => setProfileData(p => ({ ...p, username: e.target.value }))}
                    placeholder="johndoe" style={{ ...inputStyle, paddingLeft: '26px' }} />
                </div>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
              <InfoRow icon={<Mail size={15} />} label="Email" value={user?.email || ''} />
              <InfoRow icon={<Shield size={15} />} label="Role" value={user?.role || 'user'} chip chipColor={user?.is_admin ? '#4f46e5' : '#0891b2'} />
              <InfoRow icon={<CheckCircle size={15} />} label="Approval Status" value={user?.is_approved ? 'Approved' : 'Pending Approval'} chip chipColor={user?.is_approved ? '#059669' : '#dc2626'} />
              <InfoRow icon={<Clock size={15} />} label="Member Since" value={user?.created_at ? new Date(user.created_at).toLocaleDateString() : '-'} />
            </div>
            <button onClick={handleSaveProfile} disabled={savingProfile}
              style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', color: 'white', border: 'none', borderRadius: '10px', padding: '11px 24px', fontWeight: 700, cursor: savingProfile ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
              {savingProfile ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : null}
              Save Changes
            </button>
          </div>
        )}

        {/* ── Security Tab ─────────────────────────────────────────────────── */}
        {tab === 'security' && (
          <div className="glow-card" style={cardStyle}>
            <h3 style={sectionTitle}>Change Password</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '20px' }}>
              <PasswordInput label="Current Password" value={pwData.current_password}
                show={showPw.current} onToggle={() => setShowPw(p => ({ ...p, current: !p.current }))}
                onChange={(v) => setPwData(p => ({ ...p, current_password: v }))} />
              <div>
                <PasswordInput label="New Password" value={pwData.new_password}
                  show={showPw.new} onToggle={() => setShowPw(p => ({ ...p, new: !p.new }))}
                  onChange={(v) => setPwData(p => ({ ...p, new_password: v }))} />
                <PasswordStrengthMeter password={pwData.new_password} />
              </div>
              <PasswordInput label="Confirm New Password" value={pwData.confirm_password}
                show={showPw.confirm} onToggle={() => setShowPw(p => ({ ...p, confirm: !p.confirm }))}
                onChange={(v) => setPwData(p => ({ ...p, confirm_password: v }))} />
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px', cursor: 'pointer' }}>
              <input type="checkbox" checked={pwData.logout_other_sessions} onChange={(e) => setPwData(p => ({ ...p, logout_other_sessions: e.target.checked }))} style={{ accentColor: '#6366f1' }} />
              <span style={{ fontSize: '13px', color: '#94a3b8' }}>Log out all other active sessions after password change</span>
            </label>
            <button onClick={handleChangePassword} disabled={savingPw}
              style={{ background: 'linear-gradient(135deg, #dc2626, #b91c1c)', color: 'white', border: 'none', borderRadius: '10px', padding: '11px 24px', fontWeight: 700, cursor: savingPw ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
              {savingPw ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Key size={16} />}
              Change Password
            </button>
          </div>
        )}

        {/* ── Sessions Tab ─────────────────────────────────────────────────── */}
        {tab === 'sessions' && (
          <div>
            <div className="glow-card" style={{ ...cardStyle, marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h3 style={{ ...sectionTitle, marginBottom: '4px' }}>Active Sessions</h3>
                <p style={{ color: '#64748b', fontSize: '13px', margin: 0 }}>{sessions.length} active session(s)</p>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={loadSessions} style={ghostBtnStyle}><RefreshCw size={15} /></button>
                <button onClick={handleLogoutAll} style={{ ...ghostBtnStyle, color: '#f87171', borderColor: 'rgba(239,68,68,0.3)' }}>
                  <LogOut size={15} /> Logout All
                </button>
              </div>
            </div>
            {loadingSessions ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}><Loader2 size={24} style={{ animation: 'spin 1s linear infinite' }} /></div>
            ) : sessions.map((s) => (
              <div key={s.id} className="glow-card" style={{ ...cardStyle, marginBottom: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', border: s.is_current ? '1px solid var(--accent-primary)' : undefined }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <DeviceIcon type={s.device_type} />
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ color: '#e2e8f0', fontWeight: 600, fontSize: '14px' }}>{s.browser} on {s.os}</span>
                      {s.is_current && <span style={{ background: 'rgba(99,102,241,0.2)', color: '#a5b4fc', fontSize: '11px', padding: '2px 8px', borderRadius: '999px', fontWeight: 600 }}>Current</span>}
                    </div>
                    <div style={{ color: '#64748b', fontSize: '12px', marginTop: '2px' }}>
                      {s.ip_address} • {s.device_type} • Last active {new Date(s.last_active).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                {!s.is_current && (
                  <button onClick={() => handleRevokeSession(s.id)}
                    style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: '#f87171', borderRadius: '8px', padding: '6px 12px', cursor: 'pointer', fontSize: '12px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <Trash2 size={13} /> Revoke
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ── History Tab ──────────────────────────────────────────────────── */}
        {tab === 'history' && (
          <div className="glow-card" style={cardStyle}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <h3 style={sectionTitle}>Login History</h3>
              <button onClick={loadHistory} style={ghostBtnStyle}><RefreshCw size={15} /></button>
            </div>
            {loadingHistory ? (
              <div style={{ textAlign: 'center', padding: '32px', color: '#64748b' }}><Loader2 size={24} style={{ animation: 'spin 1s linear infinite' }} /></div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr>
                      {['Status', 'Date & Time', 'Browser', 'OS', 'IP Address', 'Location'].map(h => (
                        <th key={h} style={{ padding: '8px 12px', textAlign: 'left', color: '#64748b', fontWeight: 600, borderBottom: '1px solid rgba(255,255,255,0.06)', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((r) => (
                      <tr key={r.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        <td style={{ padding: '10px 12px' }}>
                          {r.success
                            ? <span style={{ color: '#86efac', display: 'flex', alignItems: 'center', gap: '4px' }}><CheckCircle size={12} /> Success</span>
                            : <span style={{ color: '#f87171', display: 'flex', alignItems: 'center', gap: '4px' }}><AlertCircle size={12} /> Failed</span>}
                        </td>
                        <td style={{ padding: '10px 12px', color: '#94a3b8', whiteSpace: 'nowrap' }}>{new Date(r.login_time).toLocaleString()}</td>
                        <td style={{ padding: '10px 12px', color: '#e2e8f0' }}>{r.browser || '-'}</td>
                        <td style={{ padding: '10px 12px', color: '#e2e8f0' }}>{r.os || '-'}</td>
                        <td style={{ padding: '10px 12px', color: '#94a3b8', fontFamily: 'monospace', fontSize: '12px' }}>{r.ip_address || '-'}</td>
                        <td style={{ padding: '10px 12px', color: '#94a3b8' }}>{r.country || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {history.length === 0 && <p style={{ textAlign: 'center', color: '#475569', padding: '24px' }}>No login history yet.</p>}
              </div>
            )}
          </div>
        )}
      </motion.div>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

// ── Sub-components ────────────────────────────────────────────────────────────

const InfoRow: React.FC<{ icon: React.ReactNode; label: string; value: string; chip?: boolean; chipColor?: string }> = ({ icon, label, value, chip, chipColor }) => (
  <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '10px', padding: '12px 14px' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748b', fontSize: '11px', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
      {icon}{label}
    </div>
    {chip ? (
      <span style={{ background: `${chipColor}20`, color: chipColor, border: `1px solid ${chipColor}40`, borderRadius: '999px', padding: '2px 10px', fontSize: '13px', fontWeight: 600 }}>{value}</span>
    ) : (
      <span style={{ color: '#e2e8f0', fontWeight: 600, fontSize: '14px' }}>{value}</span>
    )}
  </div>
);

const PasswordInput: React.FC<{ label: string; value: string; show: boolean; onToggle: () => void; onChange: (v: string) => void }> = ({ label, value, show, onToggle, onChange }) => (
  <div>
    <label style={labelStyle}>{label}</label>
    <div style={{ position: 'relative' }}>
      <Lock size={15} color="#475569" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
      <input type={show ? 'text' : 'password'} value={value} onChange={(e) => onChange(e.target.value)}
        style={{ ...inputStyle, paddingLeft: '38px', paddingRight: '40px' }} />
      <button type="button" onClick={onToggle}
        style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#475569', cursor: 'pointer' }}>
        {show ? <EyeOff size={15} /> : <Eye size={15} />}
      </button>
    </div>
  </div>
);

// ── Styles ─────────────────────────────────────────────────────────────────────

const cardStyle: React.CSSProperties = { borderRadius: '16px', padding: '24px' };
const sectionTitle: React.CSSProperties = { color: '#f1f5f9', fontWeight: 700, fontSize: '16px', margin: '0 0 18px' };
const labelStyle: React.CSSProperties = { display: 'block', fontSize: '11px', color: '#64748b', fontWeight: 600, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.06em' };
const inputStyle: React.CSSProperties = { width: '100%', padding: '10px 14px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: '#e2e8f0', fontSize: '14px', outline: 'none', boxSizing: 'border-box' };
const ghostBtnStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8', borderRadius: '8px', padding: '8px 14px', cursor: 'pointer', fontSize: '13px', fontWeight: 600 };

export default ProfilePage;
