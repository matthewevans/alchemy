import { useState, useRef, useEffect } from 'react';
import { motion, useAnimationControls } from 'framer-motion';
import type { Permanent } from '@engine/types';
import { getCurrentHealth, getEffectiveAttack } from '@engine/types';
import { CARD_REGISTRY } from '@engine/cards';
import { usePositionRegistry } from '@hooks/usePositionRegistry';
import { useLongPress } from '@hooks/useLongPress';
import { getElementColor } from './cardUtils';
import { CardFace } from './CardFace';

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

  // Entrance glow flash
  const [showEntranceGlow, setShowEntranceGlow] = useState(true);
  useEffect(() => {
    const timer = setTimeout(() => setShowEntranceGlow(false), 600);
    return () => clearTimeout(timer);
  }, []);

  // Stat change flash animations
  const healthFlashControls = useAnimationControls();
  const attackFlashControls = useAnimationControls();
  const prevHealthRef = useRef(currentHealth);
  const prevAttackRef = useRef(effectiveAttack);

  useEffect(() => {
    if (prevHealthRef.current !== currentHealth) {
      const lost = currentHealth < prevHealthRef.current;
      healthFlashControls.start({
        scale: [1.5, 1],
        color: lost ? ['#ff4444', isDamaged ? '#fecaca' : '#bbf7d0'] : ['#34d399', '#bbf7d0'],
        transition: { duration: 0.4, ease: 'easeOut' },
      });
      prevHealthRef.current = currentHealth;
    }
  }, [currentHealth, isDamaged, healthFlashControls]);

  useEffect(() => {
    if (prevAttackRef.current !== effectiveAttack) {
      const buffed = effectiveAttack > prevAttackRef.current;
      attackFlashControls.start({
        scale: [1.5, 1],
        color: buffed ? ['#fbbf24', effectiveAttack > (card.attack ?? 0) ? '#bbf7d0' : '#fecaca'] : ['#ff4444', '#fecaca'],
        transition: { duration: 0.4, ease: 'easeOut' },
      });
      prevAttackRef.current = effectiveAttack;
    }
  }, [effectiveAttack, card.attack, attackFlashControls]);

  return (
    <motion.div
      ref={posRef}
      data-testid={`board-card-${permanent.permanentId}`}
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
      initial={{ opacity: 0, scale: 0.3, y: isOpponentCard ? -30 : 30 }}
      animate={{
        opacity: 1,
        rotate: permanent.isTapped ? 15 : 0,
        x: isBlocking ? (isOpponentCard ? -10 : 10) : 0,
        y: isAttacking
          ? (isOpponentCard ? 28 : -28)
          : isBlocking
            ? (isOpponentCard ? 12 : -12)
            : 0,
        scale: isAttacking || isBlocking ? 1.04 : 1,
      }}
      exit={{
        opacity: 0,
        scale: 0.15,
        rotate: isOpponentCard ? -12 : 12,
        filter: 'brightness(2) saturate(0)',
        transition: { duration: 0.4, ease: 'easeIn' },
      }}
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
            backgroundImage: isSelectedForBlock
              ? 'linear-gradient(135deg, #0ea5e9, #22d3ee, #0ea5e9)'
              : isAttacking
              ? 'linear-gradient(135deg, #ef4444, #f97316, #ef4444)'
              : isBlocking
                ? 'linear-gradient(135deg, #3b82f6, #60a5fa, #3b82f6)'
                : isValidTarget
                  ? 'linear-gradient(135deg, #06b6d4, #22d3ee, #06b6d4)'
                  : 'linear-gradient(135deg, rgba(255,255,255,0.3), rgba(255,255,255,0.5), rgba(255,255,255,0.3))',
            backgroundSize: '200% 200%',
          }}
          animate={{
            backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
            opacity: isSelectedForBlock || isAttacking || isBlocking || isValidTarget ? [0.7, 1, 0.7] : [0.4, 0.7, 0.4],
          }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}

      {/* Entrance glow flash */}
      {showEntranceGlow && (
        <motion.div
          className="absolute -inset-[4px] rounded-xl z-0 pointer-events-none"
          style={{
            boxShadow: `0 0 20px 8px ${elementColor}66, 0 0 40px 16px ${elementColor}33`,
            background: `radial-gradient(ellipse at center, ${elementColor}22, transparent 70%)`,
          }}
          initial={{ opacity: 1 }}
          animate={{ opacity: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        />
      )}

      {/* Summoning sickness frost overlay */}
      {isSummoningSick && (
        <motion.div
          className="absolute inset-0 rounded-xl z-[5] pointer-events-none"
          style={{
            background: 'linear-gradient(180deg, rgba(147, 197, 253, 0.15) 0%, rgba(147, 197, 253, 0.05) 40%, rgba(147, 197, 253, 0.18) 100%)',
            boxShadow: 'inset 0 0 12px rgba(147, 197, 253, 0.2)',
          }}
          animate={{
            opacity: [0.5, 0.8, 0.5],
          }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        >
          <motion.span
            className="absolute top-0.5 right-1 text-blue-300/60 font-bold select-none"
            style={{ fontSize: 'calc(var(--card-font-scale) * 0.5rem)' }}
            animate={{
              opacity: [0.3, 0.7, 0.3],
              y: [0, -2, 0],
            }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
          >
            💤
          </motion.span>
        </motion.div>
      )}

      {/* Entangle vine overlay (over art area) */}
      {isEntangled && (
        <motion.div
          className="absolute inset-0 rounded-xl z-[4] pointer-events-none"
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
          className="absolute inset-0 rounded-xl z-[4] pointer-events-none"
          style={{
            background: 'linear-gradient(180deg, rgba(250, 204, 21, 0.1) 0%, rgba(250, 204, 21, 0.2) 100%)',
            boxShadow: 'inset 0 0 8px rgba(250, 204, 21, 0.3)',
          }}
        />
      )}

      <CardFace
        cardId={permanent.cardId}
        viewLevel="normal"
        stats={{
          attack: effectiveAttack,
          health: currentHealth,
          baseAttack: card.attack ?? 0,
          isDamaged,
        }}
        statFlashControls={{
          attack: attackFlashControls,
          health: healthFlashControls,
        }}
        statusEffects={statusEffects}
      />
    </motion.div>
  );
}
