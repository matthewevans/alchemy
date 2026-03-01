import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Permanent } from '@engine/types';
import { getCurrentHealth, getEffectiveAttack } from '@engine/types';
import { CARD_REGISTRY } from '@engine/cards';
import { KEYWORD_REGISTRY } from '@engine/keywords';
import { usePositionRegistry } from '@hooks/usePositionRegistry';
import { useLongPress } from '@hooks/useLongPress';
import {
  getElementColor,
  getElementArtGradient,
  getElementIconPath,
  getElementFrameGradient,
  getCardArtPath,
} from './cardUtils';

interface BoardCardProps {
  permanent: Permanent;
  isAttacking: boolean;
  isBlocking: boolean;
  isValidTarget: boolean;
  isValidAttacker: boolean;
  isValidBlocker: boolean;
  isSelectedForBlock?: boolean;
  isOpponentCard: boolean;
  cardWidth?: number;
  cardHeight?: number;
  onClick: () => void;
  onLongPress?: () => void;
}

interface StatusEffect {
  icon: string;
  label: string;
  color: string;
}

function getActiveStatusEffects(permanent: Permanent): StatusEffect[] {
  const effects: StatusEffect[] = [];
  if (permanent.cantAttackThisTurn) {
    effects.push({ icon: '🌿', label: 'Rooted', color: '#65a30d' });
  }
  if (permanent.temporaryAttackBonus > 0) {
    effects.push({ icon: '⚔', label: `+${permanent.temporaryAttackBonus}`, color: '#f59e0b' });
  }
  if (permanent.temporaryHealthBonus > 0) {
    effects.push({ icon: '♥', label: `+${permanent.temporaryHealthBonus}`, color: '#22c55e' });
  }
  return effects;
}

export function BoardCard({
  permanent,
  isAttacking,
  isBlocking,
  isValidTarget,
  isValidAttacker,
  isValidBlocker,
  isSelectedForBlock = false,
  isOpponentCard,
  cardWidth,
  cardHeight,
  onClick,
  onLongPress: onLongPressProp,
}: BoardCardProps) {
  const longPress = useLongPress(() => onLongPressProp?.());
  const card = CARD_REGISTRY[permanent.cardId];
  const elementColor = getElementColor(card.element);
  const artGradient = getElementArtGradient(card.element);
  const elementIconPath = getElementIconPath(card.element);
  const frameGradient = getElementFrameGradient(card.element);
  const artPath = getCardArtPath(card.id, card.element);
  const currentHealth = getCurrentHealth(permanent);
  const effectiveAttack = getEffectiveAttack(permanent);
  const isDamaged = permanent.damage > 0;
  const isBuffed = permanent.temporaryAttackBonus > 0 || permanent.temporaryHealthBonus > 0;
  const hasSwift = card.keywords.includes('swift');
  const isSummoningSick = permanent.summonedThisTurn && !hasSwift;
  const isEntangled = permanent.cantAttackThisTurn && !isSummoningSick;
  const isInteractable = isValidAttacker || isValidBlocker;
  const posRef = usePositionRegistry(permanent.permanentId);
  const baseZIndex = isOpponentCard ? 46 : 24;
  const activeZIndex = isOpponentCard ? 54 : 32;
  const statusEffects = getActiveStatusEffects(permanent);

  return (
    <motion.div
      ref={posRef}
      className={`
        touch-target relative flex flex-col cursor-pointer select-none
        ${isSummoningSick ? 'saturate-50 brightness-75' : ''}
      `}
      style={{
        width: cardWidth ? `${cardWidth}px` : 'var(--board-card-width)',
        height: cardHeight ? `${cardHeight}px` : 'var(--board-card-height)',
        fontSize: 'calc(var(--card-font-scale) * 1rem)',
        zIndex: isAttacking || isBlocking ? activeZIndex : baseZIndex,
      }}
      layout
      animate={{
        rotate: permanent.isTapped ? 15 : 0,
        x: isBlocking ? (isOpponentCard ? -10 : 10) : 0,
        y: isAttacking
          ? (isOpponentCard ? 28 : -28)
          : isBlocking
            ? (isOpponentCard ? 12 : -12)
            : 0,
        scale: isAttacking || isBlocking ? 1.04 : 1,
      }}
      exit={{ opacity: 0, scale: 0.6, transition: { duration: 0.3 } }}
      whileTap={{ scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      onClick={() => { if (!longPress.firedRef.current) onClick(); }}
      onPointerDown={longPress.onPointerDown}
      onPointerMove={longPress.onPointerMove}
      onPointerUp={longPress.onPointerUp}
      onPointerCancel={longPress.onPointerCancel}
    >
      {/* Combat / interaction glow ring */}
      {(isAttacking || isBlocking || isValidTarget || isInteractable || isSelectedForBlock) && (
        <motion.div
          className="absolute -inset-[2px] rounded-xl z-0 pointer-events-none"
          style={{
            background: isSelectedForBlock
              ? 'linear-gradient(135deg, #0ea5e9, #22d3ee, #0ea5e9)'
              : isAttacking
              ? 'linear-gradient(135deg, #ef4444, #f97316, #ef4444)'
              : isBlocking
                ? 'linear-gradient(135deg, #3b82f6, #60a5fa, #3b82f6)'
                : isValidTarget
                  ? 'linear-gradient(135deg, #f59e0b, #fbbf24, #f59e0b)'
                  : 'linear-gradient(135deg, rgba(255,255,255,0.3), rgba(255,255,255,0.5), rgba(255,255,255,0.3))',
            backgroundSize: '200% 200%',
          }}
          animate={{
            backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
            opacity: isSelectedForBlock || isAttacking || isBlocking ? [0.7, 1, 0.7] : [0.4, 0.7, 0.4],
          }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}

      {/* Card frame */}
      <div
        className="absolute inset-0 rounded-xl z-[1]"
        style={{ background: frameGradient, opacity: 0.6 }}
      />

      {/* Card inner body */}
      <div className="relative z-[2] flex flex-col m-[2px] rounded-[10px] overflow-hidden h-full bg-slate-900">
        {/* ── Name bar ── */}
        <div
          className="flex items-center gap-0.5 px-1 py-[1px]"
          style={{
            background: `linear-gradient(90deg, ${elementColor}33, ${elementColor}11)`,
            borderBottom: `1px solid ${elementColor}33`,
          }}
        >
          <img
            src={elementIconPath}
            alt={card.element}
            className="shrink-0 select-none"
            draggable={false}
            style={{
              width: 'calc(var(--card-font-scale) * 0.6rem)',
              height: 'calc(var(--card-font-scale) * 0.6rem)',
              objectFit: 'contain',
            }}
          />
          <span
            className="text-white font-bold truncate text-center flex-1"
            style={{ fontSize: 'calc(var(--card-font-scale) * 0.5rem)' }}
          >
            {card.name}
          </span>
        </div>

        {/* ── Art area ── */}
        <div
          className="relative mx-[3px] mt-[3px] rounded flex items-center justify-center"
          style={{
            flex: '1 1 0',
            background: artGradient,
          }}
        >
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${artPath})` }}
          />

          {/* Entangle overlay — vines/root visual treatment */}
          {isEntangled && (
            <motion.div
              className="absolute inset-0 rounded pointer-events-none"
              style={{
                background: 'linear-gradient(180deg, transparent 20%, rgba(22, 101, 52, 0.5) 70%, rgba(22, 101, 52, 0.7) 100%)',
              }}
              initial={{ opacity: 0 }}
              animate={{ opacity: [0.6, 0.85, 0.6] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            />
          )}

          {/* Buff glow overlay */}
          {isBuffed && !isEntangled && (
            <div
              className="absolute inset-0 rounded pointer-events-none"
              style={{
                background: 'linear-gradient(180deg, rgba(250, 204, 21, 0.1) 0%, rgba(250, 204, 21, 0.2) 100%)',
                boxShadow: 'inset 0 0 8px rgba(250, 204, 21, 0.3)',
              }}
            />
          )}

          {/* Keyword icons overlay */}
          {card.keywords.length > 0 && (
            <div
              className="absolute top-0.5 right-0.5 flex gap-0.5"
              style={{ fontSize: 'calc(var(--card-font-scale) * 0.55rem)' }}
            >
              {card.keywords.map((kw) => (
                <BoardKeywordIcon key={kw} keyword={kw} />
              ))}
            </div>
          )}

          {/* Art frame border */}
          <div
            className="absolute inset-0 rounded pointer-events-none"
            style={{ border: `1px solid ${isEntangled ? '#166534' : elementColor + '44'}` }}
          />
        </div>

        {/* ── Status bar (active buffs/debuffs) ── */}
        {statusEffects.length > 0 && (
          <div
            className="flex items-center justify-center gap-1 mx-[3px] px-1"
            style={{
              height: 'calc(var(--card-font-scale) * 0.7rem)',
              fontSize: 'calc(var(--card-font-scale) * 0.4rem)',
              background: 'rgba(15, 23, 42, 0.8)',
            }}
          >
            {statusEffects.map((effect) => (
              <span
                key={effect.label}
                className="flex items-center gap-[1px] font-semibold"
                style={{ color: effect.color }}
              >
                <span>{effect.icon}</span>
                <span>{effect.label}</span>
              </span>
            ))}
          </div>
        )}

        {/* ── Stat bar ── */}
        <div className="flex justify-between items-center px-[3px] py-[2px]">
          {/* Attack */}
          <div
            className="flex items-center gap-0.5 rounded-md font-black"
            style={{
              fontSize: 'calc(var(--card-font-scale) * 0.55rem)',
              padding: 'calc(var(--card-font-scale) * 0.05rem) calc(var(--card-font-scale) * 0.2rem)',
              color: effectiveAttack > (card.attack ?? 0) ? '#bbf7d0' : '#fecaca',
              background: effectiveAttack > (card.attack ?? 0)
                ? 'rgba(34, 197, 94, 0.2)'
                : 'rgba(239, 68, 68, 0.2)',
              border: effectiveAttack > (card.attack ?? 0)
                ? '1px solid rgba(134, 239, 172, 0.5)'
                : '1px solid rgba(252, 165, 165, 0.5)',
            }}
          >
            <span className="leading-none">⚔</span>
            <span className="leading-none">{effectiveAttack}</span>
          </div>

          {/* Health */}
          <div
            className="flex items-center gap-0.5 rounded-md font-black"
            style={{
              fontSize: 'calc(var(--card-font-scale) * 0.55rem)',
              padding: 'calc(var(--card-font-scale) * 0.05rem) calc(var(--card-font-scale) * 0.2rem)',
              color: isDamaged ? '#fecaca' : '#bbf7d0',
              background: isDamaged
                ? 'rgba(239, 68, 68, 0.2)'
                : 'rgba(34, 197, 94, 0.2)',
              border: isDamaged
                ? '1px solid rgba(252, 165, 165, 0.5)'
                : '1px solid rgba(134, 239, 172, 0.5)',
            }}
          >
            <span className="leading-none">♥</span>
            <span className="leading-none">{currentHealth}</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function BoardKeywordIcon({ keyword }: { keyword: import('@engine/types').Keyword }) {
  const [hovered, setHovered] = useState(false);
  const kwDef = KEYWORD_REGISTRY[keyword];

  return (
    <span
      className="relative drop-shadow-md cursor-help"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={(e) => { e.stopPropagation(); setHovered((prev) => !prev); }}
    >
      {kwDef.icon}
      <AnimatePresence>
        {hovered && (
          <motion.div
            className="absolute top-full right-0 mt-1 px-2 py-1 rounded-lg bg-slate-950 border border-slate-300/30 shadow-[0_8px_24px_rgba(0,0,0,0.7)] whitespace-nowrap z-50 pointer-events-none"
            style={{ fontSize: '11px' }}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.15 }}
          >
            <span className="text-amber-300 font-bold capitalize">{kwDef.name}</span>
            <span className="text-white"> — {kwDef.description}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </span>
  );
}
