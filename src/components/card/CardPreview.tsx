import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useDialogA11y } from '@hooks/useDialogA11y';
import { CARD_REGISTRY } from '@engine/cards';
import { useGameStore } from '@game/gameStore';
import { usePreferencesStore } from '@game/preferencesStore';
import { narrateCard, cancelNarration } from '@audio/tts';
import { getElementColor } from './cardUtils';
import { HandCard } from './HandCard';
import { getCardCostPresentation } from './costPresentation';

interface CardPreviewProps {
  cardId: string;
  onDismiss: () => void;
}

const PREVIEW_SCALE = 2.2;

export function CardPreview({ cardId, onDismiss }: CardPreviewProps) {
  const card = CARD_REGISTRY[cardId];
  const elementColor = getElementColor(card.element);
  const phase = useGameStore((s) => s.state?.phase);
  const narrationEnabled = usePreferencesStore((s) => s.narrationEnabled);
  const easyReadMode = usePreferencesStore((s) => s.easyReadMode);
  const dialogRef = useDialogA11y({ open: true, onClose: onDismiss });
  const costPresentation = getCardCostPresentation(cardId, phase);

  useEffect(() => {
    if (narrationEnabled) narrateCard(cardId, easyReadMode);
    return () => cancelNarration();
  }, [cardId, narrationEnabled, easyReadMode]);

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      onClick={onDismiss}
    >
      <motion.div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2 }}
      />

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
        animate={{ opacity: [0, 0.8, 0.6], scale: [0.3, 1.2, 1] }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
      />

      <motion.div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={`${card.name} details`}
        tabIndex={-1}
        className="relative"
        style={{
          filter: `drop-shadow(0 0 30px ${elementColor}55) drop-shadow(0 8px 24px rgba(0,0,0,0.5))`,
        }}
        initial={{ scale: 0.5, opacity: 0, y: 30 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.7, opacity: 0, y: 20 }}
        transition={{ type: 'spring', stiffness: 350, damping: 22, delay: 0.05 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            width: `calc(var(--card-width) * ${PREVIEW_SCALE})`,
            height: `calc(var(--card-height) * ${PREVIEW_SCALE})`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div style={{ transform: `scale(${PREVIEW_SCALE})`, transformOrigin: 'center center' }}>
            <HandCard
              cardInstance={{ instanceId: '__preview__', cardId }}
              isPlayable={false}
              isSelected={false}
              costOverride={costPresentation.costOverride}
              costHint={costPresentation.costHint}
              highlightCost={costPresentation.highlightCost}
              verbose
              onClick={() => {}}
              onHover={() => {}}
            />
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
