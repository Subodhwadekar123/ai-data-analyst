/**
 * LoginPage.tsx
 * Enterprise-grade user login page with:
 *  - Email + password validation
 *  - Remember Me
 *  - Show/hide password
 *  - Loading states & animations
 *  - Responsive, dark glassmorphism design
 */

import React, { useState, useCallback, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  Mail, Lock, Eye, EyeOff, Loader2,
  AlertCircle, LogIn, ArrowRight, User, Settings, ArrowLeft
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import { loginUser } from '../../services/authApi';
import { getApiBaseUrl, setCustomApiUrl } from '../../utils/apiUrl';
import { useIsMobile } from '../../hooks/useMediaQuery';
import type { AuthUser } from '../../store/useStore';
import InteractiveBackground from '../../components/layout/InteractiveBackground';

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { setUser, setToken, setSessionId, logout } = useStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [showConfigModal, setShowConfigModal] = useState(false);
  const [customUrlInput, setCustomUrlInput] = useState(
    typeof window !== 'undefined' ? localStorage.getItem('custom_api_url') || '' : ''
  );

  const handleSaveCustomUrl = () => {
    setCustomApiUrl(customUrlInput);
    setShowConfigModal(false);
    toast.success(customUrlInput ? 'Backend URL updated!' : 'Reset to default backend URL');
    window.location.reload();
  };

  // ── Backend warm-up ping ────────────────────────────────────────────────────
  // Free-tier backends (Render, etc.) sleep when idle. Ping a lightweight
  // health endpoint as soon as the page loads so the server is already
  // awake by the time the user clicks "Login". Without this, the first
  // login attempt can fail while the backend is still booting.
  useEffect(() => {
    const warmUp = async () => {
      try {
        await fetch(`${getApiBaseUrl()}/health`, { method: 'GET', mode: 'cors' });
      } catch {
        // Ignore — warm-up is best-effort. The login retry logic in
        // services/authApi.ts handles any remaining cold-start delay.
      }
    };
    warmUp();
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password.trim()) {
      setError('Please enter both email and password.');
      return;
    }

    setLoading(true);
    try {
      const res = await loginUser({ email, password, remember_me: rememberMe });

      setToken(res.access_token);
      setSessionId(res.session_id);
      setUser(res.user as AuthUser);
      toast.success(`Welcome back, ${res.user.full_name || res.user.email}!`);

      // Route based on role
      if (res.user.is_admin || res.user.role === 'admin') {
        navigate('/admin/dashboard');
      } else {
        navigate('/dashboard');
      }
    } catch (err: any) {
      const msg = err.message || 'Login failed. Please verify your credentials.';
      setError(msg);

      // Unverified account: backend emailed a fresh OTP — log out any stale
      // session and land directly on the OTP verification page with the
      // challenge pre-loaded.
      if (err.otp_required && err.challenge_id) {
        logout();
        toast.success('Verification code sent! Check your email.', { duration: 4000 });
        navigate(`/verify-email?challenge=${encodeURIComponent(err.challenge_id)}&email=${encodeURIComponent(err.masked_email || email)}`);
        return;
      }
      if (msg.toLowerCase().includes('verify your email')) {
        setTimeout(() => navigate('/verify-email'), 2000);
      }
    } finally {
      setLoading(false);
    }
  }, [email, password, rememberMe, setUser, setToken, setSessionId, logout, navigate]);

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg-app)',
      padding: isMobile ? '16px' : '24px',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Interactive Background Canvas */}
      <InteractiveBackground />

      {/* Background glowing blobs */}
      <div style={{
        position: 'absolute', top: '15%', left: '10%',
        width: isMobile ? '250px' : '400px', height: isMobile ? '250px' : '400px',
        background: 'radial-gradient(circle, var(--accent-primary-light) 0%, transparent 70%)',
        filter: 'blur(60px)', pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', bottom: '15%', right: '10%',
        width: isMobile ? '200px' : '350px', height: isMobile ? '200px' : '350px',
        background: 'radial-gradient(circle, var(--accent-primary-light) 0%, transparent 70%)',
        filter: 'blur(60px)', pointerEvents: 'none',
      }} />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        style={{ width: '100%', maxWidth: '460px', position: 'relative', zIndex: 1 }}
      >
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: isMobile ? '16px' : '24px' }}>
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.3 }}
            style={{
              width: isMobile ? '52px' : '64px', height: isMobile ? '52px' : '64px',
              background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-primary-hover))',
              borderRadius: '18px', margin: '0 auto 16px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: 'var(--shadow-md)',
            }}
          >
            <LogIn size={isMobile ? 24 : 30} color="white" />
          </motion.div>

          <h1 style={{ fontSize: isMobile ? '22px' : '26px', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 6px' }}>
            Welcome Back
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: 0 }}>
            Sign in to your AI Data Analyst account
          </p>
        </div>

        {/* Card */}
        <div className="glow-card" style={{
          backdropFilter: 'blur(20px)',
          borderRadius: '20px',
          padding: '32px',
          boxShadow: 'var(--shadow-xl)',
        }}>
          {/* Back to Home */}
          <Link
            to="/"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              color: '#64748b',
              fontSize: '13px',
              fontWeight: 600,
              textDecoration: 'none',
              marginBottom: '20px',
              transition: 'color 0.2s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#a5b4fc')}
            onMouseLeave={(e) => (e.currentTarget.style.color = '#64748b')}
          >
            <ArrowLeft size={15} /> Back to Home
          </Link>

          {/* Error Message */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                style={{
                  background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)',
                  borderRadius: '12px', padding: '14px', marginBottom: '20px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                  <AlertCircle size={16} color="#f87171" style={{ marginTop: '1px', flexShrink: 0 }} />
                  <span style={{ fontSize: '13px', color: '#fca5a5', lineHeight: '1.4' }}>{error}</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            {/* Email */}
            <div>
              <label style={labelStyle}>Email Address</label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} color="#475569" style={iconStyle} />
                <input
                  id="login-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  autoComplete="email"
                  required
                  style={{ ...inputStyle, paddingLeft: '40px' }}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label style={labelStyle}>Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} color="#475569" style={iconStyle} />
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                  style={{ ...inputStyle, paddingLeft: '40px', paddingRight: '44px' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute', right: '12px', top: '50%',
                    transform: 'translateY(-50%)', background: 'none',
                    border: 'none', cursor: 'pointer', color: '#475569', padding: '4px'
                  }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Remember Me + Forgot Password */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  id="remember-me"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  style={{ width: '16px', height: '16px', accentColor: '#6366f1', cursor: 'pointer' }}
                />
                <span style={{ fontSize: '13px', color: '#94a3b8' }}>Remember me</span>
              </label>
              <Link to="/forgot-password" style={{ fontSize: '13px', color: '#6366f1', textDecoration: 'none', fontWeight: 600 }}>
                Forgot password?
              </Link>
            </div>

            {/* Submit Button */}
            <motion.button
              type="submit"
              disabled={loading}
              whileHover={{ scale: loading ? 1 : 1.01 }}
              whileTap={{ scale: loading ? 1 : 0.98 }}
              style={{
                width: '100%', padding: '13px',
                background: loading
                  ? 'rgba(99,102,241,0.5)'
                  : 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                color: 'white', border: 'none', borderRadius: '12px',
                fontSize: '15px', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                boxShadow: loading
                  ? 'none'
                  : '0 4px 20px rgba(99,102,241,0.4)',
                transition: 'all 0.2s',
              }}
            >
              {loading ? (
                <><Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />Verifying...</>
              ) : (
                <><LogIn size={18} />Sign In</>
              )}
            </motion.button>
          </form>

          {/* Footer Section */}
          <div style={{ marginTop: '24px', textAlign: 'center', fontSize: '14px' }}>
            <span style={{ color: '#64748b' }}>Don't have an account? </span>
            <Link to="/register" style={{ color: '#6366f1', fontWeight: 700, textDecoration: 'none' }}>
              Create account <ArrowRight size={12} style={{ display: 'inline', verticalAlign: 'middle' }} />
            </Link>
          </div>
        </div>

        {/* Quick Footer Links */}
        <div style={{ textAlign: 'center', marginTop: '20px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          <Link to="/admin/login" style={{
            background: 'none',
            border: 'none',
            fontSize: '12px',
            color: '#a5b4fc',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            textDecoration: 'none',
            fontWeight: 600,
          }}>
            <User size={13} /> Admin Portal
          </Link>

          <span style={{ color: '#334155' }}>•</span>

          <button
            type="button"
            onClick={() => setShowConfigModal(true)}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '12px',
              color: '#64748b',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <Settings size={13} /> API URL
          </button>
        </div>

        {/* Backend Configuration Modal */}
        {showConfigModal && (
          <div style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 999, padding: '20px'
          }}>
            <div style={{
              background: '#161925', border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: '16px', padding: '24px', maxWidth: '440px', width: '100%',
              boxShadow: '0 20px 50px rgba(0,0,0,0.6)'
            }}>
              <h3 style={{ color: '#f1f5f9', fontSize: '18px', margin: '0 0 8px', fontWeight: 700 }}>
                Backend API Configuration
              </h3>
              <p style={{ color: '#94a3b8', fontSize: '13px', margin: '0 0 16px', lineHeight: 1.4 }}>
                If your backend is hosted on Render, Railway, or locally, enter your backend URL below.
              </p>

              <label style={labelStyle}>Backend API URL</label>
              <input
                type="text"
                value={customUrlInput}
                onChange={(e) => setCustomUrlInput(e.target.value)}
                placeholder="e.g. https://ai-data-analyst-backend.onrender.com"
                style={{ ...inputStyle, marginBottom: '16px' }}
              />

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setShowConfigModal(false)}
                  style={{
                    background: 'rgba(255,255,255,0.06)', color: '#94a3b8',
                    border: 'none', borderRadius: '8px', padding: '8px 14px',
                    fontSize: '13px', cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveCustomUrl}
                  style={{
                    background: 'linear-gradient(135deg, #4f46e5, #6366f1)',
                    color: 'white', border: 'none', borderRadius: '8px',
                    padding: '8px 16px', fontSize: '13px', fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Save & Reload
                </button>
              </div>
            </div>
          </div>
        )}
      </motion.div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        input:-webkit-autofill { -webkit-box-shadow: 0 0 0 30px #1e2235 inset !important; -webkit-text-fill-color: #e2e8f0 !important; }
      `}</style>
    </div>
  );
};

// ── Shared Styles ─────────────────────────────────────────────────────────────

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: '12px', color: '#64748b',
  fontWeight: 600, marginBottom: '6px',
  textTransform: 'uppercase', letterSpacing: '0.06em',
};

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '11px 14px',
  background: 'var(--bg-canvas)',
  border: '1px solid var(--border-default)',
  borderRadius: '10px', color: 'var(--text-primary)',
  fontSize: '14px', outline: 'none',
  transition: 'border-color 0.2s',
  boxSizing: 'border-box',
};

const iconStyle: React.CSSProperties = {
  position: 'absolute', left: '13px',
  top: '50%', transform: 'translateY(-50%)',
};

export default LoginPage;