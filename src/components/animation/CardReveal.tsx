import { motion } from 'framer-motion';
import { CARD_REGISTRY } from '@engine/cards';
import { getElementColor } from '@components/card/cardUtils';
import { HandCard } from '@components/card/HandCard';
import { CollapsibleSidePanel } from '@components/ui/CollapsibleSidePanel';

interface CardRevealProps {
  cardId: string;
}

/**
 * Side-anchored card reveal shown when any card is played.
 * Uses CollapsibleSidePanel for the collapse/expand chevron.
 */
export function CardReveal({ cardId }: CardRevealProps) {
  const card = CARD_REGISTRY[cardId];
  const elementColor = getElementColor(card.element);

  return (
    <CollapsibleSidePanel
      storageKey="alchemy:card-reveal-collapsed"
      accentColor={elementColor}
      collapseOffset={120}
    >
      {/* Card with element glow */}
      <div className="relative pointer-events-none">
        <motion.div
          className="absolute inset-0 pointer-events-none"
          style={{
            borderRadius: '50%',
            background: `radial-gradient(ellipse, ${elementColor}20, ${elementColor}08 50%, transparent 70%)`,
            filter: 'blur(14px)',
            transform: 'scale(1.8)',
          }}
          animate={{ opacity: [0.4, 0.7, 0.4] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="relative"
          style={{
            '--card-width': '110px',
            '--card-height': '154px',
            '--card-font-scale': '0.7',
            filter: `drop-shadow(0 0 12px ${elementColor}44) drop-shadow(0 4px 10px rgba(0,0,0,0.5))`,
          } as React.CSSProperties}
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.8, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 400, damping: 24 }}
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
      </div>
    </CollapsibleSidePanel>
  );
}
