import { motion, useAnimationControls } from 'framer-motion';
import { useEffect, useRef } from 'react';
import type { PlayerId } from '@engine/types';
import { useGameStore } from '@game/gameStore';

interface PlayerInfoProps {
  playerId: PlayerId;
  isOpponent: boolean;
}

export function PlayerInfo({ playerId, isOpponent }: PlayerInfoProps) {
  const player = useGameStore((s) => s.state?.players[playerId]);
  const energyCap = useGameStore((s) => s.state?.ruleset.energyCap ?? 10);
  const healthControls = useAnimationControls();
  const prevHealthRef = useRef(player?.health);

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

  return (
    <div className="flex flex-col items-center gap-1 py-2 px-1 w-full">
      {/* Avatar circle */}
      <div
        className={`
          w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold
          ${isOpponent
            ? 'bg-gradient-to-br from-red-900 to-red-950 border-2 border-red-700/50'
            : 'bg-gradient-to-br from-blue-900 to-blue-950 border-2 border-blue-700/50'
          }
        `}
      >
        <span className="text-white/80">{isOpponent ? '👹' : '🧙'}</span>
      </div>

      {/* Health */}
      <div className="flex items-center gap-0.5">
        <span className="text-red-400 text-xs">♥</span>
        <motion.span
          className="text-white font-black text-lg tabular-nums leading-none"
          animate={healthControls}
        >
          {player.health}
        </motion.span>
      </div>

      {/* Energy orbs */}
      <div className="flex flex-wrap justify-center gap-0.5 max-w-[44px]" aria-label="Energy">
        {Array.from({ length: Math.min(player.maxEnergy, energyCap) }, (_, i) => {
          const isFilled = i < player.currentEnergy;
          return (
            <div
              key={i}
              className={`w-2 h-2 rounded-full border transition-colors ${
                isFilled
                  ? 'bg-amber-400 border-amber-300 shadow-sm shadow-amber-400/50'
                  : 'bg-amber-900/40 border-amber-700/40'
              }`}
            />
          );
        })}
      </div>

      {/* Library (deck) — mini card-back stack */}
      <div className="relative w-10 h-14 mt-1" title={`Deck: ${player.deck.length}`}>
        {/* Stacked card-back layers */}
        {player.deck.length > 2 && (
          <div className="absolute inset-0 translate-x-[2px] translate-y-[-2px] rounded bg-slate-800 border border-slate-700/40" />
        )}
        {player.deck.length > 0 && (
          <div className="absolute inset-0 rounded overflow-hidden bg-slate-900 border border-slate-600/40">
            <img
              src="/cardback.png"
              alt="Deck"
              className="w-full h-full object-contain p-0.5 opacity-60"
              draggable={false}
            />
          </div>
        )}
        {/* Count badge */}
        <div className="absolute -bottom-1 -right-1 bg-slate-800 border border-slate-600/50 rounded-full w-5 h-5 flex items-center justify-center">
          <span className="text-white text-[9px] font-bold tabular-nums">{player.deck.length}</span>
        </div>
      </div>

      {/* Discard pile */}
      {player.discard.length > 0 && (
        <div className="relative w-10 h-14 mt-0.5" title={`Discard: ${player.discard.length}`}>
          <div className="absolute inset-0 rounded bg-slate-900/80 border border-slate-600/30" />
          <div className="absolute -bottom-1 -right-1 bg-slate-800 border border-slate-600/50 rounded-full w-5 h-5 flex items-center justify-center">
            <span className="text-slate-400 text-[9px] font-bold tabular-nums">{player.discard.length}</span>
          </div>
        </div>
      )}
    </div>
  );
}
