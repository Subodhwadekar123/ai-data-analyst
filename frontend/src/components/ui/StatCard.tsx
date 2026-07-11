import React, { useEffect, useRef } from 'react';
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
} from 'framer-motion';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color?: string;
  subtitle?: string;
  trend?: number;
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon,
  color = '#6366f1',
  subtitle,
  trend,
}) => {
  const isNumeric = typeof value === 'number';
  const motionVal = useMotionValue(0);
  const spring = useSpring(motionVal, { damping: 30, stiffness: 150 });
  const displayVal = useTransform(spring, (v) =>
    isNumeric ? Math.round(v).toLocaleString() : value
  );

  const hasAnimated = useRef(false);

  useEffect(() => {
    if (isNumeric && !hasAnimated.current) {
      hasAnimated.current = true;
      motionVal.set(0);
      setTimeout(() => {
        motionVal.set(value as number);
      }, 100);
    }
  }, [isNumeric, value, motionVal]);

  const trendColor =
    trend !== undefined ? (trend >= 0 ? '#22c55e' : '#ef4444') : undefined;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4, scale: 1.01 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="metric-card"
      style={{
        position: 'relative',
        padding: '20px 22px',
        borderRadius: 14,
        backgroundColor: '#1a1d27',
        border: '1px solid rgba(99,102,241,0.15)',
        overflow: 'hidden',
        cursor: 'default',
        transition: 'border-color 0.25s, box-shadow 0.25s',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.borderColor = `${color}55`;
        (e.currentTarget as HTMLDivElement).style.boxShadow = `0 0 28px ${color}22`;
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.borderColor =
          'rgba(99,102,241,0.15)';
        (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
      }}
    >
      {/* Gradient background accent */}
      <div
        style={{
          position: 'absolute',
          top: -40,
          right: -40,
          width: 120,
          height: 120,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${color}22 0%, transparent 70%)`,
          pointerEvents: 'none',
        }}
      />

      {/* Icon + Title row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          marginBottom: 16,
        }}
      >
        <div>
          <div
            style={{
              fontSize: 12,
              fontWeight: 500,
              color: 'rgba(148,163,184,0.65)',
              textTransform: 'uppercase',
              letterSpacing: '0.07em',
              marginBottom: 4,
            }}
          >
            {title}
          </div>
          {subtitle && (
            <div
              style={{
                fontSize: 11,
                color: 'rgba(148,163,184,0.4)',
              }}
            >
              {subtitle}
            </div>
          )}
        </div>
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            background: `linear-gradient(135deg, ${color}30, ${color}15)`,
            border: `1px solid ${color}35`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color,
            flexShrink: 0,
          }}
        >
          {icon}
        </div>
      </div>

      {/* Value */}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10 }}>
        <div
          style={{
            fontSize: 28,
            fontWeight: 800,
            color: '#f1f5f9',
            letterSpacing: '-0.5px',
            lineHeight: 1,
          }}
        >
          {isNumeric ? (
            <motion.span>{displayVal}</motion.span>
          ) : (
            <span>{value}</span>
          )}
        </div>

        {trend !== undefined && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 3,
              fontSize: 12,
              fontWeight: 600,
              color: trendColor,
              paddingBottom: 2,
            }}
          >
            {trend >= 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
            {Math.abs(trend)}%
          </div>
        )}
      </div>

      {/* Bottom gradient line */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: 2,
          background: `linear-gradient(90deg, ${color}, transparent)`,
          opacity: 0.5,
        }}
      />
    </motion.div>
  );
};

export default StatCard;
