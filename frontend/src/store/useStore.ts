/**
 * Global Zustand Store
 * Manages dataset state, active page, and theme across the application.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface DatasetInfo {
  rows: number;
  columns: number;
  shape: number[];
  memory_usage_mb: number;
  missing_values_total: number;
  duplicate_rows: number;
  completeness_score: number;
  column_types: {
    numeric: string[];
    categorical: string[];
    datetime: string[];
    boolean: string[];
  };
  column_details: ColumnDetail[];
  target_suggestions: string[];
  missing_info: Record<string, { count: number; percentage: number }>;
  has_datetime: boolean;
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

interface AppStore {
  // Theme
  theme: 'dark' | 'light';
  toggleTheme: () => void;

  // Active dataset
  activeDataset: UploadedDataset | null;
  setActiveDataset: (dataset: UploadedDataset | null) => void;

  // All uploaded datasets
  datasets: UploadedDataset[];
  addDataset: (dataset: UploadedDataset) => void;
  removeDataset: (id: string) => void;

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
  chatHistory: Array<{ role: 'user' | 'ai'; content: string; timestamp: string }>;
  addChatMessage: (role: 'user' | 'ai', content: string) => void;
  clearChat: () => void;

  // Authentication
  user: { email: string; full_name?: string; is_admin: boolean } | null;
  token: string | null;
  setUser: (user: { email: string; full_name?: string; is_admin: boolean } | null) => void;
  setToken: (token: string | null) => void;
  logout: () => void;
}

export const useStore = create<AppStore>()(
  persist(
    (set, get) => ({
      // Theme
      theme: 'dark',
      toggleTheme: () => set((s) => ({ theme: s.theme === 'dark' ? 'light' : 'dark' })),

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
      addChatMessage: (role, content) =>
        set((s) => ({
          chatHistory: [
            ...s.chatHistory,
            { role, content, timestamp: new Date().toISOString() },
          ],
        })),
      clearChat: () => set({ chatHistory: [] }),

      // Authentication
      user: null,
      token: localStorage.getItem('auth_token') || null,
      setUser: (user) => set({ user }),
      setToken: (token) => {
        if (token) {
          localStorage.setItem('auth_token', token);
        } else {
          localStorage.removeItem('auth_token');
        }
        set({ token });
      },
      logout: () => {
        localStorage.removeItem('auth_token');
        set({ user: null, token: null, datasets: [], activeDataset: null, chatHistory: [] });
      },
    }),
    {
      name: 'ai-data-analyst-store',
      partialize: (state) => ({
        theme: state.theme,
        sidebarCollapsed: state.sidebarCollapsed,
        token: state.token,
        user: state.user,
      }),
    }
  )
);
