import { motion } from 'framer-motion';
import type { ElementPosition } from '@game/animationStore';

interface CombatStrikeProps {
  from: ElementPosition;
  to: ElementPosition;
}

export function CombatStrike({ from, to }: CombatStrikeProps) {
  const fromX = from.x + from.width / 2;
  const fromY = from.y + from.height / 2;
  const toX = to.x + to.width / 2;
  const toY = to.y + to.height / 2;
  const deltaX = toX - fromX;
  const deltaY = toY - fromY;

  return (
    <motion.div
      className="absolute pointer-events-none"
      style={{
        left: fromX,
        top: fromY,
        width: 18,
        height: 18,
        borderRadius: '9999px',
        background:
          'radial-gradient(circle, rgba(251, 191, 36, 1) 0%, rgba(249, 115, 22, 0.95) 55%, rgba(239, 68, 68, 0.45) 100%)',
        boxShadow: '0 0 14px rgba(251, 146, 60, 0.8)',
        transform: 'translate(-50%, -50%)',
        zIndex: 52,
      }}
      initial={{ x: 0, y: 0, opacity: 0, scale: 0.85 }}
      animate={{ x: deltaX, y: deltaY, opacity: [0, 1, 0], scale: [0.85, 1, 0.75] }}
      transition={{ duration: 0.48, ease: 'easeOut' }}
    />
  );
}

