/**
 * HomePage — Infinitics AI
 * Comprehensive Data Analytics & Machine Learning Platform
 * Showcases platform details with Login/Register CTA buttons that redirect to the auth pages.
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import {
  Brain, BarChart2, Upload, Zap, Shield, TrendingUp,
  ChevronRight, Star, Play, Database, Sparkles,
  PieChart, GitMerge, Activity, X, Lock, CheckCircle, ArrowUpRight, UserPlus
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { useIsMobile } from '../hooks/useMediaQuery';
import InteractiveBackground from '../components/layout/InteractiveBackground';

const fadeUp: any = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
};

const stagger: any = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

const FEATURES = [
  { icon: Upload, title: 'Instant Dataset Ingestion', description: 'Drag & drop CSV or Excel files. Automated type inference, shape detection, and real-time schema validation.', color: '#6366f1' },
  { icon: Brain, title: 'Gemini AI Insights', description: 'Executive summaries, actionable business recommendations, and natural language Q&A against your data.', color: '#8b5cf6' },
  { icon: BarChart2, title: '20+ Chart Visualizations', description: 'Interactive histograms, heatmaps, 3D scatter, violin plots, treemaps, and boxplots powered by Plotly.', color: '#a855f7' },
  { icon: Zap, title: 'Automated EDA Engine', description: 'Automated distribution analysis, Pearson & Spearman correlations, missing value maps, and outlier detection.', color: '#ec4899' },
  { icon: TrendingUp, title: 'AutoML & Model Comparison', description: 'Auto-detect regression vs classification. Train 15+ ML models, compare metrics, ROC curves, and feature importance.', color: '#14b8a6' },
  { icon: Shield, title: 'Data Cleaning & Transformation', description: 'One-click imputation, Z-score/IQR outlier handling, one-hot encoding, and feature scaling.', color: '#f59e0b' },
  { icon: GitMerge, title: 'Feature Engineering Studio', description: 'PCA dimensionality reduction, polynomial features, variance thresholding, and mutual information scoring.', color: '#10b981' },
  { icon: Activity, title: 'Statistical Hypothesis Suite', description: 'Student’s T-tests, ANOVA, Chi-square tests of independence, Shapiro-Wilk normality tests, and confidence intervals.', color: '#3b82f6' },
];

const STATS = [
  { value: '50K+', label: 'Datasets Analyzed' },
  { value: '20+', label: 'Chart Types' },
  { value: '15+', label: 'ML Algorithms' },
  { value: '99.9%', label: 'Platform Uptime' },
];

const TESTIMONIALS = [
  {
    name: 'Dr. Sarah Chen',
    role: 'Lead Data Scientist @ FinTech Corp',
    avatar: 'SC',
    text: 'Infinitics AI replaced my entire manual EDA workflow. What used to take 3 hours now takes under 2 minutes. The auto-generated executive briefings are extraordinarily accurate.',
    rating: 5,
  },
  {
    name: 'Marcus Rodriguez',
    role: 'Senior Business Analyst @ RetailMax',
    avatar: 'MR',
    text: 'I upload our weekly sales datasets and immediately get presentation-ready charts with executive takeaways. It bridged the technical gap for our entire analytics department.',
    rating: 5,
  },
  {
    name: 'Priya Patel',
    role: 'ML Engineer @ AI Studio',
    avatar: 'PP',
    text: 'The ML module is brilliant. It detects task types, trains multiple classifiers/regressors simultaneously, and gives me feature importance rankings right in the browser.',
    rating: 5,
  },
];

export default function HomePage() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [mousePos, setMousePos] = useState({ x: -1000, y: -1000 });
  const { token, user } = useStore();

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--bg-app)',
        color: 'var(--text-primary)',
        fontFamily: "'Inter', sans-serif",
        position: 'relative',
        overflowX: 'hidden',
      }}
    >
      {/* Dynamic Cursor Glowing Orbit Field */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          background: `radial-gradient(600px circle at ${mousePos.x}px ${mousePos.y}px, rgba(99, 102, 241, 0.08) 0%, rgba(168, 85, 247, 0.03) 45%, transparent 100%)`,
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      {/* Interactive Background Canvas */}
      <InteractiveBackground />

      {/* ── Top Navigation Bar ─────────────────────────────────────────────── */}
      <nav
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 100,
          background: 'var(--bg-header)',
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid var(--border-default)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: isMobile ? '0 16px' : '0 32px',
          height: '68px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <img
            src="/logo.jpg"
            alt="Logo"
            style={{
              width: 36,
              height: 36,
              borderRadius: '10px',
              objectFit: 'cover',
              mixBlendMode: 'normal',
            }}
          />
          <div>
            <span style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
              Infinitics AI
            </span>
            <span
              style={{
                marginLeft: '8px',
                fontSize: '10px',
                fontWeight: 700,
                padding: '2px 6px',
                borderRadius: '6px',
                background: 'rgba(99, 102, 241, 0.2)',
                color: '#a5b4fc',
                border: '1px solid rgba(99, 102, 241, 0.3)',
              }}
            >
              v1.0 Enterprise
            </span>
          </div>
        </div>

        {/* Quick Nav Items */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <Link
            to="/admin/login"
            style={{
              fontSize: '13px',
              fontWeight: 600,
              color: '#c084fc',
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '8px',
              background: 'rgba(168, 85, 247, 0.08)',
              border: '1px solid rgba(168, 85, 247, 0.2)',
            }}
          >
            <Shield size={14} /> Admin Portal
          </Link>

          <Link
            to={token ? '/dashboard/upload' : '/login'}
            style={{
              padding: '8px 18px',
              borderRadius: '10px',
              fontWeight: 700,
              fontSize: '13px',
              background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
              color: 'white',
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 4px 14px rgba(79,70,229,0.35)',
            }}
          >
            {token ? 'Open Workspace' : 'Sign In'} <ChevronRight size={15} />
          </Link>
        </div>
      </nav>

      {/* ── Hero Section (with Login/Register CTA Panel) ───────────────────── */}
      <section
        style={{
          paddingTop: '110px',
          paddingBottom: '70px',
          position: 'relative',
          overflow: 'hidden',
          minHeight: 'calc(100vh - 68px)',
          display: 'flex',
          alignItems: 'center',
        }}
      >
        {/* Ambient Glows */}
        <div
          style={{
            position: 'absolute',
            top: '15%',
            left: '20%',
            width: '500px',
            height: '400px',
            background: 'radial-gradient(circle, rgba(99,102,241,0.14) 0%, transparent 70%)',
            filter: 'blur(70px)',
            pointerEvents: 'none',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: '10%',
            right: '15%',
            width: '450px',
            height: '350px',
            background: 'radial-gradient(circle, rgba(168,85,247,0.12) 0%, transparent 70%)',
            filter: 'blur(60px)',
            pointerEvents: 'none',
          }}
        />

        <div
          style={{
            maxWidth: '1280px',
            margin: '0 auto',
            padding: isMobile ? '0 16px' : '0 32px',
            width: '100%',
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(360px, 1fr))',
            gap: isMobile ? '32px' : '48px',
            alignItems: 'center',
            position: 'relative',
            zIndex: 1,
          }}
        >
          {/* Left Column: Hero Content & Capabilities */}
          <motion.div initial="hidden" animate="visible" variants={stagger}>
            <motion.div variants={fadeUp}>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '6px 16px',
                  borderRadius: '20px',
                  marginBottom: '20px',
                  background: 'rgba(99,102,241,0.12)',
                  border: '1px solid rgba(99,102,241,0.3)',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  color: '#a5b4fc',
                  letterSpacing: '0.04em',
                }}
              >
                <Sparkles size={13} color="#818cf8" />
                ENTERPRISE AI DATA ANALYTICS & ML
              </span>
            </motion.div>

            <motion.h1
              variants={fadeUp}
              style={{
                fontSize: 'clamp(2.2rem, 4.5vw, 3.8rem)',
                fontWeight: 900,
                lineHeight: 1.15,
                marginBottom: '20px',
                fontFamily: "'Outfit', sans-serif",
                letterSpacing: '-0.02em',
              }}
            >
              Upload Data.{' '}
              <span
                style={{
                  background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 50%, #ec4899 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                Get AI Insights
              </span>{' '}
              & Train ML Models Instantly.
            </motion.h1>

            <motion.p
              variants={fadeUp}
              style={{
                fontSize: '1.05rem',
                color: 'var(--text-secondary)',
                maxWidth: '560px',
                lineHeight: 1.7,
                marginBottom: '28px',
              }}
            >
              A unified analytics suite combining automated EDA, interactive Plotly visualizations,
              machine learning model comparisons, and enterprise user & administrative governance.
            </motion.p>

            {/* Feature Pills */}
            <motion.div
              variants={fadeUp}
              style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '32px' }}
            >
              {[
                { icon: Zap, label: 'Auto EDA' },
                { icon: BarChart2, label: '20+ Charts' },
                { icon: TrendingUp, label: '15+ ML Models' },
                { icon: Brain, label: 'Gemini Briefings' },
                { icon: Shield, label: 'Admin Telemetry' },
              ].map(({ icon: Icon, label }) => (
                <span
                  key={label}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    padding: '6px 12px',
                    borderRadius: '8px',
                    background: 'var(--bg-hover)',
                    border: '1px solid var(--border-default)',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: 'var(--text-secondary)',
                  }}
                >
                  <Icon size={13} color="var(--accent-primary)" /> {label}
                </span>
              ))}
            </motion.div>

            {/* Quick Metrics Bar */}
            <motion.div
              variants={fadeUp}
              style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? 'repeat(3, 1fr)' : 'repeat(3, 1fr)',
                gap: '12px',
                maxWidth: '500px',
              }}
            >
              {[
                { label: 'Ingestion Engine', val: '< 2.0s', sub: 'CSV & Excel' },
                { label: 'Model Benchmarking', val: '15+ Algos', sub: 'Auto-Tuned' },
                { label: 'Security & Auth', val: 'Enterprise', sub: 'RBAC & Audit' },
              ].map(({ label, val, sub }) => (
                <div
                  key={label}
                  style={{
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-default)',
                    borderRadius: '12px',
                    padding: '12px 14px',
                    boxShadow: 'var(--shadow-sm)',
                  }}
                >
                  <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)' }}>{val}</div>
                  <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--accent-primary)', marginTop: '2px' }}>{label}</div>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{sub}</div>
                </div>
              ))}
            </motion.div>
          </motion.div>

          {/* Right Column: Login / Register CTA Panel */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            style={{ display: 'flex', justifyContent: 'center' }}
          >
            <div
              className="glow-card"
              style={{
                backdropFilter: 'blur(24px)',
                borderRadius: '24px',
                padding: isMobile ? '24px 20px' : '32px',
                boxShadow: 'var(--shadow-xl)',
                maxWidth: '420px',
                width: '100%',
                textAlign: 'center',
                position: 'relative',
                zIndex: 10,
                boxSizing: 'border-box',
              }}
            >
              {/* Icon */}
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  margin: '0 auto 16px',
                  borderRadius: '18px',
                  background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 8px 32px rgba(99,102,241,0.4)',
                }}
              >
                <Zap size={30} color="white" />
              </div>

              <h3 style={{ margin: '0 0 8px', fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)' }}>
                {token && user ? 'Welcome Back!' : 'Get Started Today'}
              </h3>
              <p style={{ margin: '0 0 24px', fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                {token && user
                  ? 'Your workspace is ready. Continue analyzing, visualizing, and training ML models.'
                  : 'Sign in to access automated EDA, 20+ charts, AI insights & 15+ ML models. Create a free account in seconds.'}
              </p>

              {/* Primary CTA */}
              <Link
                to={token ? '/dashboard/upload' : '/login'}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  width: '100%',
                  padding: '13px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                  color: 'white',
                  fontSize: '15px',
                  fontWeight: 700,
                  textDecoration: 'none',
                  boxShadow: '0 6px 20px rgba(79,70,229,0.45)',
                  transition: 'all 0.2s ease',
                  marginBottom: '12px',
                }}
              >
                {token && user ? 'Open Workspace' : 'Sign In to Workspace'}
                <ChevronRight size={18} />
              </Link>

              {/* Secondary CTA */}
              {!(token && user) && (
                <Link
                  to="/register"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    width: '100%',
                    padding: '13px',
                    borderRadius: '12px',
                    background: 'var(--bg-hover)',
                    border: '1px solid var(--border-default)',
                    color: 'var(--text-primary)',
                    fontSize: '15px',
                    fontWeight: 600,
                    textDecoration: 'none',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <UserPlus size={18} color="var(--accent-primary)" />
                  Create Free Account
                </Link>
              )}

              {/* Divider */}
              <div style={{ position: 'relative', textAlign: 'center', margin: '22px 0 16px' }}>
                <div style={{ borderTop: '1px solid var(--border-default)', position: 'absolute', top: '50%', left: 0, right: 0 }} />
                <span style={{ background: 'var(--bg-surface)', padding: '0 10px', fontSize: '11px', color: 'var(--text-muted)', position: 'relative', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Quick Launchers
                </span>
              </div>

              {/* Quick Launcher Buttons */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <Link
                  to="/dashboard/upload"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    padding: '10px',
                    borderRadius: '10px',
                    background: 'var(--bg-hover)',
                    border: '1px solid var(--border-default)',
                    color: 'var(--text-primary)',
                    fontSize: '12px',
                    fontWeight: 600,
                    textDecoration: 'none',
                  }}
                >
                  <Database size={14} color="var(--accent-cyan)" /> Analyst
                </Link>
                <Link
                  to="/admin/login"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    padding: '10px',
                    borderRadius: '10px',
                    background: 'var(--bg-hover)',
                    border: '1px solid var(--border-default)',
                    color: 'var(--text-primary)',
                    fontSize: '12px',
                    fontWeight: 600,
                    textDecoration: 'none',
                  }}
                >
                  <Shield size={14} color="var(--accent-indigo)" /> Admin
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Interactive Capability Showcase Grid ───────────────────────────── */}
      <section
        style={{
          padding: isMobile ? '40px 16px 60px' : '40px 32px 80px',
          maxWidth: '1280px',
          margin: '0 auto',
          position: 'relative',
          zIndex: 1,
        }}
      >
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}>
          <div style={{ textAlign: 'center', marginBottom: '40px' }}>
            <h2 style={{ fontSize: isMobile ? '1.6rem' : '2.2rem', fontWeight: 800, fontFamily: "'Outfit', sans-serif", margin: '0 0 12px' }}>
              Explore Platform Capabilities
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: 0 }}>
              Direct access to all analytical modules from one unified workspace
            </p>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '20px',
            }}
          >
            {FEATURES.map(({ icon: Icon, title, description, color }) => (
              <motion.div
                key={title}
                variants={fadeUp}
                whileHover={{ y: -4 }}
                className="glow-card"
                style={{
                  backdropFilter: 'blur(12px)',
                  borderRadius: '16px',
                  padding: '24px',
                  transition: 'all 0.25s ease',
                  boxShadow: 'var(--shadow-sm)',
                }}
              >
                <div
                  style={{
                    width: '46px',
                    height: '46px',
                    borderRadius: '12px',
                    marginBottom: '16px',
                    background: `${color}18`,
                    border: `1px solid ${color}35`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Icon size={22} color={color} />
                </div>
                <h3 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 8px', color: 'var(--text-primary)' }}>
                  {title}
                </h3>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
                  {description}
                </p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* ── Testimonials ──────────────────────────────────────────────────── */}
      <section style={{ padding: isMobile ? '60px 16px' : '80px 32px', background: 'var(--bg-app)', borderTop: '1px solid var(--border-default)' }}>
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <motion.div variants={fadeUp} style={{ textAlign: 'center', marginBottom: '48px' }}>
            <h2 style={{ fontSize: isMobile ? '1.6rem' : '2.2rem', fontWeight: 800, fontFamily: "'Outfit', sans-serif", marginBottom: '12px' }}>
              Trusted by Data Teams Worldwide
            </h2>
            <p style={{ color: 'var(--text-secondary)' }}>From independent analysts to high-scale enterprise departments.</p>
          </motion.div>

          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
            {TESTIMONIALS.map(({ name, role, avatar, text, rating }) => (
              <motion.div
                key={name}
                variants={fadeUp}
                whileHover={{ y: -4 }}
                className="glow-card"
                style={{
                  borderRadius: '16px',
                  padding: '26px',
                  boxShadow: 'var(--shadow-sm)',
                }}
              >
                <div style={{ display: 'flex', gap: '4px', marginBottom: '14px' }}>
                  {Array.from({ length: rating }).map((_, i) => (
                    <Star key={i} size={15} fill="#f59e0b" color="#f59e0b" />
                  ))}
                </div>
                <p style={{ color: 'var(--text-secondary)', lineHeight: 1.65, marginBottom: '18px', fontStyle: 'italic', fontSize: '13px' }}>
                  "{text}"
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #6366f1, #a855f7)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.85rem',
                      fontWeight: 700,
                      color: 'white',
                      flexShrink: 0,
                    }}
                  >
                    {avatar}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '14px' }}>{name}</div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>{role}</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <footer
        style={{
          borderTop: '1px solid var(--border-default)',
          padding: isMobile ? '24px 16px' : '36px 32px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: isMobile ? '12px' : '16px',
          maxWidth: '1280px',
          margin: '0 auto',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <img src="/logo.jpg" alt="Logo" style={{ width: 22, height: 22, borderRadius: '6px', objectFit: 'cover', mixBlendMode: 'normal' }} />
          <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '14px' }}>Infinitics AI</span>
          {!isMobile && <span style={{ color: 'var(--border-strong)', margin: '0 8px' }}>|</span>}
          <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>AI-Powered Automated Data Analytics & Machine Learning</span>
        </div>

        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
          <Link to="/login" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '13px' }}>User Portal</Link>
          <Link to="/admin/login" style={{ color: 'var(--accent-primary)', textDecoration: 'none', fontSize: '13px', fontWeight: 600 }}>Admin Center</Link>
          <Link to="/register" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '13px' }}>Register</Link>
        </div>

        <p style={{ color: 'var(--text-muted)', fontSize: '12px', margin: 0, width: isMobile ? '100%' : 'auto', textAlign: isMobile ? 'center' : 'left' }}>
          © {new Date().getFullYear()} Infinitics AI Platform. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
