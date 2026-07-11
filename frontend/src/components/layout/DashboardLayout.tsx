import React from 'react';
import { Outlet } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import Sidebar from './Sidebar';
import Header from './Header';
import { useStore } from '../../store/useStore';
import { listDatasets, getDataset } from '../../services/api';

const DashboardLayout: React.FC = () => {
  const { sidebarCollapsed, datasets, activeDataset, addDataset, setActiveDataset } = useStore();
  const [mousePos, setMousePos] = React.useState({ x: -1000, y: -1000 }); // start offscreen

  React.useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  React.useEffect(() => {
    const syncDatasets = async () => {
      try {
        const res = await listDatasets();
        const backendList = res.datasets || [];
        
        // Load details for datasets not present in local store
        for (const item of backendList) {
          const alreadyStored = datasets.some(d => d.id === item.id);
          if (!alreadyStored) {
            try {
              const fullDetails = await getDataset(item.id);
              const mapped: any = {
                id: fullDetails.dataset_id,
                filename: fullDetails.filename,
                file_size_mb: item.file_size_mb,
                file_type: fullDetails.file_type,
                dataset_info: fullDetails.dataset_info,
                preview: fullDetails.preview,
                uploaded_at: fullDetails.created_at,
              };
              addDataset(mapped);
            } catch (err) {
              console.error(`Failed to fetch details for dataset ${item.id}`, err);
            }
          }
        }

        // Set active dataset if not set and datasets are available
        if (!activeDataset && backendList.length > 0) {
          try {
            const firstId = backendList[0].id;
            const fullDetails = await getDataset(firstId);
            const mapped: any = {
              id: fullDetails.dataset_id,
              filename: fullDetails.filename,
              file_size_mb: backendList[0].file_size_mb,
              file_type: fullDetails.file_type,
              dataset_info: fullDetails.dataset_info,
              preview: fullDetails.preview,
              uploaded_at: fullDetails.created_at,
            };
            setActiveDataset(mapped);
          } catch (err) {
            console.error("Failed to auto-set active dataset", err);
          }
        }
      } catch (err) {
        console.error("Failed to sync datasets list from backend", err);
      }
    };
    syncDatasets();
  }, []); // Run once on layout mount

  const mainMarginLeft = sidebarCollapsed ? 68 : 240;

  return (
    <div
      style={{
        display: 'flex',
        minHeight: '100vh',
        backgroundColor: '#0f1117',
        color: '#e2e8f0',
        fontFamily: "'Inter', 'Outfit', sans-serif",
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Ambient background glows */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          pointerEvents: 'none',
          zIndex: 0,
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: '-20%',
            left: '-10%',
            width: '60%',
            height: '60%',
            background:
              'radial-gradient(circle, rgba(99,102,241,0.06) 0%, transparent 70%)',
            borderRadius: '50%',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: '-20%',
            right: '-10%',
            width: '50%',
            height: '50%',
            background:
              'radial-gradient(circle, rgba(168,85,247,0.05) 0%, transparent 70%)',
            borderRadius: '50%',
          }}
        />

        {/* Dynamic Cursor Glowing Orbit Field */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: `radial-gradient(450px circle at ${mousePos.x}px ${mousePos.y}px, rgba(99, 102, 241, 0.08) 0%, rgba(168, 85, 247, 0.03) 40%, transparent 100%)`,
            pointerEvents: 'none',
            transition: 'background 0.05s ease',
          }}
        />

        {/* Dynamic Interactive Dot Matrix Constellation */}
        <div
          className="constellation-matrix"
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='60' viewBox='0 0 60 60'%3E%3Ccircle cx='30' cy='30' r='6' fill='rgba%28168, 85, 247, 0.14%29' /%3E%3Ccircle cx='30' cy='30' r='2' fill='rgba%28168, 85, 247, 0.7%29' /%3E%3Ccircle cx='15' cy='15' r='1.5' fill='rgba%28168, 85, 247, 0.5%29' /%3E%3Ccircle cx='45' cy='45' r='1.5' fill='rgba%28168, 85, 247, 0.5%29' /%3E%3Ccircle cx='15' cy='45' r='1.5' fill='rgba%28168, 85, 247, 0.5%29' /%3E%3Ccircle cx='45' cy='15' r='1.5' fill='rgba%28168, 85, 247, 0.5%29' /%3E%3Cline x1='30' y1='30' x2='15' y2='15' stroke='rgba%28168, 85, 247, 0.22%29' stroke-width='0.8' /%3E%3Cline x1='30' y1='30' x2='45' y2='45' stroke='rgba%28168, 85, 247, 0.22%29' stroke-width='0.8' /%3E%3Cline x1='30' y1='30' x2='15' y2='45' stroke='rgba%28168, 85, 247, 0.22%29' stroke-width='0.8' /%3E%3Cline x1='30' y1='30' x2='45' y2='15' stroke='rgba%28168, 85, 247, 0.22%29' stroke-width='0.8' /%3E%3Cline x1='15' y1='15' x2='45' y2='15' stroke='rgba%28168, 85, 247, 0.14%29' stroke-width='0.6' stroke-dasharray='2,2' /%3E%3Cline x1='45' y1='15' x2='45' y2='45' stroke='rgba%28168, 85, 247, 0.14%29' stroke-width='0.6' stroke-dasharray='2,2' /%3E%3Cline x1='45' y1='45' x2='15' y2='45' stroke='rgba%28168, 85, 247, 0.14%29' stroke-width='0.6' stroke-dasharray='2,2' /%3E%3Cline x1='15' y1='45' x2='15' y2='15' stroke='rgba%28168, 85, 247, 0.14%29' stroke-width='0.6' stroke-dasharray='2,2' /%3E%3Cline x1='15' y1='15' x2='0' y2='0' stroke='rgba%28168, 85, 247, 0.12%29' stroke-width='0.6' /%3E%3Cline x1='45' y1='15' x2='60' y2='0' stroke='rgba%28168, 85, 247, 0.12%29' stroke-width='0.6' /%3E%3Cline x1='15' y1='45' x2='0' y2='60' stroke='rgba%28168, 85, 247, 0.12%29' stroke-width='0.6' /%3E%3Cline x1='45' y1='45' x2='60' y2='60' stroke='rgba%28168, 85, 247, 0.12%29' stroke-width='0.6' /%3E%3C/svg%3E")`,
            backgroundSize: '60px 60px',
            maskImage: `radial-gradient(280px circle at ${mousePos.x}px ${mousePos.y}px, black 30%, transparent 100%)`,
            WebkitMaskImage: `radial-gradient(280px circle at ${mousePos.x}px ${mousePos.y}px, black 30%, transparent 100%)`,
            pointerEvents: 'none',
          }}
        />
      </div>

      {/* Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
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
        }}
      >
        {/* Header */}
        <Header />

        {/* Page Content */}
        <main
          style={{
            flex: 1,
            padding: '24px',
            overflowY: 'auto',
            overflowX: 'hidden',
          }}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={window.location.pathname}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              style={{ minHeight: '100%' }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </motion.div>
    </div>
  );
};

export default DashboardLayout;
