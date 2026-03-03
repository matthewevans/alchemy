import { motion } from 'framer-motion';
import type { ElementPosition } from '@game/animationStore';

interface MathBreakdownOverlayProps {
  position: ElementPosition;
  text: string;
  tone: 'damage' | 'heal';
}

const TONE_STYLES = {
  damage: {
    textColor: '#fecaca',
    borderColor: 'rgba(248, 113, 113, 0.5)',
    glow: 'rgba(239, 68, 68, 0.35)',
  },
  heal: {
    textColor: '#bbf7d0',
    borderColor: 'rgba(52, 211, 153, 0.5)',
    glow: 'rgba(16, 185, 129, 0.35)',
  },
} as const;

export function MathBreakdownOverlay({ position, text, tone }: MathBreakdownOverlayProps) {
  const cx = position.x + position.width / 2;
  const cy = position.y + position.height / 2;
  const styles = TONE_STYLES[tone];

  return (
    <motion.div
      className="absolute pointer-events-none whitespace-nowrap rounded-lg px-2.5 py-1 text-sm font-bold tabular-nums"
      style={{
        left: cx,
        top: cy,
        color: styles.textColor,
        background: 'rgba(15, 23, 42, 0.92)',
        border: `1px solid ${styles.borderColor}`,
        boxShadow: `0 0 14px ${styles.glow}, 0 6px 16px rgba(0,0,0,0.5)`,
        textShadow: '0 1px 2px rgba(0,0,0,0.5)',
      }}
      initial={{ opacity: 0, y: 18, scale: 0.92, x: '-50%' }}
      animate={{ opacity: 1, y: -28, scale: 1, x: '-50%' }}
      exit={{ opacity: 0, y: -52, scale: 0.96, x: '-50%' }}
      transition={{ duration: 0.45, ease: 'easeOut' }}
    >
      {text}
    </motion.div>
  );
}

