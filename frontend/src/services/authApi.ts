/**
 * Authentication API Service
 * All auth-related API calls with automatic token refresh interceptor.
 */

import axios, { AxiosInstance } from 'axios';
import { useStore } from '../store/useStore';
import { getApiBaseUrl } from '../utils/apiUrl';

const API_BASE = getApiBaseUrl();

// ── Dedicated Auth Axios Instance ─────────────────────────────────────────────

const authApi: AxiosInstance = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
  withCredentials: true,  // Send cookies (for refresh token HttpOnly cookie)
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor: attach Bearer token
authApi.interceptors.request.use(
  (config) => {
    const token = useStore.getState().token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: auto-refresh on 401
let isRefreshing = false;
let refreshQueue: Array<(token: string) => void> = [];

authApi.interceptors.response.use(
  (response) => response.data,
  async (error) => {
    const originalRequest = error.config;
    const requestUrl = originalRequest?.url || '';

    // Public auth endpoints should never trigger token refresh
    const isPublicAuthRoute =
      requestUrl.includes('/auth/login') ||
      requestUrl.includes('/auth/register') ||
      requestUrl.includes('/auth/verify-otp') ||
      requestUrl.includes('/auth/resend-otp') ||
      requestUrl.includes('/auth/forgot-password') ||
      requestUrl.includes('/auth/reset-password') ||
      requestUrl.includes('/auth/verify-email') ||
      requestUrl.includes('/auth/resend-verification') ||
      requestUrl.includes('/auth/refresh');

    if (error.response?.status === 401 && !originalRequest?._retry && !isPublicAuthRoute) {
      if (isRefreshing) {
        // Queue requests while refreshing
        return new Promise((resolve) => {
          refreshQueue.push((token: string) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            resolve(authApi(originalRequest));
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Try to refresh token via cookie
        const refreshData: any = await axios.post(
          `${API_BASE}/auth/refresh`,
          {},
          { withCredentials: true }
        );
        const newToken = refreshData.data?.access_token || refreshData.access_token;
        if (newToken) {
          useStore.getState().setToken(newToken);
          if (refreshData.data?.session_id || refreshData.session_id) {
            useStore.getState().setSessionId(refreshData.data?.session_id || refreshData.session_id);
          }
          authApi.defaults.headers.common.Authorization = `Bearer ${newToken}`;
          refreshQueue.forEach((cb) => cb(newToken));
          refreshQueue = [];
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
          }
          return authApi(originalRequest);
        }
      } catch (_refreshError) {
        // Refresh failed — force logout
        useStore.getState().logout();
        window.location.href = '/login';
      } finally {
        isRefreshing = false;
      }
    }

    // ── Cold-start retry for sleeping/slow backends ─────────────────────────
    // Free-tier backends (Render, etc.) sleep when idle. The first request
    // fails with a network error while the server boots. Retry a few times
    // with a delay instead of failing instantly.
    const isNetworkError =
      error.message === 'Network Error' || error.code === 'ERR_NETWORK' || !error.response;
    const isTimeout = error.code === 'ECONNABORTED';

    if ((isNetworkError || isTimeout) && originalRequest) {
      const retries = (originalRequest._coldRetryCount as number) || 0;
      if (retries < 3) {
        originalRequest._coldRetryCount = retries + 1;
        await new Promise((r) => setTimeout(r, 3000));
        try {
          return await authApi(originalRequest);
        } catch (retryError: any) {
          error = retryError;
          // fall through to final message below
        }
      }
    }

    let message = error.response?.data?.detail;
    if (!message) {
      if (error.message === 'Network Error' || error.code === 'ERR_NETWORK' || !error.response) {
        message = 'Unable to connect to the backend server. If this is the first request in a while, the backend may be starting up — please try again in a few seconds.';
      } else if (error.code === 'ECONNABORTED') {
        message = 'The backend took too long to respond (it may be starting up). Please try again.';
      } else {
        message = error.message || 'An error occurred';
      }
    }
    return Promise.reject(new Error(message));
  }
);

// ── Auth API Functions ────────────────────────────────────────────────────────

export interface RegisterPayload {
  email: string;
  password: string;
  full_name: string;
  username?: string;
  agree_terms?: boolean;
}

export interface LoginPayload {
  email: string;
  password: string;
  remember_me?: boolean;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  session_id: string;
  user: {
    id: string;
    email: string;
    username?: string;
    full_name?: string;
    profile_picture_url?: string;
    role: string;
    is_admin: boolean;
    is_active: boolean;
    is_verified: boolean;
    last_login?: string;
    created_at: string;
    login_count: number;
  };
}

export const registerUser = (payload: RegisterPayload): Promise<any> =>
  authApi.post('/auth/register', payload) as Promise<any>;

export const verifyOtp = (challengeId: string, code: string): Promise<any> =>
  authApi.post('/auth/verify-otp', { challenge_id: challengeId, code }) as Promise<any>;

export const resendOtp = (challengeId: string): Promise<any> =>
  authApi.post('/auth/resend-otp', { challenge_id: challengeId }) as Promise<any>;

export const loginUser = (payload: LoginPayload): Promise<LoginResponse> =>
  authApi.post('/auth/login', payload) as Promise<LoginResponse>;

export const logoutUser = (): Promise<any> =>
  authApi.post('/auth/logout') as Promise<any>;

export const logoutAllDevices = (): Promise<any> =>
  authApi.post('/auth/logout-all') as Promise<any>;

export const refreshToken = (): Promise<any> =>
  authApi.post('/auth/refresh') as Promise<any>;

export const verifyEmail = (token: string): Promise<any> =>
  authApi.post('/auth/verify-email', { token }) as Promise<any>;

export const resendVerification = (email: string): Promise<any> =>
  authApi.post('/auth/resend-verification', { email }) as Promise<any>;

export const forgotPassword = (email: string): Promise<any> =>
  authApi.post('/auth/forgot-password', { email }) as Promise<any>;

export const resetPassword = (token: string, new_password: string, confirm_password: string): Promise<any> =>
  authApi.post('/auth/reset-password', { token, new_password, confirm_password }) as Promise<any>;

export const getMe = (): Promise<any> =>
  authApi.get('/auth/me') as Promise<any>;

export const updateProfile = (data: { full_name?: string; username?: string; profile_picture_url?: string }): Promise<any> =>
  authApi.put('/auth/profile', data) as Promise<any>;

export const changePassword = (payload: {
  current_password: string;
  new_password: string;
  confirm_password: string;
  logout_other_sessions?: boolean;
}): Promise<any> =>
  authApi.post('/auth/change-password', payload) as Promise<any>;

export const getActiveSessions = (): Promise<any> =>
  authApi.get('/auth/sessions') as Promise<any>;

export const revokeSession = (sessionId: string): Promise<any> =>
  authApi.delete(`/auth/sessions/${sessionId}`) as Promise<any>;

export const getLoginHistory = (limit = 20, offset = 0): Promise<any> =>
  authApi.get(`/auth/login-history?limit=${limit}&offset=${offset}`) as Promise<any>;

// Re-export the axiosInstance for other uses (e.g. upload, analysis, etc.)
export default authApi;
