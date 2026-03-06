import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { CombatPriorityPhase, GameAction } from '@engine/types';
import { CARD_REGISTRY } from '@engine/cards';
import { useGameStore } from '@game/gameStore';
import { getOpponent } from '@engine/types';
import { useGameDispatch } from '@game/GameDispatchContext';
import { usePhaseInfo } from '@hooks/usePhaseInfo';
import { gameButtonClass } from '@components/ui/buttonStyles';

type SkipConfirmStep = 'declare_attackers' | 'declare_blockers' | null;
const SKIP_CONFIRM_WINDOW_MS = 1200;
const COMBAT_CONTROLS_BOTTOM = 'calc(env(safe-area-inset-bottom) + 8rem)';

function getPriorityWindowLabel(window: CombatPriorityPhase['window']): string {
  return window === 'post_attackers' ? 'Before Blockers' : 'Before Combat Damage';
}

function getPriorityButtonLabel(phase: CombatPriorityPhase): string {
  if (phase.stack.length > 0) {
    return 'Resolve Top Spell';
  }

  if (phase.window === 'post_attackers') {
    return 'Proceed to Blockers';
  }

  return 'Resolve Combat';
}

function getStackCardTone(cardId: string): string {
  const element = CARD_REGISTRY[cardId]?.element;
  switch (element) {
    case 'fire':
      return 'border-red-400/50 bg-red-950/75';
    case 'water':
      return 'border-cyan-400/50 bg-cyan-950/75';
    case 'earth':
      return 'border-amber-400/50 bg-amber-950/75';
    case 'air':
      return 'border-sky-400/50 bg-sky-950/75';
    case 'shadow':
      return 'border-violet-400/50 bg-violet-950/75';
    default:
      return 'border-white/25 bg-slate-950/75';
  }
}

export function ActionButton() {
  const phase = useGameStore((s) => s.state?.phase);
  const activePlayer = useGameStore((s) => s.state?.activePlayer);
  const humanPlayer = useGameStore((s) => s.humanPlayer);
  const legalActions = useGameStore((s) => s.legalActions);
  const dispatch = useGameDispatch();
  const phaseInfo = usePhaseInfo();
  const [skipConfirmStep, setSkipConfirmStep] = useState<SkipConfirmStep>(null);

  const handleAllAttack = useCallback(() => {
    setSkipConfirmStep(null);
    const declareActions = legalActions.filter(
      (a): a is Extract<GameAction, { type: 'DECLARE_ATTACKER' }> => a.type === 'DECLARE_ATTACKER',
    );
    const undeclareActions = legalActions.filter(
      (a): a is Extract<GameAction, { type: 'UNDECLARE_ATTACKER' }> => a.type === 'UNDECLARE_ATTACKER',
    );

    // Toggle all attackers: if any unselected attackers remain, select all.
    // Otherwise (all selected), clear them all.
    const actionsToDispatch = declareActions.length > 0 ? declareActions : undeclareActions;
    for (const action of actionsToDispatch) {
      dispatch(action, humanPlayer);
    }
  }, [legalActions, dispatch, humanPlayer]);

  const handleClearAttackers = useCallback(() => {
    setSkipConfirmStep(null);
    const undeclareActions = legalActions.filter(
      (a): a is Extract<GameAction, { type: 'UNDECLARE_ATTACKER' }> => a.type === 'UNDECLARE_ATTACKER',
    );
    for (const action of undeclareActions) {
      dispatch(action, humanPlayer);
    }
  }, [legalActions, dispatch, humanPlayer]);

  const handleClearBlockers = useCallback(() => {
    setSkipConfirmStep(null);
    const removeActions = legalActions.filter(
      (a): a is Extract<GameAction, { type: 'REMOVE_BLOCKER' }> => a.type === 'REMOVE_BLOCKER',
    );
    for (const action of removeActions) {
      dispatch(action, humanPlayer);
    }
  }, [legalActions, dispatch, humanPlayer]);

  const hasDeclareAttackers = useMemo(
    () => legalActions.some((a) => a.type === 'DECLARE_ATTACKER'),
    [legalActions],
  );
  const hasUndeclareAttackers = useMemo(
    () => legalActions.some((a) => a.type === 'UNDECLARE_ATTACKER'),
    [legalActions],
  );
  const hasAssignBlockers = useMemo(
    () => legalActions.some((a) => a.type === 'ASSIGN_BLOCKER'),
    [legalActions],
  );
  const hasRemoveBlockers = useMemo(
    () => legalActions.some((a) => a.type === 'REMOVE_BLOCKER'),
    [legalActions],
  );

  useEffect(() => {
    if (!skipConfirmStep) return;
    const timeout = setTimeout(() => setSkipConfirmStep(null), SKIP_CONFIRM_WINDOW_MS);
    return () => clearTimeout(timeout);
  }, [skipConfirmStep]);

  if (!phase || !phaseInfo) return null;

  if (phase.type === 'combat_priority') {
    const passAction = legalActions.find((a) => a.type === 'PASS_PRIORITY');
    const visibleStack = phase.stack.slice(Math.max(phase.stack.length - 4, 0));
    const isPriorityPlayer = humanPlayer === phase.priorityPlayer;
    const buttonLabel = getPriorityButtonLabel(phase);

    if (visibleStack.length === 0) {
      if (!isPriorityPlayer || !passAction) {
        return null;
      }

      return (
        <div
          data-testid="combat-controls"
          className="fixed z-[45] pointer-events-none"
          style={{
            right: 'calc(env(safe-area-inset-right) + var(--sidebar-w) + 1rem)',
            bottom: COMBAT_CONTROLS_BOTTOM,
          }}
        >
          <motion.button
            className={`${gameButtonClass({
              tone: 'slate',
              size: 'sm',
              className: 'px-5 py-2 font-bold',
            })} pointer-events-auto`}
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            data-testid="pass-priority-btn"
            onClick={() => dispatch(passAction, humanPlayer)}
          >
            {buttonLabel}
          </motion.button>
        </div>
      );
    }

    return (
      <div
        data-testid="combat-controls"
        className="fixed z-[45] pointer-events-none"
        style={{
          right: 'calc(env(safe-area-inset-right) + var(--sidebar-w) + 1rem)',
          bottom: COMBAT_CONTROLS_BOTTOM,
        }}
      >
        <motion.div
          className="pointer-events-auto flex items-center gap-3 rounded-xl border border-white/20 bg-slate-900/85 px-3 py-2.5"
          initial={{ opacity: 0, y: 10, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.9 }}
          transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="flex flex-col leading-tight">
            <span className="text-[11px] font-semibold text-blue-300 uppercase tracking-wide">
              {getPriorityWindowLabel(phase.window)}
            </span>
            <span className="text-[11px] text-white/70">
              {isPriorityPlayer ? 'Choose a response' : 'Opponent is deciding'}
            </span>
          </div>

          <div className="relative h-14 w-44 overflow-visible" data-testid="stack-pile">
            {visibleStack.map((item, idx) => {
              const cardName = CARD_REGISTRY[item.cardId]?.name ?? item.cardId;
              const isTop = idx === visibleStack.length - 1;
              return (
                <div
                  key={item.stackId}
                  className={`absolute h-12 w-36 rounded-md border px-2 py-1 shadow-lg backdrop-blur-sm ${getStackCardTone(item.cardId)}`}
                  style={{
                    transform: `translate(${idx * 12}px, ${idx * -7}px)`,
                    zIndex: idx + 1,
                  }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-[10px] font-semibold text-white/95">{cardName}</span>
                    <span className="text-[9px] uppercase tracking-wide text-white/65">
                      {item.casterId === humanPlayer ? 'You' : 'Opp'}
                    </span>
                  </div>
                  {isTop && (
                    <span className="mt-0.5 block text-[9px] uppercase tracking-wide text-blue-200/85">
                      Resolves Next
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {isPriorityPlayer && passAction && (
            <motion.button
              className={gameButtonClass({
                tone: 'slate',
                size: 'sm',
                className: 'px-4 py-1.5 font-bold',
              })}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.95 }}
              data-testid="pass-priority-btn"
              onClick={() => dispatch(passAction, humanPlayer)}
            >
              {buttonLabel}
            </motion.button>
          )}
        </motion.div>
      </div>
    );
  }

  const isAttacker = phase.type === 'battle' && humanPlayer === activePlayer;
  const isDefender = phase.type === 'battle' && humanPlayer === getOpponent(activePlayer!);

  // Battle phase — combat controls
  if (phase.type === 'battle') {
    const hasAttackToggles = hasDeclareAttackers || hasUndeclareAttackers;
    const hasTentativeAttackers = phase.step === 'declare_attackers' && phase.tentativeAttackers.length > 0;
    const hasBlockChoices = hasAssignBlockers || hasRemoveBlockers;
    const hasTentativeBlockers = phase.step === 'declare_blockers' && Object.keys(phase.tentativeBlockers).length > 0;

    const isAttackSkipArmed = phase.step === 'declare_attackers' && skipConfirmStep === 'declare_attackers';
    const isBlockSkipArmed = phase.step === 'declare_blockers' && skipConfirmStep === 'declare_blockers';

    const confirmNoAttacks = () => {
      const requiresGuard = hasAttackToggles || hasTentativeAttackers;
      if (!requiresGuard || isAttackSkipArmed) {
        setSkipConfirmStep(null);
        dispatch({ type: 'CONFIRM_ATTACKERS' }, humanPlayer);
        return;
      }
      setSkipConfirmStep('declare_attackers');
    };

    const confirmNoBlocks = () => {
      const requiresGuard = hasBlockChoices || hasTentativeBlockers;
      if (!requiresGuard || isBlockSkipArmed) {
        setSkipConfirmStep(null);
        dispatch({ type: 'CONFIRM_BLOCKERS' }, humanPlayer);
        return;
      }
      setSkipConfirmStep('declare_blockers');
    };

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
              {hasTentativeAttackers ? (
                <>
                  <motion.button
                    className={gameButtonClass({
                      tone: 'slate',
                      size: 'sm',
                      className: 'px-4 py-1.5 font-bold',
                    })}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.95 }}
                    data-testid="clear-attack-btn"
                    onClick={handleClearAttackers}
                  >
                    Clear Attackers
                  </motion.button>
                  <motion.button
                    className={gameButtonClass({
                      tone: 'red',
                      size: 'sm',
                      className: 'px-5 py-1.5 font-bold',
                    })}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    animate={{
                      scale: [1, 1.06, 1],
                      boxShadow: [
                        '0 0 0 rgba(239, 68, 68, 0)',
                        '0 0 18px rgba(239, 68, 68, 0.6)',
                        '0 0 0 rgba(239, 68, 68, 0)',
                      ],
                    }}
                    transition={{ duration: 1.1, repeat: Infinity, ease: 'easeInOut' }}
                    data-testid="confirm-attack-btn"
                    onClick={() => {
                      setSkipConfirmStep(null);
                      dispatch({ type: 'CONFIRM_ATTACKERS' }, humanPlayer);
                    }}
                  >
                    Attack!
                  </motion.button>
                </>
              ) : (
                <>
                  {hasAttackToggles && (
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
                      tone: isAttackSkipArmed ? 'amber' : 'slate',
                      size: 'sm',
                      className: 'px-4 py-1.5 font-bold',
                    })}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.95 }}
                    data-testid="skip-attack-btn"
                    data-armed={isAttackSkipArmed ? 'true' : 'false'}
                    onClick={confirmNoAttacks}
                  >
                    {isAttackSkipArmed ? 'Tap again: No Attacks' : 'No Attacks'}
                  </motion.button>
                </>
              )}
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
              {hasTentativeBlockers ? (
                <>
                  <motion.button
                    className={gameButtonClass({
                      tone: 'slate',
                      size: 'sm',
                      className: 'px-4 py-1.5 font-bold',
                    })}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.95 }}
                    data-testid="clear-block-btn"
                    onClick={handleClearBlockers}
                  >
                    Clear Blocks
                  </motion.button>
                  <motion.button
                    className={gameButtonClass({
                      tone: 'blue',
                      size: 'sm',
                      className: 'px-4 py-1.5 font-bold',
                    })}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    data-testid="confirm-block-btn"
                    onClick={() => {
                      setSkipConfirmStep(null);
                      dispatch({ type: 'CONFIRM_BLOCKERS' }, humanPlayer);
                    }}
                  >
                    Block!
                  </motion.button>
                </>
              ) : (
                <motion.button
                  className={gameButtonClass({
                    tone: isBlockSkipArmed ? 'amber' : 'slate',
                    size: 'sm',
                    className: 'px-4 py-1.5 font-bold',
                  })}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.95 }}
                  data-testid="skip-block-btn"
                  data-armed={isBlockSkipArmed ? 'true' : 'false'}
                  onClick={confirmNoBlocks}
                >
                  {isBlockSkipArmed ? 'Tap again: No Blocks' : 'No Blocks'}
                </motion.button>
              )}
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
