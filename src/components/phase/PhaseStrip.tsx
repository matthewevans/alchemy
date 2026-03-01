import { motion, useReducedMotion } from 'framer-motion';
import { useGameStore } from '@game/gameStore';
import { useGameDispatch } from '@game/GameDispatchContext';
import type { GameAction } from '@engine/types';
import { gameButtonClass } from '@components/ui/buttonStyles';

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
  const shouldReduceMotion = useReducedMotion();

  if (!phase) return null;

  const currentPhaseType = phase.type;
  const currentOrder = PHASE_ORDER[currentPhaseType] ?? -1;
  const canAdvance = legalActions.some((a) => a.type === 'ADVANCE_PHASE');
  const advanceInfo = getAdvanceAction(currentPhaseType);

  return (
    <div
      className="fixed z-40 pointer-events-none rounded-lg border border-white/15 bg-slate-950/85 backdrop-blur-sm px-1.5 py-0.5"
      style={{
        right: 'calc(env(safe-area-inset-right) + 7rem)',
        bottom: 'calc(env(safe-area-inset-bottom) + 0.65rem)',
      }}
    >
      <div className="flex items-center justify-center gap-1.5">
      {/* Phase icons */}
      <div className="flex items-center gap-0.5 pointer-events-none">
        {PHASES.map((p) => {
          const order = PHASE_ORDER[p.key];
          const isActive = p.key === currentPhaseType || (currentPhaseType === 'targeting' && p.key === 'play');
          const isCompleted = order < currentOrder;

          return (
            <motion.div
              key={p.key}
              className={`
                flex flex-col items-center px-1 py-0.5 rounded select-none pointer-events-none
                ${isActive ? 'text-amber-300' : isCompleted ? 'text-slate-500' : 'text-white/50'}
              `}
              animate={
                !shouldReduceMotion && isActive
                  ? { scale: [1, 1.08, 1], filter: 'drop-shadow(0 0 4px rgba(251, 191, 36, 0.6)) grayscale(0) brightness(1)' }
                  : { scale: 1, filter: 'drop-shadow(0 0 0px transparent) grayscale(1) brightness(0.5)' }
              }
              transition={
                !shouldReduceMotion && isActive
                  ? { duration: 1.5, repeat: Infinity, ease: 'easeInOut' }
                  : { duration: 0.2 }
              }
            >
              <span className="text-sm leading-none">{p.icon}</span>
              <span className="text-[9px] mt-0.5 font-medium">{p.label}</span>
            </motion.div>
          );
        })}
      </div>

      {/* Advance button */}
      {canAdvance && advanceInfo && (
        <motion.button
          className={gameButtonClass({
            tone:
              currentPhaseType === 'play'
                ? 'red'
                : currentPhaseType === 'end'
                  ? 'indigo'
                  : 'slate',
            size: 'sm',
            className: 'ml-1 px-3 py-1 font-bold text-xs pointer-events-auto',
          })}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => dispatch(advanceInfo.action, humanPlayer)}
        >
          {advanceInfo.label}
        </motion.button>
      )}
      </div>
    </div>
  );
}
