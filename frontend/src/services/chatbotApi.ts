/**
 * Chatbot & Properties API Service
 * Handles queries to the properties chatbot and admin property Excel ingestion.
 */

import axios from 'axios';
import { useStore } from '../store/useStore';
import { getApiBaseUrl } from '../utils/apiUrl';

const API_BASE = getApiBaseUrl();

const api = axios.create({
  baseURL: API_BASE,
  timeout: 120000, // 2 minutes for processing
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to attach JWT access token dynamically
api.interceptors.request.use(
  (config) => {
    const token = useStore.getState().token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for unified error mapping
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    let message = error.response?.data?.detail;
    if (!message) {
      if (error.message === 'Network Error' || error.code === 'ERR_NETWORK' || !error.response) {
        message = 'Unable to connect to the backend server. Please verify your backend server is running and accessible.';
      } else {
        message = error.message || 'An error occurred during the chatbot request';
      }
    }
    return Promise.reject(new Error(message));
  }
);

// ── Ingestion (Admin) ───────────────────────────────────────────────────────

export const uploadPropertiesExcel = (file: File): Promise<any> => {
  const formData = new FormData();
  formData.append('file', file);
  return api.post('/admin/properties/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

export const getAdminPropertiesMetadata = (): Promise<any> => {
  return api.get('/admin/properties/metadata');
};

// ── Chatbot (All Logged-in Users) ───────────────────────────────────────────

export const getPropertiesMetadata = (): Promise<any> => {
  return api.get('/properties/metadata');
};

export const queryChatbot = (
  question: string,
  history: Array<{ role: 'user' | 'assistant'; content: string }>
): Promise<any> => {
  return api.post('/chatbot/query', { question, history });
};
