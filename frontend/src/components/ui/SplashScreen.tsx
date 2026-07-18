import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Database, BrainCircuit, Activity } from 'lucide-react';

const SplashScreen: React.FC = () => {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0f1117',
        color: 'white',
        zIndex: 9999,
        overflow: 'hidden'
      }}
    >
      {/* Background glow effects */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '600px',
          height: '600px',
          background: 'radial-gradient(circle, rgba(99, 102, 241, 0.15) 0%, rgba(15, 17, 23, 0) 70%)',
          zIndex: 0
        }}
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1, ease: 'easeOut' }}
        style={{ zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}
      >
        {/* Animated Icon Cluster */}
        <div style={{ position: 'relative', width: '120px', height: '120px', marginBottom: '40px' }}>
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
            style={{ position: 'absolute', inset: 0, border: '2px dashed rgba(99, 102, 241, 0.3)', borderRadius: '50%' }}
          />
          
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5 }}
            style={{ position: 'absolute', top: '10px', left: '10px', color: '#6366f1' }}
          >
            <Database size={28} />
          </motion.div>
          
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.7 }}
            style={{ position: 'absolute', bottom: '10px', right: '10px', color: '#a855f7' }}
          >
            <Activity size={28} />
          </motion.div>

          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 1, type: 'spring' }}
            style={{ 
              position: 'absolute', 
              top: '50%', left: '50%', 
              transform: 'translate(-50%, -50%)',
              background: 'linear-gradient(135deg, #6366f1, #a855f7)',
              borderRadius: '50%',
              padding: '16px',
              boxShadow: '0 0 30px rgba(99, 102, 241, 0.5)'
            }}
          >
            <BrainCircuit size={40} color="white" />
          </motion.div>
        </div>

        {/* Text content */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2 }}
          style={{ fontSize: '2.5rem', fontWeight: 800, margin: '0 0 16px', letterSpacing: '-0.05em' }}
        >
          Infinitics AI
        </motion.h1>
        
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
          style={{ fontSize: '1.2rem', color: '#94a3b8', margin: '0 0 40px', display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <Sparkles size={18} color="#f59e0b" />
          Loading the fully automated website just for you...
        </motion.p>

        {/* Loading Bar */}
        <div style={{ width: '300px', height: '4px', background: '#1e293b', borderRadius: '4px', overflow: 'hidden' }}>
          <motion.div
            initial={{ width: '0%' }}
            animate={{ width: '100%' }}
            transition={{ duration: 9.5, ease: 'easeInOut' }}
            style={{ height: '100%', background: 'linear-gradient(90deg, #6366f1, #a855f7)' }}
          />
        </div>
      </motion.div>
    </div>
  );
};

export default SplashScreen;
