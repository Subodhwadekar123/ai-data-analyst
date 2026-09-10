/**
 * VerifyEmailPage.tsx
 * Two verification modes:
 *  1. Magic-link verification — token passed via ?token= in URL (auto-verifies)
 *  2. OTP verification — 6-digit code entry; challenge_id passed via ?challenge= in URL
 *     or via location.state from a resend redirect. Email passed via ?email= or state.
 */

import React, { useEffect, useState, useRef } from 'react';
import { Link, useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle, XCircle, Loader2, Mail, RefreshCw, AlertCircle, ArrowRight, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import { verifyEmail, resendVerification, verifyOtp, resendOtp } from '../../services/authApi';
import InteractiveBackground from '../../components/layout/InteractiveBackground';
import { useStore } from '../../store/useStore';
import type { AuthUser } from '../../store/useStore';

type MagicState = 'verifying' | 'success' | 'error' | 'expired' | 'no-token';
type OtpState = 'idle' | 'verifying' | 'verified' | 'error';

type PageMode = 'magic-link' | 'otp' | 'pick';

const VerifyEmailPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { setUser, setToken, setSessionId } = useStore();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const challengeIdParam = searchParams.get('challenge');
  const emailParam = searchParams.get('email');

  const [mode, setMode] = useState<PageMode>('pick');
  const [magicState, setMagicState] = useState<MagicState>('no-token');
  const [errorMsg, setErrorMsg] = useState('');
  const [otpChallengeId, setOtpChallengeId] = useState('');
  const [otpMaskedEmail, setOtpMaskedEmail] = useState('');
  const [otpState, setOtpState] = useState<OtpState>('idle');
  const [otpError, setOtpError] = useState('');
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const otpInputsRef = useRef<Array<HTMLInputElement | null>>([]);

  const [enterEmail, setEnterEmail] = useState('');
  const [resending, setResending] = useState(false);
  const [resentOk, setResentOk] = useState(false);
  const [otpResendCooldown, setOtpResendCooldown] = useState(0);

  useEffect(() => {
    if (token) { setMode('magic-link'); setMagicState('verifying'); return; }
    if (challengeIdParam && emailParam) {
      setMode('otp'); setOtpChallengeId(challengeIdParam); setOtpMaskedEmail(emailParam); setOtpState('idle'); return;
    }
    const st = location.state as { challengeId?: string; maskedEmail?: string } | null;
    if (st && st.challengeId && st.maskedEmail) {
      setMode('otp'); setOtpChallengeId(st.challengeId); setOtpMaskedEmail(st.maskedEmail); setOtpState('idle'); return;
    }
    setMode('pick'); setMagicState(token ? 'verifying' : 'no-token');
  }, [token, challengeIdParam, emailParam, location.state]);

  // Magic-link verification — auto-verifies when a token is in the URL.
  useEffect(() => {
    if (mode !== 'magic-link' || !token) return;
    setMagicState('verifying');
    verifyEmail(token)
      .then(() => {
        setMagicState('success');
        toast.success('Email verified successfully!');
      })
      .catch((err: any) => {
        const msg = err.message || '';
        if (msg.toLowerCase().includes('expired')) {
          setMagicState('expired');
        } else {
          setMagicState('error');
          setErrorMsg(msg);
        }
      });
  }, [mode, token]);

  const handleResend = async () => {
    if (!enterEmail.trim()) { toast.error('Please enter your email'); return; }
    setResending(true);
    try {
      const res: any = await resendVerification(enterEmail);
      if (res?.otp_required && res?.challenge_id) {
        // OTP flow: switch this page to OTP mode with the challenge
        setMode('otp');
        setOtpChallengeId(res.challenge_id);
        setOtpMaskedEmail(res.masked_email || enterEmail);
        setOtpState('idle');
        setOtpError('');
        startOtpResendCooldown(30);
        setTimeout(() => otpInputsRef.current?.[0]?.focus(), 250);
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

  // ── OTP handlers ─────────────────────────────────────────────────────────────

  const handleOtpChange = (index: number, value: string) => {
    const clean = value.replace(/[^0-9]/g, '');
    if (!clean) {
      const next = [...otpDigits];
      next[index] = '';
      setOtpDigits(next);
      return;
    }
    const chars = clean.split('').slice(0, 6 - index);
    const next = [...otpDigits];
    let i = 0;
    for (; i < chars.length; i++) next[index + i] = chars[i];
    setOtpDigits(next);
    const target = Math.min(index + chars.length, 5);
    otpInputsRef.current?.[target]?.focus();
    setOtpError('');
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && otpDigits[index] === '' && index > 0) {
      const next = [...otpDigits];
      next[index - 1] = '';
      setOtpDigits(next);
      otpInputsRef.current?.[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    const text = e.clipboardData.getData('text').replace(/[^0-9]/g, '').slice(0, 6);
    if (!text) return;
    e.preventDefault();
    const next = ['', '', '', '', '', ''];
    for (let i = 0; i < text.length; i++) next[i] = text[i];
    setOtpDigits(next);
    otpInputsRef.current?.[Math.min(text.length, 5)]?.focus();
    setOtpError('');
  };

  
  const startOtpResendCooldown = (seconds: number) => setOtpResendCooldown(seconds);

  useEffect(() => {
    if (otpResendCooldown <= 0) return;
    const t = setTimeout(() => setOtpResendCooldown((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [otpResendCooldown]);

  const handleOtpVerify = async () => {
    const code = otpDigits.join('');
    if (code.length < 6) {
      setOtpError('Please enter the complete 6-digit code.');
      return;
    }
    if (!otpChallengeId) {
      setOtpError('Verification session expired. Please try again.');
      return;
    }
    setOtpState('verifying');
    setOtpError('');
    try {
      const res: any = await verifyOtp(otpChallengeId, code);
      setOtpState('verified');
      // Auto-login: store tokens + user, then go to dashboard
      if (res?.access_token) {
        setToken(res.access_token);
        setSessionId(res.session_id);
        setUser(res.user as AuthUser);
      }
      toast.success(res?.message || 'Email verified! Welcome to AI Data Analyst.');
      if (res?.user?.is_admin || res?.user?.role === 'admin') {
        navigate('/admin/dashboard', { replace: true });
      } else if (res?.access_token) {
        navigate('/dashboard', { replace: true });
      } else {
        navigate('/login', { replace: true });
      }
    } catch (err: any) {
      const msg = err.message || 'Verification failed. Please try again.';
      setOtpError(msg);
      setOtpDigits(['', '', '', '', '', '']);
      otpInputsRef.current?.[0]?.focus();
    }
  };

  const handleOtpResend = async () => {
    if (otpResendCooldown > 0 || otpState === 'verifying') return;
    if (!otpChallengeId) {
      // No challenge — fall back to resend-verification email
      if (!enterEmail.trim()) { toast.error('Please enter your email'); return; }
      setResending(true);
      try {
        const res: any = await resendVerification(enterEmail);
        if (res?.otp_required && res?.challenge_id) {
          setMode('otp');
          setOtpChallengeId(res.challenge_id);
          setOtpMaskedEmail(res.masked_email || enterEmail);
          setOtpState('idle');
          setOtpError('');
          startOtpResendCooldown(30);
          setTimeout(() => otpInputsRef.current?.[0]?.focus(), 250);
          return;
        }
        setResentOk(true);
        toast.success('Verification email sent!');
      } catch (err: any) {
        toast.error(err.message || 'Failed to resend.');
      } finally {
        setResending(false);
      }
      return;
    }
    try {
      const res: any = await resendOtp(otpChallengeId);
      if (res?.challenge_id) {
        setOtpChallengeId(res.challenge_id);
      }
      if (res?.email_sent === false) {
        toast.error('Email delivery failed — check backend SMTP settings.');
      } else {
        toast.success(res?.message || 'A new verification code has been sent to your email.');
      }
      setOtpError('');
      startOtpResendCooldown(30);
      otpInputsRef.current?.[0]?.focus();
    } catch (err: any) {
      toast.error(err.message || 'Failed to resend the code.');
    }
  };

  const handleOtpBack = () => {
    setMode('pick');
    setEnterEmail(otpMaskedEmail);
    setOtpChallengeId('');
    setOtpState('idle');
    setOtpError('');
    setOtpDigits(['', '', '', '', '', '']);
  };

  const otpView = () => (
    <div>
      <div style={{ textAlign: 'center', marginBottom: '20px' }}>
        <div style={{ width: '72px', height: '72px', background: 'var(--accent-primary-light)', border: '2px solid var(--border-default)', borderRadius: '50%', margin: '0 auto 20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Mail size={34} color="var(--accent-primary)" />
        </div>
        <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#f1f5f9', marginBottom: '8px' }}>Enter Verification Code</h2>
        <p style={{ color: '#64748b', lineHeight: 1.6, marginBottom: '6px', fontSize: '14px' }}>
          We emailed a 6-digit code to <strong style={{ color: '#a5b4fc' }}>{otpMaskedEmail}</strong>. Enter it below to activate your account.
        </p>
        <p style={{ color: '#64748b', fontSize: '12px', marginBottom: '22px' }}>
          Code expires in 10 minutes. Can't find it? Check your spam/junk folder.
        </p>

        {otpError && (
          <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
              background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px',
              padding: '8px 12px', marginBottom: '16px', fontSize: '13px', color: '#f87171' }}>
            <AlertCircle size={14} /><span>{otpError}</span>
          </motion.div>
        )}

        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginBottom: '18px' }}>

          {otpDigits.map((d, i) => (
            <input key={i} ref={(el) => { if (el) otpInputsRef.current[i] = el; }} value={d} inputMode="numeric"
              autoComplete={i === 0 ? 'one-time-code' : 'off'} maxLength={6} disabled={otpState === 'verifying'}
              onChange={(e) => handleOtpChange(i, e.target.value)}
              onKeyDown={(e) => handleOtpKeyDown(i, e)} onPaste={handleOtpPaste}
              style={{ width: 44, height: 52, textAlign: 'center', fontSize: '20px', fontWeight: 700,
                fontFamily: 'var(--font-family-mono)', background: 'var(--bg-canvas)',
                border: `1.5px solid ${d ? 'var(--accent-primary)' : 'var(--border-default)'}`, borderRadius: '10px',
                color: 'var(--text-primary)', outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.15s',
                cursor: otpState === 'verifying' ? 'not-allowed' : 'text' }}
            />
          ))}
        </div>

        <motion.button whileHover={{ scale: otpState === 'verifying' ? 1 : 1.01 }} whileTap={{ scale: otpState === 'verifying' ? 1 : 0.98 }}
          onClick={handleOtpVerify} disabled={otpState === 'verifying'}
          style={{ width: '100%', padding: '13px', background: otpState === 'verifying' ? 'rgba(99,102,241,0.5)' : 'linear-gradient(135deg, #4f46e5, #7c3aed)',
            color: 'white', border: 'none', borderRadius: '12px', fontSize: '15px', fontWeight: 700,
            cursor: otpState === 'verifying' ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            boxShadow: otpState === 'verifying' ? 'none' : '0 4px 20px rgba(99,102,241,0.4)' }}>
          {otpState === 'verifying' ? <><Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />Verifying...</> : <>Verify & Activate Account <ArrowRight size={16} /></>}
        </motion.button>

        <div style={{ marginTop: '16px', fontSize: '13px' }}>
          {otpResendCooldown > 0 ? <span style={{ color: '#64748b' }}>Resend code in {otpResendCooldown}s</span>
            : <><span style={{ color: '#64748b' }}>Didn't receive it? </span>
              <button onClick={handleOtpResend} disabled={otpState === 'verifying'}
                style={{ background: 'none', border: 'none', color: '#6366f1', fontSize: '13px', cursor: 'pointer', textDecoration: 'underline', fontWeight: 600 }}>Resend code</button>
            </>}
        </div>

        {otpResendCooldown <= 0 && (
          <div style={{ marginTop: '14px', paddingTop: '14px', borderTop: '1px solid var(--border-subtle)' }}>
            <button onClick={handleOtpBack} style={{ background: 'none', border: 'none', color: '#64748b', fontSize: '13px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <ArrowLeft size={13} /> Back to enter email
            </button>
          </div>
        )}

        {otpState === 'verified' && (
          <div style={{ marginTop: '12px', textAlign: 'center', color: '#86efac', fontWeight: 600 }}>&#10003; Verified! Redirecting...</div>
        )}
      </div>
    </div>
  );


        const renderContent = () => {
      if (mode === 'otp') return otpView();
      switch (magicState) {
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
                <input type="email" value={enterEmail} onChange={(e) => setEnterEmail(e.target.value)}
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
                <input type="email" value={enterEmail} onChange={(e) => setEnterEmail(e.target.value)}
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
                    {((mode === 'otp' && otpState !== 'verifying') || magicState !== 'verifying') && (
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
