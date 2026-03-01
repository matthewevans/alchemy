import { motion } from 'framer-motion';
import { CARD_REGISTRY } from '@engine/cards';
import { getElementColor } from '@components/card/cardUtils';
import { HandCard } from '@components/card/HandCard';

interface CardRevealProps {
  cardId: string;
}

export function CardReveal({ cardId }: CardRevealProps) {
  const card = CARD_REGISTRY[cardId];
  const elementColor = getElementColor(card.element);

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
    >
      {/* Dimmed backdrop */}
      <motion.div
        className="absolute inset-0 bg-black/50"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
      />

      {/* Element-colored radial glow */}
      <motion.div
        className="absolute pointer-events-none"
        style={{
          width: 400,
          height: 400,
          borderRadius: '50%',
          background: `radial-gradient(ellipse, ${elementColor}30, ${elementColor}10 40%, transparent 70%)`,
          filter: 'blur(20px)',
        }}
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 0.8, scale: 1 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
      />

      {/* The card */}
      <motion.div
        className="relative"
        style={{
          '--card-width': '180px',
          '--card-height': '320px',
          '--card-font-scale': '1.3',
          filter: `drop-shadow(0 0 24px ${elementColor}55) drop-shadow(0 6px 20px rgba(0,0,0,0.5))`,
        } as React.CSSProperties}
        initial={{ scale: 0.3, opacity: 0, y: 40 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.8, opacity: 0, y: -20 }}
        transition={{
          type: 'spring',
          stiffness: 400,
          damping: 24,
        }}
      >
        <HandCard
          cardInstance={{ instanceId: '__reveal__', cardId }}
          isPlayable={false}
          isSelected={false}
          verbose
          onClick={() => {}}
          onHover={() => {}}
        />
      </motion.div>
    </motion.div>
  );
}
