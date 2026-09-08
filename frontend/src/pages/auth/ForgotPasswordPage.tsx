/**
 * ForgotPasswordPage.tsx
 * Forgot password flow — enter email, receive reset link.
 */

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, ArrowLeft, Loader2, AlertCircle, CheckCircle, Key } from 'lucide-react';
import { forgotPassword } from '../../services/authApi';
import InteractiveBackground from '../../components/layout/InteractiveBackground';

const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email.trim()) { setError('Please enter your email address.'); return; }
    setLoading(true);
    try {
      await forgotPassword(email);
      setSent(true);
    } catch (err: any) {
      setError(err.message || 'Failed to send reset email.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={pageStyle}>
      <InteractiveBackground />
      <div style={{ position: 'absolute', top: '20%', left: '20%', width: '300px', height: '300px', background: 'radial-gradient(circle, var(--accent-primary-light) 0%, transparent 70%)', filter: 'blur(60px)' }} />
      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
        style={{ width: '100%', maxWidth: '420px', position: 'relative', zIndex: 1 }}>
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{ width: '58px', height: '58px', background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-primary-hover))', borderRadius: '16px', margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'var(--shadow-md)' }}>
            <Key size={26} color="white" />
          </div>
          <h1 style={{ fontSize: '26px', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 6px' }}>Forgot Password?</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Enter your email to receive a reset link</p>
        </div>

        <div className="glow-card" style={{ padding: '32px' }}>
          {!sent ? (
            <>
              <AnimatePresence>
                {error && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    style={{ display: 'flex', gap: '10px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '10px', padding: '12px 14px', marginBottom: '18px' }}>
                    <AlertCircle size={16} color="#f87171" style={{ flexShrink: 0 }} />
                    <span style={{ fontSize: '13px', color: '#fca5a5' }}>{error}</span>
                  </motion.div>
                )}
              </AnimatePresence>
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                <div>
                  <label style={labelStyle}>Email Address</label>
                  <div style={{ position: 'relative' }}>
                    <Mail size={15} color="#475569" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                    <input id="forgot-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@example.com" required autoComplete="email" style={{ ...inputStyle, paddingLeft: '38px' }} />
                  </div>
                </div>
                <motion.button type="submit" disabled={loading} whileHover={{ scale: loading ? 1 : 1.01 }} whileTap={{ scale: loading ? 1 : 0.98 }}
                  style={{ width: '100%', padding: '13px', background: loading ? 'rgba(99,102,241,0.5)' : 'linear-gradient(135deg, #4f46e5, #7c3aed)', color: 'white', border: 'none', borderRadius: '12px', fontSize: '15px', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: loading ? 'none' : '0 4px 20px rgba(99,102,241,0.4)' }}>
                  {loading ? <><Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />Sending...</> : 'Send Reset Link'}
                </motion.button>
              </form>
            </>
          ) : (
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} style={{ textAlign: 'center', padding: '8px 0' }}>
              <div style={{ width: '64px', height: '64px', background: 'rgba(16,185,129,0.12)', border: '2px solid rgba(16,185,129,0.3)', borderRadius: '50%', margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CheckCircle size={32} color="#10b981" />
              </div>
              <h3 style={{ color: '#f1f5f9', fontWeight: 700, fontSize: '18px', marginBottom: '10px' }}>Check Your Email!</h3>
              <p style={{ color: '#64748b', fontSize: '14px', lineHeight: 1.6, marginBottom: '20px' }}>
                If <strong style={{ color: '#a5b4fc' }}>{email}</strong> is registered, you'll receive a reset link shortly. Check your spam folder too.
              </p>
              <button onClick={() => { setSent(false); setEmail(''); }}
                style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)', color: '#a5b4fc', borderRadius: '10px', padding: '10px 20px', fontSize: '14px', cursor: 'pointer', fontWeight: 600 }}>
                Try another email
              </button>
            </motion.div>
          )}

          <div style={{ marginTop: '24px', textAlign: 'center' }}>
            <Link to="/login" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#64748b', fontSize: '14px', textDecoration: 'none' }}>
              <ArrowLeft size={14} /> Back to Login
            </Link>
          </div>
        </div>
      </motion.div>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

const pageStyle: React.CSSProperties = { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-app)', padding: '24px', position: 'relative', overflow: 'hidden' };
const cardStyle: React.CSSProperties = { background: 'rgba(22,25,37,0.8)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '20px', padding: '32px', boxShadow: '0 24px 60px rgba(0,0,0,0.5)' };
const labelStyle: React.CSSProperties = { display: 'block', fontSize: '12px', color: '#64748b', fontWeight: 600, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.06em' };
const inputStyle: React.CSSProperties = { width: '100%', padding: '11px 14px', background: 'var(--bg-canvas)', border: '1px solid var(--border-default)', borderRadius: '10px', color: 'var(--text-primary)', fontSize: '14px', outline: 'none', boxSizing: 'border-box' };

export default ForgotPasswordPage;
