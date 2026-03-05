import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type { GameAction, GameEvent, GameState, PlayerId } from '@engine/types';
import type { SeededRNG } from '@engine/prng';
import { restoreRNG } from '@engine/prng';
import { reduce } from '@engine/reducer';
import { createInitialGameState } from '@engine/gameInit';
import type { GameInitConfig } from '@engine/gameInit';
import type { AIConfig } from '@engine/aiConfig';
import { enumerateLegalActions } from '@engine/validation';
import { saveGame, clearSavedGame, saveActiveGameId } from '@storage/persistence';
import type { PersistedGame } from '@storage/persistence';
import type { GameSessionMeta } from './sessionMeta';

interface GameStore {
  // State
  state: GameState | null;
  events: GameEvent[];
  rng: SeededRNG | null;
  humanPlayer: PlayerId;
  gameId: string | null;
  player1DeckIds: string[];
  player2DeckIds: string[];
  aiConfig: AIConfig | null;
  sessionMeta: GameSessionMeta | null;

  // Derived (cached on dispatch)
  legalActions: GameAction[];

  // Actions
  initGame: (
    config: GameInitConfig,
    humanPlayer: PlayerId,
    aiConfig?: AIConfig,
    sessionMeta?: GameSessionMeta,
  ) => string;
  restoreGame: (gameState: GameState, rngState: number, persisted: PersistedGame) => void;
  dispatch: (action: GameAction, actingPlayer: PlayerId) => GameEvent[];
  suspend: () => void;
  reset: () => void;
}

interface PendingAutoSave {
  gameId: string;
  gameState: GameState;
  rngState: number;
  humanPlayer: PlayerId;
  player1DeckIds: string[];
  player2DeckIds: string[];
  aiConfig?: AIConfig;
  sessionMeta?: GameSessionMeta;
}

const AUTOSAVE_DEBOUNCE_MS = 250;
let pendingAutoSave: PendingAutoSave | null = null;
let autoSaveTimer: ReturnType<typeof setTimeout> | null = null;

function flushAutoSave(): void {
  if (!pendingAutoSave) return;
  const save = pendingAutoSave;
  pendingAutoSave = null;
  saveGame(
    save.gameId,
    save.gameState,
    save.rngState,
    save.humanPlayer,
    save.player1DeckIds,
    save.player2DeckIds,
    save.aiConfig,
    save.sessionMeta,
  );
}

function scheduleAutoSave(save: PendingAutoSave): void {
  pendingAutoSave = save;
  if (autoSaveTimer !== null) return;
  autoSaveTimer = setTimeout(() => {
    autoSaveTimer = null;
    flushAutoSave();
  }, AUTOSAVE_DEBOUNCE_MS);
}

function cancelAutoSave(): void {
  if (autoSaveTimer !== null) {
    clearTimeout(autoSaveTimer);
    autoSaveTimer = null;
  }
  pendingAutoSave = null;
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
    aiConfig: null,
    sessionMeta: null,
    legalActions: [],

    initGame: (config, humanPlayer, aiConfig, sessionMeta) => {
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
        aiConfig: aiConfig ?? null,
        sessionMeta: sessionMeta ?? null,
        legalActions: legal,
      });

      saveActiveGameId(gameId);
      cancelAutoSave();
      saveGame(gameId, gameState, rng.getState(), humanPlayer, p1Ids, p2Ids, aiConfig, sessionMeta);
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
        aiConfig: persisted.aiConfig ?? null,
        sessionMeta: persisted.meta ?? null,
        legalActions: legal,
      });
    },

    dispatch: (action, actingPlayer) => {
      const {
        state,
        rng,
        humanPlayer,
        gameId,
        player1DeckIds,
        player2DeckIds,
        aiConfig,
        sessionMeta,
      } = get();
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
        scheduleAutoSave({
          gameId,
          gameState: result.newState,
          rngState: rng.getState(),
          humanPlayer,
          player1DeckIds,
          player2DeckIds,
          aiConfig: aiConfig ?? undefined,
          sessionMeta: sessionMeta ?? undefined,
        });
      } else {
        cancelAutoSave();
      }

      return result.events;
    },

    suspend: () => {
      cancelAutoSave();
      set({
        state: null,
        events: [],
        rng: null,
        gameId: null,
        player1DeckIds: [],
        player2DeckIds: [],
        aiConfig: null,
        sessionMeta: null,
        legalActions: [],
      });
    },

    reset: () => {
      const { gameId } = get();
      cancelAutoSave();
      clearSavedGame(gameId ?? undefined);
      set({
        state: null,
        events: [],
        rng: null,
        gameId: null,
        player1DeckIds: [],
        player2DeckIds: [],
        aiConfig: null,
        sessionMeta: null,
        legalActions: [],
      });
    },
  })),
);
