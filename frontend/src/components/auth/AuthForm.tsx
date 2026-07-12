import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Shield, Mail, Lock, User, RefreshCw, Info } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { login, registerUser } from '../../services/api';

interface AuthFormProps {
  onSuccess?: () => void;
  initialMode?: 'login' | 'register';
}

const AuthForm: React.FC<AuthFormProps> = ({ onSuccess, initialMode = 'login' }) => {
  const navigate = useNavigate();
  const { setUser, setToken } = useStore();
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [showForceModal, setShowForceModal] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      toast.error('Please enter email and password.');
      return;
    }
    if (mode === 'register' && !fullName.trim()) {
      toast.error('Please enter your name.');
      return;
    }

    setLoading(true);
    const loadingToast = toast.loading(mode === 'login' ? 'Authenticating session...' : 'Creating your account...');

    try {
      if (mode === 'login') {
        const res = await login({ email, password });
        setToken(res.access_token);
        setUser(res.user);
        toast.dismiss(loadingToast);
        toast.success(`Welcome back, ${res.user.full_name || res.user.email}!`);
        if (onSuccess) onSuccess();
        navigate('/dashboard/upload');
      } else {
        const registerRes = await registerUser({ email, password, full_name: fullName });
        toast.dismiss(loadingToast);
        toast.success('Account registered successfully! Please log in.');
        // Auto-switch to login mode with details pre-filled
        setMode('login');
        setLoading(false);
      }
    } catch (err: any) {
      toast.dismiss(loadingToast);
      if (err.message && err.message.includes('already logged in elsewhere')) {
        setShowForceModal(true);
      } else {
        toast.error(err.message || 'Authentication failed.');
      }
      setLoading(false);
    }
  };

  const handleForceLogin = async () => {
    setShowForceModal(false);
    setLoading(true);
    const loadingToast = toast.loading('Forcing logout of other session...');
    try {
      const res = await login({ email, password, force_login: true });
      setToken(res.access_token);
      setUser(res.user);
      toast.dismiss(loadingToast);
      toast.success(`Successfully logged in and terminated old session!`);
      if (onSuccess) onSuccess();
      navigate('/dashboard/upload');
    } catch (err: any) {
      toast.dismiss(loadingToast);
      toast.error(err.message || 'Authentication failed.');
      setLoading(false);
    }
  };

  return (
    <div style={{ width: '100%' }}>
      {/* Title */}
      <h2 style={{ fontSize: '24px', fontWeight: 700, color: 'white', margin: '0 0 8px', textAlign: 'center' }}>
        {mode === 'login' ? 'Welcome Back' : 'Create Account'}
      </h2>
      <p style={{ color: '#94a3b8', fontSize: '14px', margin: '0 0 20px', textAlign: 'center' }}>
        {mode === 'login' ? "Access your secure data analytics panel" : "Sign up to start analyzing datasets with AI"}
      </p>

      {/* Onboarding Info Alert */}
      <div
        style={{
          display: 'flex',
          gap: '12px',
          padding: '14px 16px',
          background: 'rgba(99, 102, 241, 0.1)',
          borderRadius: '12px',
          border: '1px solid rgba(99, 102, 241, 0.25)',
          marginBottom: '24px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Shield size={20} color="#818cf8" style={{ flexShrink: 0 }} />
        </div>
        <div>
          <h4 style={{ margin: '0 0 3px', color: '#e2e8f0', fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
            Why do I need to login?
          </h4>
          <p style={{ margin: 0, color: '#a5b4fc', fontSize: '12px', lineHeight: '1.4' }}>
            We require authentication to secure your private datasets, protect your machine learning pipelines, and keep your custom AI insights confidential.
          </p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {mode === 'register' && (
          <div>
            <label
              htmlFor="reg-name"
              style={{
                display: 'block',
                fontSize: '12px',
                color: '#94a3b8',
                marginBottom: '6px',
                fontWeight: 500,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
              }}
            >
              Full Name *
            </label>
            <div style={{ position: 'relative' }}>
              <User
                size={18}
                color="#64748b"
                style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }}
              />
              <input
                id="reg-name"
                type="text"
                className="input"
                placeholder="John Doe"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                style={{ paddingLeft: '40px' }}
                required
              />
            </div>
          </div>
        )}

        <div>
          <label
            htmlFor="auth-email"
            style={{
              display: 'block',
              fontSize: '12px',
              color: '#94a3b8',
              marginBottom: '6px',
              fontWeight: 500,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
            }}
          >
            Email Address *
          </label>
          <div style={{ position: 'relative' }}>
            <Mail
              size={18}
              color="#64748b"
              style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }}
            />
            <input
              id="auth-email"
              type="email"
              className="input"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{ paddingLeft: '40px' }}
              required
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="auth-password"
            style={{
              display: 'block',
              fontSize: '12px',
              color: '#94a3b8',
              marginBottom: '6px',
              fontWeight: 500,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
            }}
          >
            Password *
          </label>
          <div style={{ position: 'relative' }}>
            <Lock
              size={18}
              color="#64748b"
              style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }}
            />
            <input
              id="auth-password"
              type="password"
              className="input"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ paddingLeft: '40px' }}
              required
            />
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          className="btn-primary"
          disabled={loading}
          style={{
            marginTop: '8px',
            padding: '12px',
            fontSize: '14px',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            width: '100%',
          }}
        >
          {loading ? (
            <RefreshCw size={18} className="animate-spin" />
          ) : mode === 'login' ? (
            'Sign In'
          ) : (
            'Create Account'
          )}
        </button>
      </form>

      {/* Mode Switcher */}
      <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '14px' }}>
        <span style={{ color: '#94a3b8' }}>
          {mode === 'login' ? "Don't have an account? " : "Already have an account? "}
        </span>
        <button
          onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#6366f1',
            fontWeight: 600,
            cursor: 'pointer',
            padding: '0',
          }}
          onMouseEnter={(e) => e.currentTarget.style.color = '#818cf8'}
          onMouseLeave={(e) => e.currentTarget.style.color = '#6366f1'}
        >
          {mode === 'login' ? 'Sign Up' : 'Log In'}
        </button>
      </div>

      {/* Force Login Modal */}
      {showForceModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
        }}>
          <div style={{
            background: '#1e293b', border: '1px solid #334155', borderRadius: '16px',
            padding: '30px', maxWidth: '400px', width: '90%', textAlign: 'center'
          }}>
            <h3 style={{ margin: '0 0 16px', color: '#f87171', fontSize: '20px', fontWeight: 600 }}>Active Session Detected</h3>
            <p style={{ color: '#cbd5e1', fontSize: '14px', marginBottom: '24px', lineHeight: '1.5' }}>
              Your account is already logged in on another device or browser. Do you want to forcefully logout the other session and login here?
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                onClick={() => setShowForceModal(false)}
                style={{ padding: '10px 16px', borderRadius: '8px', border: '1px solid #475569', background: 'transparent', color: '#94a3b8', cursor: 'pointer', fontWeight: 600 }}
              >
                Cancel
              </button>
              <button
                onClick={handleForceLogin}
                style={{ padding: '10px 16px', borderRadius: '8px', border: 'none', background: '#f87171', color: 'white', cursor: 'pointer', fontWeight: 600 }}
              >
                Yes, Force Login
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuthForm;
