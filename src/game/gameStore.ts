import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type { GameAction, GameEvent, GameState, PlayerId } from '@engine/types';
import type { SeededRNG } from '@engine/prng';
import { restoreRNG } from '@engine/prng';
import { reduce } from '@engine/reducer';
import { createInitialGameState } from '@engine/gameInit';
import type { GameInitConfig } from '@engine/gameInit';
import { enumerateLegalActions } from '@engine/validation';
import { saveGame, clearSavedGame, saveActiveGameId } from '@storage/persistence';
import type { PersistedGame } from '@storage/persistence';

interface GameStore {
  // State
  state: GameState | null;
  events: GameEvent[];
  rng: SeededRNG | null;
  humanPlayer: PlayerId;
  gameId: string | null;
  player1DeckIds: string[];
  player2DeckIds: string[];

  // Derived (cached on dispatch)
  legalActions: GameAction[];

  // Actions
  initGame: (config: GameInitConfig, humanPlayer: PlayerId) => string;
  restoreGame: (gameState: GameState, rngState: number, persisted: PersistedGame) => void;
  dispatch: (action: GameAction, actingPlayer: PlayerId) => GameEvent[];
  reset: () => void;
}

export const useGameStore = create<GameStore>()(
  subscribeWithSelector((set, get) => ({
    state: null,
    events: [],
    rng: null,
    humanPlayer: 'player1',
    gameId: null,
    player1DeckIds: [],
    player2DeckIds: [],
    legalActions: [],

    initGame: (config, humanPlayer) => {
      const gameId = crypto.randomUUID();
      const gameState = createInitialGameState(config);
      const legal = enumerateLegalActions(gameState, humanPlayer);
      const rng = config.rng as SeededRNG;
      const p1Ids = config.player1Deck;
      const p2Ids = config.player2Deck;

      set({
        state: gameState,
        events: [],
        rng,
        humanPlayer,
        gameId,
        player1DeckIds: p1Ids,
        player2DeckIds: p2Ids,
        legalActions: legal,
      });

      saveActiveGameId(gameId);
      saveGame(gameId, gameState, rng.getState(), humanPlayer, p1Ids, p2Ids);
      return gameId;
    },

    restoreGame: (gameState, rngState, persisted) => {
      const rng = restoreRNG(rngState);
      const legal = enumerateLegalActions(gameState, persisted.humanPlayer);

      set({
        state: gameState,
        events: [],
        rng,
        humanPlayer: persisted.humanPlayer,
        gameId: persisted.gameId,
        player1DeckIds: persisted.player1DeckIds,
        player2DeckIds: persisted.player2DeckIds,
        legalActions: legal,
      });
    },

    dispatch: (action, actingPlayer) => {
      const { state, rng, humanPlayer, gameId, player1DeckIds, player2DeckIds } = get();
      if (!state || !rng) throw new Error('Game not initialized');

      const result = reduce(state, action, actingPlayer, rng);
      const legal = enumerateLegalActions(result.newState, humanPlayer);

      set({
        state: result.newState,
        events: result.events,
        legalActions: legal,
      });

      // Auto-save unless game just ended
      if (result.newState.phase.type !== 'game_over' && gameId) {
        saveGame(gameId, result.newState, rng.getState(), humanPlayer, player1DeckIds, player2DeckIds);
      }

      return result.events;
    },

    reset: () => {
      const { gameId } = get();
      clearSavedGame(gameId ?? undefined);
      set({
        state: null,
        events: [],
        rng: null,
        gameId: null,
        player1DeckIds: [],
        player2DeckIds: [],
        legalActions: [],
      });
    },
  })),
);
