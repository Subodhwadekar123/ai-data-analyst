/**
 * Landing Page — Infinitics AI
 * Stunning hero + features + testimonials + CTA + footer
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  Brain, BarChart2, Upload, Zap, Shield, TrendingUp,
  ChevronRight, Star, Play, Database, Sparkles,
  PieChart, GitMerge, Activity, X
} from 'lucide-react';
import { useStore } from '../store/useStore';
import AuthForm from '../components/auth/AuthForm';

const fadeUp: any = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' } },
};

const stagger: any = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};

const FEATURES = [
  { icon: Upload, title: 'Instant Upload', description: 'Drag & drop CSV or Excel files. Supports up to 200MB with real-time validation and preview.', color: '#6366f1' },
  { icon: Brain, title: 'AI Insights', description: 'Powered by Gemini AI to generate executive summaries, recommendations, and natural language Q&A.', color: '#8b5cf6' },
  { icon: BarChart2, title: '20+ Chart Types', description: 'Interactive histograms, scatter plots, heatmaps, 3D scatter, violin plots, treemaps, and more.', color: '#a855f7' },
  { icon: Zap, title: 'Auto EDA', description: 'Automated exploratory data analysis with distribution, correlation, missing values, and outlier reports.', color: '#ec4899' },
  { icon: TrendingUp, title: 'Machine Learning', description: 'Auto-detect problem type. Train 15+ algorithms. Compare models with full metrics and confusion matrix.', color: '#14b8a6' },
  { icon: Shield, title: 'Data Cleaning', description: 'Handle missing values, remove outliers, normalize, encode, and transform your data with one click.', color: '#f59e0b' },
  { icon: GitMerge, title: 'Feature Engineering', description: 'PCA dimensionality reduction, polynomial features, feature selection, and variance threshold.', color: '#10b981' },
  { icon: Activity, title: 'Statistical Tests', description: 'T-tests, ANOVA, Chi-square, normality tests, confidence intervals, and correlation matrices.', color: '#3b82f6' },
];

const STATS = [
  { value: '50K+', label: 'Datasets Analyzed' },
  { value: '20+', label: 'Chart Types' },
  { value: '15+', label: 'ML Algorithms' },
  { value: '99.9%', label: 'Uptime' },
];

const TESTIMONIALS = [
  {
    name: 'Dr. Sarah Chen',
    role: 'Data Scientist @ FinTech Corp',
    avatar: 'SC',
    text: 'Infinitics AI replaced my entire EDA workflow. What used to take me 3 hours now takes 3 minutes. The auto-generated insights are surprisingly accurate.',
    rating: 5,
  },
  {
    name: 'Marcus Rodriguez',
    role: 'Business Analyst @ RetailMax',
    avatar: 'MR',
    text: 'I upload our weekly sales data and instantly get executive summaries with recommendations. My manager loves the PDF reports. Game changer for non-technical teams.',
    rating: 5,
  },
  {
    name: 'Priya Patel',
    role: 'ML Engineer @ AI Startup',
    avatar: 'PP',
    text: 'The ML module is fantastic. Auto-detects regression vs classification, trains XGBoost, and gives me feature importances — all in the browser. Impressive.',
    rating: 5,
  },
];

export default function LandingPage() {
  const [mousePos, setMousePos] = useState({ x: -1000, y: -1000 });
  const token = useStore((state) => state.token);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authInitialMode, setAuthInitialMode] = useState<'login' | 'register'>('login');

  const handleCTAClick = (e: React.MouseEvent, path: string) => {
    if (!token) {
      e.preventDefault();
      setAuthInitialMode('login');
      setShowAuthModal(true);
    }
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <div style={{ minHeight: '100vh', background: '#0f1117', color: '#e2e8f0', fontFamily: "'Inter', sans-serif", position: 'relative', overflowX: 'hidden' }}>

      {/* Dynamic Cursor Glowing Orbit Field */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          background: `radial-gradient(550px circle at ${mousePos.x}px ${mousePos.y}px, rgba(99, 102, 241, 0.07) 0%, rgba(168, 85, 247, 0.03) 45%, transparent 100%)`,
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      {/* Dynamic Interactive Dot Matrix Constellation */}
      <div
        className="constellation-matrix"
        style={{
          position: 'fixed',
          inset: 0,
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='60' viewBox='0 0 60 60'%3E%3Ccircle cx='30' cy='30' r='6' fill='rgba%28168, 85, 247, 0.14%29' /%3E%3Ccircle cx='30' cy='30' r='2' fill='rgba%28168, 85, 247, 0.7%29' /%3E%3Ccircle cx='15' cy='15' r='1.5' fill='rgba%28168, 85, 247, 0.5%29' /%3E%3Ccircle cx='45' cy='45' r='1.5' fill='rgba%28168, 85, 247, 0.5%29' /%3E%3Ccircle cx='15' cy='45' r='1.5' fill='rgba%28168, 85, 247, 0.5%29' /%3E%3Ccircle cx='45' cy='15' r='1.5' fill='rgba%28168, 85, 247, 0.5%29' /%3E%3Cline x1='30' y1='30' x2='15' y2='15' stroke='rgba%28168, 85, 247, 0.22%29' stroke-width='0.8' /%3E%3Cline x1='30' y1='30' x2='45' y2='45' stroke='rgba%28168, 85, 247, 0.22%29' stroke-width='0.8' /%3E%3Cline x1='30' y1='30' x2='15' y2='45' stroke='rgba%28168, 85, 247, 0.22%29' stroke-width='0.8' /%3E%3Cline x1='30' y1='30' x2='45' y2='15' stroke='rgba%28168, 85, 247, 0.22%29' stroke-width='0.8' /%3E%3Cline x1='15' y1='15' x2='45' y2='15' stroke='rgba%28168, 85, 247, 0.14%29' stroke-width='0.6' stroke-dasharray='2,2' /%3E%3Cline x1='45' y1='15' x2='45' y2='45' stroke='rgba%28168, 85, 247, 0.14%29' stroke-width='0.6' stroke-dasharray='2,2' /%3E%3Cline x1='45' y1='45' x2='15' y2='45' stroke='rgba%28168, 85, 247, 0.14%29' stroke-width='0.6' stroke-dasharray='2,2' /%3E%3Cline x1='15' y1='45' x2='15' y2='15' stroke='rgba%28168, 85, 247, 0.14%29' stroke-width='0.6' stroke-dasharray='2,2' /%3E%3Cline x1='15' y1='15' x2='0' y2='0' stroke='rgba%28168, 85, 247, 0.12%29' stroke-width='0.6' /%3E%3Cline x1='45' y1='15' x2='60' y2='0' stroke='rgba%28168, 85, 247, 0.12%29' stroke-width='0.6' /%3E%3Cline x1='15' y1='45' x2='0' y2='60' stroke='rgba%28168, 85, 247, 0.12%29' stroke-width='0.6' /%3E%3Cline x1='45' y1='45' x2='60' y2='60' stroke='rgba%28168, 85, 247, 0.12%29' stroke-width='0.6' /%3E%3C/svg%3E")`,
          backgroundSize: '60px 60px',
          maskImage: `radial-gradient(350px circle at ${mousePos.x}px ${mousePos.y}px, black 35%, transparent 100%)`,
          WebkitMaskImage: `radial-gradient(350px circle at ${mousePos.x}px ${mousePos.y}px, black 35%, transparent 100%)`,
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      {/* ── Navbar ─────────────────────────────────────────────────────────── */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        background: 'rgba(15, 17, 23, 0.85)', backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(99,102,241,0.15)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 32px', height: '64px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <img src="/logo.jpg" alt="Logo" style={{
            width: 36, height: 36, borderRadius: '10px',
            objectFit: 'cover', mixBlendMode: 'screen'
          }} />
          <span style={{ fontSize: '1.1rem', fontWeight: 700, color: 'white' }}>Infinitics AI</span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Link
            to={token ? "/dashboard/upload" : "#"}
            onClick={(e) => handleCTAClick(e, '/dashboard/upload')}
            style={{
              padding: '8px 20px', borderRadius: '8px', fontWeight: 600, fontSize: '0.9rem',
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: 'white',
              textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px',
            }}
          >
            Launch App <ChevronRight size={16} />
          </Link>
        </div>
      </nav>

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section style={{ paddingTop: '120px', paddingBottom: '80px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        {/* Background glow */}
        <div style={{
          position: 'absolute', top: '10%', left: '50%', transform: 'translateX(-50%)',
          width: '800px', height: '400px', borderRadius: '50%',
          background: 'radial-gradient(ellipse, rgba(99,102,241,0.15) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        <motion.div initial="hidden" animate="visible" variants={stagger} style={{ position: 'relative' }}>
          <motion.div variants={fadeUp}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              padding: '6px 16px', borderRadius: '20px', marginBottom: '24px',
              background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.3)',
              fontSize: '0.8rem', fontWeight: 600, color: '#818cf8', letterSpacing: '0.05em',
            }}>
              <Sparkles size={12} /> AI-POWERED DATA ANALYSIS
            </span>
          </motion.div>

          <motion.h1 variants={fadeUp} style={{
            fontSize: 'clamp(2.5rem, 6vw, 4.5rem)', fontWeight: 900, lineHeight: 1.1,
            marginBottom: '24px', fontFamily: "'Outfit', sans-serif",
          }}>
            Upload Your Dataset.
            <br />
            <span style={{
              background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 50%, #ec4899 100%)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
            }}>
              Get Professional Insights
            </span>
            <br />
            Instantly.
          </motion.h1>

          <motion.p variants={fadeUp} style={{
            fontSize: '1.2rem', color: '#94a3b8', maxWidth: '600px', margin: '0 auto 40px',
            lineHeight: 1.7,
          }}>
            A production-ready AI platform combining Tableau + Power BI + Pandas + ChatGPT.
            Analyze, clean, visualize, and run ML models — all from your browser.
          </motion.p>

          <motion.div variants={fadeUp} style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link
              to={token ? "/dashboard/upload" : "#"}
              onClick={(e) => handleCTAClick(e, '/dashboard/upload')}
              style={{
                padding: '14px 32px', borderRadius: '12px', fontWeight: 700, fontSize: '1rem',
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: 'white',
                textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '8px',
                boxShadow: '0 0 30px rgba(99,102,241,0.4)',
                transition: 'all 0.2s ease',
              }}
            >
              <Upload size={18} /> Upload Dataset Free
            </Link>
            <Link
              to={token ? "/dashboard/upload" : "#"}
              onClick={(e) => handleCTAClick(e, '/dashboard/upload')}
              style={{
                padding: '14px 32px', borderRadius: '12px', fontWeight: 600, fontSize: '1rem',
                background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.15)',
                color: '#e2e8f0', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '8px',
              }}
            >
              <Play size={18} /> View Dashboard
            </Link>
          </motion.div>
        </motion.div>

        {/* Floating Dashboard Preview Cards */}
        <motion.div
          initial={{ opacity: 0, y: 60 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.8 }}
          style={{ marginTop: '60px', position: 'relative', maxWidth: '900px', margin: '60px auto 0' }}
        >
          <div style={{
            background: '#1a1d27', border: '1px solid #2d2f3e', borderRadius: '20px',
            padding: '24px', boxShadow: '0 40px 80px rgba(0,0,0,0.5)',
            display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px',
          }}>
            {[
              { label: 'Dataset Rows', value: '124,832', color: '#6366f1', icon: Database },
              { label: 'Quality Score', value: '94/100', color: '#10b981', icon: Star },
              { label: 'Missing Values', value: '2.4%', color: '#f59e0b', icon: Activity },
              { label: 'ML Accuracy', value: '97.2%', color: '#a855f7', icon: Brain },
            ].map(({ label, value, color, icon: Icon }) => (
              <motion.div
                key={label}
                whileHover={{ scale: 1.03 }}
                style={{
                  background: '#252836', border: '1px solid #3d3f50', borderRadius: '12px',
                  padding: '16px', textAlign: 'center',
                }}
              >
                <Icon size={24} color={color} style={{ marginBottom: '8px' }} />
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color }}>{value}</div>
                <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>{label}</div>
              </motion.div>
            ))}
          </div>
          {/* Gradient fade at bottom to suggest more content */}
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0, height: '60px',
            background: 'linear-gradient(transparent, #0f1117)',
          }} />
        </motion.div>
      </section>

      {/* ── Stats ─────────────────────────────────────────────────────────── */}
      <section style={{ padding: '60px 32px', borderTop: '1px solid #1e2130', borderBottom: '1px solid #1e2130' }}>
        <motion.div
          initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}
          style={{ display: 'flex', justifyContent: 'center', gap: '60px', flexWrap: 'wrap', maxWidth: '800px', margin: '0 auto' }}
        >
          {STATS.map(({ value, label }) => (
            <motion.div key={label} variants={fadeUp} style={{ textAlign: 'center' }}>
              <div style={{
                fontSize: '2.5rem', fontWeight: 900, fontFamily: "'Outfit', sans-serif",
                background: 'linear-gradient(135deg, #6366f1, #a855f7)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
              }}>{value}</div>
              <div style={{ color: '#64748b', fontSize: '0.9rem', marginTop: '4px' }}>{label}</div>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* ── Features ──────────────────────────────────────────────────────── */}
      <section style={{ padding: '80px 32px', maxWidth: '1200px', margin: '0 auto' }}>
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}>
          <motion.div variants={fadeUp} style={{ textAlign: 'center', marginBottom: '60px' }}>
            <h2 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '16px', fontFamily: "'Outfit', sans-serif" }}>
              Everything You Need for{' '}
              <span style={{
                background: 'linear-gradient(135deg, #6366f1, #a855f7)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
              }}>Professional Data Analysis</span>
            </h2>
            <p style={{ color: '#64748b', fontSize: '1.1rem', maxWidth: '600px', margin: '0 auto' }}>
              From raw data to actionable insights in minutes. No coding required.
            </p>
          </motion.div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px' }}>
            {FEATURES.map(({ icon: Icon, title, description, color }) => (
              <motion.div
                key={title}
                variants={fadeUp}
                whileHover={{ y: -4, borderColor: color }}
                style={{
                  background: '#1a1d27', border: '1px solid #2d2f3e', borderRadius: '16px',
                  padding: '24px', cursor: 'default', transition: 'all 0.3s ease',
                }}
              >
                <div style={{
                  width: '48px', height: '48px', borderRadius: '12px', marginBottom: '16px',
                  background: `${color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  border: `1px solid ${color}40`,
                }}>
                  <Icon size={24} color={color} />
                </div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '8px', color: '#e2e8f0' }}>{title}</h3>
                <p style={{ fontSize: '0.875rem', color: '#64748b', lineHeight: 1.6 }}>{description}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* ── Testimonials ──────────────────────────────────────────────────── */}
      <section style={{ padding: '80px 32px', background: '#0d1020' }}>
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <motion.div variants={fadeUp} style={{ textAlign: 'center', marginBottom: '60px' }}>
            <h2 style={{ fontSize: '2.2rem', fontWeight: 800, fontFamily: "'Outfit', sans-serif", marginBottom: '12px' }}>
              Loved by Data Professionals
            </h2>
            <p style={{ color: '#64748b' }}>Join thousands of analysts, scientists, and engineers.</p>
          </motion.div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
            {TESTIMONIALS.map(({ name, role, avatar, text, rating }) => (
              <motion.div
                key={name}
                variants={fadeUp}
                whileHover={{ y: -4 }}
                style={{
                  background: '#1a1d27', border: '1px solid #2d2f3e', borderRadius: '16px', padding: '28px',
                }}
              >
                <div style={{ display: 'flex', gap: '4px', marginBottom: '16px' }}>
                  {Array.from({ length: rating }).map((_, i) => (
                    <Star key={i} size={16} fill="#f59e0b" color="#f59e0b" />
                  ))}
                </div>
                <p style={{ color: '#cbd5e1', lineHeight: 1.7, marginBottom: '20px', fontStyle: 'italic' }}>"{text}"</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '42px', height: '42px', borderRadius: '50%',
                    background: 'linear-gradient(135deg, #6366f1, #a855f7)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.85rem', fontWeight: 700, color: 'white', flexShrink: 0,
                  }}>{avatar}</div>
                  <div>
                    <div style={{ fontWeight: 600, color: '#e2e8f0', fontSize: '0.9rem' }}>{name}</div>
                    <div style={{ color: '#64748b', fontSize: '0.8rem' }}>{role}</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* ── CTA ───────────────────────────────────────────────────────────── */}
      <section style={{ padding: '100px 32px', textAlign: 'center' }}>
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}>
          <motion.div variants={fadeUp}>
            <div style={{
              maxWidth: '700px', margin: '0 auto', padding: '60px 40px', borderRadius: '28px',
              background: 'linear-gradient(135deg, rgba(99,102,241,0.15) 0%, rgba(139,92,246,0.1) 100%)',
              border: '1px solid rgba(99,102,241,0.3)',
              boxShadow: '0 0 60px rgba(99,102,241,0.1)',
            }}>
              <Brain size={56} color="#6366f1" style={{ marginBottom: '24px' }} />
              <h2 style={{ fontSize: '2.2rem', fontWeight: 800, fontFamily: "'Outfit', sans-serif", marginBottom: '16px' }}>
                Ready to Transform Your Data?
              </h2>
              <p style={{ color: '#94a3b8', marginBottom: '32px', fontSize: '1.05rem', lineHeight: 1.7 }}>
                Upload your first dataset for free. No account needed.
                Get professional insights in under 60 seconds.
              </p>
              <Link
                to={token ? "/dashboard/upload" : "#"}
                onClick={(e) => handleCTAClick(e, '/dashboard/upload')}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '10px',
                  padding: '16px 40px', borderRadius: '14px', fontWeight: 700, fontSize: '1.05rem',
                  background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: 'white',
                  textDecoration: 'none', boxShadow: '0 0 40px rgba(99,102,241,0.5)',
                }}
              >
                <Upload size={20} /> Upload Your Dataset Now
              </Link>
            </div>
          </motion.div>
        </motion.div>
      </section>

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <footer style={{
        borderTop: '1px solid #1e2130', padding: '40px 32px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <img src="/logo.jpg" alt="Logo" style={{ width: 20, height: 20, borderRadius: '6px', objectFit: 'cover', mixBlendMode: 'screen' }} />
          <span style={{ fontWeight: 700, color: '#e2e8f0' }}>Infinitics AI</span>
          <span style={{ color: '#374151', margin: '0 8px' }}>|</span>
          <span style={{ color: '#64748b', fontSize: '0.85rem' }}>Upload Your Dataset. Get Professional Insights Instantly.</span>
        </div>
        <div style={{ display: 'flex', gap: '24px' }}>
          {[
            { to: '/dashboard', label: 'Dashboard' },
            { to: '/dashboard/upload', label: 'Upload' },
            { to: '/dashboard/ai-insights', label: 'AI Insights' },
          ].map(({ to, label }) => (
            <Link
              key={label}
              to={token ? to : "#"}
              onClick={(e) => handleCTAClick(e, to)}
              style={{ color: '#64748b', textDecoration: 'none', fontSize: '0.875rem', transition: 'color 0.2s' }}
              onMouseEnter={e => (e.currentTarget.style.color = '#818cf8')}
              onMouseLeave={e => (e.currentTarget.style.color = '#64748b')}
            >
              {label}
            </Link>
          ))}
        </div>
        <p style={{ color: '#374151', fontSize: '0.8rem' }}>
          © 2024 Infinitics AI. Built with FastAPI + React + ❤️
        </p>
      </footer>

      {/* Login / Registration Modal */}
      <AnimatePresence>
        {showAuthModal && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 1000,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '24px',
            }}
          >
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAuthModal(false)}
              style={{
                position: 'absolute',
                inset: 0,
                background: 'rgba(15, 17, 23, 0.82)',
                backdropFilter: 'blur(12px)',
              }}
            />

            {/* Modal Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              style={{
                position: 'relative',
                background: '#1a1d27',
                border: '1px solid #2d2f3e',
                borderRadius: '20px',
                width: '100%',
                maxWidth: '460px',
                padding: '32px',
                boxShadow: '0 25px 60px rgba(0, 0, 0, 0.65)',
                zIndex: 1001,
              }}
            >
              {/* Close Button */}
              <button
                onClick={() => setShowAuthModal(false)}
                style={{
                  position: 'absolute',
                  top: '20px',
                  right: '20px',
                  background: 'transparent',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  padding: '4px',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                onMouseEnter={(e) => e.currentTarget.style.color = '#e2e8f0'}
                onMouseLeave={(e) => e.currentTarget.style.color = '#94a3b8'}
              >
                <X size={18} />
              </button>

              <AuthForm
                initialMode={authInitialMode}
                onSuccess={() => setShowAuthModal(false)}
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
