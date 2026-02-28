import { motion } from 'framer-motion';
import type { ElementPosition } from '@game/animationStore';

interface SpellImpactProps {
  position: ElementPosition;
}

export function SpellImpact({ position }: SpellImpactProps) {
  return (
    <motion.div
      className="absolute rounded-full pointer-events-none"
      style={{
        left: position.x + position.width / 2,
        top: position.y + position.height / 2,
        width: 60,
        height: 60,
        transform: 'translate(-50%, -50%)',
        background: 'radial-gradient(circle, rgba(168, 85, 247, 0.6) 0%, rgba(168, 85, 247, 0) 70%)',
        zIndex: 50,
      }}
      initial={{ opacity: 1, scale: 0.3 }}
      animate={{ opacity: 0, scale: 2.5 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
    />
  );
}
