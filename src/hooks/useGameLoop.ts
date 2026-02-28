import { useEffect, useRef } from 'react';
import { useGameStore } from '@game/gameStore';
import { useUIStore } from '@game/uiStore';
import { chooseAction } from '@engine/ai';
import { getOpponent } from '@engine/types';
import type { GameAction, GameState, PlayerId } from '@engine/types';

export function useGameLoop() {
  const prevActivePlayerRef = useRef<string | null>(null);
  const aiLoopTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoAdvanceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const clearTimers = () => {
      if (aiLoopTimeoutRef.current !== null) {
        clearTimeout(aiLoopTimeoutRef.current);
        aiLoopTimeoutRef.current = null;
      }
      if (autoAdvanceTimeoutRef.current !== null) {
        clearTimeout(autoAdvanceTimeoutRef.current);
        autoAdvanceTimeoutRef.current = null;
      }
    };

    const tick = () => {
      clearTimers();

      const { state, rng, humanPlayer, dispatch, legalActions } = useGameStore.getState();
      if (!state || !rng) return;
      if (state.phase.type === 'game_over') return;

      const aiPlayer = getOpponent(humanPlayer);

      // Detect active player change for turn banners
      const activeKey = `${state.activePlayer}-${state.turn}`;
      if (prevActivePlayerRef.current !== activeKey && state.phase.type !== 'mulligan') {
        prevActivePlayerRef.current = activeKey;
        const isHumanTurn = state.activePlayer === humanPlayer;
        useUIStore.getState().flashTurnBanner(isHumanTurn ? 'YOUR TURN' : 'THEIR TURN');
      }

      // AI turn logic
      if (isAIPhase(state, aiPlayer)) {
        const delay = 500 + Math.random() * 500;
        aiLoopTimeoutRef.current = setTimeout(() => {
          const fresh = useGameStore.getState();
          if (!fresh.state || !fresh.rng) return;
          if (fresh.state.phase.type === 'game_over') return;
          if (!isAIPhase(fresh.state, aiPlayer)) return;

          const action = chooseAction(fresh.state, aiPlayer, fresh.rng);
          dispatch(action, aiPlayer);
          tick();
        }, delay);
        return;
      }

      // Human auto-advance: draw and energy phases always auto-advance
      if (state.activePlayer === humanPlayer) {
        if (state.phase.type === 'draw' || state.phase.type === 'energy') {
          autoAdvanceTimeoutRef.current = setTimeout(() => {
            const fresh = useGameStore.getState();
            if (!fresh.state) return;
            if (
              fresh.state.activePlayer === humanPlayer &&
              (fresh.state.phase.type === 'draw' || fresh.state.phase.type === 'energy')
            ) {
              dispatch({ type: 'ADVANCE_PHASE' }, humanPlayer);
              tick();
            }
          }, 300);
          return;
        }

        // Auto-skip battle if no creatures can attack
        if (state.phase.type === 'battle' && 'step' in state.phase && state.phase.step === 'declare_attackers') {
          const canDeclare = legalActions.some((a) => a.type === 'DECLARE_ATTACKER');
          if (!canDeclare) {
            autoAdvanceTimeoutRef.current = setTimeout(() => {
              const fresh = useGameStore.getState();
              if (!fresh.state || fresh.state.phase.type !== 'battle') return;
              dispatch({ type: 'CONFIRM_ATTACKERS' }, humanPlayer);
              tick();
            }, 200);
            return;
          }
        }

        // Auto-advance when the player has no meaningful choices
        // (only ADVANCE_PHASE and CONCEDE available) — EXCEPT "end" phase
        // which needs an explicit "End Turn" click
        if (state.phase.type !== 'end' && shouldAutoAdvance(state, legalActions, humanPlayer)) {
          autoAdvanceTimeoutRef.current = setTimeout(() => {
            const fresh = useGameStore.getState();
            if (!fresh.state) return;
            if (fresh.state.phase.type === 'end' || fresh.state.phase.type === 'game_over') return;
            if (shouldAutoAdvance(fresh.state, fresh.legalActions, humanPlayer)) {
              dispatch({ type: 'ADVANCE_PHASE' }, humanPlayer);
              tick();
            }
          }, 200);
          return;
        }
      }
    };

    const unsubscribe = useGameStore.subscribe(
      (s) => s.state,
      () => tick(),
    );

    tick();

    return () => {
      unsubscribe();
      clearTimers();
    };
  }, []);
}

/** Check if the only meaningful actions are ADVANCE_PHASE and CONCEDE. */
function shouldAutoAdvance(state: GameState, legalActions: GameAction[], humanPlayer: PlayerId): boolean {
  if (state.activePlayer !== humanPlayer) return false;

  // During battle declare_attackers: auto-skip if no creatures can attack
  if (state.phase.type === 'battle') {
    const hasAttackActions = legalActions.some((a) => a.type === 'DECLARE_ATTACKER');
    if (!hasAttackActions && legalActions.some((a) => a.type === 'CONFIRM_ATTACKERS')) {
      // No creatures to declare — auto-confirm with 0 attackers
      return false; // We need to dispatch CONFIRM_ATTACKERS, not ADVANCE_PHASE
    }
    return false;
  }

  // For play phase: auto-advance if no cards are playable
  const meaningfulActions = legalActions.filter(
    (a) => a.type !== 'ADVANCE_PHASE' && a.type !== 'CONCEDE',
  );
  return meaningfulActions.length === 0;
}

function isAIPhase(
  state: { phase: { type: string; player?: string; casterId?: string; step?: string }; activePlayer: string },
  aiPlayer: string,
): boolean {
  const { phase } = state;

  switch (phase.type) {
    case 'mulligan':
      return phase.player === aiPlayer;
    case 'discard':
      return phase.player === aiPlayer;
    case 'targeting':
      return phase.casterId === aiPlayer;
    case 'battle':
      if (phase.step === 'declare_attackers') {
        return state.activePlayer === aiPlayer;
      }
      if (phase.step === 'declare_blockers') {
        return getOpponent(state.activePlayer as 'player1' | 'player2') === aiPlayer;
      }
      return false;
    case 'game_over':
      return false;
    default:
      return state.activePlayer === aiPlayer;
  }
}
