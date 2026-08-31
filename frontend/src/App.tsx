/**
 * AI Data Analyst - Main App Component
 * Updated routing with enterprise auth system, admin portal, and user account pages.
 */

import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useEffect, useState } from 'react';
import { useStore } from './store/useStore';
import { healthCheck } from './services/api';
import SplashScreen from './components/ui/SplashScreen';
import ErrorBoundary from './components/ui/ErrorBoundary';
import ProtectedRoute from './components/layout/ProtectedRoute';
import ProtectedAdminRoute from './components/auth/ProtectedAdminRoute';
import DashboardLayout from './components/layout/DashboardLayout';

// ── Public / Auth Pages ────────────────────────────────────────────────────
import HomePage from './pages/HomePage';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import ResetPasswordPage from './pages/auth/ResetPasswordPage';
import VerifyEmailPage from './pages/auth/VerifyEmailPage';

// ── User Portal Pages ──────────────────────────────────────────────────────
import DashboardHome from './pages/DashboardHome';
import UploadPage from './pages/UploadPage';
import EDAPage from './pages/EDAPage';
import CleaningPage from './pages/CleaningPage';
import VisualizationPage from './pages/VisualizationPage';
import StatisticsPage from './pages/StatisticsPage';
import MLPage from './pages/MLPage';
import SQLWorkplacePage from './pages/SQLWorkplacePage';
import AIInsightsPage from './pages/AIInsightsPage';
import FeatureEngineeringPage from './pages/FeatureEngineeringPage';
import ReportsPage from './pages/ReportsPage';
import SettingsPage from './pages/SettingsPage';
import ProfilePage from './pages/user/ProfilePage';

// ── Admin Portal Pages ─────────────────────────────────────────────────────
import AdminLoginPage from './pages/admin/AdminLoginPage';
import AdminLayout from './pages/admin/AdminLayout';
import AdminDashboardPage from './pages/admin/AdminDashboardPage';
import AdminUsersPage from './pages/admin/AdminUsersPage';
import AdminActivityPage from './pages/admin/AdminActivityPage';
import AdminSessionsPage from './pages/admin/AdminSessionsPage';
import AdminAuditLogsPage from './pages/admin/AdminAuditLogsPage';

function App() {
  const [showSplash, setShowSplash] = useState(() => {
    const isFirstVisit = !localStorage.getItem('infinitics_splash_seen');
    const isHome = !window.location.hash || window.location.hash === '#' || window.location.hash === '#/';
    return isFirstVisit && isHome;
  });
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', 'light');
  }, []);

  useEffect(() => {
    if (!showSplash) return;
    localStorage.setItem('infinitics_splash_seen', 'true');
    healthCheck().catch(() => {});
    const timer = setTimeout(() => setShowSplash(false), 8000);
    return () => clearTimeout(timer);
  }, [showSplash]);

  if (showSplash) return <SplashScreen />;

  return (
    <HashRouter>
      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            background: 'var(--bg-surface)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border-default)',
            borderRadius: '10px',
            fontSize: '13.5px',
            padding: '12px 20px',
            fontWeight: 600,
            boxShadow: 'var(--shadow-lg)',
          },
          success: { iconTheme: { primary: '#10b981', secondary: '#ffffff' } },
          error: { iconTheme: { primary: '#ef4444', secondary: '#ffffff' } },
        }}
      />

      <Routes>
        {/* ── Public Routes ──────────────────────────────────────── */}
        <Route path="/" element={<HomePage />} />

        {/* ── Auth Routes ────────────────────────────────────────── */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />

        {/* ── Admin Routes ───────────────────────────────────────── */}
        <Route path="/admin/login" element={<AdminLoginPage />} />
        <Route element={<ProtectedAdminRoute />}>
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="dashboard" element={<AdminDashboardPage />} />
            <Route path="users" element={<AdminUsersPage />} />
            <Route path="activity" element={<AdminActivityPage />} />
            <Route path="sessions" element={<AdminSessionsPage />} />
            <Route path="audit" element={<AdminAuditLogsPage />} />
          </Route>
        </Route>

        {/* ── User Protected Routes ──────────────────────────────── */}
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<DashboardLayout />}>
            <Route index element={<DashboardHome />} />
            <Route path="upload" element={<UploadPage />} />
            <Route path="eda" element={<EDAPage />} />
            <Route path="cleaning" element={<CleaningPage />} />
            <Route path="visualization" element={<VisualizationPage />} />
            <Route path="statistics" element={<StatisticsPage />} />
            <Route path="ml" element={<MLPage />} />
            <Route
              path="sql"
              element={
                <ErrorBoundary>
                  <SQLWorkplacePage />
                </ErrorBoundary>
              }
            />
            <Route path="ai-insights" element={<AIInsightsPage />} />
            <Route path="features" element={<FeatureEngineeringPage />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="profile" element={<ProfilePage />} />
          </Route>
        </Route>

        {/* ── Fallback ───────────────────────────────────────────── */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  );
}

export default App;
