import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type { GameAction, GameEvent, GameState, PlayerId, RNG } from '@engine/types';
import { reduce } from '@engine/reducer';
import { createInitialGameState } from '@engine/gameInit';
import type { GameInitConfig } from '@engine/gameInit';
import { enumerateLegalActions } from '@engine/validation';

interface GameStore {
  // State
  state: GameState | null;
  events: GameEvent[];
  rng: RNG | null;
  humanPlayer: PlayerId;

  // Derived (cached on dispatch)
  legalActions: GameAction[];

  // Actions
  initGame: (config: GameInitConfig, humanPlayer: PlayerId) => void;
  dispatch: (action: GameAction, actingPlayer: PlayerId) => GameEvent[];
  reset: () => void;
}

export const useGameStore = create<GameStore>()(
  subscribeWithSelector((set, get) => ({
    state: null,
    events: [],
    rng: null,
    humanPlayer: 'player1',
    legalActions: [],

    initGame: (config, humanPlayer) => {
      const gameState = createInitialGameState(config);
      const legal = enumerateLegalActions(gameState, humanPlayer);
      set({
        state: gameState,
        events: [],
        rng: config.rng,
        humanPlayer,
        legalActions: legal,
      });
    },

    dispatch: (action, actingPlayer) => {
      const { state, rng, humanPlayer } = get();
      if (!state || !rng) throw new Error('Game not initialized');

      const result = reduce(state, action, actingPlayer, rng);
      const legal = enumerateLegalActions(result.newState, humanPlayer);

      set({
        state: result.newState,
        events: result.events,
        legalActions: legal,
      });

      return result.events;
    },

    reset: () => {
      set({
        state: null,
        events: [],
        rng: null,
        legalActions: [],
      });
    },
  })),
);
