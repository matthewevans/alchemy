import { motion } from 'framer-motion';
import type { ElementPosition } from '@game/animationStore';

interface FloatingNumberProps {
  position: ElementPosition;
  color: 'red' | 'green' | 'amber';
  text: string;
}

const COLOR_MAP = {
  red: { text: '#ef4444', shadow: 'drop-shadow(0 2px 4px rgba(239, 68, 68, 0.6))' },
  green: { text: '#34d399', shadow: 'drop-shadow(0 2px 4px rgba(52, 211, 153, 0.6))' },
  amber: { text: '#fbbf24', shadow: 'drop-shadow(0 2px 4px rgba(251, 191, 36, 0.6))' },
};

export function FloatingNumber({ position, color, text }: FloatingNumberProps) {
  const { text: textColor, shadow } = COLOR_MAP[color];

  return (
    <motion.div
      className="absolute pointer-events-none font-black text-2xl whitespace-nowrap"
      style={{
        left: position.x + position.width / 2,
        top: position.y + position.height / 2,
        color: textColor,
        filter: shadow,
        transform: 'translate(-50%, -50%)',
        zIndex: 50,
      }}
      initial={{ opacity: 1, y: 0, scale: 1.2 }}
      animate={{ opacity: 0, y: -40, scale: 1 }}
      transition={{ duration: 0.8, ease: 'easeOut' }}
    >
      {text}
    </motion.div>
  );
}
