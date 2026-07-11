import React from 'react';
import { motion } from 'framer-motion';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
  fullScreen?: boolean;
}

const sizeMap = {
  sm: 24,
  md: 40,
  lg: 60,
};

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  text,
  fullScreen = false,
}) => {
  const px = sizeMap[size];

  const spinner = (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 14,
      }}
    >
      {/* Outer ring */}
      <div style={{ position: 'relative', width: px, height: px }}>
        {/* Track */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '50%',
            border: `${size === 'sm' ? 2 : 3}px solid rgba(99,102,241,0.15)`,
          }}
        />
        {/* Animated arc */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1.1, repeat: Infinity, ease: 'linear' }}
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '50%',
            border: `${size === 'sm' ? 2 : 3}px solid transparent`,
            borderTopColor: '#6366f1',
            borderRightColor: '#8b5cf6',
          }}
        />
        {/* Inner pulse */}
        <motion.div
          animate={{ scale: [0.6, 1, 0.6], opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            position: 'absolute',
            inset: '25%',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #6366f1, #a855f7)',
            boxShadow: '0 0 12px rgba(99,102,241,0.6)',
          }}
        />
      </div>

      {/* Text */}
      {text && (
        <motion.p
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            margin: 0,
            fontSize: size === 'sm' ? 11 : size === 'lg' ? 15 : 13,
            fontWeight: 500,
            color: 'rgba(148,163,184,0.7)',
            letterSpacing: '0.02em',
          }}
        >
          {text}
        </motion.p>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{
          position: 'fixed',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'rgba(15,17,23,0.85)',
          backdropFilter: 'blur(8px)',
          zIndex: 9999,
        }}
      >
        {spinner}
      </motion.div>
    );
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
      }}
    >
      {spinner}
    </div>
  );
};

export default LoadingSpinner;
