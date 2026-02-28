import { motion } from 'framer-motion';
import type { CardInstance } from '@engine/types';
import { CARD_REGISTRY } from '@engine/cards';
import { EFFECT_REGISTRY } from '@engine/effects';
import { useLongPress } from '@hooks/useLongPress';
import {
  getElementColor,
  getElementArtGradient,
  getElementIconPath,
  getElementFrameGradient,
  getCardArtPath,
} from './cardUtils';
import { KeywordBadge } from './KeywordBadge';
import { EffectShorthand } from './EffectShorthand';

interface HandCardProps {
  cardInstance: CardInstance;
  isPlayable: boolean;
  isSelected: boolean;
  onClick: () => void;
  onHover: (hovering: boolean) => void;
  onLongPress?: () => void;
  onPointerDown?: (e: React.PointerEvent) => void;
}

export function HandCard({
  cardInstance,
  isPlayable,
  isSelected,
  onClick,
  onHover,
  onLongPress: onLongPressProp,
  onPointerDown: onPointerDownProp,
}: HandCardProps) {
  const longPress = useLongPress(() => onLongPressProp?.());
  const card = CARD_REGISTRY[cardInstance.cardId];
  const elementColor = getElementColor(card.element);
  const artGradient = getElementArtGradient(card.element);
  const elementIconPath = getElementIconPath(card.element);
  const frameGradient = getElementFrameGradient(card.element);
  const artPath = getCardArtPath(card.id, card.element);
  const effect = card.effectId ? EFFECT_REGISTRY[card.effectId] : null;
  const isCreature = card.type === 'creature';

  return (
    <motion.div
      className={`
        touch-target relative flex flex-col cursor-pointer select-none
        ${isPlayable ? '' : 'brightness-[0.6] saturate-50'}
        ${isSelected ? 'shadow-xl' : 'shadow-lg shadow-black/50'}
      `}
      style={{
        width: 'var(--card-width)',
        height: 'var(--card-height)',
        fontSize: 'calc(var(--card-font-scale) * 1rem)',
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
          className="absolute -inset-[2px] rounded-xl z-0 pointer-events-none"
          style={{
            background: `linear-gradient(135deg, ${elementColor}, #fbbf24, ${elementColor})`,
            backgroundSize: '200% 200%',
          }}
          animate={{
            backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
            opacity: isSelected ? [0.9, 1, 0.9] : [0.5, 0.8, 0.5],
          }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}

      {/* Card frame (outer gradient border) */}
      <div
        className="absolute inset-0 rounded-xl z-[1]"
        style={{ background: frameGradient, opacity: 0.7 }}
      />

      {/* Card inner body */}
      <div className="relative z-[2] flex flex-col m-[2px] rounded-[10px] overflow-hidden h-full bg-slate-900">
        {/* ── Name bar ── */}
        <div
          className="flex items-center gap-1 px-1.5 py-[2px]"
          style={{
            background: `linear-gradient(90deg, ${elementColor}33, ${elementColor}11)`,
            borderBottom: `1px solid ${elementColor}44`,
          }}
        >
          {/* Energy cost gem with element icon */}
          <div
            className="shrink-0 flex items-center gap-[2px] rounded-md px-[3px] text-white font-black"
            style={{
              height: 'calc(var(--card-font-scale) * 1.25rem)',
              fontSize: 'calc(var(--card-font-scale) * 0.7rem)',
              background: `linear-gradient(135deg, ${elementColor}, ${elementColor}cc)`,
              boxShadow: `0 1px 3px ${elementColor}66`,
            }}
          >
            <span>{card.cost}</span>
            <img
              src={elementIconPath}
              alt={card.element}
              className="select-none"
              style={{
                width: 'calc(var(--card-font-scale) * 0.75rem)',
                height: 'calc(var(--card-font-scale) * 0.75rem)',
                objectFit: 'contain',
              }}
            />
          </div>

          {/* Card name */}
          <span
            className="flex-1 text-white font-bold truncate"
            style={{ fontSize: 'calc(var(--card-font-scale) * 0.6rem)' }}
          >
            {card.name}
          </span>

          {/* Type icon */}
          <span
            className="shrink-0 opacity-70"
            style={{ fontSize: 'calc(var(--card-font-scale) * 0.65rem)' }}
            title={card.type}
          >
            {isCreature ? '⚔️' : '✨'}
          </span>
        </div>

        {/* ── Art area ── */}
        <div
          className="relative mx-1 mt-1 rounded-md overflow-hidden flex items-center justify-center"
          style={{
            height: 'calc(var(--card-height) * 0.36)',
            background: artGradient,
          }}
        >
          <img
            src={artPath}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
          />

          {/* Art frame border */}
          <div
            className="absolute inset-0 rounded-md pointer-events-none"
            style={{ border: `1px solid ${elementColor}55` }}
          />
        </div>

        {/* ── Text box (keywords + effects) ── */}
        <div
          className="flex-1 mx-1 mt-1 mb-1 px-1.5 py-1 rounded-md overflow-hidden"
          style={{
            background: 'rgba(15, 23, 42, 0.8)',
            border: '1px solid rgba(148, 163, 184, 0.15)',
          }}
        >
          {/* Keywords */}
          {card.keywords.length > 0 && (
            <div className="flex flex-wrap gap-x-1 gap-y-0.5 mb-0.5">
              {card.keywords.map((kw) => (
                <KeywordBadge key={kw} keyword={kw} />
              ))}
            </div>
          )}

          {/* Spell effect — symbolic shorthand */}
          {effect && <EffectShorthand effect={effect} />}

          {/* Flavor text (if space) */}
          {card.flavor && !effect && card.keywords.length === 0 && (
            <p
              className="text-white/30 italic leading-tight"
              style={{ fontSize: 'calc(var(--card-font-scale) * 0.5rem)' }}
            >
              {card.flavor}
            </p>
          )}
        </div>

        {/* ── Stat bar (creatures only) ── */}
        {isCreature && (
          <div className="flex justify-between items-center px-1 pb-1">
            {/* Attack - bottom left */}
            <div
              className="flex items-center justify-center rounded-md text-white font-black"
              style={{
                minWidth: 'calc(var(--card-font-scale) * 1.4rem)',
                height: 'calc(var(--card-font-scale) * 1.2rem)',
                fontSize: 'calc(var(--card-font-scale) * 0.7rem)',
                background: 'linear-gradient(135deg, #dc2626, #991b1b)',
                boxShadow: '0 1px 2px rgba(0,0,0,0.3)',
                padding: '0 3px',
              }}
            >
              {card.attack}
            </div>

            {/* Health - bottom right */}
            <div
              className="flex items-center justify-center rounded-md text-white font-black"
              style={{
                minWidth: 'calc(var(--card-font-scale) * 1.4rem)',
                height: 'calc(var(--card-font-scale) * 1.2rem)',
                fontSize: 'calc(var(--card-font-scale) * 0.7rem)',
                background: 'linear-gradient(135deg, #16a34a, #14532d)',
                boxShadow: '0 1px 2px rgba(0,0,0,0.3)',
                padding: '0 3px',
              }}
            >
              {card.health}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
