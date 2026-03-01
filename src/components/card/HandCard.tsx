import { motion } from 'framer-motion';
import type { CardInstance } from '@engine/types';
import { CARD_REGISTRY } from '@engine/cards';
import { EFFECT_REGISTRY } from '@engine/effects';
import { KEYWORD_REGISTRY } from '@engine/keywords';
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

      {/* Card frame (outer gradient border) */}
      <div
        className="absolute inset-0 rounded-xl z-[1]"
        style={{ background: frameGradient, opacity: 0.7 }}
      />

      {/* Card inner body */}
      <div className="relative z-[2] flex flex-col m-[2px] rounded-[10px] overflow-hidden h-full bg-slate-900">
        {/* ── Name bar ── */}
        <div
          data-testid="hand-card-header"
          className="flex items-center gap-1 px-1.5 py-[2px]"
          style={{
            background: `linear-gradient(90deg, ${elementColor}33, ${elementColor}11)`,
            borderBottom: `1px solid ${elementColor}44`,
          }}
        >
          {/* Card name */}
          <span
            className="flex-1 text-white font-bold truncate"
            style={{ fontSize: 'calc(var(--card-font-scale) * 0.6rem)' }}
          >
            {card.name}
          </span>

          {/* Energy cost — element icon ×N */}
          <div
            data-testid="hand-card-cost"
            className="shrink-0 flex items-center"
            style={{ gap: 'calc(var(--card-font-scale) * 0.05rem)' }}
          >
            <img
              src={elementIconPath}
              alt={`${card.cost} ${card.element}`}
              className="select-none drop-shadow-sm"
              draggable={false}
              style={{
                width: 'calc(var(--card-font-scale) * 0.55rem)',
                height: 'calc(var(--card-font-scale) * 0.55rem)',
                objectFit: 'contain',
              }}
            />
            {card.cost > 1 && (
              <span
                className="text-white/50 leading-none"
                style={{ fontSize: 'calc(var(--card-font-scale) * 0.4rem)' }}
              >
                ×<span className="font-bold text-white/80" style={{ fontSize: 'calc(var(--card-font-scale) * 0.5rem)' }}>{card.cost}</span>
              </span>
            )}
          </div>
        </div>

        {/* ── Art area — fills remaining space after text box ── */}
        <div
          className="relative mx-1 mt-1 rounded-md overflow-hidden"
          style={{
            flex: '1 1 0',
            minHeight: 0,
            background: artGradient,
          }}
        >
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${artPath})` }}
          />

          {/* Art frame border */}
          <div
            className="absolute inset-0 rounded-md pointer-events-none"
            style={{ border: `1px solid ${elementColor}55` }}
          />
        </div>

        {/* ── Type label (overlaps art/text boundary) ── */}
        <div className="flex justify-center" style={{ marginTop: 'calc(var(--card-font-scale) * -0.35rem)' }}>
          <span
            data-testid="hand-card-type-label"
            className="relative z-[3] inline-flex rounded px-1.5 py-[1px] text-white/85 uppercase tracking-wide backdrop-blur-sm"
            style={{
              fontSize: 'calc(var(--card-font-scale) * 0.44rem)',
              background: 'rgba(15, 23, 42, 0.85)',
              border: '1px solid rgba(148, 163, 184, 0.3)',
            }}
          >
            {isCreature ? 'Creature' : 'Spell'}
          </span>
        </div>

        {/* ── Text box (keywords + effects) — content-sized, art gets remaining space ── */}
        <div
          className="mx-1 mb-1 px-1.5 rounded-md overflow-hidden"
          style={{
            background: 'rgba(15, 23, 42, 0.8)',
            border: '1px solid rgba(148, 163, 184, 0.15)',
            marginTop: 'calc(var(--card-font-scale) * -0.3rem)',
            paddingTop: 'calc(var(--card-font-scale) * 0.4rem)',
            paddingBottom: 'calc(var(--card-font-scale) * 0.2rem)',
          }}
        >
          {/* Keywords — verbose shows full descriptions, compact shows badges */}
          {card.keywords.length > 0 && (
            verbose ? (
              <div className="flex flex-col gap-0.5 mb-0.5">
                {card.keywords.map((kw) => {
                  const kwDef = KEYWORD_REGISTRY[kw];
                  return (
                    <div
                      key={kw}
                      className="flex items-start gap-1 leading-tight"
                      style={{ fontSize: 'calc(var(--card-font-scale) * 0.5rem)' }}
                    >
                      <span>{kwDef.icon}</span>
                      <span className="text-white/80">
                        <span className="font-semibold text-amber-300 capitalize">{kwDef.name}</span>
                        {' \u2014 '}{kwDef.description}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-wrap gap-x-1 gap-y-0.5 mb-0.5">
                {card.keywords.map((kw) => (
                  <KeywordBadge key={kw} keyword={kw} />
                ))}
              </div>
            )
          )}

          {/* Spell effect */}
          {effect && (
            verbose ? (
              <p
                className="text-white/80 leading-tight"
                style={{ fontSize: 'calc(var(--card-font-scale) * 0.5rem)' }}
              >
                {effect.description}
              </p>
            ) : (
              <EffectShorthand effect={effect} />
            )
          )}

          {/* Flavor text */}
          {card.flavor && (
            <p
              className="text-white/30 italic leading-tight mt-0.5"
              style={{ fontSize: 'calc(var(--card-font-scale) * 0.45rem)' }}
            >
              {card.flavor}
            </p>
          )}
        </div>

        {/* ── Stat bar (creatures only) ── */}
        {isCreature && (
          <div className="flex justify-between items-center px-1 pb-1 pt-0.5">
            {/* Attack - bottom left */}
            <div
              className="flex items-center gap-0.5 rounded-md backdrop-blur-sm font-black text-red-100"
              style={{
                fontSize: 'calc(var(--card-font-scale) * 0.55rem)',
                padding: 'calc(var(--card-font-scale) * 0.1rem) calc(var(--card-font-scale) * 0.25rem)',
                background: 'rgba(239, 68, 68, 0.2)',
                border: '1px solid rgba(252, 165, 165, 0.5)',
              }}
            >
              <span className="leading-none">⚔</span>
              <span className="leading-none">{card.attack}</span>
            </div>

            {/* Health - bottom right */}
            <div
              className="flex items-center gap-0.5 rounded-md backdrop-blur-sm font-black text-emerald-100"
              style={{
                fontSize: 'calc(var(--card-font-scale) * 0.55rem)',
                padding: 'calc(var(--card-font-scale) * 0.1rem) calc(var(--card-font-scale) * 0.25rem)',
                background: 'rgba(34, 197, 94, 0.2)',
                border: '1px solid rgba(134, 239, 172, 0.5)',
              }}
            >
              <span className="leading-none">♥</span>
              <span className="leading-none">{card.health}</span>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
