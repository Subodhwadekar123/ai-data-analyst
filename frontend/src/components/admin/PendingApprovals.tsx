import { useCallback, useEffect, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Bell, Check, Loader2, X } from 'lucide-react';
import { approveUser, getPendingApprovals } from '../../services/adminApi';
import type { PendingUser } from '../../services/adminApi';
import { APPROVALS_CHANGED, usePendingApprovalCount } from '../../hooks/usePendingApprovalCount';

const buttonStyle = { border: '1px solid var(--border-default)', borderRadius: 8, padding: '9px 12px',
  background: 'var(--accent-primary)', color: 'white', cursor: 'pointer' };

export default function PendingApprovals({ onApproved }: { onApproved: () => void }) {
  const count = usePendingApprovalCount();
  const [open, setOpen] = useState(false);
  const [users, setUsers] = useState<PendingUser[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await getPendingApprovals(20, page * 20);
      setUsers(result.users);
      setTotal(result.total);
      if (page > 0 && result.users.length === 0) setPage(page - 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load pending approvals.');
    } finally { setLoading(false); }
  }, [page]);
  useEffect(() => {
    if (!open) return;
    void load();
    const timer = window.setInterval(load, 30000);
    return () => window.clearInterval(timer);
  }, [open, load]);

  const approve = async (id: string) => {
    setBusy(id);
    setError('');
    try {
      await approveUser(id);
      window.dispatchEvent(new Event(APPROVALS_CHANGED));
      onApproved();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Approval failed. Please retry.');
    } finally { setBusy(null); }
  };

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button style={{ ...buttonStyle, marginTop: 12, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <Bell size={18} /> Pending Approvals
          <span aria-label={count === null ? 'Count unavailable' : `${count} users awaiting approval`}
            style={{ background: '#f97316', borderRadius: 999, padding: '2px 7px', fontWeight: 800 }}>{count ?? '—'}</span>
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 1000 }} />
        <Dialog.Content style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
          width: 'min(600px, calc(100vw - 32px))', maxHeight: '80vh', overflowY: 'auto', boxSizing: 'border-box',
          background: 'var(--bg-app)', color: 'var(--text-primary)', padding: 24, borderRadius: 16, zIndex: 1001 }}>
          <Dialog.Title>Pending Approvals ({total})</Dialog.Title>
          <Dialog.Description style={{ color: 'var(--text-secondary)' }}>
            Review new registrations and approve access. Approval does not remove suspensions or reactivate disabled accounts.
          </Dialog.Description>
          <Dialog.Close asChild>
            <button aria-label="Close pending approvals" style={{ ...buttonStyle, position: 'absolute', right: 16, top: 16 }}><X size={16} /></button>
          </Dialog.Close>
          {error && <div role="alert" style={{ color: '#dc2626', margin: '12px 0' }}>{error} <button onClick={load} style={buttonStyle}>Retry</button></div>}
          {loading && <p role="status"><Loader2 size={16} /> Loading pending users…</p>}
          {!loading && !error && users.length === 0 && <p>No users are waiting for approval.</p>}
          {users.map(user => <div key={user.id} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px 0', borderBottom: '1px solid var(--border-default)' }}>
            <div style={{ flex: 1, minWidth: 0, overflowWrap: 'anywhere' }}>
              <strong>{user.full_name || user.email}</strong>
              <div>{user.email}</div>
              <small style={{ color: 'var(--text-secondary)' }}>Registered {new Date(user.created_at).toLocaleDateString()}</small>
            </div>
            <button disabled={!!busy || loading} onClick={() => approve(user.id)} style={buttonStyle} aria-label={`Approve ${user.email}`}>
              {busy === user.id ? <Loader2 size={16} /> : <Check size={16} />} Approve
            </button>
          </div>)}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 16 }}>
            <button style={buttonStyle} disabled={page === 0 || loading || !!busy} onClick={() => setPage(page - 1)}>Previous</button>
            <span>Page {page + 1} of {Math.max(1, Math.ceil(total / 20))}</span>
            <button style={buttonStyle} disabled={(page + 1) * 20 >= total || loading || !!busy} onClick={() => setPage(page + 1)}>Next</button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
