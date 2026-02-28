import { motion } from 'framer-motion';
import { useGameStore } from '@game/gameStore';
import { useGameDispatch } from '@game/GameDispatchContext';
import type { GameAction } from '@engine/types';

const PHASES = [
  { key: 'draw', label: 'Draw', icon: '🂠' },
  { key: 'energy', label: 'Energy', icon: '⚡' },
  { key: 'play', label: 'Play', icon: '🃏' },
  { key: 'battle', label: 'Battle', icon: '⚔️' },
  { key: 'end', label: 'End', icon: '🏁' },
] as const;

const PHASE_ORDER: Record<string, number> = {
  draw: 0,
  energy: 1,
  play: 2,
  targeting: 2, // targeting is sub-phase of play
  battle: 3,
  end: 4,
};

function getAdvanceAction(phaseType: string): { action: GameAction; label: string } | null {
  switch (phaseType) {
    case 'play':
      return { action: { type: 'ADVANCE_PHASE' }, label: 'Battle!' };
    case 'end':
      return { action: { type: 'ADVANCE_PHASE' }, label: 'End Turn' };
    default:
      return null;
  }
}

export function PhaseStrip() {
  const phase = useGameStore((s) => s.state?.phase);
  const legalActions = useGameStore((s) => s.legalActions);
  const humanPlayer = useGameStore((s) => s.humanPlayer);
  const dispatch = useGameDispatch();

  if (!phase) return null;

  const currentPhaseType = phase.type;
  const currentOrder = PHASE_ORDER[currentPhaseType] ?? -1;
  const canAdvance = legalActions.some((a) => a.type === 'ADVANCE_PHASE');
  const advanceInfo = getAdvanceAction(currentPhaseType);

  return (
    <div className="flex items-center justify-center gap-2 px-4 py-1">
      {/* Phase icons */}
      <div className="flex items-center gap-1">
        {PHASES.map((p) => {
          const order = PHASE_ORDER[p.key];
          const isActive = p.key === currentPhaseType || (currentPhaseType === 'targeting' && p.key === 'play');
          const isCompleted = order < currentOrder;

          return (
            <motion.div
              key={p.key}
              className={`
                flex flex-col items-center px-1.5 py-0.5 rounded-md text-xs select-none
                ${isActive ? 'text-amber-300' : isCompleted ? 'text-slate-500' : 'text-white/50'}
              `}
              animate={
                isActive
                  ? { scale: [1, 1.08, 1], filter: 'drop-shadow(0 0 4px rgba(251, 191, 36, 0.6))' }
                  : { scale: 1, filter: 'drop-shadow(0 0 0px transparent)' }
              }
              transition={isActive ? { duration: 1.5, repeat: Infinity, ease: 'easeInOut' } : { duration: 0.2 }}
            >
              <span className="text-base leading-none">{p.icon}</span>
              <span className="text-[9px] mt-0.5 font-medium">{p.label}</span>
            </motion.div>
          );
        })}
      </div>

      {/* Advance button */}
      {canAdvance && advanceInfo && (
        <motion.button
          className={`
            ml-2 px-4 py-1.5 rounded-lg font-bold text-sm text-white shadow-md
            ${currentPhaseType === 'play'
              ? 'bg-gradient-to-b from-red-500 to-orange-600 shadow-red-500/30'
              : currentPhaseType === 'end'
                ? 'bg-gradient-to-b from-indigo-500 to-indigo-700 shadow-indigo-500/30'
                : 'bg-gradient-to-b from-slate-500 to-slate-600 shadow-slate-500/20'
            }
          `}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => dispatch(advanceInfo.action, humanPlayer)}
        >
          {advanceInfo.label}
        </motion.button>
      )}
    </div>
  );
}
