import { motion } from 'framer-motion';
import type { ElementPosition } from '@game/animationStore';

interface BlockLinkProps {
  from: ElementPosition;
  to: ElementPosition;
}

export function BlockLink({ from, to }: BlockLinkProps) {
  const fromX = from.x + from.width / 2;
  const fromY = from.y + from.height / 2;
  const toX = to.x + to.width / 2;
  const toY = to.y + to.height / 2;
  const deltaX = toX - fromX;
  const deltaY = toY - fromY;
  const distance = Math.hypot(deltaX, deltaY);
  const angle = (Math.atan2(deltaY, deltaX) * 180) / Math.PI;

  return (
    <>
      <motion.div
        className="absolute pointer-events-none rounded-full"
        style={{
          left: fromX,
          top: fromY,
          width: distance,
          height: 5,
          transform: `translateY(-50%) rotate(${angle}deg)`,
          transformOrigin: '0 50%',
          background:
            'linear-gradient(90deg, rgba(96, 165, 250, 0.9) 0%, rgba(147, 197, 253, 0.55) 60%, rgba(96, 165, 250, 0.1) 100%)',
          boxShadow: '0 0 10px rgba(96, 165, 250, 0.6)',
          zIndex: 51,
        }}
        initial={{ opacity: 0, scaleX: 0.15 }}
        animate={{ opacity: [0, 1, 0], scaleX: [0.15, 1, 1] }}
        transition={{ duration: 0.45, ease: 'easeOut' }}
      />
      <motion.div
        className="absolute pointer-events-none rounded-full border-2 border-sky-300/85"
        style={{
          left: fromX,
          top: fromY,
          width: 28,
          height: 28,
          transform: 'translate(-50%, -50%)',
          zIndex: 52,
        }}
        initial={{ opacity: 0.9, scale: 0.6 }}
        animate={{ opacity: 0, scale: 1.5 }}
        transition={{ duration: 0.45, ease: 'easeOut' }}
      />
    </>
  );
}

