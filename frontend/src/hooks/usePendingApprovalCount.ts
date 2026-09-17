import { useCallback, useEffect, useState } from 'react';
import { getPendingApprovals } from '../services/adminApi';

export const APPROVALS_CHANGED = 'admin-approvals-changed';

export function usePendingApprovalCount() {
  const [count, setCount] = useState<number | null>(null);
  const refresh = useCallback(async () => {
    try {
      const result = await getPendingApprovals(1);
      setCount(result.total);
    } catch {
      setCount(null); // Do not display a stale count as a successful response.
    }
  }, []);
  useEffect(() => {
    void refresh();
    const timer = window.setInterval(refresh, 30000);
    window.addEventListener(APPROVALS_CHANGED, refresh);
    window.addEventListener('focus', refresh);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener(APPROVALS_CHANGED, refresh);
      window.removeEventListener('focus', refresh);
    };
  }, [refresh]);
  return count;
}
