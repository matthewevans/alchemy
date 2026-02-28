import { motion } from 'framer-motion';
import type { Permanent } from '@engine/types';
import { getCurrentHealth, getEffectiveAttack } from '@engine/types';
import { CARD_REGISTRY } from '@engine/cards';
import { KEYWORD_REGISTRY } from '@engine/keywords';
import { getElementColor, getElementBg } from './cardUtils';

interface BoardCardProps {
  permanent: Permanent;
  isAttacking: boolean;
  isBlocking: boolean;
  isValidTarget: boolean;
  isValidAttacker: boolean;
  isValidBlocker: boolean;
  onClick: () => void;
}

export function BoardCard({
  permanent,
  isAttacking,
  isBlocking,
  isValidTarget,
  isValidAttacker,
  isValidBlocker,
  onClick,
}: BoardCardProps) {
  const card = CARD_REGISTRY[permanent.cardId];
  const elementColor = getElementColor(card.element);
  const elementBg = getElementBg(card.element);
  const currentHealth = getCurrentHealth(permanent);
  const effectiveAttack = getEffectiveAttack(permanent);
  const isDamaged = permanent.damage > 0;
  const hasSwift = card.keywords.includes('swift');
  const isSummoningSick = permanent.summonedThisTurn && !hasSwift;
  const isInteractable = isValidAttacker || isValidBlocker;

  const displayName =
    card.name.length > 10 ? card.name.slice(0, 9) + '\u2026' : card.name;

  return (
    <motion.div
      className={`
        touch-target relative flex flex-col items-center rounded-lg cursor-pointer select-none overflow-hidden
        ${isValidTarget ? 'ring-2 ring-amber-400 animate-pulse' : ''}
        ${isInteractable ? 'ring-1 ring-white/40' : ''}
        ${isSummoningSick ? 'saturate-50' : ''}
      `}
      style={{
        width: 'var(--board-card-width)',
        height: 'var(--board-card-height)',
        borderWidth: 2,
        borderStyle: 'solid',
        borderColor: elementColor,
        backgroundColor: elementBg,
        fontSize: 'calc(var(--card-font-scale) * 1rem)',
      }}
      animate={{
        rotate: permanent.isTapped ? 15 : 0,
        x: isAttacking ? 4 : 0,
        y: isAttacking ? -4 : 0,
        boxShadow: isAttacking
          ? `0 0 12px 4px rgba(239, 68, 68, 0.5)`
          : isBlocking
            ? `0 0 12px 4px rgba(59, 130, 246, 0.5)`
            : '0 2px 8px rgba(0,0,0,0.3)',
      }}
      whileTap={{ scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      onClick={onClick}
    >
      {/* Card name */}
      <div
        className="w-full text-center text-white font-semibold truncate px-1 pt-1"
        style={{ fontSize: 'calc(var(--card-font-scale) * 0.55rem)' }}
      >
        {displayName}
      </div>

      {/* Attack / Health - large */}
      <div className="flex-1 flex items-center justify-center gap-2">
        <span
          className="text-white font-bold"
          style={{ fontSize: 'calc(var(--card-font-scale) * 1.25rem)' }}
          title="Attack"
        >
          {effectiveAttack}
        </span>
        <span
          className="text-slate-400"
          style={{ fontSize: 'calc(var(--card-font-scale) * 0.75rem)' }}
        >
          /
        </span>
        <span
          className={`font-bold ${isDamaged ? 'text-red-400' : 'text-white'}`}
          style={{ fontSize: 'calc(var(--card-font-scale) * 1.25rem)' }}
          title="Health"
        >
          {currentHealth}
        </span>
      </div>

      {/* Keyword icons */}
      {card.keywords.length > 0 && (
        <div
          className="flex gap-0.5 pb-1"
          style={{ fontSize: 'calc(var(--card-font-scale) * 0.6rem)' }}
        >
          {card.keywords.map((kw) => (
            <span key={kw} title={KEYWORD_REGISTRY[kw].description}>
              {KEYWORD_REGISTRY[kw].icon}
            </span>
          ))}
        </div>
      )}
    </motion.div>
  );
}
