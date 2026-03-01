import { motion } from 'framer-motion';
import { useDialogA11y } from '@hooks/useDialogA11y';
import { CARD_REGISTRY } from '@engine/cards';
import { getElementColor } from './cardUtils';
import { HandCard } from './HandCard';

interface CardPreviewProps {
  cardId: string;
  onDismiss: () => void;
}

export function CardPreview({ cardId, onDismiss }: CardPreviewProps) {
  const card = CARD_REGISTRY[cardId];
  const elementColor = getElementColor(card.element);
  const dialogRef = useDialogA11y({ open: true, onClose: onDismiss });

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      onClick={onDismiss}
    >
      {/* Darkened backdrop with blur */}
      <motion.div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2 }}
      />

      {/* Element-colored radial spotlight behind the card */}
      <motion.div
        className="absolute pointer-events-none"
        style={{
          width: 500,
          height: 500,
          borderRadius: '50%',
          background: `radial-gradient(ellipse, ${elementColor}30, ${elementColor}10 40%, transparent 70%)`,
          filter: 'blur(30px)',
        }}
        initial={{ opacity: 0, scale: 0.3 }}
        animate={{
          opacity: [0, 0.8, 0.6],
          scale: [0.3, 1.2, 1],
        }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
      />

      {/* Vertical light ray — element-colored beam */}
      <motion.div
        className="absolute pointer-events-none"
        style={{
          width: 4,
          height: '100vh',
          background: `linear-gradient(180deg, transparent 10%, ${elementColor}20 30%, ${elementColor}30 50%, ${elementColor}20 70%, transparent 90%)`,
        }}
        initial={{ opacity: 0, scaleY: 0 }}
        animate={{ opacity: 1, scaleY: 1 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1], delay: 0.05 }}
      />

      {/* Horizontal accent line */}
      <motion.div
        className="absolute pointer-events-none"
        style={{
          width: '80vw',
          height: 1,
          background: `linear-gradient(90deg, transparent, ${elementColor}40 30%, ${elementColor}60 50%, ${elementColor}40 70%, transparent)`,
        }}
        initial={{ opacity: 0, scaleX: 0 }}
        animate={{ opacity: 1, scaleX: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1], delay: 0.08 }}
      />

      {/* Pulsing aura ring behind card */}
      <motion.div
        className="absolute pointer-events-none rounded-2xl"
        style={{
          width: 240,
          height: 330,
          boxShadow: `0 0 60px 20px ${elementColor}22, 0 0 120px 40px ${elementColor}11`,
        }}
        animate={{
          boxShadow: [
            `0 0 60px 20px ${elementColor}22, 0 0 120px 40px ${elementColor}11`,
            `0 0 80px 30px ${elementColor}33, 0 0 140px 50px ${elementColor}18`,
            `0 0 60px 20px ${elementColor}22, 0 0 120px 40px ${elementColor}11`,
          ],
        }}
        transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* The card itself */}
      <motion.div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={`${card.name} details`}
        tabIndex={-1}
        className="relative"
        style={{
          '--card-width': '210px',
          '--card-height': '300px',
          '--card-font-scale': '1.5',
          filter: `drop-shadow(0 0 30px ${elementColor}55) drop-shadow(0 8px 24px rgba(0,0,0,0.5))`,
        } as React.CSSProperties}
        initial={{ scale: 0.5, opacity: 0, y: 30 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.7, opacity: 0, y: 20 }}
        transition={{
          type: 'spring',
          stiffness: 350,
          damping: 22,
          delay: 0.05,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <HandCard
          cardInstance={{ instanceId: '__preview__', cardId }}
          isPlayable
          isSelected={false}
          verbose
          onClick={() => {}}
          onHover={() => {}}
        />
      </motion.div>
    </motion.div>
  );
}
