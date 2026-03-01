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
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10 }}
        transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
      >
        {phase.step === 'declare_attackers' && isAttacker && (
          <motion.div
            className="pointer-events-auto flex items-center gap-3 rounded-lg border border-red-300/30 bg-slate-950/50 px-3 py-1.5 shadow-lg shadow-black/20 backdrop-blur-sm"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          >
            {hasValidAttackers && (
              <motion.button
                className={gameButtonClass({
                  tone: 'red',
                  size: 'sm',
                  className: 'px-5 py-1.5 font-bold',
                })}
                style={{
                  boxShadow: '0 0 12px rgba(239, 68, 68, 0.3)',
                }}
                whileHover={{
                  scale: 1.08,
                  boxShadow: '0 0 20px rgba(239, 68, 68, 0.5), 0 0 40px rgba(239, 68, 68, 0.2)',
                }}
                whileTap={{ scale: 0.93 }}
                animate={{
                  boxShadow: [
                    '0 0 8px rgba(239, 68, 68, 0.2)',
                    '0 0 16px rgba(239, 68, 68, 0.5)',
                    '0 0 8px rgba(239, 68, 68, 0.2)',
                  ],
                }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                onClick={handleAllAttack}
              >
                ⚔ All Attack
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
              {hasTentativeAttackers ? '⚔ Attack!' : 'Skip'}
            </motion.button>
          </motion.div>
        )}

        {phase.step === 'declare_blockers' && isDefender && (
          <motion.div
            data-testid="blocker-controls"
            className="pointer-events-auto flex items-center gap-2 rounded-lg border bg-slate-950/50 px-3 py-1.5 shadow-lg shadow-black/20 backdrop-blur-sm"
            style={{ borderColor: 'rgba(96, 165, 250, 0.3)' }}
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{
              scale: 1,
              opacity: 1,
              borderColor: [
                'rgba(96, 165, 250, 0.2)',
                'rgba(96, 165, 250, 0.5)',
                'rgba(96, 165, 250, 0.2)',
              ],
            }}
            transition={{
              scale: { duration: 0.3, ease: [0.22, 1, 0.36, 1] },
              borderColor: { duration: 2, repeat: Infinity, ease: 'easeInOut' },
            }}
          >
            <span className="text-blue-300 font-medium text-sm">🛡 Assign blockers</span>
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
          </motion.div>
        )}

        {phase.step === 'resolving' && (
          <motion.div
            className="pointer-events-auto rounded-lg border border-orange-300/30 bg-slate-950/50 px-4 py-1.5 shadow-lg shadow-black/20 backdrop-blur-sm"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          >
            <motion.span
              className="text-orange-300 font-bold text-sm"
              animate={{
                opacity: [1, 0.4, 1],
                textShadow: [
                  '0 0 8px rgba(251, 146, 60, 0.4)',
                  '0 0 16px rgba(251, 146, 60, 0.7)',
                  '0 0 8px rgba(251, 146, 60, 0.4)',
                ],
              }}
              transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
            >
              ⚔ Resolving combat...
            </motion.span>
          </motion.div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
