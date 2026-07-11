/**
 * DataMind AI - Main App Component
 * Sets up React Router with all pages and the app layout.
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useStore } from './store/useStore';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import AdminPage from './pages/AdminPage';
import ProtectedRoute from './components/layout/ProtectedRoute';
import DashboardLayout from './components/layout/DashboardLayout';
import DashboardHome from './pages/DashboardHome';
import UploadPage from './pages/UploadPage';
import EDAPage from './pages/EDAPage';
import CleaningPage from './pages/CleaningPage';
import VisualizationPage from './pages/VisualizationPage';
import StatisticsPage from './pages/StatisticsPage';
import MLPage from './pages/MLPage';
import AIInsightsPage from './pages/AIInsightsPage';
import FeatureEngineeringPage from './pages/FeatureEngineeringPage';
import ReportsPage from './pages/ReportsPage';
import SettingsPage from './pages/SettingsPage';

function App() {
  return (
    <BrowserRouter>
      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            background: '#252836',
            color: '#e2e8f0',
            border: '1px solid #3d3f50',
            borderRadius: '16px',
            fontSize: '1.15rem',
            padding: '18px 36px',
            fontWeight: 600,
            minWidth: '380px',
            textAlign: 'center',
            boxShadow: '0 12px 40px rgba(0,0,0,0.6)',
          },
          success: {
            iconTheme: { primary: '#10b981', secondary: '#252836' },
          },
          error: {
            iconTheme: { primary: '#ef4444', secondary: '#252836' },
          },
        }}
      />
      <Routes>
        {/* Landing Page */}
        <Route path="/" element={<LandingPage />} />
        
        {/* Dedicated Login/Register pages if needed */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Dashboard - protected routes block */}
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<DashboardLayout />}>
            <Route index element={<DashboardHome />} />
            <Route path="upload" element={<UploadPage />} />
            <Route path="eda" element={<EDAPage />} />
            <Route path="cleaning" element={<CleaningPage />} />
            <Route path="visualization" element={<VisualizationPage />} />
            <Route path="statistics" element={<StatisticsPage />} />
            <Route path="ml" element={<MLPage />} />
            <Route path="ai-insights" element={<AIInsightsPage />} />
            <Route path="features" element={<FeatureEngineeringPage />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="admin" element={<AdminPage />} />
          </Route>
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
