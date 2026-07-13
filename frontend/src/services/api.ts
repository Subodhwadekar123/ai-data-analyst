/**
 * API Service Layer
 * Centralized Axios instance with all endpoint calls to the FastAPI backend.
 */

import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api/v1',
  timeout: 120000, // 2 minutes for large dataset processing
  headers: {
    'Content-Type': 'application/json',
  },
});

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const message = error.response?.data?.detail || error.message || 'An error occurred';
    return Promise.reject(new Error(message));
  }
);

// Request interceptor to attach JWT token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Upload ─────────────────────────────────────────────────────────────────

export const uploadDataset = (file: File, onProgress?: (pct: number) => void) => {
  const formData = new FormData();
  formData.append('file', file);
  return api.post('/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (e) => {
      if (onProgress && e.total) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    },
  });
};

export const uploadFromUrl = (url: string) => api.post('/upload/url', { url }) as Promise<any>;

export const listDatasets = () => api.get('/datasets') as Promise<any>;
export const getDataset = (id: string) => api.get(`/datasets/${id}`) as Promise<any>;
export const getPreview = (id: string, rows = 20) => api.get(`/datasets/${id}/preview?rows=${rows}`) as Promise<any>;
export const deleteDataset = (id: string) => api.delete(`/datasets/${id}`) as Promise<any>;

// ── Analysis ──────────────────────────────────────────────────────────────

export const getFullEDA = (id: string) => api.get(`/analysis/${id}/eda`) as Promise<any>;
export const getSummary = (id: string) => api.get(`/analysis/${id}/summary`) as Promise<any>;
export const getDistributions = (id: string) => api.get(`/analysis/${id}/distributions`) as Promise<any>;
export const getCorrelations = (id: string) => api.get(`/analysis/${id}/correlations`) as Promise<any>;
export const getMissingValues = (id: string) => api.get(`/analysis/${id}/missing-values`) as Promise<any>;
export const getOutliers = (id: string) => api.get(`/analysis/${id}/outliers`) as Promise<any>;
export const getFeatureInsights = (id: string) => api.get(`/analysis/${id}/feature-insights`) as Promise<any>;
export const getQualityScore = (id: string) => api.get(`/analysis/${id}/quality-score`) as Promise<any>;

// ── Statistics ────────────────────────────────────────────────────────────

export const getStatistics = (id: string) => api.get(`/statistics/${id}`) as Promise<any>;
export const getDescriptiveStats = (id: string) => api.get(`/statistics/${id}/descriptive`) as Promise<any>;
export const getCorrelationMatrix = (id: string) => api.get(`/statistics/${id}/correlation-matrix`) as Promise<any>;
export const getNormalityTests = (id: string) => api.get(`/statistics/${id}/normality-tests`) as Promise<any>;
export const getConfidenceIntervals = (id: string) => api.get(`/statistics/${id}/confidence-intervals`) as Promise<any>;
export const runTTest = (id: string, body: object) => api.post(`/statistics/${id}/ttest`, body) as Promise<any>;
export const getHypothesisTests = (id: string) => api.get(`/statistics/${id}/hypothesis-tests`) as Promise<any>;

// ── Visualization ─────────────────────────────────────────────────────────

export const getHistogram = (id: string, col: string, bins = 30) =>
  api.get(`/viz/${id}/histogram/${encodeURIComponent(col)}?bins=${bins}`);
export const getBarChart = (id: string, xCol: string, yCol?: string, topN = 20) =>
  api.get(`/viz/${id}/bar/${encodeURIComponent(xCol)}?${yCol ? `y_col=${encodeURIComponent(yCol)}&` : ''}top_n=${topN}`);
export const getLineChart = (id: string, xCol: string, yCol: string) =>
  api.get(`/viz/${id}/line/${encodeURIComponent(xCol)}/${encodeURIComponent(yCol)}`);
export const getScatterPlot = (id: string, xCol: string, yCol: string, colorCol?: string) =>
  api.get(`/viz/${id}/scatter/${encodeURIComponent(xCol)}/${encodeURIComponent(yCol)}${colorCol ? `?color_col=${encodeURIComponent(colorCol)}` : ''}`);
export const getBoxPlot = (id: string, col: string, groupCol?: string) =>
  api.get(`/viz/${id}/box/${encodeURIComponent(col)}${groupCol ? `?group_col=${encodeURIComponent(groupCol)}` : ''}`);
export const getPieChart = (id: string, col: string, topN = 10) =>
  api.get(`/viz/${id}/pie/${encodeURIComponent(col)}?top_n=${topN}`);
export const getCorrelationHeatmap = (id: string) => api.get(`/viz/${id}/heatmap`) as Promise<any>;
export const getViolinPlot = (id: string, col: string, groupCol?: string) =>
  api.get(`/viz/${id}/violin/${encodeURIComponent(col)}${groupCol ? `?group_col=${encodeURIComponent(groupCol)}` : ''}`);
export const getTimeSeries = (id: string, dateCol: string, valueCol: string) =>
  api.get(`/viz/${id}/timeseries/${encodeURIComponent(dateCol)}/${encodeURIComponent(valueCol)}`);
export const getBubbleChart = (id: string, xCol: string, yCol: string, sizeCol: string) =>
  api.get(`/viz/${id}/bubble/${encodeURIComponent(xCol)}/${encodeURIComponent(yCol)}/${encodeURIComponent(sizeCol)}`);
export const getTreemap = (id: string, labelCol: string, valueCol: string) =>
  api.get(`/viz/${id}/treemap/${encodeURIComponent(labelCol)}/${encodeURIComponent(valueCol)}`);
export const getScatter3D = (id: string, xCol: string, yCol: string, zCol: string) =>
  api.get(`/viz/${id}/scatter3d/${encodeURIComponent(xCol)}/${encodeURIComponent(yCol)}/${encodeURIComponent(zCol)}`);
export const getPairPlot = (id: string, maxCols = 5) =>
  api.get(`/viz/${id}/pairplot?max_cols=${maxCols}`);
export const getBubbleMap = (id: string, locationCol: string, sizeCol: string) =>
  api.get(`/viz/${id}/bubblemap/${encodeURIComponent(locationCol)}/${encodeURIComponent(sizeCol)}`);

// ── Cleaning ──────────────────────────────────────────────────────────────

export const handleMissingValues = (id: string, body: object) =>
  api.post(`/cleaning/${id}/missing-values`, body);
export const removeDuplicates = (id: string) => api.post(`/cleaning/${id}/remove-duplicates`) as Promise<any>;
export const renameColumns = (id: string, renameMap: Record<string, string>) =>
  api.post(`/cleaning/${id}/rename-columns`, { rename_map: renameMap });
export const dropColumns = (id: string, columns: string[]) =>
  api.post(`/cleaning/${id}/drop-columns`, { columns });
export const convertDtype = (id: string, column: string, targetDtype: string) =>
  api.post(`/cleaning/${id}/convert-dtype`, { column, target_dtype: targetDtype });
export const handleOutliers = (id: string, body: object) =>
  api.post(`/cleaning/${id}/handle-outliers`, body);
export const normalizeData = (id: string, body: object) =>
  api.post(`/cleaning/${id}/normalize`, body);
export const encodeColumn = (id: string, body: object) =>
  api.post(`/cleaning/${id}/encode`, body);
export const handleSkewness = (id: string, body: object) =>
  api.post(`/cleaning/${id}/handle-skewness`, body);
export const removeConstants = (id: string) =>
  api.post(`/cleaning/${id}/remove-constants`);
export const exportCleaned = (id: string, format = 'csv') =>
  `/api/v1/cleaning/${id}/export?format=${format}`;

// ── Machine Learning ──────────────────────────────────────────────────────

export const detectProblemType = (id: string, targetCol: string) =>
  api.get(`/ml/${id}/detect-problem/${encodeURIComponent(targetCol)}`);
export const trainModel = (id: string, body: object) => api.post(`/ml/${id}/train`, body) as Promise<any>;
export const compareModels = (id: string, body: object) => api.post(`/ml/${id}/compare`, body) as Promise<any>;

// ── AI Insights ────────────────────────────────────────────────────────────

export const getAIInsights = (id: string) => api.get(`/ai/${id}/insights`) as Promise<any>;
export const askQuestion = (id: string, question: string) =>
  api.post(`/ai/${id}/ask`, { question });
export const getDataDictionary = (id: string) => api.get(`/ai/${id}/data-dictionary`) as Promise<any>;

// ── Feature Engineering ───────────────────────────────────────────────────

export const runPCA = (id: string, body: object) => api.post(`/features/${id}/pca`, body) as Promise<any>;
export const polynomialFeatures = (id: string, body: object) =>
  api.post(`/features/${id}/polynomial`, body);
export const featureSelection = (id: string, body: object) =>
  api.post(`/features/${id}/select`, body);
export const varianceThreshold = (id: string, threshold: number) =>
  api.post(`/features/${id}/variance-threshold?threshold=${threshold}`);

// ── Reports & File Downloads ──────────────────────────────────────────────

export const triggerBlobDownload = (data: Blob, filename: string) => {
  const url = window.URL.createObjectURL(data);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

export const downloadPDFReport = async (id: string) => {
  const response = await api.get(`/reports/${id}/pdf`, { responseType: 'blob' });
  triggerBlobDownload(response as unknown as Blob, `datamind_report_${id}.pdf`);
};

export const downloadExcelReport = async (id: string) => {
  const response = await api.get(`/reports/${id}/excel`, { responseType: 'blob' });
  triggerBlobDownload(response as unknown as Blob, `datamind_report_${id}.xlsx`);
};

export const downloadJupyterReport = async (id: string) => {
  const response = await api.get(`/reports/${id}/jupyter`, { responseType: 'blob' });
  triggerBlobDownload(response as unknown as Blob, `datamind_notebook_${id}.ipynb`);
};

// ── Health ────────────────────────────────────────────────────────────────

export const healthCheck = () => api.get('/health') as Promise<any>;

// ── Issues ────────────────────────────────────────────────────────────────

export const reportIssue = (body: { title: string; category: string; description: string; email?: string }) =>
  api.post('/issues', body) as Promise<any>;
export const listIssues = () => api.get('/issues') as Promise<any>;
export const downloadIssuesCSV = () => '/api/v1/issues/download';

// ── Authentication ─────────────────────────────────────────────────────────

export const login = (data: { email: string; password: string; force_login?: boolean }) => {
  return api.post('/auth/login', {
    email: data.email,
    password: data.password,
    force_login: data.force_login || false
  });
};

export const logout = () => api.post('/auth/logout') as Promise<any>;
export const registerUser = (body: object) => api.post('/auth/register', body) as Promise<any>;
export const getCurrentProfile = () => api.get('/auth/me') as Promise<any>;

// ── Administration ─────────────────────────────────────────────────────────

export const getAdminStats = () => api.get('/admin/stats') as Promise<any>;
export const getAdminUsers = () => api.get('/admin/users') as Promise<any>;
export const getAdminDatasets = () => api.get('/admin/datasets') as Promise<any>;
export const getAdminIssues = () => api.get('/admin/issues') as Promise<any>;

export const deleteIssue = (issueId: number) => api.delete(`/admin/issues/${issueId}`) as Promise<any>;
export const forceLogoutUser = (userId: string) => api.put(`/admin/users/${userId}/force-logout`) as Promise<any>;
export const getUserDatasets = (userId: string) => api.get(`/admin/users/${userId}/datasets`) as Promise<any>;
// ── Admin File Downloads ───────────────────────────────────────────────────

export const adminDownloadPDF = async (datasetId: string) => {
  const response = await api.get(`/admin/reports/${datasetId}/pdf`, { responseType: 'blob' });
  triggerBlobDownload(response as unknown as Blob, `admin_report_${datasetId}.pdf`);
};

export const adminDownloadExcel = async (datasetId: string) => {
  const response = await api.get(`/admin/reports/${datasetId}/excel`, { responseType: 'blob' });
  triggerBlobDownload(response as unknown as Blob, `admin_report_${datasetId}.xlsx`);
};

export const adminDownloadCSV = async (datasetId: string) => {
  const response = await api.get(`/cleaning/${datasetId}/export?format=csv`, { responseType: 'blob' });
  triggerBlobDownload(response as unknown as Blob, `dataset_${datasetId}.csv`);
};

export default api;
