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
        scale: [1.2, 1],
        transition: { duration: 0.4 },
      });
    }
    prevHealthRef.current = player.health;
  }, [player?.health, healthControls]);

  if (!player) return null;

  const label = isOpponent ? 'Opponent' : 'You';

  return (
    <div className="flex items-center gap-4 px-4 py-2">
      {/* Name label */}
      <span className="text-white/70 text-sm font-medium min-w-12">{label}</span>

      {/* Health */}
      <div className="flex items-center gap-1.5">
        <span className="text-red-400 text-lg" aria-label="Health">
          ♥
        </span>
        <motion.span
          className="text-white font-bold text-2xl tabular-nums min-w-8 text-center"
          animate={healthControls}
        >
          {player.health}
        </motion.span>
      </div>

      {/* Energy orbs */}
      <div className="flex items-center gap-1" aria-label="Energy">
        {Array.from({ length: energyCap }, (_, i) => {
          const isFilled = i < player.currentEnergy;
          const isEarned = i < player.maxEnergy;
          return (
            <div
              key={i}
              className={`w-3 h-3 rounded-full border transition-colors ${
                isFilled
                  ? 'bg-amber-400 border-amber-300 shadow-sm shadow-amber-400/50'
                  : isEarned
                    ? 'bg-amber-900/50 border-amber-600/50'
                    : 'bg-slate-700/30 border-slate-600/30'
              }`}
            />
          );
        })}
      </div>

      {/* Deck count */}
      <div className="flex items-center gap-1 text-slate-400 text-xs" title="Deck">
        <svg
          width="14"
          height="14"
          viewBox="0 0 16 16"
          fill="none"
          className="text-slate-400"
        >
          <rect x="2" y="1" width="10" height="14" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
          <rect x="4" y="3" width="10" height="14" rx="1.5" fill="currentColor" opacity="0.3" />
        </svg>
        <span className="tabular-nums">{player.deck.length}</span>
      </div>

      {/* Discard count */}
      <div className="flex items-center gap-1 text-slate-500 text-xs" title="Discard">
        <svg
          width="14"
          height="14"
          viewBox="0 0 16 16"
          fill="none"
          className="text-slate-500"
        >
          <rect x="1" y="3" width="10" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
          <rect x="3" y="1" width="10" height="12" rx="1.5" stroke="currentColor" strokeWidth="1" opacity="0.4" />
          <rect x="5" y="0" width="10" height="12" rx="1.5" stroke="currentColor" strokeWidth="0.5" opacity="0.2" />
        </svg>
        <span className="tabular-nums">{player.discard.length}</span>
      </div>
    </div>
  );
}
