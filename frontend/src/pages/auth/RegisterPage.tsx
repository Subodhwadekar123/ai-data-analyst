/**
 * RegisterPage.tsx
 * Full registration form with:
 *  - Full Name, Username (optional), Email, Password, Confirm Password
 *  - Password strength meter
 *  - Terms & Conditions checkbox
 *  - Post-registration "check your email" screen
 */

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  User, Mail, Lock, Eye, EyeOff, Shield,
  Loader2, AlertCircle, CheckCircle, ArrowRight, UserPlus, ArrowLeft
} from 'lucide-react';
import { registerUser, resendVerification } from '../../services/authApi';
import PasswordStrengthMeter from '../../components/auth/PasswordStrengthMeter';
import { useIsMobile } from '../../hooks/useMediaQuery';
import InteractiveBackground from '../../components/layout/InteractiveBackground';

const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [formData, setFormData] = useState({
    full_name: '',
    username: '',
    email: '',
    password: '',
    confirm_password: '',
    agree_terms: false,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [registered, setRegistered] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [verificationUrl, setVerificationUrl] = useState('');

  const update = (field: string, value: string | boolean) =>
    setFormData((p) => ({ ...p, [field]: value }));

  const validate = (): string | null => {
    if (!formData.full_name.trim()) return 'Full name is required.';
    if (!formData.email.trim()) return 'Email is required.';
    if (!formData.password) return 'Password is required.';
    if (formData.password !== formData.confirm_password) return 'Passwords do not match.';
    if (formData.password.length < 8) return 'Password must be at least 8 characters.';
    if (!formData.agree_terms) return 'You must agree to the Terms & Conditions.';
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const err = validate();
    if (err) { setError(err); return; }

    setLoading(true);
    try {
      const res = await registerUser({
        email: formData.email,
        password: formData.password,
        full_name: formData.full_name,
        username: formData.username || undefined,
        agree_terms: true,
      });
      if (res?.is_verified) {
        setIsVerified(true);
      }
      if (res?.verification_url) {
        setVerificationUrl(res.verification_url);
      }
      setRegistered(true);
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (registered) {
    return (
      <div style={pageStyle}>
        <InteractiveBackground />
        <div style={blobStyle1} /><div style={blobStyle2} />
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glow-card"
          style={{ padding: '32px', position: 'relative', zIndex: 1, textAlign: 'center', maxWidth: '440px', width: '100%', boxSizing: 'border-box' }}
        >
          <div style={{ width: '72px', height: '72px', background: 'var(--accent-primary-light)', border: '2px solid var(--border-default)', borderRadius: '50%', margin: '0 auto 20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CheckCircle size={36} color="#10b981" />
          </div>
          <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#f1f5f9', marginBottom: '12px' }}>
            {isVerified ? '🎉 Account Activated!' : 'Account Created!'}
          </h2>
          <p style={{ color: '#94a3b8', lineHeight: 1.6, marginBottom: '16px', fontSize: '14px' }}>
            {isVerified
              ? <>Welcome <strong style={{ color: '#a5b4fc' }}>{formData.full_name || formData.email}</strong>! Your account is active and verified. You can log in right now.</>
              : <>Verification link prepared for <strong style={{ color: '#a5b4fc' }}>{formData.email}</strong>.</>
            }
          </p>

          {!isVerified && verificationUrl && (
            <div style={{ margin: '16px 0 20px', padding: '16px', background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: '12px', textAlign: 'center' }}>
              <p style={{ fontSize: '12px', fontWeight: 700, color: '#a5b4fc', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                ⚡ Instant Email Verification
              </p>
              <a
                href={verificationUrl}
                style={{
                  display: 'inline-block',
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  color: 'white',
                  textDecoration: 'none',
                  borderRadius: '10px',
                  padding: '10px 24px',
                  fontSize: '14px',
                  fontWeight: 700,
                  boxShadow: '0 4px 12px rgba(16,185,129,0.35)'
                }}
              >
                Verify & Activate Account Now →
              </a>
            </div>
          )}

          {!isVerified && (
            <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '20px' }}>
              Link expires in 24 hours. Once verified, you can sign in to your dashboard.
            </p>
          )}

          <button
            onClick={() => navigate('/login')}
            style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', color: 'white', border: 'none', borderRadius: '10px', padding: '12px 28px', fontSize: '15px', fontWeight: 700, cursor: 'pointer', width: '100%', marginTop: isVerified ? '8px' : '0' }}
          >
            {isVerified ? 'Sign In to Your Account →' : 'Go to Login'}
          </button>
          {!isVerified && (
            <div style={{ marginTop: '16px' }}>
              <button
                onClick={async () => {
                  try {
                    const res = await resendVerification(formData.email);
                    if (res?.verification_url) {
                      setVerificationUrl(res.verification_url);
                    }
                    toast.success('Verification link refreshed!');
                  } catch (err: any) {
                    toast.error(err.message || 'Failed to resend.');
                  }
                }}
                style={{ background: 'none', border: 'none', color: '#6366f1', fontSize: '13px', cursor: 'pointer', textDecoration: 'underline' }}
              >
                Resend verification link
              </button>
            </div>
          )}
        </motion.div>
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      <InteractiveBackground />
      <div style={blobStyle1} /><div style={blobStyle2} />
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        style={{ width: '100%', maxWidth: '500px', position: 'relative', zIndex: 1 }}
      >
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{ width: '58px', height: '58px', background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-primary-hover))', borderRadius: '16px', margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'var(--shadow-md)' }}>
            <Shield size={26} color="white" />
          </div>
          <h1 style={{ fontSize: '26px', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 6px' }}>Create Account</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Join the AI Data Analyst platform</p>
        </div>

        <div className="glow-card" style={{ padding: '32px', position: 'relative', zIndex: 1 }}>
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

          <AnimatePresence>
            {error && (
              <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                style={{ display: 'flex', gap: '10px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '10px', padding: '12px 14px', marginBottom: '18px' }}>
                <AlertCircle size={16} color="#f87171" style={{ marginTop: '1px', flexShrink: 0 }} />
                <span style={{ fontSize: '13px', color: '#fca5a5' }}>{error}</span>
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Full Name */}
            <div>
              <label style={labelStyle}>Full Name *</label>
              <div style={{ position: 'relative' }}>
                <User size={15} color="#475569" style={iconStyle} />
                <input id="reg-fullname" type="text" placeholder="John Doe" value={formData.full_name}
                  onChange={(e) => update('full_name', e.target.value)} required style={{ ...inputStyle, paddingLeft: '38px' }} />
              </div>
            </div>

            {/* Username */}
            <div>
              <label style={labelStyle}>Username <span style={{ color: '#475569', fontWeight: 400 }}>(optional)</span></label>
              <div style={{ position: 'relative' }}>
                <span style={{ ...iconStyle, color: '#475569', fontSize: '14px' }}>@</span>
                <input id="reg-username" type="text" placeholder="johndoe" value={formData.username}
                  onChange={(e) => update('username', e.target.value)} style={{ ...inputStyle, paddingLeft: '28px' }} />
              </div>
            </div>

            {/* Email */}
            <div>
              <label style={labelStyle}>Email Address *</label>
              <div style={{ position: 'relative' }}>
                <Mail size={15} color="#475569" style={iconStyle} />
                <input id="reg-email" type="email" placeholder="name@example.com" value={formData.email}
                  onChange={(e) => update('email', e.target.value)} required autoComplete="email" style={{ ...inputStyle, paddingLeft: '38px' }} />
              </div>
            </div>

            {/* Password */}
            <div>
              <label style={labelStyle}>Password *</label>
              <div style={{ position: 'relative' }}>
                <Lock size={15} color="#475569" style={iconStyle} />
                <input id="reg-password" type={showPassword ? 'text' : 'password'} placeholder="Min. 8 characters" value={formData.password}
                  onChange={(e) => update('password', e.target.value)} required style={{ ...inputStyle, paddingLeft: '38px', paddingRight: '40px' }} />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#475569', cursor: 'pointer' }}>
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              <PasswordStrengthMeter password={formData.password} />
            </div>

            {/* Confirm Password */}
            <div>
              <label style={labelStyle}>Confirm Password *</label>
              <div style={{ position: 'relative' }}>
                <Lock size={15} color="#475569" style={iconStyle} />
                <input id="reg-confirm" type={showConfirm ? 'text' : 'password'} placeholder="Repeat password" value={formData.confirm_password}
                  onChange={(e) => update('confirm_password', e.target.value)} required style={{ ...inputStyle, paddingLeft: '38px', paddingRight: '40px',
                    borderColor: formData.confirm_password && formData.password !== formData.confirm_password ? 'rgba(239,68,68,0.5)' : undefined }} />
                <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                  style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#475569', cursor: 'pointer' }}>
                  {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {formData.confirm_password && formData.password !== formData.confirm_password && (
                <p style={{ color: '#f87171', fontSize: '12px', marginTop: '4px' }}>Passwords do not match</p>
              )}
            </div>

            {/* Terms */}
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer' }}>
              <input type="checkbox" id="agree-terms" checked={formData.agree_terms}
                onChange={(e) => update('agree_terms', e.target.checked)}
                style={{ marginTop: '2px', accentColor: '#6366f1', width: '16px', height: '16px', flexShrink: 0 }} />
              <span style={{ fontSize: '13px', color: '#94a3b8', lineHeight: 1.4 }}>
                I agree to the{' '}
                <a href="#" style={{ color: '#6366f1' }}>Terms of Service</a>{' '}
                and{' '}
                <a href="#" style={{ color: '#6366f1' }}>Privacy Policy</a>
              </span>
            </label>

            {/* Submit */}
            <motion.button type="submit" disabled={loading}
              whileHover={{ scale: loading ? 1 : 1.01 }} whileTap={{ scale: loading ? 1 : 0.98 }}
              style={{ width: '100%', padding: '13px', background: loading ? 'rgba(99,102,241,0.5)' : 'linear-gradient(135deg, #4f46e5, #7c3aed)', color: 'white', border: 'none', borderRadius: '12px', fontSize: '15px', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '4px', boxShadow: loading ? 'none' : '0 4px 20px rgba(99,102,241,0.4)' }}>
              {loading ? <><Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />Creating account...</> : <><UserPlus size={18} />Create Account</>}
            </motion.button>
          </form>

          <div style={{ marginTop: '20px', textAlign: 'center', fontSize: '14px' }}>
            <span style={{ color: '#64748b' }}>Already have an account? </span>
            <Link to="/login" style={{ color: '#6366f1', fontWeight: 700, textDecoration: 'none' }}>
              Sign in <ArrowRight size={12} style={{ display: 'inline', verticalAlign: 'middle' }} />
            </Link>
          </div>

          <div style={{
            marginTop: '16px',
            paddingTop: '16px',
            borderTop: '1px solid rgba(255,255,255,0.06)',
            textAlign: 'center',
            fontSize: '12px',
          }}>
            <span style={{ color: '#475569' }}>System Administrator? </span>
            <Link to="/login?role=admin" style={{ color: '#c084fc', fontWeight: 600, textDecoration: 'none' }}>
              Admin Portal Login →
            </Link>
          </div>
        </div>
      </motion.div>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

// ── Shared Styles ──────────────────────────────────────────────────────────────

const pageStyle: React.CSSProperties = {
  minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
  background: 'var(--bg-app)',
  padding: '32px 24px', position: 'relative', overflow: 'hidden',
};

const blobStyle1: React.CSSProperties = {
  position: 'absolute', top: '10%', right: '15%', width: '350px', height: '350px',
  background: 'radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)',
  filter: 'blur(60px)', pointerEvents: 'none',
};

const blobStyle2: React.CSSProperties = {
  position: 'absolute', bottom: '10%', left: '10%', width: '300px', height: '300px',
  background: 'radial-gradient(circle, rgba(168,85,247,0.10) 0%, transparent 70%)',
  filter: 'blur(50px)', pointerEvents: 'none',
};

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: '12px', color: '#64748b', fontWeight: 600,
  marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.06em',
};

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '11px 14px', background: 'var(--bg-canvas)',
  border: '1px solid var(--border-default)', borderRadius: '10px', color: 'var(--text-primary)',
  fontSize: '14px', outline: 'none', boxSizing: 'border-box',
};

const iconStyle: React.CSSProperties = {
  position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)',
};

export default RegisterPage;
