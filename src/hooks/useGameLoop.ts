import { useEffect, useRef } from 'react';
import { useGameStore } from '@game/gameStore';
import { useUIStore } from '@game/uiStore';
import { useAnimationStore } from '@game/animationStore';
import { useGameDispatch, useOpponentController } from '@game/GameDispatchContext';
import { isOpponentPhase } from '@game/controllers/types';
import { getOpponent } from '@engine/types';
import type { GameAction, GameState, PlayerId } from '@engine/types';

interface AutoAction {
  action: GameAction;
  delay: number;
}

/** Pure decision function: given the current state, returns what (if anything) the game loop should auto-dispatch. */
export function getAutoAction(
  state: GameState,
  legalActions: GameAction[],
  humanPlayer: PlayerId,
): AutoAction | null {
  if (state.activePlayer !== humanPlayer) return null;

  switch (state.phase.type) {
    case 'draw':
    case 'energy':
    case 'end':
      return { action: { type: 'ADVANCE_PHASE' }, delay: 300 };

    case 'battle':
      if (state.phase.step === 'declare_attackers') {
        const hasDeclare = legalActions.some((a) => a.type === 'DECLARE_ATTACKER');
        const hasUndeclare = legalActions.some((a) => a.type === 'UNDECLARE_ATTACKER');
        const hasSelectedAttackers = state.phase.tentativeAttackers.length > 0;

        // Auto-skip only when the player has no attack selection to make.
        // If any attackers are already selected, wait for explicit "Attack!" confirm.
        if (!hasDeclare && !hasUndeclare && !hasSelectedAttackers) {
          return { action: { type: 'CONFIRM_ATTACKERS' }, delay: 200 };
        }
      }
      return null;

    case 'play': {
      const hasPlayableAction = legalActions.some(
        (a) => a.type !== 'ADVANCE_PHASE' && a.type !== 'CONCEDE',
      );
      return hasPlayableAction ? null : { action: { type: 'ADVANCE_PHASE' }, delay: 200 };
    }

    case 'learning':
      return null;

    default:
      return null;
  }
}

export function useGameLoop() {
  const prevActivePlayerRef = useRef<string | null>(null);
  const autoAdvanceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const controller = useOpponentController();
  const dispatch = useGameDispatch();

  useEffect(() => {
    const clearTimers = () => {
      if (autoAdvanceTimeoutRef.current !== null) {
        clearTimeout(autoAdvanceTimeoutRef.current);
        autoAdvanceTimeoutRef.current = null;
      }
    };

    const scheduleAction = (auto: AutoAction, humanPlayer: PlayerId) => {
      autoAdvanceTimeoutRef.current = setTimeout(() => {
        const fresh = useGameStore.getState();
        if (!fresh.state || fresh.state.phase.type === 'game_over') return;
        const freshAuto = getAutoAction(fresh.state, fresh.legalActions, humanPlayer);
        if (freshAuto && freshAuto.action.type === auto.action.type) {
          dispatch(freshAuto.action, humanPlayer);
          tick();
        }
      }, auto.delay);
    };

    const detectTurnChange = (state: GameState, humanPlayer: PlayerId) => {
      const activeKey = `${state.activePlayer}-${state.turn}`;
      if (prevActivePlayerRef.current !== activeKey && state.phase.type !== 'mulligan') {
        prevActivePlayerRef.current = activeKey;
        const isHumanTurn = state.activePlayer === humanPlayer;
        useUIStore.getState().flashTurnBanner(isHumanTurn ? 'YOUR TURN' : 'THEIR TURN');
      }
    };

    const tick = () => {
      clearTimers();
      if (useAnimationStore.getState().isAnimating) return;

      const { state, humanPlayer, legalActions } = useGameStore.getState();
      if (!state) return;
      if (state.phase.type === 'game_over') return;

      detectTurnChange(state, humanPlayer);

      if (isOpponentPhase(state, getOpponent(humanPlayer))) {
        controller?.onOpponentPhase();
        return;
      }

      const auto = getAutoAction(state, legalActions, humanPlayer);
      if (auto) {
        scheduleAction(auto, humanPlayer);
      }
    };

    const unsubscribeGame = useGameStore.subscribe(
      (s) => s.state,
      () => tick(),
    );

    const unsubscribeAnim = useAnimationStore.subscribe(
      (s) => s.isAnimating,
      (isAnimating) => { if (!isAnimating) tick(); },
    );

    tick();

    return () => {
      unsubscribeGame();
      unsubscribeAnim();
      clearTimers();
    };
  }, [controller, dispatch]);
}
