import { useState, useEffect } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { useGameStore } from '@game/gameStore';
import { useGameDispatch } from '@game/GameDispatchContext';
import type { GameAction, Phase } from '@engine/types';
import { gameButtonClass } from '@components/ui/buttonStyles';

const PHASES = [
  { key: 'draw', label: 'Draw', icon: '🂠' },
  { key: 'energy', label: 'Energy', icon: '⚡' },
  { key: 'play', label: 'Play', icon: '🃏' },
  { key: 'battle', label: 'Battle', icon: '⚔️' },
  { key: 'play2', label: 'Play', icon: '🃏' },
] as const;

const PHASE_ORDER: Record<string, number> = {
  draw: 0,
  energy: 1,
  play: 2,
  targeting: 2, // targeting is sub-phase of play
  battle: 3,
  play2: 4,
  end: 5, // auto-advances, not shown in strip
};

/** Map raw phase to a display key that accounts for post-combat play. */
function getDisplayPhaseKey(phase: Phase): string {
  if (phase.type === 'play' && phase.postCombat) return 'play2';
  if (phase.type === 'targeting' && phase.postCombat) return 'play2';
  return phase.type;
}

function getAdvanceAction(displayKey: string): { action: GameAction; label: string } | null {
  switch (displayKey) {
    case 'play':
      return { action: { type: 'ADVANCE_PHASE' }, label: 'Battle!' };
    case 'play2':
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

  // Phase transition flash (derived state pattern — detect transition during render)
  const [prevPhaseType, setPrevPhaseType] = useState(phase?.type);
  const [transitionFlash, setTransitionFlash] = useState(false);

  if (phase && prevPhaseType !== phase.type) {
    setPrevPhaseType(phase.type);
    setTransitionFlash(true);
  }

  useEffect(() => {
    if (!transitionFlash) return;
    const timer = setTimeout(() => setTransitionFlash(false), 400);
    return () => clearTimeout(timer);
  }, [transitionFlash]);

  if (!phase) return null;

  const displayKey = getDisplayPhaseKey(phase);
  const currentOrder = PHASE_ORDER[displayKey] ?? -1;
  const canAdvance = legalActions.some((a) => a.type === 'ADVANCE_PHASE');
  const advanceInfo = getAdvanceAction(displayKey);

  return (
    <div
      data-testid="phase-strip"
      data-phase={displayKey}
      className="fixed z-40 pointer-events-none rounded-lg border border-white/15 bg-slate-950/85 backdrop-blur-sm px-1.5 py-0.5"
      style={{
        right: 'calc(env(safe-area-inset-right) + 7rem)',
        bottom: 'calc(env(safe-area-inset-bottom) + 0.65rem)',
      }}
    >
      <div className="flex items-center justify-center gap-1.5">
      {/* Phase icons */}
      <div className="flex items-center gap-0.5 pointer-events-none relative">
        {PHASES.map((p) => {
          const order = PHASE_ORDER[p.key];
          const isActive = p.key === displayKey;
          const isCompleted = order < currentOrder;

          return (
            <motion.div
              key={p.key}
              className={`
                flex flex-col items-center px-1 py-0.5 rounded select-none pointer-events-none relative
                ${isActive ? 'text-amber-300' : isCompleted ? 'text-slate-500' : 'text-white/50'}
              `}
              style={{
                filter: isActive ? 'none' : 'grayscale(1) brightness(0.5)',
              }}
              animate={
                !shouldReduceMotion && isActive
                  ? {
                      scale: [1, 1.08, 1],
                      opacity: 1,
                    }
                  : {
                      scale: 1,
                      opacity: 1,
                    }
              }
              transition={
                !shouldReduceMotion && isActive
                  ? { duration: 1.5, repeat: Infinity, ease: 'easeInOut' }
                  : { duration: 0.2 }
              }
            >
              {/* Active phase underline glow */}
              {isActive && !shouldReduceMotion && (
                <motion.div
                  className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 rounded-full"
                  style={{
                    width: 16,
                    height: 2,
                    background: 'rgba(251, 191, 36, 0.8)',
                    boxShadow: '0 0 6px rgba(251, 191, 36, 0.6)',
                  }}
                  layoutId="phase-indicator"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
              <span className="text-sm leading-none">{p.icon}</span>
              <span className="text-[9px] mt-0.5 font-medium">{p.label}</span>
            </motion.div>
          );
        })}

        {/* Phase transition flash — brief golden burst */}
        {transitionFlash && !shouldReduceMotion && (
          <motion.div
            className="absolute inset-0 rounded pointer-events-none"
            style={{
              background: 'radial-gradient(ellipse at center, rgba(251, 191, 36, 0.3), transparent 70%)',
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 0] }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          />
        )}
      </div>

      {/* Advance button */}
      {canAdvance && advanceInfo && (
        <motion.button
          className={gameButtonClass({
            tone:
              displayKey === 'play'
                ? 'red'
                : displayKey === 'play2'
                  ? 'indigo'
                  : 'slate',
            size: 'sm',
            className: 'ml-1 px-3 py-1 font-bold text-xs pointer-events-auto',
          })}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
          onClick={() => dispatch(advanceInfo.action, humanPlayer)}
        >
          {advanceInfo.label}
        </motion.button>
      )}
      </div>
    </div>
  );
}
