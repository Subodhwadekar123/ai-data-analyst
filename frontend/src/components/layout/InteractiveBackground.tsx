import React, { useRef, useEffect } from 'react';
import { useIsMobile } from '../../hooks/useMediaQuery';

interface Particle {
  x: number;
  y: number;
  baseX: number;
  baseY: number;
  vx: number;
  vy: number;
}

const InteractiveBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: -1000, y: -1000, active: false });
  const isMobile = useIsMobile();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let particles: Particle[] = [];
    const spacing = isMobile ? 80 : 48; // Reduced density on mobile
    const radius = isMobile ? 1.2 : 1.8;
    const forceRadius = isMobile ? 100 : 130;
    const forceFactor = isMobile ? 2.5 : 3.5;
    const returnSpeed = 0.08;

    const init = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      canvas.width = w;
      canvas.height = h;
      particles = [];

      const cols = Math.floor(w / spacing) + 2;
      const rows = Math.floor(h / spacing) + 2;

      for (let c = 0; c < cols; c++) {
        for (let r = 0; r < rows; r++) {
          const x = c * spacing;
          const y = r * spacing;
          particles.push({
            x,
            y,
            baseX: x,
            baseY: y,
            vx: 0,
            vy: 0,
          });
        }
      }
    };

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const theme = document.documentElement.getAttribute('data-theme');
      
      // Determine theme-aligned color for maximum visibility
      if (theme === 'dark') {
        ctx.fillStyle = 'rgba(129, 140, 248, 0.35)'; // Vibrant indigo dots
      } else if (theme === 'pastel') {
        ctx.fillStyle = 'rgba(244, 63, 94, 0.32)'; // Rich coral rose dots
      } else {
        ctx.fillStyle = 'rgba(37, 99, 235, 0.26)'; // Deep vibrant blue dots
      }

      const mouse = mouseRef.current;

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        // Interaction with mouse
        if (mouse.active) {
          const dx = p.x - mouse.x;
          const dy = p.y - mouse.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < forceRadius) {
            const force = (forceRadius - dist) / forceRadius;
            const dirX = dx / (dist || 1);
            const dirY = dy / (dist || 1);

            // Apply acceleration away from cursor
            p.vx += dirX * force * forceFactor;
            p.vy += dirY * force * forceFactor;
          }
        }
      }

      // Batch drawing operations to prevent GPU overhead and rendering lag
      ctx.beginPath();
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        // Return force to return back home
        const returnX = (p.baseX - p.x) * returnSpeed;
        const returnY = (p.baseY - p.y) * returnSpeed;

        p.vx += returnX;
        p.vy += returnY;

        // Apply friction to dampen oscillation
        p.vx *= 0.82;
        p.vy *= 0.82;

        p.x += p.vx;
        p.y += p.vy;

        // Draw particle (batched)
        ctx.moveTo(p.x + radius, p.y);
        ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
      }
      ctx.fill();

      animationFrameId = requestAnimationFrame(draw);
    };

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current.x = e.clientX - rect.left;
      mouseRef.current.y = e.clientY - rect.top;
      mouseRef.current.active = true;
    };

    const handleMouseLeave = () => {
      mouseRef.current.active = false;
    };

    const handleResize = () => {
      init();
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseleave', handleMouseLeave);
    window.addEventListener('resize', handleResize);

    init();
    draw();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 0,
        width: '100vw',
        height: '100vh',
      }}
    />
  );
};

export default InteractiveBackground;
