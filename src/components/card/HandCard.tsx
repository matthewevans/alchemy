import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import type { CardInstance } from '@engine/types';
import { CARD_REGISTRY } from '@engine/cards';
import { useLongPress } from '@hooks/useLongPress';
import { getElementColor } from './cardUtils';
import { CardFace } from './CardFace';

interface HandCardProps {
  cardInstance: CardInstance;
  isPlayable: boolean;
  isSelected: boolean;
  verbose?: boolean;
  onClick: () => void;
  onHover: (hovering: boolean) => void;
  onLongPress?: () => void;
  onPointerDown?: (e: React.PointerEvent) => void;
}

export function HandCard({
  cardInstance,
  isPlayable,
  isSelected,
  verbose,
  onClick,
  onHover,
  onLongPress: onLongPressProp,
  onPointerDown: onPointerDownProp,
}: HandCardProps) {
  const longPress = useLongPress(() => onLongPressProp?.());
  const card = CARD_REGISTRY[cardInstance.cardId];
  const elementColor = getElementColor(card.element);
  const isPreview = cardInstance.instanceId === '__preview__' || cardInstance.instanceId === '__reveal__';

  // Draw shimmer — brief golden flash when card first appears in hand
  const [showDrawGlow, setShowDrawGlow] = useState(!isPreview);
  useEffect(() => {
    if (!showDrawGlow) return;
    const timer = setTimeout(() => setShowDrawGlow(false), 700);
    return () => clearTimeout(timer);
  }, [showDrawGlow]);

  return (
    <motion.div
      className={`
        touch-target relative flex flex-col cursor-pointer select-none
        ${isSelected ? 'shadow-xl' : 'shadow-lg shadow-black/50'}
      `}
      style={{
        width: 'var(--card-width)',
        height: 'var(--card-height)',
        fontSize: 'calc(var(--card-font-scale) * 1rem)',
        touchAction: 'none',
        WebkitTouchCallout: 'none',
      }}
      animate={{
        y: isSelected ? -20 : 0,
      }}
      whileHover={{ y: isSelected ? -20 : -8, scale: 1.04 }}
      whileTap={{ scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      onClick={() => { if (!longPress.firedRef.current) onClick(); }}
      onPointerDown={(e) => { longPress.onPointerDown(e); onPointerDownProp?.(e); }}
      onPointerMove={longPress.onPointerMove}
      onPointerUp={longPress.onPointerUp}
      onPointerCancel={longPress.onPointerCancel}
      onHoverStart={() => onHover(true)}
      onHoverEnd={() => onHover(false)}
    >
      {/* Playable glow ring */}
      {isPlayable && (
        <motion.div
          className="absolute -inset-[3px] rounded-xl z-0 pointer-events-none"
          style={{
            background: 'linear-gradient(135deg, #06b6d4, #22d3ee, #67e8f9, #22d3ee, #06b6d4)',
            backgroundSize: '200% 200%',
            boxShadow: isSelected
              ? '0 0 12px 2px rgba(34, 211, 238, 0.6)'
              : '0 0 8px 1px rgba(34, 211, 238, 0.3)',
          }}
          animate={{
            backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
            opacity: isSelected ? 1 : [0.7, 1, 0.7],
          }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}

      {/* Draw shimmer — golden flash on arrival */}
      {showDrawGlow && (
        <motion.div
          className="absolute -inset-[3px] rounded-xl z-[1] pointer-events-none"
          style={{
            boxShadow: `0 0 24px 8px ${elementColor}55, 0 0 48px 16px ${elementColor}22`,
            background: `radial-gradient(ellipse at center, ${elementColor}20, transparent 70%)`,
          }}
          initial={{ opacity: 1 }}
          animate={{ opacity: 0 }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
        />
      )}

      <CardFace
        cardId={cardInstance.cardId}
        viewLevel={verbose ? 'verbose' : 'normal'}
      />
    </motion.div>
  );
}
