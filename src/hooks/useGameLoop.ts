import { useEffect, useRef } from 'react';
import { useGameStore } from '@game/gameStore';
import { useUIStore } from '@game/uiStore';
import { useAnimationStore } from '@game/animationStore';
import { useGameDispatch, useOpponentController } from '@game/GameDispatchContext';
import { isOpponentPhase } from '@game/controllers/types';
import { getOpponent } from '@engine/types';
import type { GameAction, GameState, PlayerId } from '@engine/types';

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

    const tick = () => {
      clearTimers();

      // Wait for animations to finish before processing game logic
      if (useAnimationStore.getState().isAnimating) return;

      const { state, rng, humanPlayer, legalActions } = useGameStore.getState();
      if (!state || !rng) return;
      if (state.phase.type === 'game_over') return;

      const opponentPlayer = getOpponent(humanPlayer);

      // Detect active player change for turn banners
      const activeKey = `${state.activePlayer}-${state.turn}`;
      if (prevActivePlayerRef.current !== activeKey && state.phase.type !== 'mulligan') {
        prevActivePlayerRef.current = activeKey;
        const isHumanTurn = state.activePlayer === humanPlayer;
        useUIStore.getState().flashTurnBanner(isHumanTurn ? 'YOUR TURN' : 'THEIR TURN');
      }

      // Opponent turn — delegate to controller
      if (isOpponentPhase(state, opponentPlayer)) {
        controller?.onOpponentPhase();
        return;
      }

      // Human auto-advance: draw, energy, and end phases always auto-advance
      if (state.activePlayer === humanPlayer) {
        if (state.phase.type === 'draw' || state.phase.type === 'energy' || state.phase.type === 'end') {
          autoAdvanceTimeoutRef.current = setTimeout(() => {
            const fresh = useGameStore.getState();
            if (!fresh.state) return;
            if (
              fresh.state.activePlayer === humanPlayer &&
              (fresh.state.phase.type === 'draw' || fresh.state.phase.type === 'energy' || fresh.state.phase.type === 'end')
            ) {
              dispatch({ type: 'ADVANCE_PHASE' }, humanPlayer);
              tick();
            }
          }, 300);
          return;
        }

        // Auto-skip attacker declaration when human has no valid attackers
        if (
          state.phase.type === 'battle' &&
          state.phase.step === 'declare_attackers' &&
          !legalActions.some((a) => a.type === 'DECLARE_ATTACKER')
        ) {
          autoAdvanceTimeoutRef.current = setTimeout(() => {
            const fresh = useGameStore.getState();
            if (!fresh.state || fresh.state.phase.type === 'game_over') return;
            if (
              fresh.state.phase.type === 'battle' &&
              fresh.state.phase.step === 'declare_attackers' &&
              !fresh.legalActions.some((a) => a.type === 'DECLARE_ATTACKER')
            ) {
              dispatch({ type: 'CONFIRM_ATTACKERS' }, humanPlayer);
              tick();
            }
          }, 200);
          return;
        }

        // Auto-advance when the player has no meaningful choices
        // (only ADVANCE_PHASE and CONCEDE available)
        if (shouldAutoAdvance(state, legalActions, humanPlayer)) {
          autoAdvanceTimeoutRef.current = setTimeout(() => {
            const fresh = useGameStore.getState();
            if (!fresh.state) return;
            if (fresh.state.phase.type === 'game_over') return;
            if (shouldAutoAdvance(fresh.state, fresh.legalActions, humanPlayer)) {
              dispatch({ type: 'ADVANCE_PHASE' }, humanPlayer);
              tick();
            }
          }, 200);
          return;
        }
      }
    };

    const unsubscribeGame = useGameStore.subscribe(
      (s) => s.state,
      () => tick(),
    );

    // Re-trigger tick when animations finish
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

/** Check if the only meaningful actions are ADVANCE_PHASE and CONCEDE. */
function shouldAutoAdvance(state: GameState, legalActions: GameAction[], humanPlayer: PlayerId): boolean {
  if (state.activePlayer !== humanPlayer) return false;

  // Never auto-skip battle — handled separately with correct action types
  if (state.phase.type === 'battle') return false;

  // For play phase: auto-advance if no cards are playable
  const meaningfulActions = legalActions.filter(
    (a) => a.type !== 'ADVANCE_PHASE' && a.type !== 'CONCEDE',
  );
  return meaningfulActions.length === 0;
}
