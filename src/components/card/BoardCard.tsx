import { useState, useRef, useEffect } from 'react';
import { motion, useAnimationControls } from 'framer-motion';
import type { Permanent } from '@engine/types';
import { getEffectiveAttack } from '@engine/types';
import { CARD_REGISTRY } from '@engine/cards';
import { useAnimationStore } from '@game/animationStore';
import { useGameStore } from '@game/gameStore';
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

const BUFF_PARTICLES = [
  { left: '14%', top: '20%', color: 'rgba(253, 224, 71, 1)', driftX: -10, driftY: -18, delay: 0, duration: 1.3 },
  { left: '36%', top: '14%', color: 'rgba(250, 204, 21, 1)', driftX: 12, driftY: -14, delay: 0.18, duration: 1.5 },
  { left: '64%', top: '22%', color: 'rgba(52, 211, 153, 1)', driftX: -13, driftY: -12, delay: 0.32, duration: 1.4 },
  { left: '82%', top: '28%', color: 'rgba(125, 211, 252, 1)', driftX: 11, driftY: -13, delay: 0.47, duration: 1.45 },
  { left: '18%', top: '72%', color: 'rgba(192, 132, 252, 1)', driftX: -12, driftY: -11, delay: 0.61, duration: 1.35 },
  { left: '46%', top: '80%', color: 'rgba(56, 189, 248, 1)', driftX: 10, driftY: -15, delay: 0.76, duration: 1.55 },
  { left: '74%', top: '74%', color: 'rgba(251, 191, 36, 1)', driftX: -11, driftY: -14, delay: 0.89, duration: 1.5 },
  { left: '86%', top: '52%', color: 'rgba(110, 231, 183, 1)', driftX: -10, driftY: -10, delay: 1.02, duration: 1.42 },
  { left: '10%', top: '48%', color: 'rgba(250, 204, 21, 1)', driftX: 12, driftY: -12, delay: 1.12, duration: 1.46 },
] as const;

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

  // During combat animations, use the per-step display damage so health updates
  // per-exchange rather than jumping to the final value immediately.
  const displayDamage = useAnimationStore((s) => s.displayCreatureDamage?.[permanent.permanentId]);
  const learningPhase = useGameStore((s) => s.state?.phase);
  const humanPlayer = useGameStore((s) => s.humanPlayer);
  const activeDamage = displayDamage ?? permanent.damage;
  const currentHealth = permanent.health + permanent.temporaryHealthBonus - activeDamage;
  const effectiveAttack = getEffectiveAttack(permanent);
  const isDamaged = activeDamage > 0;
  const isBuffed = permanent.temporaryAttackBonus > 0 || permanent.temporaryHealthBonus > 0;
  const hasSwift = card.keywords.includes('swift');
  const isSummoningSick = permanent.summonedThisTurn && !hasSwift;
  const isEntangled = permanent.cantAttackThisTurn && !isSummoningSick;
  const isInteractable = isValidAttacker || isValidBlocker;
  const posRef = usePositionRegistry(permanent.permanentId);
  const baseZIndex = isOpponentCard ? 46 : 24;
  const activeZIndex = isOpponentCard ? 54 : 32;
  const statusEffects = getActiveStatusEffects(permanent);
  const isLearningRewardTarget =
    learningPhase?.type === 'learning'
    && learningPhase.player === humanPlayer
    && learningPhase.reward.permanentId === permanent.permanentId;

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
  const prevDamageRef = useRef(activeDamage);
  const prevTemporaryHealthBonusRef = useRef(permanent.temporaryHealthBonus);

  useEffect(() => {
    if (prevHealthRef.current !== currentHealth) {
      const lost = currentHealth < prevHealthRef.current;
      const tookDamage = activeDamage > prevDamageRef.current;
      const lostTemporaryHealthBonus = permanent.temporaryHealthBonus < prevTemporaryHealthBonusRef.current;
      const flashColors = lost
        ? tookDamage
          ? ['#ff4444', '#fecaca']
          : lostTemporaryHealthBonus
            ? ['#fbbf24', '#fde68a']
            : isDamaged
              ? ['#ff4444', '#fecaca']
              : ['#f59e0b', '#bbf7d0']
        : ['#34d399', '#bbf7d0'];
      healthFlashControls.start({
        scale: [1.5, 1],
        color: flashColors,
        transition: { duration: 0.4, ease: 'easeOut' },
      });
    }
    prevHealthRef.current = currentHealth;
    prevDamageRef.current = activeDamage;
    prevTemporaryHealthBonusRef.current = permanent.temporaryHealthBonus;
  }, [
    activeDamage,
    currentHealth,
    healthFlashControls,
    isDamaged,
    permanent.temporaryHealthBonus,
  ]);

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
      onContextMenu={(e) => { e.preventDefault(); onLongPressProp?.(); }}
      onPointerDown={longPress.onPointerDown}
      onPointerMove={longPress.onPointerMove}
      onPointerUp={longPress.onPointerUp}
      onPointerCancel={longPress.onPointerCancel}
    >
      {/* Combat / interaction glow ring */}
      {(isAttacking || isBlocking || isValidTarget || isInteractable || isSelectedForBlock) && (
        <motion.div
          className="absolute -inset-[2px] rounded-xl z-0 pointer-events-none"
          style={isValidTarget ? {
            border: '2px solid rgba(6, 182, 212, 0.6)',
          } : {
            backgroundImage: isSelectedForBlock
              ? 'linear-gradient(135deg, #0ea5e9, #22d3ee, #0ea5e9)'
              : isAttacking
              ? 'linear-gradient(135deg, #ef4444, #f97316, #ef4444)'
              : isBlocking
                ? 'linear-gradient(135deg, #3b82f6, #60a5fa, #3b82f6)'
                : 'linear-gradient(135deg, rgba(255,255,255,0.3), rgba(255,255,255,0.5), rgba(255,255,255,0.3))',
            backgroundSize: '200% 200%',
          }}
          animate={isValidTarget ? {
            borderColor: [
              'rgba(6, 182, 212, 0.4)',
              'rgba(6, 182, 212, 0.9)',
              'rgba(6, 182, 212, 0.4)',
            ],
            boxShadow: [
              '0 0 8px rgba(6, 182, 212, 0.3)',
              '0 0 16px rgba(6, 182, 212, 0.7)',
              '0 0 8px rgba(6, 182, 212, 0.3)',
            ],
          } : {
            backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
            opacity: isSelectedForBlock || isAttacking || isBlocking ? [0.7, 1, 0.7] : [0.4, 0.7, 0.4],
          }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}

      {/* Learning reward target pulse */}
      {isLearningRewardTarget && (
        <motion.div
          className="absolute -inset-[3px] rounded-xl z-[12] pointer-events-none"
          style={{
            border: '2px solid rgba(110, 231, 183, 0.95)',
            boxShadow: '0 0 0 1px rgba(16, 185, 129, 0.6), 0 0 22px rgba(16, 185, 129, 0.45)',
          }}
          animate={{
            opacity: [0.55, 1, 0.55],
            scale: [1, 1.02, 1],
          }}
          transition={{ duration: 1.1, repeat: Infinity, ease: 'easeInOut' }}
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

      {/* Summoning sickness frost overlay (inside filtered area) */}
      {isSummoningSick && (
        <div
          className="absolute inset-0 rounded-xl z-[5] pointer-events-none"
          style={{
            background: 'linear-gradient(180deg, rgba(147, 197, 253, 0.15) 0%, rgba(147, 197, 253, 0.05) 40%, rgba(147, 197, 253, 0.18) 100%)',
            boxShadow: 'inset 0 0 12px rgba(147, 197, 253, 0.2)',
          }}
        />
      )}

      {/* Summoning sickness 💤 badge — outside filter so it stays bright */}
      {isSummoningSick && (
        <motion.div
          className="absolute inset-0 z-[10] flex items-center justify-center pointer-events-none"
          animate={{
            opacity: [0.85, 1, 0.85],
          }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        >
          <motion.span
            className="select-none rounded-full px-1.5 py-0.5"
            style={{
              fontSize: 'calc(var(--card-font-scale) * 1.5rem)',
              background: 'rgba(0, 0, 0, 0.55)',
              filter: 'saturate(2) brightness(1.33) drop-shadow(0 2px 6px rgba(0,0,0,0.8))',
            }}
            animate={{ y: [0, -4, 0] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
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

      {/* Buff particles */}
      {isBuffed && (
        <div className="absolute inset-0 rounded-xl z-[13] pointer-events-none overflow-hidden" aria-hidden="true">
          <motion.div
            className="absolute -inset-[4px] rounded-xl"
            style={{
              background: 'conic-gradient(from 0deg, rgba(250,204,21,0.05), rgba(52,211,153,0.18), rgba(56,189,248,0.05), rgba(250,204,21,0.16), rgba(250,204,21,0.05))',
              filter: 'blur(8px)',
              mixBlendMode: 'screen',
            }}
            animate={{
              rotate: [0, 360],
              opacity: [0.35, 0.8, 0.35],
            }}
            transition={{
              rotate: { duration: 3.2, repeat: Infinity, ease: 'linear' },
              opacity: { duration: 1.4, repeat: Infinity, ease: 'easeInOut' },
            }}
          />
          {BUFF_PARTICLES.map((particle, index) => (
            <motion.span
              key={`${permanent.permanentId}-buff-particle-${index}`}
              className="absolute rounded-full"
              style={{
                left: particle.left,
                top: particle.top,
                width: '0.52rem',
                height: '0.52rem',
                background: particle.color,
                boxShadow: `0 0 14px ${particle.color}, 0 0 24px ${particle.color.replace('1)', '0.45)')}`,
              }}
              animate={{
                x: [0, particle.driftX, 0],
                y: [0, particle.driftY, 0],
                opacity: [0.24, 1, 0.24],
                scale: [0.6, 1.3, 0.6],
              }}
              transition={{
                duration: particle.duration,
                delay: particle.delay,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            />
          ))}
        </div>
      )}

      <CardFace
        cardId={permanent.cardId}
        viewLevel={cardWidth && cardWidth < 90 ? 'compact' : 'normal'}
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
