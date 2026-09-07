/**
 * API Base URL Resolver
 * =====================
 * Resolution order:
 *   1. Runtime override via localStorage key "custom_api_url"
 *   2. Build-time env var VITE_API_URL (set in Vercel dashboard)
 *   3. Production fallback (hardcoded Render URL) — logs a warning
 *   4. Local dev proxy (/api/v1) — used by Vite dev server only
 *
 * For Vercel deployments:
 *   Go to Vercel → Settings → Environment Variables → Add:
 *     VITE_API_URL = https://your-backend.onrender.com
 *   Then redeploy. Vite bakes env vars at build time.
 */

const PRODUCTION_BACKEND_FALLBACK = 'https://datamind-backend-tmql.onrender.com';

const appendApiPrefix = (url: string): string => {
  let clean = url.trim().replace(/\/+$/, '');
  // If it's a domain but missing the protocol, automatically prepend https://
  if (!clean.startsWith('http://') && !clean.startsWith('https://') && !clean.startsWith('/')) {
    clean = `https://${clean}`;
  }
  return clean.endsWith('/api/v1') ? clean : `${clean}/api/v1`;
};

export const getApiBaseUrl = (): string => {
  // 1. Runtime localStorage override (useful for debugging production issues)
  const customUrl = typeof window !== 'undefined' ? localStorage.getItem('custom_api_url') : null;
  if (customUrl && customUrl.trim() !== '') {
    return appendApiPrefix(customUrl);
  }

  // 2. Build-time environment variable (RECOMMENDED for production)
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl && envUrl.trim() !== '') {
    return appendApiPrefix(envUrl);
  }

  // 3. Production domain detection — use hardcoded fallback with warning
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
      console.warn(
        '[API Config] VITE_API_URL is not set. Falling back to:',
        PRODUCTION_BACKEND_FALLBACK,
        '\nTo fix: Set VITE_API_URL in your Vercel Environment Variables and redeploy.'
      );
      return appendApiPrefix(PRODUCTION_BACKEND_FALLBACK);
    }
  }

  // 4. Local development — Vite dev server proxy handles /api → localhost:8000
  return '/api/v1';
};

export const setCustomApiUrl = (url: string | null): void => {
  if (!url || url.trim() === '') {
    localStorage.removeItem('custom_api_url');
  } else {
    localStorage.setItem('custom_api_url', url.trim());
  }
};

