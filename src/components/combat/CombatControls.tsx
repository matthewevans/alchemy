import { useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { GameAction } from '@engine/types';
import { useGameStore } from '@game/gameStore';
import { useGameDispatch } from '@game/GameDispatchContext';
import { getOpponent } from '@engine/types';
import { gameButtonClass } from '@components/ui/buttonStyles';

export function CombatControls() {
  const phase = useGameStore((s) => s.state?.phase);
  const activePlayer = useGameStore((s) => s.state?.activePlayer);
  const humanPlayer = useGameStore((s) => s.humanPlayer);
  const legalActions = useGameStore((s) => s.legalActions);
  const dispatch = useGameDispatch();

  const handleAllAttack = useCallback(() => {
    // Declare every valid attacker, then confirm
    const declareActions = legalActions.filter(
      (a): a is Extract<GameAction, { type: 'DECLARE_ATTACKER' }> => a.type === 'DECLARE_ATTACKER',
    );
    for (const action of declareActions) {
      dispatch(action, humanPlayer);
    }
    dispatch({ type: 'CONFIRM_ATTACKERS' }, humanPlayer);
  }, [legalActions, dispatch, humanPlayer]);

  if (!phase || phase.type !== 'battle' || !activePlayer) return null;

  const isAttacker = humanPlayer === activePlayer;
  const isDefender = humanPlayer === getOpponent(activePlayer);

  const hasValidAttackers = legalActions.some((a) => a.type === 'DECLARE_ATTACKER');
  const hasTentativeAttackers = phase.step === 'declare_attackers' && phase.tentativeAttackers.length > 0;

  return (
    <AnimatePresence>
      <motion.div
        data-testid="combat-controls"
        className="pointer-events-none fixed z-[45] flex items-center justify-center"
        style={{
          right: 'calc(env(safe-area-inset-right) + 7rem)',
          bottom: 'calc(env(safe-area-inset-bottom) + 4.8rem)',
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
      >
        {phase.step === 'declare_attackers' && isAttacker && (
          <div className="pointer-events-auto flex items-center gap-3 rounded-lg border border-red-300/30 bg-slate-950/50 px-3 py-1.5 shadow-lg shadow-black/20 backdrop-blur-sm">
            {hasValidAttackers && (
              <motion.button
                className={gameButtonClass({
                  tone: 'red',
                  size: 'sm',
                  className: 'px-5 py-1.5 font-bold',
                })}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleAllAttack}
              >
                All Attack
              </motion.button>
            )}
            <motion.button
              className={gameButtonClass({
                tone: 'red',
                size: 'sm',
                className: 'px-5 py-1.5 font-bold',
              })}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => dispatch({ type: 'CONFIRM_ATTACKERS' }, humanPlayer)}
            >
              {hasTentativeAttackers ? 'Attack!' : 'Skip'}
            </motion.button>
          </div>
        )}

        {phase.step === 'declare_blockers' && isDefender && (
          <div
            data-testid="blocker-controls"
            className="pointer-events-auto flex items-center gap-2 rounded-lg border border-blue-300/30 bg-slate-950/50 px-3 py-1.5 shadow-lg shadow-black/20 backdrop-blur-sm"
          >
            <span className="text-blue-300 font-medium text-sm">Assign blockers</span>
            <motion.button
              className={gameButtonClass({
                tone: 'blue',
                size: 'sm',
                className: 'px-4 py-1.5 font-bold',
              })}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => dispatch({ type: 'CONFIRM_BLOCKERS' }, humanPlayer)}
            >
              Done
            </motion.button>
          </div>
        )}

        {phase.step === 'resolving' && (
          <div className="pointer-events-auto rounded-lg border border-orange-300/30 bg-slate-950/50 px-4 py-1.5 shadow-lg shadow-black/20 backdrop-blur-sm">
            <motion.span
              className="text-orange-300 font-bold text-sm"
              animate={{ opacity: [1, 0.5, 1] }}
              transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
            >
              Resolving combat...
            </motion.span>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
