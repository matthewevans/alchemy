import { motion, useAnimationControls } from 'framer-motion';
import { useEffect, useRef } from 'react';
import type { PlayerId } from '@engine/types';
import { useGameStore } from '@game/gameStore';
import { usePositionRegistry } from '@hooks/usePositionRegistry';

interface PlayerInfoProps {
  playerId: PlayerId;
  isOpponent: boolean;
  isValidTarget?: boolean;
  onClick?: () => void;
}

export function PlayerInfo({
  playerId,
  isOpponent,
  isValidTarget = false,
  onClick,
}: PlayerInfoProps) {
  const player = useGameStore((s) => s.state?.players[playerId]);
  const energyCap = useGameStore((s) => s.state?.ruleset.energyCap ?? 10);
  const healthControls = useAnimationControls();
  const prevHealthRef = useRef(player?.health);
  const healthRef = usePositionRegistry(`player:${playerId}`);
  const cardBackSrc = `${import.meta.env.BASE_URL}cardback.webp`;

  useEffect(() => {
    if (!player) return;
    if (prevHealthRef.current !== undefined && player.health < prevHealthRef.current) {
      healthControls.start({
        color: ['#ef4444', '#ffffff'],
        scale: [1.3, 1],
        transition: { duration: 0.4 },
      });
    }
    prevHealthRef.current = player.health;
  }, [player?.health, healthControls]);

  if (!player) return null;

  const content = (
    <>
      {/* Avatar circle */}
      <div
        className={`
          w-14 h-14 rounded-full flex items-center justify-center text-2xl font-bold transition-all
          ${isOpponent
            ? 'bg-gradient-to-br from-red-900 to-red-950 border-2 border-red-700/50'
            : 'bg-gradient-to-br from-blue-900 to-blue-950 border-2 border-blue-700/50'
          }
          ${isValidTarget ? 'ring-4 ring-amber-300/75 shadow-[0_0_18px_rgba(251,191,36,0.65)] scale-105' : ''}
        `}
      >
        <span className="text-white/80">{isOpponent ? '👹' : '🧙'}</span>
      </div>

      {/* Health */}
      <div ref={healthRef} className="flex items-center gap-1">
        <span className="text-red-400 text-sm">♥</span>
        <motion.span
          className="text-white font-black text-2xl tabular-nums leading-none"
          animate={healthControls}
        >
          {player.health}
        </motion.span>
      </div>

      {/* Energy orbs */}
      <div className="flex flex-wrap justify-center gap-1 max-w-[68px]" aria-label="Energy">
        {Array.from({ length: Math.min(player.maxEnergy, energyCap) }, (_, i) => {
          const isFilled = i < player.currentEnergy;
          return (
            <div
              key={i}
              className={`w-3 h-3 rounded-full border transition-colors ${
                isFilled
                  ? 'bg-amber-400 border-amber-300 shadow-sm shadow-amber-400/50'
                  : 'bg-amber-900/40 border-amber-700/40'
              }`}
            />
          );
        })}
      </div>

      {/* Library (deck) — mini card-back stack */}
      <div className="relative w-14 h-20 mt-1" title={`Deck: ${player.deck.length}`}>
        {/* Stacked card-back layers */}
        {player.deck.length > 2 && (
          <div className="absolute inset-0 translate-x-[2px] translate-y-[-2px] rounded bg-slate-800 border border-slate-700/40" />
        )}
        {player.deck.length > 0 && (
          <div className="absolute inset-0 rounded overflow-hidden bg-slate-900 border border-slate-600/40">
            <img
              src={cardBackSrc}
              alt="Deck"
              className="w-full h-full object-contain p-1 opacity-60"
              draggable={false}
            />
          </div>
        )}
        {/* Count badge */}
        <div className="absolute -bottom-1 -right-1 bg-slate-800 border border-slate-600/50 rounded-full w-6 h-6 flex items-center justify-center">
          <span className="text-white text-[11px] font-bold tabular-nums">{player.deck.length}</span>
        </div>
      </div>

      {/* Discard pile */}
      {player.discard.length > 0 && (
        <div className="relative w-14 h-20 mt-0.5" title={`Discard: ${player.discard.length}`}>
          <div className="absolute inset-0 rounded bg-slate-900/80 border border-slate-600/30" />
          <div className="absolute -bottom-1 -right-1 bg-slate-800 border border-slate-600/50 rounded-full w-6 h-6 flex items-center justify-center">
            <span className="text-slate-400 text-[11px] font-bold tabular-nums">{player.discard.length}</span>
          </div>
        </div>
      )}
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        className="appearance-none border-0 bg-transparent flex flex-col items-center gap-2 py-3 px-2 w-full cursor-pointer rounded-xl transition-colors hover:bg-white/6 focus-visible:bg-white/8"
        onClick={onClick}
        aria-label={`Target ${isOpponent ? 'opponent' : 'your'} hero`}
      >
        {content}
      </button>
    );
  }

  return <div className="flex flex-col items-center gap-2 py-3 px-2 w-full">{content}</div>;
}
