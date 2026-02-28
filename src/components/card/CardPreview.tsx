import { motion } from 'framer-motion';
import { CARD_REGISTRY } from '@engine/cards';
import { EFFECT_REGISTRY } from '@engine/effects';
import { KEYWORD_REGISTRY } from '@engine/keywords';
import { getElementColor, getElementBg } from './cardUtils';

interface CardPreviewProps {
  cardId: string;
}

export function CardPreview({ cardId }: CardPreviewProps) {
  const card = CARD_REGISTRY[cardId];
  const elementColor = getElementColor(card.element);
  const elementBg = getElementBg(card.element);
  const effect = card.effectId ? EFFECT_REGISTRY[card.effectId] : null;

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" />

      {/* Card */}
      <motion.div
        className="relative flex flex-col rounded-xl overflow-hidden shadow-2xl"
        style={{
          width: 'calc(var(--card-width) * 1.5)',
          height: 'calc(var(--card-height) * 1.5)',
          borderWidth: 3,
          borderStyle: 'solid',
          borderColor: elementColor,
          background: `linear-gradient(135deg, ${elementBg}, rgba(15, 23, 42, 0.95))`,
          fontSize: 'calc(var(--card-font-scale) * 1rem)',
        }}
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.8, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      >
        {/* Header: cost + name */}
        <div className="flex items-center gap-2 px-2 pt-2">
          <div
            className="flex items-center justify-center rounded-full text-white font-bold shrink-0"
            style={{
              width: 'calc(var(--card-font-scale) * 1.75rem)',
              height: 'calc(var(--card-font-scale) * 1.75rem)',
              fontSize: 'calc(var(--card-font-scale) * 0.85rem)',
              backgroundColor: elementColor,
            }}
          >
            {card.cost}
          </div>
          <span
            className="text-white font-bold truncate"
            style={{ fontSize: 'calc(var(--card-font-scale) * 0.85rem)' }}
          >
            {card.name}
          </span>
        </div>

        {/* Element + type badge */}
        <div className="flex gap-1 px-2 mt-1">
          <span
            className="px-1.5 rounded-full text-white capitalize"
            style={{
              fontSize: 'calc(var(--card-font-scale) * 0.5rem)',
              backgroundColor: elementColor,
            }}
          >
            {card.element}
          </span>
          <span
            className="px-1.5 rounded-full text-white/80 bg-white/10 capitalize"
            style={{ fontSize: 'calc(var(--card-font-scale) * 0.5rem)' }}
          >
            {card.type}
          </span>
        </div>

        {/* Art placeholder */}
        <div
          className="mx-2 mt-2 rounded flex items-center justify-center"
          style={{
            height: 'calc(var(--card-height) * 0.35)',
            backgroundColor: 'rgba(255,255,255,0.05)',
            borderWidth: 1,
            borderStyle: 'solid',
            borderColor: 'rgba(255,255,255,0.1)',
          }}
        >
          <span
            className="text-white/30"
            style={{ fontSize: 'calc(var(--card-font-scale) * 0.6rem)' }}
          >
            Art
          </span>
        </div>

        {/* Keywords with descriptions */}
        <div className="flex-1 px-2 mt-1.5 overflow-y-auto">
          {card.keywords.map((kw) => {
            const kwDef = KEYWORD_REGISTRY[kw];
            return (
              <div
                key={kw}
                className="flex items-start gap-1 mb-0.5"
                style={{ fontSize: 'calc(var(--card-font-scale) * 0.5rem)' }}
              >
                <span>{kwDef.icon}</span>
                <span className="text-white/80">
                  <span className="font-semibold text-white capitalize">
                    {kwDef.name}
                  </span>
                  {' \u2014 '}
                  {kwDef.description}
                </span>
              </div>
            );
          })}

          {/* Effect description for spells */}
          {effect && (
            <div
              className="text-white/80 mt-1"
              style={{ fontSize: 'calc(var(--card-font-scale) * 0.5rem)' }}
            >
              {effect.description}
            </div>
          )}
        </div>

        {/* Flavor text */}
        {card.flavor && (
          <div
            className="px-2 text-white/40 italic"
            style={{ fontSize: 'calc(var(--card-font-scale) * 0.45rem)' }}
          >
            {card.flavor}
          </div>
        )}

        {/* Attack / Health (creatures only) */}
        {card.type === 'creature' && (
          <div
            className="flex justify-between px-3 pb-2 pt-1 text-white font-bold"
            style={{ fontSize: 'calc(var(--card-font-scale) * 0.9rem)' }}
          >
            <span title="Attack">{'\u2694\uFE0F'} {card.attack}</span>
            <span title="Health">{'\u2764\uFE0F'} {card.health}</span>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
