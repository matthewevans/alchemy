import type { GameAction, GameEvent, GameState, PlayerId } from '@engine/types';
import { getOpponent } from '@engine/types';
import { chooseAction } from '@engine/ai';
import type { SeededRNG } from '@engine/prng';
import { useAnimationStore } from '@game/animationStore';
import type { OpponentController } from './types';
import { isOpponentPhase } from './types';

interface StoreAccessor {
  getState: () => {
    state: GameState | null;
    rng: SeededRNG | null;
    humanPlayer: PlayerId;
  };
  dispatch: (action: GameAction, actingPlayer: PlayerId) => GameEvent[];
}

export function createAIController(store: StoreAccessor): OpponentController {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  const scheduleAIAction = () => {
    if (timeoutId !== null) return;

    const delay = 500 + Math.random() * 500;
    timeoutId = setTimeout(() => {
      timeoutId = null;

      // Wait for animations to finish before AI acts
      if (useAnimationStore.getState().isAnimating) {
        scheduleAIAction();
        return;
      }

      const { state, rng, humanPlayer } = store.getState();
      if (!state || !rng) return;
      if (state.phase.type === 'game_over') return;

      const aiPlayer = getOpponent(humanPlayer);
      if (!isOpponentPhase(state, aiPlayer)) return;

      const action = chooseAction(state, aiPlayer, rng);
      store.dispatch(action, aiPlayer);

      // Check if AI still needs to act (multi-step turns like declaring attackers)
      const fresh = store.getState();
      if (fresh.state && isOpponentPhase(fresh.state, aiPlayer)) {
        scheduleAIAction();
      }
    }, delay);
  };

  return {
    onOpponentPhase() {
      scheduleAIAction();
    },

    onLocalAction() {
      // AI doesn't need to know about human actions
    },

    dispose() {
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
    },
  };
}
