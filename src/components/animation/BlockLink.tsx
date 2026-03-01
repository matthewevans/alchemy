import { motion } from 'framer-motion';
import type { ElementPosition } from '@game/animationStore';

// Deterministic sizes — avoids impure Math.random in render
const ENERGY_DOT_CONFIGS = [
  { t: 1 / 7, size: 4.2, delay: 0 },
  { t: 2 / 7, size: 3.5, delay: 0.04 },
  { t: 3 / 7, size: 5.1, delay: 0.08 },
  { t: 4 / 7, size: 3.8, delay: 0.12 },
  { t: 5 / 7, size: 4.6, delay: 0.16 },
  { t: 6 / 7, size: 3.3, delay: 0.20 },
];

interface BlockLinkProps {
  from: ElementPosition;
  to: ElementPosition;
}

export function BlockLink({ from, to }: BlockLinkProps) {
  const fromX = from.x + from.width / 2;
  const fromY = from.y + from.height / 2;
  const toX = to.x + to.width / 2;
  const toY = to.y + to.height / 2;
  const midX = (fromX + toX) / 2;
  const midY = (fromY + toY) / 2;
  const deltaX = toX - fromX;
  const deltaY = toY - fromY;
  const distance = Math.hypot(deltaX, deltaY);
  const angle = (Math.atan2(deltaY, deltaX) * 180) / Math.PI;

  return (
    <>
      {/* Main connector line — thicker and brighter */}
      <motion.div
        className="absolute pointer-events-none rounded-full"
        style={{
          left: fromX,
          top: fromY,
          width: distance,
          height: 6,
          transform: `translateY(-50%) rotate(${angle}deg)`,
          transformOrigin: '0 50%',
          background:
            'linear-gradient(90deg, rgba(96, 165, 250, 0.95) 0%, rgba(190, 220, 255, 0.8) 50%, rgba(96, 165, 250, 0.95) 100%)',
          boxShadow:
            '0 0 16px rgba(96, 165, 250, 0.7), 0 0 4px rgba(255, 255, 255, 0.3)',
          zIndex: 51,
        }}
        initial={{ opacity: 0, scaleX: 0 }}
        animate={{ opacity: [0, 1, 0.8, 0], scaleX: [0, 1, 1, 1] }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      />

      {/* Expanding ring at blocker (from) */}
      <motion.div
        className="absolute pointer-events-none rounded-full"
        style={{
          left: fromX,
          top: fromY,
          width: 36,
          height: 36,
          transform: 'translate(-50%, -50%)',
          border: '2px solid rgba(96, 165, 250, 0.85)',
          boxShadow: '0 0 10px rgba(96, 165, 250, 0.5)',
          zIndex: 52,
        }}
        initial={{ opacity: 0.9, scale: 0.4 }}
        animate={{ opacity: 0, scale: 1.8 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      />

      {/* Expanding ring at attacker (to) */}
      <motion.div
        className="absolute pointer-events-none rounded-full"
        style={{
          left: toX,
          top: toY,
          width: 36,
          height: 36,
          transform: 'translate(-50%, -50%)',
          border: '2px solid rgba(239, 68, 68, 0.85)',
          boxShadow: '0 0 10px rgba(239, 68, 68, 0.5)',
          zIndex: 52,
        }}
        initial={{ opacity: 0.9, scale: 0.4 }}
        animate={{ opacity: 0, scale: 1.8 }}
        transition={{ duration: 0.5, ease: 'easeOut', delay: 0.05 }}
      />

      {/* Energy dots traveling along the line */}
      {ENERGY_DOT_CONFIGS.map((dot, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full pointer-events-none"
          style={{
            left: fromX + deltaX * dot.t,
            top: fromY + deltaY * dot.t,
            width: dot.size,
            height: dot.size,
            transform: 'translate(-50%, -50%)',
            background: 'rgba(255, 255, 255, 0.9)',
            boxShadow: '0 0 6px rgba(96, 165, 250, 0.8)',
            zIndex: 52,
          }}
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: [0, 1, 0], scale: [0, 1.5, 0.5] }}
          transition={{ duration: 0.35, ease: 'easeOut', delay: 0.08 + dot.delay }}
        />
      ))}

      {/* Clash spark at midpoint */}
      <motion.div
        className="absolute rounded-full pointer-events-none"
        style={{
          left: midX,
          top: midY,
          width: 24,
          height: 24,
          transform: 'translate(-50%, -50%)',
          background:
            'radial-gradient(circle, rgba(255, 255, 255, 0.85) 0%, rgba(96, 165, 250, 0.4) 60%, transparent 100%)',
          zIndex: 53,
        }}
        initial={{ opacity: 0, scale: 0.3 }}
        animate={{ opacity: [0, 1, 0], scale: [0.3, 1.6, 0.5] }}
        transition={{ duration: 0.4, ease: 'easeOut', delay: 0.15 }}
      />
    </>
  );
}
