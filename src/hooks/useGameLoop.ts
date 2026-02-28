import { useEffect, useRef } from 'react';
import { useGameStore } from '@game/gameStore';
import { useUIStore } from '@game/uiStore';
import { chooseAction } from '@engine/ai';
import { getOpponent } from '@engine/types';

export function useGameLoop() {
  const prevActivePlayerRef = useRef<string | null>(null);
  const aiLoopTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoAdvanceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Subscribe to state changes and drive AI + auto-advance
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

      const { state, rng, humanPlayer, dispatch } = useGameStore.getState();
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
          // Schedule next tick
          tick();
        }, delay);
        return;
      }

      // Human auto-advance for draw/energy phases
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
      }
    };

    // Subscribe to state changes — re-run tick on every game state update
    const unsubscribe = useGameStore.subscribe(
      (s) => s.state,
      () => tick(),
    );

    // Run initial tick in case game was already initialized
    tick();

    return () => {
      unsubscribe();
      if (aiLoopTimeoutRef.current !== null) {
        clearTimeout(aiLoopTimeoutRef.current);
      }
      if (autoAdvanceTimeoutRef.current !== null) {
        clearTimeout(autoAdvanceTimeoutRef.current);
      }
    };
  }, []);
}

function isAIPhase(state: { phase: { type: string; player?: string; casterId?: string; step?: string }; activePlayer: string }, aiPlayer: string): boolean {
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
      // resolving step: no one acts, it auto-resolves
      return false;
    case 'game_over':
      return false;
    default:
      // draw, energy, play, end — active player acts
      return state.activePlayer === aiPlayer;
  }
}
