import { motion } from 'framer-motion';
import type { ElementPosition } from '@game/animationStore';

interface FloatingNumberProps {
  position: ElementPosition;
  color: 'red' | 'green' | 'amber';
  text: string;
}

const COLOR_MAP = {
  red: {
    text: '#ff4444',
    glow: 'rgba(255, 68, 68, 0.8)',
    ring: 'rgba(255, 68, 68, 0.35)',
  },
  green: {
    text: '#34d399',
    glow: 'rgba(52, 211, 153, 0.8)',
    ring: 'rgba(52, 211, 153, 0.3)',
  },
  amber: {
    text: '#fbbf24',
    glow: 'rgba(251, 191, 36, 0.8)',
    ring: 'rgba(251, 191, 36, 0.3)',
  },
};

export function FloatingNumber({ position, color, text }: FloatingNumberProps) {
  const cx = position.x + position.width / 2;
  const cy = position.y + position.height / 2;
  const { text: textColor, glow, ring } = COLOR_MAP[color];
  const amount = parseInt(text.replace(/[^0-9]/g, ''), 10) || 1;
  const isBigHit = color === 'red' && amount >= 3;
  const fontSize = isBigHit ? '3.2rem' : '2.2rem';

  return (
    <>
      {/* Impact ring that expands and fades behind the number */}
      <motion.div
        className="absolute rounded-full pointer-events-none"
        style={{
          left: cx,
          top: cy,
          width: 50,
          height: 50,
          transform: 'translate(-50%, -50%)',
          background: `radial-gradient(circle, ${ring} 0%, transparent 70%)`,
          zIndex: 49,
        }}
        initial={{ opacity: 1, scale: 0.4 }}
        animate={{ opacity: 0, scale: isBigHit ? 4 : 3 }}
        transition={{ duration: 0.7, ease: 'easeOut' }}
      />

      {/* The number itself — punchy scale entrance, then float up and fade */}
      <motion.div
        className="absolute pointer-events-none font-black whitespace-nowrap"
        style={{
          left: cx,
          top: cy,
          color: textColor,
          transform: 'translate(-50%, -50%)',
          zIndex: 50,
          fontSize,
          textShadow: `0 0 16px ${glow}, 0 0 32px ${glow}, 0 2px 4px rgba(0,0,0,0.5)`,
          WebkitTextStroke: isBigHit ? '1px rgba(0,0,0,0.3)' : undefined,
        }}
        initial={{ opacity: 1, y: 0, scale: isBigHit ? 2.4 : 1.8 }}
        animate={{ opacity: 0, y: -65, scale: 0.85 }}
        transition={{
          duration: 0.95,
          ease: 'easeOut',
          scale: {
            duration: 0.95,
            ease: [0.22, 1, 0.36, 1],
          },
        }}
      >
        {text}
      </motion.div>
    </>
  );
}
