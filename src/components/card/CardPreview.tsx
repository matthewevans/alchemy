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
      transition={{ duration: 0.15 }}
      onClick={onDismiss}
    >
      <div className="absolute inset-0 bg-black/50" />

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
          filter: `drop-shadow(0 0 20px ${elementColor}44)`,
        } as React.CSSProperties}
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.8, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
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
