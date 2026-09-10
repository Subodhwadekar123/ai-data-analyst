/**
 * VerifyEmailPage.tsx
 * Auto-verifies when token is in URL. Shows success/failure/expired states.
 */

import React, { useEffect, useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle, XCircle, Loader2, Mail, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { verifyEmail, resendVerification } from '../../services/authApi';
import InteractiveBackground from '../../components/layout/InteractiveBackground';

type State = 'verifying' | 'success' | 'error' | 'expired' | 'no-token';

const VerifyEmailPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const [state, setState] = useState<State>(token ? 'verifying' : 'no-token');
  const [errorMsg, setErrorMsg] = useState('');
  const [email, setEmail] = useState('');
  const [resending, setResending] = useState(false);
  const [resentOk, setResentOk] = useState(false);

  useEffect(() => {
    if (!token) return;
    verifyEmail(token)
      .then((res: any) => {
        setState('success');
        toast.success('Email verified successfully!');
      })
      .catch((err: any) => {
        const msg = err.message || '';
        if (msg.toLowerCase().includes('expired')) {
          setState('expired');
        } else {
          setState('error');
          setErrorMsg(msg);
        }
      });
  }, [token]);

  const handleResend = async () => {
    if (!email.trim()) { toast.error('Please enter your email'); return; }
    setResending(true);
    try {
      const res: any = await resendVerification(email);
      // OTP flow: the backend returns a challenge id — drop the user straight
      // into the OTP entry step on the register page instead of a dead-end.
      if (res?.otp_required && res?.challenge_id) {
        navigate('/register', {
          state: { challengeId: res.challenge_id, maskedEmail: res.masked_email },
        });
        return;
      }
      setResentOk(true);
      toast.success('Verification email sent!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to resend.');
    } finally {
      setResending(false);
    }
  };

  const renderContent = () => {
    switch (state) {
      case 'verifying':
        return (
          <div style={{ textAlign: 'center' }}>
            <Loader2 size={56} color="#6366f1" style={{ animation: 'spin 1s linear infinite', marginBottom: '16px' }} />
            <h2 style={{ color: '#f1f5f9', marginBottom: '8px' }}>Verifying Your Email...</h2>
            <p style={{ color: '#64748b' }}>Please wait a moment.</p>
          </div>
        );

      case 'success':
        return (
          <div style={{ textAlign: 'center' }}>
            <CheckCircle size={64} color="#10b981" style={{ marginBottom: '16px' }} />
            <h2 style={{ color: '#f1f5f9', marginBottom: '10px', fontSize: '22px', fontWeight: 800 }}>Email Verified!</h2>
            <p style={{ color: '#64748b', marginBottom: '24px' }}>Your account is now active. You can sign in to start using the platform.</p>
            <Link to="/login" style={{ display: 'inline-block', background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', color: 'white', textDecoration: 'none', padding: '12px 28px', borderRadius: '10px', fontWeight: 700, fontSize: '15px' }}>
              Sign In Now
            </Link>
          </div>
        );

      case 'expired':
        return (
          <div>
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <XCircle size={56} color="#f97316" style={{ marginBottom: '12px' }} />
              <h2 style={{ color: '#f1f5f9', marginBottom: '8px' }}>Link Expired</h2>
              <p style={{ color: '#64748b', marginBottom: '20px' }}>This verification link has expired. Request a new one below.</p>
            </div>
            {!resentOk ? (
              <div style={{ display: 'flex', gap: '10px' }}>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email" style={{ ...inputStyle, flex: 1 }} />
                <button onClick={handleResend} disabled={resending}
                  style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', color: 'white', border: 'none', borderRadius: '10px', padding: '0 16px', cursor: resending ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, fontSize: '14px', whiteSpace: 'nowrap' }}>
                  {resending ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <RefreshCw size={15} />}
                  Resend
                </button>
              </div>
            ) : (
              <div style={{ textAlign: 'center', color: '#86efac', fontWeight: 600 }}>New verification link sent!</div>
            )}
          </div>
        );

      case 'error':
        return (
          <div style={{ textAlign: 'center' }}>
            <XCircle size={56} color="#ef4444" style={{ marginBottom: '12px' }} />
            <h2 style={{ color: '#f1f5f9', marginBottom: '8px' }}>Verification Failed</h2>
            <p style={{ color: '#fca5a5', marginBottom: '20px', fontSize: '14px' }}>{errorMsg || 'Invalid verification link.'}</p>
            <Link to="/login" style={{ color: '#6366f1', fontWeight: 700 }}>Back to Login</Link>
          </div>
        );

      case 'no-token':
        return (
          <div>
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <Mail size={48} color="#6366f1" style={{ marginBottom: '12px' }} />
              <h2 style={{ color: '#f1f5f9', marginBottom: '8px' }}>Verify Your Email</h2>
              <p style={{ color: '#64748b', marginBottom: '16px' }}>Enter your email to receive a new verification link.</p>
            </div>
            {!resentOk ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email" style={inputStyle} />
                <button onClick={handleResend} disabled={resending}
                  style={{ width: '100%', background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', color: 'white', border: 'none', borderRadius: '10px', padding: '12px', cursor: resending ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  {resending ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />Sending...</> : 'Send Verification Email'}
                </button>
              </div>
            ) : (
              <div style={{ textAlign: 'center', color: '#86efac', fontWeight: 600, padding: '16px 0' }}>Verification email sent! Check your inbox.</div>
            )}
          </div>
        );
    }
  };

  return (
    <div style={pageStyle}>
      <InteractiveBackground />
      <div style={{ position: 'absolute', top: '20%', left: '20%', width: '300px', height: '300px', background: 'radial-gradient(circle, var(--accent-primary-light) 0%, transparent 70%)', filter: 'blur(60px)' }} />
      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
        style={{ width: '100%', maxWidth: '420px', position: 'relative', zIndex: 1 }}>
        <div className="glow-card" style={{ padding: '40px' }}>
          {renderContent()}
          {state !== 'no-token' && state !== 'verifying' && (
            <div style={{ marginTop: '24px', textAlign: 'center' }}>
              <Link to="/login" style={{ color: '#64748b', fontSize: '14px', textDecoration: 'none' }}>← Back to Login</Link>
            </div>
          )}
        </div>
      </motion.div>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

const pageStyle: React.CSSProperties = { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-app)', padding: '24px', position: 'relative', overflow: 'hidden' };
const inputStyle: React.CSSProperties = { width: '100%', padding: '11px 14px', background: 'var(--bg-canvas)', border: '1px solid var(--border-default)', borderRadius: '10px', color: 'var(--text-primary)', fontSize: '14px', outline: 'none', boxSizing: 'border-box' };

export default VerifyEmailPage;
