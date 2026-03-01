import { motion, useAnimationControls, useReducedMotion, AnimatePresence } from 'framer-motion';
import { useEffect, useRef } from 'react';
import type { PlayerId } from '@engine/types';
import { useGameStore } from '@game/gameStore';
import { usePositionRegistry } from '@hooks/usePositionRegistry';

interface PlayerInfoProps {
  playerId: PlayerId;
  isOpponent: boolean;
  isValidTarget?: boolean;
  onHeroClick?: () => void;
  onDiscardClick?: () => void;
}

export function PlayerInfo({
  playerId,
  isOpponent,
  isValidTarget = false,
  onHeroClick,
  onDiscardClick,
}: PlayerInfoProps) {
  const player = useGameStore((s) => s.state?.players[playerId]);
  const energyCap = useGameStore((s) => s.state?.ruleset.energyCap ?? 10);
  const isBattlePhase = useGameStore((s) => s.state?.phase.type === 'battle');
  const shouldReduceMotion = useReducedMotion();
  const healthControls = useAnimationControls();
  const energyGlowControls = useAnimationControls();
  const deckGlowControls = useAnimationControls();
  const prevHealthRef = useRef(player?.health);
  const prevMaxEnergyRef = useRef(player?.maxEnergy);
  const prevCurrentEnergyRef = useRef(player?.currentEnergy);
  const prevDeckLengthRef = useRef(player?.deck.length);
  const healthRef = usePositionRegistry(`player:${playerId}`);
  const cardBackSrc = `${import.meta.env.BASE_URL}cardback.webp`;

  const health = player?.health;
  const maxEnergy = player?.maxEnergy;
  const currentEnergy = player?.currentEnergy;
  const deckLength = player?.deck.length;

  // Health change animation
  useEffect(() => {
    if (health === undefined) return;
    if (prevHealthRef.current !== undefined && health < prevHealthRef.current) {
      const amount = prevHealthRef.current - health;
      const intensity = Math.min(amount / 3, 1);
      healthControls.start({
        color: ['#ff2222', '#ef4444', '#ffffff'],
        scale: [1.5 + intensity * 0.3, 1.1, 1],
        textShadow: [
          '0 0 20px rgba(255,34,34,0.8)',
          '0 0 10px rgba(255,34,34,0.4)',
          '0 0 0px rgba(255,34,34,0)',
        ],
        transition: { duration: 0.5 + intensity * 0.2 },
      });
    } else if (prevHealthRef.current !== undefined && health > prevHealthRef.current) {
      healthControls.start({
        color: ['#34d399', '#ffffff'],
        scale: [1.3, 1],
        textShadow: [
          '0 0 15px rgba(52,211,153,0.6)',
          '0 0 0px rgba(52,211,153,0)',
        ],
        transition: { duration: 0.4 },
      });
    }
    prevHealthRef.current = health;
  }, [health, healthControls]);

  // Energy change animation — golden flash when energy refills or max increases
  useEffect(() => {
    if (maxEnergy === undefined || currentEnergy === undefined) return;
    const prevMax = prevMaxEnergyRef.current;
    const prevCurrent = prevCurrentEnergyRef.current;

    if (prevMax !== undefined && (maxEnergy > prevMax || (prevCurrent !== undefined && currentEnergy > prevCurrent))) {
      energyGlowControls.start({
        boxShadow: [
          '0 0 16px rgba(251, 191, 36, 0.7)',
          '0 0 8px rgba(251, 191, 36, 0.3)',
          '0 0 0px rgba(251, 191, 36, 0)',
        ],
        transition: { duration: 0.6, ease: 'easeOut' },
      });
    }

    prevMaxEnergyRef.current = maxEnergy;
    prevCurrentEnergyRef.current = currentEnergy;
  }, [maxEnergy, currentEnergy, energyGlowControls]);

  // Deck draw animation — cyan flash when a card is drawn (deck shrinks)
  useEffect(() => {
    if (deckLength === undefined) return;
    if (prevDeckLengthRef.current !== undefined && deckLength < prevDeckLengthRef.current) {
      deckGlowControls.start({
        boxShadow: [
          '0 0 20px rgba(34, 211, 238, 0.8), 0 0 6px rgba(34, 211, 238, 0.4)',
          '0 0 10px rgba(34, 211, 238, 0.3)',
          '0 0 0px rgba(34, 211, 238, 0)',
        ],
        scale: [1, 1.06, 1],
        transition: { duration: 0.5, ease: 'easeOut' },
      });
    }
    prevDeckLengthRef.current = deckLength;
  }, [deckLength, deckGlowControls]);

  if (!player) return null;

  const showBattlePulse = isBattlePhase && !shouldReduceMotion;
  const accentRgb = isOpponent ? '239, 68, 68' : '96, 165, 250';

  const heroInner = (
    <div className="relative">
      {/* Outer ring glow */}
      <motion.div
        className="absolute -inset-1 rounded-full"
        style={{
          background: `radial-gradient(circle, rgba(${accentRgb}, 0.15) 0%, transparent 70%)`,
          border: `1.5px solid rgba(${accentRgb}, 0.25)`,
        }}
        animate={
          isValidTarget
            ? {
                borderColor: [
                  `rgba(251, 191, 36, 0.4)`,
                  `rgba(251, 191, 36, 0.9)`,
                  `rgba(251, 191, 36, 0.4)`,
                ],
                boxShadow: [
                  '0 0 8px rgba(251, 191, 36, 0.3)',
                  '0 0 20px rgba(251, 191, 36, 0.7)',
                  '0 0 8px rgba(251, 191, 36, 0.3)',
                ],
                scale: [1, 1.08, 1],
              }
            : showBattlePulse
              ? {
                  borderColor: [
                    `rgba(${accentRgb}, 0.2)`,
                    `rgba(${accentRgb}, 0.5)`,
                    `rgba(${accentRgb}, 0.2)`,
                  ],
                }
              : {}
        }
        transition={
          isValidTarget || showBattlePulse
            ? { duration: 1.5, repeat: Infinity, ease: 'easeInOut' }
            : { duration: 0.3 }
        }
      />
      {/* Inner portrait */}
      <motion.div
        className={`relative w-12 h-12 rounded-full flex items-center justify-center text-xl ${
          isOpponent
            ? 'bg-gradient-to-br from-red-900 to-red-950 border-2 border-red-700/40'
            : 'bg-gradient-to-br from-blue-900 to-blue-950 border-2 border-blue-700/40'
        }`}
        animate={isValidTarget ? { scale: [1.02, 1.08, 1.02] } : { scale: 1 }}
        transition={
          isValidTarget
            ? { duration: 1.5, repeat: Infinity, ease: 'easeInOut' }
            : { duration: 0.3 }
        }
      >
        <span className="text-white/80">{isOpponent ? '👹' : '🧙'}</span>
      </motion.div>
    </div>
  );

  const heroNode = onHeroClick ? (
    <button
      type="button"
      className="appearance-none border-0 bg-transparent p-0 m-0"
      onClick={onHeroClick}
      aria-label={`Target ${isOpponent ? 'opponent' : 'your'} hero`}
    >
      {heroInner}
    </button>
  ) : heroInner;

  const content = (
    <>
      {/* Section label */}
      <span className="text-[9px] font-semibold tracking-widest uppercase text-white/30">
        {isOpponent ? 'Enemy' : 'You'}
      </span>

      {heroNode}

      {/* Health */}
      <div ref={healthRef} data-testid={`health-${playerId}`} className="flex items-center gap-1.5">
        <span className="text-red-400 text-base leading-none">♥</span>
        <motion.span
          className="text-white font-black text-xl tabular-nums leading-none"
          animate={healthControls}
        >
          {player.health}
        </motion.span>
      </div>

      {/* Energy orbs */}
      <motion.div
        className="flex flex-wrap justify-center gap-[3px] max-w-[72px] rounded-lg px-1.5 py-1"
        style={{
          background: 'rgba(120, 53, 15, 0.08)',
          border: '1px solid rgba(251, 191, 36, 0.08)',
        }}
        aria-label="Energy"
        animate={energyGlowControls}
      >
        <AnimatePresence>
          {Array.from({ length: Math.min(player.maxEnergy, energyCap) }, (_, i) => {
            const isFilled = i < player.currentEnergy;
            return (
              <motion.div
                key={i}
                className="w-3.5 h-3.5 rounded-full"
                initial={{ scale: 0, opacity: 0 }}
                animate={{
                  scale: isFilled ? [1.4, 1] : [1.2, 0.85, 1],
                  opacity: 1,
                  backgroundColor: isFilled ? 'rgb(251, 191, 36)' : 'rgba(120, 53, 15, 0.35)',
                  borderColor: isFilled ? 'rgb(252, 211, 77)' : 'rgba(180, 83, 9, 0.3)',
                  boxShadow: isFilled
                    ? '0 0 6px rgba(251, 191, 36, 0.5), inset 0 -1px 2px rgba(0,0,0,0.2)'
                    : 'inset 0 1px 2px rgba(0,0,0,0.3)',
                }}
                style={{ borderWidth: 1.5, borderStyle: 'solid' }}
                transition={{
                  scale: { duration: 0.3, ease: 'easeOut' },
                  opacity: { duration: 0.2 },
                  backgroundColor: { duration: 0.25 },
                  borderColor: { duration: 0.25 },
                  boxShadow: { duration: 0.25 },
                }}
                layout
              />
            );
          })}
        </AnimatePresence>
      </motion.div>

      {/* Library (deck) — mini card-back stack */}
      <motion.div
        className="relative w-14 h-[72px] mt-1 rounded"
        title={`Deck: ${player.deck.length}`}
        animate={deckGlowControls}
      >
        {/* Stacked card-back layers */}
        {player.deck.length > 2 && (
          <div
            className="absolute inset-0 translate-x-[2px] translate-y-[-2px] rounded"
            style={{
              background: 'linear-gradient(135deg, rgb(30, 41, 59) 0%, rgb(15, 23, 42) 100%)',
              border: '1px solid rgba(100, 116, 139, 0.25)',
            }}
          />
        )}
        {player.deck.length > 0 && (
          <div
            className="absolute inset-0 rounded overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, rgb(30, 41, 59) 0%, rgb(15, 23, 42) 100%)',
              border: '1px solid rgba(100, 116, 139, 0.3)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
            }}
          >
            <img
              src={cardBackSrc}
              alt="Deck"
              className="w-full h-full object-contain p-0.5 opacity-50"
              draggable={false}
            />
          </div>
        )}
        {/* Count badge */}
        <div
          className="absolute -bottom-1.5 -right-1.5 rounded-full w-6 h-6 flex items-center justify-center"
          style={{
            background: 'linear-gradient(135deg, rgb(51, 65, 85) 0%, rgb(30, 41, 59) 100%)',
            border: '1.5px solid rgba(148, 163, 184, 0.25)',
            boxShadow: '0 1px 4px rgba(0,0,0,0.4)',
          }}
        >
          <span className="text-white text-[10px] font-bold tabular-nums">{player.deck.length}</span>
        </div>
      </motion.div>

      {/* Discard pile */}
      {player.discard.length > 0 && (
        <button
          type="button"
          className={`relative w-14 h-[72px] mt-0.5 ${onDiscardClick ? 'cursor-pointer hover:brightness-110' : 'cursor-default'}`}
          title={`Discard: ${player.discard.length}`}
          onClick={onDiscardClick}
          disabled={!onDiscardClick}
          data-testid={`discard-pile-${playerId}`}
        >
          <div
            className="absolute inset-0 rounded"
            style={{
              background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0.7) 100%)',
              border: '1px solid rgba(100, 116, 139, 0.2)',
            }}
          />
          <div
            className="absolute -bottom-1.5 -right-1.5 rounded-full w-6 h-6 flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, rgb(51, 65, 85) 0%, rgb(30, 41, 59) 100%)',
              border: '1.5px solid rgba(148, 163, 184, 0.2)',
              boxShadow: '0 1px 4px rgba(0,0,0,0.4)',
            }}
          >
            <span className="text-slate-400 text-[10px] font-bold tabular-nums">{player.discard.length}</span>
          </div>
        </button>
      )}
    </>
  );

  return (
    <div
      className="flex flex-col items-center gap-1.5 py-3 px-2 w-full"
      style={{
        background: `linear-gradient(180deg, rgba(${accentRgb}, 0.04) 0%, transparent 60%)`,
      }}
    >
      {content}
    </div>
  );
}
