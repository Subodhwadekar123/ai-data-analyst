/**
 * Admin API Service
 * All admin-specific API calls requiring admin privileges.
 */

import axios from 'axios';
import { useStore } from '../store/useStore';
import { getApiBaseUrl } from '../utils/apiUrl';

const API_BASE = getApiBaseUrl();

const adminApi = axios.create({
  baseURL: `${API_BASE}/admin`,
  timeout: 60000,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

// Attach auth token
adminApi.interceptors.request.use(
  (config) => {
    const token = useStore.getState().token;
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

adminApi.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401 || error.response?.status === 403) {
      useStore.getState().logout();
      window.location.href = '/#/admin/login';
    }
    let message = error.response?.data?.detail;
    if (!message) {
      if (error.message === 'Network Error' || error.code === 'ERR_NETWORK' || !error.response) {
        message = 'Unable to connect to the backend server. Please verify your backend server is running and accessible.';
      } else {
        message = error.message || 'Admin API error';
      }
    }
    return Promise.reject(new Error(message));
  }
);

// ── Stats ──────────────────────────────────────────────────────────────────

export const getAdminStats = (): Promise<any> =>
  adminApi.get('/stats') as Promise<any>;

// ── Users ──────────────────────────────────────────────────────────────────

export interface UserListParams {
  search?: string;
  role?: string;
  is_active?: boolean;
  is_approved?: boolean;
  is_suspended?: boolean;
  is_deleted?: boolean;
  limit?: number;
  offset?: number;
}

export const listUsers = (params: UserListParams = {}): Promise<any> =>
  adminApi.get('/users', { params }) as Promise<any>;

export const getUser = (userId: string): Promise<any> =>
  adminApi.get(`/users/${userId}`) as Promise<any>;

export const editUser = (userId: string, data: { full_name?: string; username?: string; email?: string }): Promise<any> =>
  adminApi.put(`/users/${userId}`, data) as Promise<any>;

export const suspendUser = (userId: string, reason?: string): Promise<any> =>
  adminApi.put(`/users/${userId}/suspend`, { reason }) as Promise<any>;

export const activateUser = (userId: string): Promise<any> =>
  adminApi.put(`/users/${userId}/activate`) as Promise<any>;

export const lockAccount = (userId: string): Promise<any> =>
  adminApi.put(`/users/${userId}/lock`) as Promise<any>;

export const unlockAccount = (userId: string): Promise<any> =>
  adminApi.put(`/users/${userId}/unlock`) as Promise<any>;

export const softDeleteUser = (userId: string): Promise<any> =>
  adminApi.delete(`/users/${userId}`) as Promise<any>;

export const permanentDeleteUser = (userId: string): Promise<any> =>
  adminApi.delete(`/users/${userId}/permanent`) as Promise<any>;

export const changeUserRole = (userId: string, role: 'user' | 'admin'): Promise<any> =>
  adminApi.put(`/users/${userId}/role`, { role }) as Promise<any>;

export const approveUser = (userId: string): Promise<any> =>
  adminApi.put(`/users/${userId}/approve`) as Promise<any>;

export const forceLogoutUser = (userId: string): Promise<any> =>
  adminApi.put(`/users/${userId}/force-logout`) as Promise<any>;

export const adminResetPassword = (userId: string): Promise<any> =>
  adminApi.post(`/users/${userId}/reset-password`) as Promise<any>;

export const getUserSessions = (userId: string): Promise<any> =>
  adminApi.get(`/users/${userId}/sessions`) as Promise<any>;

// ── Login Activity ─────────────────────────────────────────────────────────

export interface ActivityParams {
  search?: string;
  user_id?: string;
  success?: boolean;
  browser?: string;
  device_type?: string;
  ip_address?: string;
  country?: string;
  date_from?: string;
  date_to?: string;
  limit?: number;
  offset?: number;
}

export const getLoginActivity = (params: ActivityParams = {}): Promise<any> =>
  adminApi.get('/login-activity', { params }) as Promise<any>;

export const getLoginActivityCsvUrl = (params: { date_from?: string; date_to?: string } = {}): string => {
  const query = new URLSearchParams({ ...(params as any) }).toString();
  return `${API_BASE}/admin/export/login-activity${query ? '?' + query : ''}`;
};

// ── Sessions ───────────────────────────────────────────────────────────────

export const getAllSessions = (limit = 50, offset = 0): Promise<any> =>
  adminApi.get(`/sessions?limit=${limit}&offset=${offset}`) as Promise<any>;

export const terminateSession = (sessionId: string): Promise<any> =>
  adminApi.delete(`/sessions/${sessionId}`) as Promise<any>;

// ── Audit Logs ─────────────────────────────────────────────────────────────

export interface AuditParams {
  search?: string;
  action?: string;
  severity?: string;
  user_email?: string;
  date_from?: string;
  date_to?: string;
  limit?: number;
  offset?: number;
}

export const getAuditLogs = (params: AuditParams = {}): Promise<any> =>
  adminApi.get('/audit-logs', { params }) as Promise<any>;

// ── Datasets & Issues ──────────────────────────────────────────────────────

export const getAdminDatasets = (): Promise<any> =>
  adminApi.get('/datasets') as Promise<any>;

export const getAdminIssues = (): Promise<any> =>
  adminApi.get('/issues') as Promise<any>;

export const deleteIssue = (issueId: number): Promise<any> =>
  adminApi.delete(`/issues/${issueId}`) as Promise<any>;

export default adminApi;

export interface PendingUser {
  id: string;
  email: string;
  full_name?: string;
  created_at: string;
}
export const getPendingApprovals = (limit = 20, offset = 0): Promise<{ total: number; users: PendingUser[] }> =>
  adminApi.get('/pending-approvals', { params: { limit, offset } }) as Promise<{ total: number; users: PendingUser[] }>;
