/**
 * Admin Users Management Page
 * Full CRUD user management with search, filters, inline actions, and modals.
 */

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  Search, Filter, RefreshCw, Users, MoreVertical,
  UserCheck, UserX, Lock, Unlock, Trash2, Shield,
  Mail, LogOut, Eye, Loader2, ChevronLeft, ChevronRight,
  Key, Edit3, CheckCircle, XCircle, AlertTriangle
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import {
  listUsers, suspendUser, activateUser, lockAccount, unlockAccount,
  softDeleteUser, changeUserRole, manuallyVerifyEmail,
  forceLogoutUser, adminResetPassword
} from '../../services/adminApi';

interface AdminUser {
  id: string; email: string; username?: string; full_name?: string;
  role: string; is_admin: boolean; is_active: boolean; is_verified: boolean;
  is_suspended: boolean; is_deleted: boolean; is_online: boolean;
  created_at: string; last_login?: string; login_count: number;
  failed_login_attempts: number; account_age_days: number; suspension_reason?: string;
}

const LIMIT = 20;

const StatusBadge: React.FC<{ ok: boolean; trueLabel: string; falseLabel: string }> = ({ ok, trueLabel, falseLabel }) => (
  <span style={{
    display: 'inline-flex', alignItems: 'center', gap: '4px',
    padding: '2px 8px', borderRadius: '999px', fontSize: '11px', fontWeight: 700,
    background: ok ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
    color: ok ? '#34d399' : '#f87171',
  }}>
    {ok ? <CheckCircle size={10} /> : <XCircle size={10} />}
    {ok ? trueLabel : falseLabel}
  </span>
);

const AdminUsersPage: React.FC = () => {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [filterActive, setFilterActive] = useState('');
  const [filterVerified, setFilterVerified] = useState('');
  const [filterSuspended, setFilterSuspended] = useState('');
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [suspendReason, setSuspendReason] = useState('');
  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const currentUserId = useStore((s) => s.user?.id);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { limit: LIMIT, offset: page * LIMIT };
      if (search) params.search = search;
      if (filterRole) params.role = filterRole;
      if (filterActive !== '') params.is_active = filterActive === 'true';
      if (filterVerified !== '') params.is_verified = filterVerified === 'true';
      if (filterSuspended !== '') params.is_suspended = filterSuspended === 'true';
      const res = await listUsers(params) as any;
      setUsers(res.users || []);
      setTotal(res.total || 0);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [page, search, filterRole, filterActive, filterVerified, filterSuspended]);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  const act = async (fn: () => Promise<any>, successMsg: string) => {
    setActionLoading('...');
    try {
      await fn();
      toast.success(successMsg);
      setOpenMenu(null);
      loadUsers();
    } catch (err: any) { toast.error(err.message); }
    finally { setActionLoading(null); }
  };

  const totalPages = Math.ceil(total / LIMIT);

  // ── Actions menu (portal) open/close ─────────────────────────────────────────
  // The dropdown is rendered through a portal to document.body with fixed
  // positioning: the table card (.glow-card) has `overflow: hidden !important`
  // and `z-index: 1`, which would otherwise CLIP the menu and trap it under
  // the page's stacking order — making the action options unclickable.
  const MENU_WIDTH = 190;
  const toggleMenu = (u: AdminUser, btn: HTMLElement) => {
    if (openMenu === u.id) { setOpenMenu(null); return; }
    const rect = btn.getBoundingClientRect();
    const left = Math.max(8, Math.min(rect.right - MENU_WIDTH, window.innerWidth - MENU_WIDTH - 8));
    const top = Math.max(8, Math.min(rect.bottom + 6, window.innerHeight - 320));
    setMenuPos({ top, left });
    setSelectedUser(u);
    setOpenMenu(u.id);
  };

  // Close the menu when clicking anywhere outside it, or on scroll/resize
  // (fixed-positioned menu would otherwise detach from its anchor).
  useEffect(() => {
    if (!openMenu) return;
    const onDown = (e: MouseEvent) => {
      if (menuRef.current && menuRef.current.contains(e.target as Node)) return;
      setOpenMenu(null);
    };
    const onScroll = () => setOpenMenu(null);
    document.addEventListener('mousedown', onDown);
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onScroll);
    return () => {
      document.removeEventListener('mousedown', onDown);
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onScroll);
    };
  }, [openMenu]);

  return (
    <div style={{ padding: '28px' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#f1f5f9', margin: '0 0 4px' }}>
          <Users size={22} style={{ display: 'inline', marginRight: '10px', color: '#6366f1', verticalAlign: 'middle' }} />
          User Management
        </h1>
        <p style={{ color: '#64748b', margin: 0, fontSize: '14px' }}>{total} total users</p>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: '1', minWidth: '200px', maxWidth: '320px' }}>
          <Search size={15} color="#475569" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
          <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            placeholder="Search by name, email, username..."
            style={{ ...inputStyle, paddingLeft: '36px' }} />
        </div>
        <select value={filterRole} onChange={(e) => { setFilterRole(e.target.value); setPage(0); }} style={selectStyle}>
          <option value="">All Roles</option><option value="user">User</option><option value="admin">Admin</option>
        </select>
        <select value={filterActive} onChange={(e) => { setFilterActive(e.target.value); setPage(0); }} style={selectStyle}>
          <option value="">Any Status</option><option value="true">Active</option><option value="false">Inactive</option>
        </select>
        <select value={filterVerified} onChange={(e) => { setFilterVerified(e.target.value); setPage(0); }} style={selectStyle}>
          <option value="">Any Verification</option><option value="true">Verified</option><option value="false">Unverified</option>
        </select>
        <select value={filterSuspended} onChange={(e) => { setFilterSuspended(e.target.value); setPage(0); }} style={selectStyle}>
          <option value="">Any Suspension</option><option value="true">Suspended</option><option value="false">Not Suspended</option>
        </select>
        <button onClick={loadUsers} style={ghostBtnStyle}><RefreshCw size={15} /></button>
      </div>

      {/* Table */}
      <div className="glow-card" style={{ borderRadius: '16px', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                {['User', 'Role', 'Status', 'Verified', 'Online', 'Last Login', 'Logins', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '12px 14px', textAlign: 'left', color: '#64748b', fontWeight: 600, whiteSpace: 'nowrap', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}><Loader2 size={24} style={{ animation: 'spin 1s linear infinite' }} /></td></tr>
              ) : users.map((u) => (
                <tr key={u.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', transition: 'background 0.1s' }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.02)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}>
                  <td style={{ padding: '12px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ width: '32px', height: '32px', background: u.is_admin ? 'linear-gradient(135deg,#4f46e5,#7c3aed)' : 'linear-gradient(135deg,#0891b2,#0e7490)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 800, color: 'white', flexShrink: 0 }}>
                        {(u.full_name || u.email)[0].toUpperCase()}
                      </div>
                      <div>
                        <div style={{ color: '#e2e8f0', fontWeight: 600, maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.full_name || u.email}</div>
                        <div style={{ color: '#64748b', fontSize: '11px', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    <span style={{ background: u.is_admin ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.05)', color: u.is_admin ? '#a5b4fc' : '#94a3b8', padding: '2px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 700 }}>
                      {u.role.toUpperCase()}
                    </span>
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    {u.is_suspended
                      ? <span style={{ color: '#f97316', fontSize: '11px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}><AlertTriangle size={11} /> Suspended</span>
                      : <StatusBadge ok={u.is_active} trueLabel="Active" falseLabel="Inactive" />}
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    <StatusBadge ok={u.is_verified} trueLabel="Verified" falseLabel="Pending" />
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    <span style={{ width: '8px', height: '8px', background: u.is_online ? '#22c55e' : '#475569', borderRadius: '50%', display: 'inline-block', boxShadow: u.is_online ? '0 0 6px #22c55e' : 'none' }} />
                  </td>
                  <td style={{ padding: '12px 14px', color: '#64748b', whiteSpace: 'nowrap', fontSize: '12px' }}>
                    {u.last_login ? new Date(u.last_login).toLocaleDateString() : 'Never'}
                  </td>
                  <td style={{ padding: '12px 14px', color: '#e2e8f0', fontWeight: 600 }}>{u.login_count}</td>
                  <td style={{ padding: '12px 14px' }}>
                    <button onClick={(e) => { e.stopPropagation(); toggleMenu(u, e.currentTarget); }}
                      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', color: '#94a3b8', width: '32px', height: '32px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <MoreVertical size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <span style={{ color: '#64748b', fontSize: '13px' }}>
            Showing {page * LIMIT + 1}–{Math.min((page + 1) * LIMIT, total)} of {total}
          </span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={() => setPage(p => p - 1)} disabled={page === 0} style={{ ...ghostBtnStyle, opacity: page === 0 ? 0.4 : 1 }}><ChevronLeft size={15} /></button>
            <span style={{ color: '#e2e8f0', fontSize: '13px', padding: '6px 12px', fontWeight: 600 }}>{page + 1} / {totalPages || 1}</span>
            <button onClick={() => setPage(p => p + 1)} disabled={page >= totalPages - 1} style={{ ...ghostBtnStyle, opacity: page >= totalPages - 1 ? 0.4 : 1 }}><ChevronRight size={15} /></button>
          </div>
        </div>
      </div>

      {/* Suspend Modal */}
      <AnimatePresence>
        {showSuspendModal && selectedUser && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            onClick={() => setShowSuspendModal(false)}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
              style={{ background: '#1e2235', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', padding: '28px', maxWidth: '400px', width: '90%' }}
              onClick={(e) => e.stopPropagation()}>
              <h3 style={{ color: '#f1f5f9', fontWeight: 700, marginBottom: '8px' }}>Suspend {selectedUser.full_name || selectedUser.email}?</h3>
              <p style={{ color: '#64748b', fontSize: '13px', marginBottom: '16px' }}>This will log the user out and disable their account.</p>
              <label style={{ display: 'block', fontSize: '12px', color: '#64748b', marginBottom: '6px' }}>Reason (optional)</label>
              <textarea value={suspendReason} onChange={(e) => setSuspendReason(e.target.value)}
                style={{ ...inputStyle, resize: 'vertical', minHeight: '80px', width: '100%' }} />
              <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                <button onClick={() => setShowSuspendModal(false)} style={{ flex: 1, padding: '10px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: '#94a3b8', cursor: 'pointer', fontWeight: 600 }}>Cancel</button>
                <button onClick={() => { setShowSuspendModal(false); act(() => suspendUser(selectedUser.id, suspendReason), 'User suspended.'); }}
                  style={{ flex: 1, padding: '10px', background: 'rgba(249,115,22,0.2)', border: '1px solid rgba(249,115,22,0.4)', borderRadius: '10px', color: '#fb923c', cursor: 'pointer', fontWeight: 700 }}>Suspend</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>

      {/* ── Actions Dropdown (rendered via portal to document.body) ─────────────
          Must live OUTSIDE the .glow-card: the card clips its children
          (`overflow: hidden !important`) and sits at z-index 1, which trapped
          the menu under every other layer and swallowed all option clicks. */}
      {createPortal(
        <AnimatePresence>
          {openMenu && selectedUser && (
            <motion.div ref={menuRef}
              initial={{ opacity: 0, scale: 0.95, y: -6 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.12 }}
              style={{ position: 'fixed', top: menuPos.top, left: menuPos.left, background: '#1e2235', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '6px', zIndex: 1000, minWidth: `${MENU_WIDTH}px`, boxShadow: '0 16px 40px rgba(0,0,0,0.6)' }}
              onClick={(e) => e.stopPropagation()}>
              {[
                !selectedUser.is_verified && { icon: <Mail size={14} />, label: 'Verify Email', action: () => act(() => manuallyVerifyEmail(selectedUser.id), 'Email verified.'), color: '#34d399' },
                !selectedUser.is_suspended
                  ? { icon: <UserX size={14} />, label: 'Suspend', action: () => { setShowSuspendModal(true); setOpenMenu(null); }, color: '#f97316' }
                  : { icon: <UserCheck size={14} />, label: 'Activate', action: () => act(() => activateUser(selectedUser.id), 'User activated.'), color: '#34d399' },
                { icon: <Lock size={14} />, label: 'Lock Account', action: () => act(() => lockAccount(selectedUser.id), 'Account locked.'), color: '#eab308' },
                { icon: <Unlock size={14} />, label: 'Unlock Account', action: () => act(() => unlockAccount(selectedUser.id), 'Account unlocked.'), color: '#eab308' },
                { icon: <Key size={14} />, label: 'Send Reset Link', action: () => act(() => adminResetPassword(selectedUser.id), 'Reset link sent.'), color: '#6366f1' },
                !selectedUser.is_admin && { icon: <Shield size={14} />, label: 'Make Admin', action: () => act(() => changeUserRole(selectedUser.id, 'admin'), 'Role changed to admin.'), color: '#8b5cf6' },
                selectedUser.is_admin && selectedUser.id !== currentUserId && { icon: <Users size={14} />, label: 'Remove Admin', action: () => act(() => changeUserRole(selectedUser.id, 'user'), 'Role changed to user.'), color: '#94a3b8' },
                { icon: <LogOut size={14} />, label: 'Force Logout', action: () => act(() => forceLogoutUser(selectedUser.id), 'User logged out.'), color: '#64748b' },
                !selectedUser.is_admin && { icon: <Trash2 size={14} />, label: 'Delete User', action: () => act(() => softDeleteUser(selectedUser.id), 'User deleted.'), color: '#ef4444' },
              ].filter(Boolean).map((item: any, i) => (
                <button key={i} onClick={item.action}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '8px 10px', background: 'none', border: 'none', borderRadius: '8px', cursor: 'pointer', color: item.color, fontSize: '13px', fontWeight: 600, textAlign: 'left' }}>
                  {item.icon}{item.label}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
};

const inputStyle: React.CSSProperties = { width: '100%', padding: '9px 14px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: '#e2e8f0', fontSize: '13px', outline: 'none', boxSizing: 'border-box' };
const selectStyle: React.CSSProperties = { ...{ padding: '9px 12px', background: '#1e2235', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: '#94a3b8', fontSize: '13px', outline: 'none', cursor: 'pointer' } };
const ghostBtnStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#64748b', borderRadius: '10px', padding: '9px 12px', cursor: 'pointer', fontSize: '13px', fontWeight: 600 };

export default AdminUsersPage;
