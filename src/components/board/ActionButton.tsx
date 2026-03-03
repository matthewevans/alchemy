import { useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { GameAction } from '@engine/types';
import { useGameStore } from '@game/gameStore';
import { getOpponent } from '@engine/types';
import { useGameDispatch } from '@game/GameDispatchContext';
import { usePhaseInfo } from '@hooks/usePhaseInfo';
import { gameButtonClass } from '@components/ui/buttonStyles';

export function ActionButton() {
  const phase = useGameStore((s) => s.state?.phase);
  const activePlayer = useGameStore((s) => s.state?.activePlayer);
  const humanPlayer = useGameStore((s) => s.humanPlayer);
  const legalActions = useGameStore((s) => s.legalActions);
  const dispatch = useGameDispatch();
  const phaseInfo = usePhaseInfo();

  const handleAllAttack = useCallback(() => {
    const declareActions = legalActions.filter(
      (a): a is Extract<GameAction, { type: 'DECLARE_ATTACKER' }> => a.type === 'DECLARE_ATTACKER',
    );
    for (const action of declareActions) {
      dispatch(action, humanPlayer);
    }
    dispatch({ type: 'CONFIRM_ATTACKERS' }, humanPlayer);
  }, [legalActions, dispatch, humanPlayer]);

  if (!phase || !phaseInfo) return null;

  const isAttacker = phase.type === 'battle' && humanPlayer === activePlayer;
  const isDefender = phase.type === 'battle' && humanPlayer === getOpponent(activePlayer!);

  // Battle phase — combat controls
  if (phase.type === 'battle') {
    const hasValidAttackers = legalActions.some((a) => a.type === 'DECLARE_ATTACKER');
    const hasTentativeAttackers = phase.step === 'declare_attackers' && phase.tentativeAttackers.length > 0;

    return (
      <div
        data-testid="combat-controls"
        className="fixed z-[45] pointer-events-none"
        style={{
          right: 'calc(env(safe-area-inset-right) + var(--sidebar-w) + 1rem)',
          bottom: 'calc(env(safe-area-inset-bottom) + 0.75rem)',
        }}
      >
        <AnimatePresence>
          {phase.step === 'declare_attackers' && isAttacker && (
            <motion.div
              className="pointer-events-auto flex items-center gap-2"
              initial={{ opacity: 0, y: 10, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.9 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            >
              {hasValidAttackers && !hasTentativeAttackers && (
                <motion.button
                  className={gameButtonClass({
                    tone: 'red',
                    size: 'sm',
                    className: 'px-5 py-1.5 font-bold',
                  })}
                  style={{ boxShadow: '0 0 12px rgba(239, 68, 68, 0.3)' }}
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
                  data-testid="all-attack-btn"
                  onClick={handleAllAttack}
                >
                  All Attack
                </motion.button>
              )}
              <motion.button
                className={gameButtonClass({
                  tone: hasTentativeAttackers ? 'red' : 'amber',
                  size: 'sm',
                  className: 'px-5 py-1.5 font-bold',
                })}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                data-testid="skip-attack-btn"
                onClick={() => dispatch({ type: 'CONFIRM_ATTACKERS' }, humanPlayer)}
              >
                {hasTentativeAttackers ? 'Attack!' : 'No Attacks'}
              </motion.button>
            </motion.div>
          )}

          {phase.step === 'declare_blockers' && isDefender && (
            <motion.div
              data-testid="blocker-controls"
              className="pointer-events-auto flex items-center gap-2"
              initial={{ opacity: 0, y: 10, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.9 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            >
              <span className="text-blue-300 font-medium text-sm">Assign blockers</span>
              <motion.button
                className={gameButtonClass({
                  tone: Object.keys(phase.tentativeBlockers).length > 0 ? 'blue' : 'amber',
                  size: 'sm',
                  className: 'px-4 py-1.5 font-bold',
                })}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => dispatch({ type: 'CONFIRM_BLOCKERS' }, humanPlayer)}
              >
                {Object.keys(phase.tentativeBlockers).length > 0 ? 'Block!' : 'No Blocks'}
              </motion.button>
            </motion.div>
          )}

          {phase.step === 'order_blockers' && isAttacker && (
            <motion.div
              className="pointer-events-auto flex items-center gap-2"
              initial={{ opacity: 0, y: 10, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.9 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            >
              <span className="text-blue-300 font-medium text-sm">Choose block order</span>
              <motion.button
                className={gameButtonClass({
                  tone: 'blue',
                  size: 'sm',
                  className: 'px-4 py-1.5 font-bold',
                })}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => dispatch({ type: 'CONFIRM_BLOCKER_ORDER' }, humanPlayer)}
              >
                Resolve
              </motion.button>
            </motion.div>
          )}

          {phase.step === 'resolving' && (
            <motion.div
              className="pointer-events-auto"
              initial={{ opacity: 0, y: 10, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.9 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
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
                Resolving...
              </motion.span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Phase advance button (pre-combat "Battle!" / post-combat "End Turn") */}
        <AnimatePresence>
          {phaseInfo.canAdvance && phaseInfo.advanceAction && phaseInfo.advanceLabel && (
            <motion.button
              className={gameButtonClass({
                tone: phaseInfo.displayKey === 'play' ? 'red' : phaseInfo.displayKey === 'play2' ? 'indigo' : 'slate',
                size: 'sm',
                className: 'pointer-events-auto px-5 py-1.5 font-bold',
              })}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              onClick={() => dispatch(phaseInfo.advanceAction!, humanPlayer)}
            >
              {phaseInfo.advanceLabel}
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // Non-battle phases — just the advance button
  if (!phaseInfo.canAdvance || !phaseInfo.advanceAction || !phaseInfo.advanceLabel) return null;

  return (
    <div
      data-testid="combat-controls"
      className="fixed z-[45] pointer-events-none"
      style={{
        right: 'calc(env(safe-area-inset-right) + var(--sidebar-w) + 1rem)',
        bottom: 'calc(env(safe-area-inset-bottom) + 0.75rem)',
      }}
    >
      <motion.button
        className={gameButtonClass({
          tone: phaseInfo.displayKey === 'play' ? 'red' : phaseInfo.displayKey === 'play2' ? 'indigo' : 'slate',
          size: 'sm',
          className: 'pointer-events-auto px-5 py-1.5 font-bold',
        })}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        initial={{ opacity: 0, y: 10, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
        onClick={() => dispatch(phaseInfo.advanceAction!, humanPlayer)}
      >
        {phaseInfo.advanceLabel}
      </motion.button>
    </div>
  );
}
