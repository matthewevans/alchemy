import { motion } from 'framer-motion';
import type { CardInstance } from '@engine/types';
import { CARD_REGISTRY } from '@engine/cards';
import { KEYWORD_REGISTRY } from '@engine/keywords';
import { getElementColor, getElementBg } from './cardUtils';

interface HandCardProps {
  cardInstance: CardInstance;
  isPlayable: boolean;
  isSelected: boolean;
  onClick: () => void;
  onHover: (hovering: boolean) => void;
}

export function HandCard({
  cardInstance,
  isPlayable,
  isSelected,
  onClick,
  onHover,
}: HandCardProps) {
  const card = CARD_REGISTRY[cardInstance.cardId];
  const elementColor = getElementColor(card.element);
  const elementBg = getElementBg(card.element);

  return (
    <motion.div
      className={`
        touch-target relative flex flex-col rounded-lg cursor-pointer select-none overflow-hidden
        ${isPlayable ? 'ring-2 ring-green-400 animate-pulse' : 'opacity-60'}
        ${isSelected ? 'ring-3 ring-yellow-300 shadow-lg shadow-yellow-300/50' : 'shadow-md shadow-black/40'}
      `}
      style={{
        width: 'var(--card-width)',
        height: 'var(--card-height)',
        borderWidth: 2,
        borderStyle: 'solid',
        borderColor: elementColor,
        backgroundColor: elementBg,
        fontSize: 'calc(var(--card-font-scale) * 1rem)',
      }}
      animate={{
        y: isSelected ? -16 : 0,
      }}
      whileHover={{ y: isSelected ? -16 : -6, scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      onClick={onClick}
      onHoverStart={() => onHover(true)}
      onHoverEnd={() => onHover(false)}
    >
      {/* Energy cost circle */}
      <div
        className="absolute top-1 left-1 flex items-center justify-center rounded-full text-white font-bold"
        style={{
          width: 'calc(var(--card-font-scale) * 1.5rem)',
          height: 'calc(var(--card-font-scale) * 1.5rem)',
          fontSize: 'calc(var(--card-font-scale) * 0.75rem)',
          backgroundColor: elementColor,
        }}
      >
        {card.cost}
      </div>

      {/* Card name */}
      <div className="flex-1 flex flex-col items-center justify-center px-1 pt-4">
        <span
          className="text-white font-bold text-center leading-tight"
          style={{ fontSize: 'calc(var(--card-font-scale) * 0.7rem)' }}
        >
          {card.name}
        </span>

        {/* Element badge */}
        <span
          className="mt-1 px-1.5 rounded-full text-white capitalize"
          style={{
            fontSize: 'calc(var(--card-font-scale) * 0.5rem)',
            backgroundColor: elementColor,
          }}
        >
          {card.element}
        </span>

        {/* Keyword icons */}
        {card.keywords.length > 0 && (
          <div
            className="mt-1 flex gap-0.5"
            style={{ fontSize: 'calc(var(--card-font-scale) * 0.7rem)' }}
          >
            {card.keywords.map((kw) => (
              <span key={kw} title={KEYWORD_REGISTRY[kw].description}>
                {KEYWORD_REGISTRY[kw].icon}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Attack / Health (creatures only) */}
      {card.type === 'creature' && (
        <div
          className="flex justify-between px-1.5 pb-1 text-white font-bold"
          style={{ fontSize: 'calc(var(--card-font-scale) * 0.75rem)' }}
        >
          <span title="Attack">⚔️ {card.attack}</span>
          <span title="Health">❤️ {card.health}</span>
        </div>
      )}
    </motion.div>
  );
}
