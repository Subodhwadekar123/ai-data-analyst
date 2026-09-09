import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import Sidebar from './Sidebar';
import Header from './Header';
import AIChatWidget from '../chat/AIChatWidget';
import InteractiveBackground from './InteractiveBackground';
import { useStore } from '../../store/useStore';
import { useIsMobile } from '../../hooks/useMediaQuery';
import { listDatasets, getDataset } from '../../services/api';
import ErrorBoundary from '../ui/ErrorBoundary';

const DashboardLayout: React.FC = () => {
  const { sidebarCollapsed, datasets, setDatasets } = useStore();
  const location = useLocation();
  const isMobile = useIsMobile();
  const [mobileNavOpen, setMobileNavOpen] = React.useState(false);
  const didSync = React.useRef(false);

  React.useEffect(() => {
    if (didSync.current) return;
    didSync.current = true;

    const syncDatasets = async () => {
      // Always honor what the user has already (persisted across reloads).
      const localIds = new Set(datasets.map((d) => d.id));
      let backendList: any[] = [];
      try {
        const res = await listDatasets();
        backendList = res.datasets || [];
      } catch (err) {
        console.error('Failed to sync datasets list from backend', err);
        // Keep persisted datasets — do NOT clear them on a network/auth error.
        return;
      }

      const merged = [...datasets];
      // Load full details for backend items missing from local store
      const missing = backendList.filter((item) => !localIds.has(item.id));
      for (const item of missing) {
        try {
          const fullDetails = await getDataset(item.id);
          const mapped: any = {
            id: fullDetails.dataset_id ?? fullDetails.id ?? item.id,
            filename: fullDetails.filename,
            file_size_mb: item.file_size_mb,
            file_type: fullDetails.file_type,
            dataset_info: fullDetails.dataset_info,
            preview: fullDetails.preview,
            uploaded_at: fullDetails.created_at ?? fullDetails.uploaded_at,
          };
          merged.push(mapped);
        } catch (err) {
          console.error(`Failed to fetch details for dataset ${item.id}`, err);
        }
      }

      // Always publish once — preserves active selection by id, defaults to first.
      if (merged.length > 0) {
        setDatasets(merged);
      }
    };
    syncDatasets();
  }, [datasets, setDatasets]); // didSync ref guard keeps this a true one-time mount sync

  // Close mobile nav on route change
  React.useEffect(() => {
    setMobileNavOpen(false);
  }, [location.pathname]);

  // Prevent body scroll when mobile nav is open
  React.useEffect(() => {
    if (mobileNavOpen && isMobile) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [mobileNavOpen, isMobile]);

  const mainMarginLeft = isMobile ? 0 : (sidebarCollapsed ? 64 : 230);

  return (
    <div
      style={{
        display: 'flex',
        minHeight: '100vh',
        backgroundColor: 'var(--bg-app)',
        color: 'var(--text-primary)',
        fontFamily: "var(--font-family-sans)",
        position: 'relative',
        overflow: 'hidden',
        transition: 'background-color 0.2s ease, color 0.2s ease',
      }}
    >
      {/* Interactive Background Canvas */}
      <InteractiveBackground />

      {/* Mobile Sidebar Backdrop */}
      {isMobile && (
        <div
          className={`sidebar-backdrop ${mobileNavOpen ? 'open' : ''}`}
          onClick={() => setMobileNavOpen(false)}
          style={{ cursor: 'pointer' }}
        />
      )}

      {/* Sidebar Navigation */}
      <Sidebar mobileOpen={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />

      {/* Main Content Workspace */}
      <motion.div
        animate={{ marginLeft: mainMarginLeft }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100vh',
          position: 'relative',
          zIndex: 1,
          overflow: 'hidden',
          width: isMobile ? '100%' : undefined,
        }}
      >
        {/* Header Bar */}
        <Header onMenuToggle={() => setMobileNavOpen(!mobileNavOpen)} />

        {/* Floating AI Assistant (global overlay) */}
        <AIChatWidget />

        {/* Page Main Content */}
        <main
          style={{
            flex: 1,
            padding: isMobile ? '16px 14px' : '24px 28px',
            overflowY: 'auto',
            overflowX: 'hidden',
          }}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              style={{ minHeight: '100%' }}
            >
              <ErrorBoundary key={location.pathname}>
                <Outlet />
              </ErrorBoundary>
            </motion.div>
          </AnimatePresence>
        </main>
      </motion.div>
    </div>
  );
};

export default DashboardLayout;
