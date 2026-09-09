/**
 * Global Zustand Store
 * Manages dataset state, auth state, active page, and theme across the application.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ── Auth Types ─────────────────────────────────────────────────────────────

export interface AuthUser {
  id: string;
  email: string;
  username?: string | null;
  full_name?: string | null;
  profile_picture_url?: string | null;
  role: 'user' | 'admin';
  is_admin: boolean;
  is_active: boolean;
  is_verified: boolean;
  last_login?: string | null;
  created_at?: string | null;
  login_count?: number;
}

// ── Dataset Types ──────────────────────────────────────────────────────────

export interface DatasetInfo {
  rows: number;
  columns: number;
  shape: number[];
  memory_usage_bytes?: number;
  memory_usage_mb: number;
  missing_values_total: number;
  missing_columns?: number;
  missing_info: Record<string, { count: number; percentage: number }>;
  duplicate_rows: number;
  duplicate_percentage?: number;
  completeness_score: number;
  unique_counts?: Record<string, number>;
  column_types: {
    numeric: string[];
    categorical: string[];
    datetime: string[];
    boolean: string[];
  };
  column_details: ColumnDetail[];
  target_suggestions: string[];
  has_datetime: boolean;
  is_time_series?: boolean;
  // ── Optional legacy flat aliases (present on older payloads) ───────────────
  column_names?: string[];
  numeric_columns?: string[];
  categorical_columns?: string[];
}

export interface ColumnDetail {
  name: string;
  dtype: string;
  type_category: string;
  missing_count: number;
  missing_pct: number;
  unique_count: number;
  sample_values: any[];
}

export interface DatasetPreview {
  columns: string[];
  dtypes: Record<string, string>;
  records: Record<string, any>[];
  total_rows: number;
}

export interface UploadedDataset {
  id: string;
  filename: string;
  file_size_mb: number;
  file_type: string;
  dataset_info: DatasetInfo;
  preview: DatasetPreview;
  uploaded_at: string;
}

// ── Chat Types ──────────────────────────────────────────────────────────────

export interface ChatDebugInfo {
  code_errors?: Array<{ type: string; message: string; line?: number | null; solution: string }>;
  code_fixed?: string | null;
  execution_output?: string | null;
}

export interface ChatMessage {
  role: 'user' | 'ai';
  content: string;
  timestamp: string;
  debug?: ChatDebugInfo;
}

// ── Store Interface ────────────────────────────────────────────────────────

interface AppStore {
  // Theme
  theme: 'dark' | 'light' | 'pastel';
  toggleTheme: () => void;
  setTheme: (theme: 'dark' | 'light' | 'pastel') => void;

  // Active dataset
  activeDataset: UploadedDataset | null;
  setActiveDataset: (dataset: UploadedDataset | null) => void;

  // All uploaded datasets
  datasets: UploadedDataset[];
  addDataset: (dataset: UploadedDataset) => void;
  removeDataset: (id: string) => void;
  setDatasets: (list: UploadedDataset[]) => void;

  // Sidebar state
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;

  // Loading states
  isUploading: boolean;
  setIsUploading: (loading: boolean) => void;
  uploadProgress: number;
  setUploadProgress: (progress: number) => void;

  // ML Results cache
  mlResults: Record<string, any>;
  setMLResult: (key: string, result: any) => void;

  // AI Chat history
  chatHistory: ChatMessage[];
  addChatMessage: (role: 'user' | 'ai', content: string, debug?: ChatDebugInfo) => void;
  clearChat: () => void;

  // Authentication — extended
  user: AuthUser | null;
  token: string | null;          // Access token (JWT)
  sessionId: string | null;      // Current session ID
  setUser: (user: AuthUser | null) => void;
  setToken: (token: string | null) => void;
  setSessionId: (id: string | null) => void;
  logout: () => void;
}

export const useStore = create<AppStore>()(
  persist(
    (set, get) => ({
      // Theme
      theme: 'light',
      toggleTheme: () => set((s) => ({
        theme: s.theme === 'light' ? 'pastel' : s.theme === 'pastel' ? 'dark' : 'light'
      })),
      setTheme: (theme) => set({ theme }),

      // Active dataset
      activeDataset: null,
      setActiveDataset: (dataset) => set({ activeDataset: dataset }),

      // All datasets
      datasets: [],
      addDataset: (dataset) =>
        set((s) => ({
          datasets: [dataset, ...s.datasets.filter((d) => d.id !== dataset.id)],
          activeDataset: dataset,
        })),
      removeDataset: (id) =>
        set((s) => ({
          datasets: s.datasets.filter((d) => d.id !== id),
          activeDataset: s.activeDataset?.id === id ? null : s.activeDataset,
        })),
      // Replace the full dataset list while preserving the currently-active dataset.
      // Used by layout sync (avoids addDataset's always-activate behavior in bulk).
      setDatasets: (list) =>
        set((s) => {
          const activeId = s.activeDataset?.id;
          const stillActive = list.find((d) => d.id === activeId);
          return {
            datasets: list,
            activeDataset: stillActive ?? (list.length > 0 ? list[0] : null),
          };
        }),

      // Sidebar
      sidebarCollapsed: false,
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),

      // Loading
      isUploading: false,
      setIsUploading: (loading) => set({ isUploading: loading }),
      uploadProgress: 0,
      setUploadProgress: (progress) => set({ uploadProgress: progress }),

      // ML Results
      mlResults: {},
      setMLResult: (key, result) =>
        set((s) => ({ mlResults: { ...s.mlResults, [key]: result } })),

      // Chat
      chatHistory: [],
      addChatMessage: (role, content, debug) =>
        set((s) => ({
          chatHistory: [
            ...s.chatHistory,
            { role, content, timestamp: new Date().toISOString(), ...(debug ? { debug } : {}) },
          ],
        })),
      clearChat: () => set({ chatHistory: [] }),

      // Authentication — extended
      user: null,
      token: null,
      sessionId: null,
      setUser: (user) => set({ user }),
      setToken: (token) => {
        if (token) {
          localStorage.setItem('auth_token', token);
        } else {
          localStorage.removeItem('auth_token');
        }
        set({ token });
      },
      setSessionId: (id) => set({ sessionId: id }),
      logout: () => {
        localStorage.removeItem('auth_token');
        set({
          user: null,
          token: null,
          sessionId: null,
          datasets: [],
          activeDataset: null,
          chatHistory: [],
        });
      },
    }),
    {
      name: 'ai-data-analyst-store',
      partialize: (state) => ({
        theme: state.theme,
        sidebarCollapsed: state.sidebarCollapsed,
        token: state.token,
        user: state.user,
        sessionId: state.sessionId,
        datasets: state.datasets,
        activeDataset: state.activeDataset,
      }),
    }
  )
);
